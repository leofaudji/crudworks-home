<?php
// AuthController.php
$db = Database::getInstance();

switch ($method) {
    case 'POST':
        if ($id === 'login') {
            $username = trim($params['username'] ?? '');
            $password = trim($params['password'] ?? '');

            if (empty($username) || empty($password)) {
                errorResponse('Username dan kata sandi wajib diisi');
            }

            $user = $db->fetch(
                "SELECT u.*, r.name as role_name, r.label as role_label 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.username = ? LIMIT 1",
                [$username]
            );

            if (!$user) {
                errorResponse('Pengguna tidak ditemukan atau kredensial salah', 401);
            }

            if ($user['status'] !== 'aktif') {
                errorResponse('Akun Anda sedang dinonaktifkan. Hubungi administrator.', 403);
            }

            if (!password_verify($password, $user['password'])) {
                errorResponse('Kata sandi salah', 401);
            }

            // Setup session
            $_SESSION['user_id'] = (int)$user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['nama_lengkap'] = $user['nama_lengkap'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['role_id'] = (int)$user['role_id'];
            $_SESSION['role_name'] = $user['role_name'];

            // Update last login
            $db->execute("UPDATE users SET last_login = NOW() WHERE id = ?", [$user['id']]);

            // Generate CSRF token
            $csrfToken = generateCsrfToken();

            logActivity('login', 'users', $user['id'], null, ['username' => $username]);

            $menus = getUserMenus($user['role_id']);
            $permissions = getUserPermissions($user['role_id']);
            $permCodes = array_column($permissions, 'kode');

            successResponse([
                'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'nama_lengkap' => $user['nama_lengkap'],
                    'email' => $user['email'],
                    'role' => $user['role_label'] ?? $user['role_name'],
                    'role_id' => (int)$user['role_id'],
                    'role_name' => $user['role_name'],
                    'role_label' => $user['role_label']
                ],
                'menus' => $menus,
                'permissions' => $permCodes,
                'csrf_token' => $csrfToken
            ], 'Login berhasil');
        } elseif ($id === 'logout') {
            if (isset($_SESSION['user_id'])) {
                logActivity('logout', 'users', $_SESSION['user_id']);
            }
            $_SESSION = [];
            if (ini_get("session.use_cookies")) {
                $p = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]);
            }
            session_destroy();
            successResponse(null, 'Berhasil logout');
        } else {
            errorResponse('Endpoint auth tidak ditemukan', 404);
        }
        break;

    case 'PUT':
        authCheck();
        $userId = (int)$_SESSION['user_id'];

        if ($id === 'profile') {
            $namaLengkap = trim($params['nama_lengkap'] ?? '');
            $email = trim($params['email'] ?? '');

            if (empty($namaLengkap)) {
                errorResponse('Nama lengkap tidak boleh kosong');
            }

            $db->execute("UPDATE users SET nama_lengkap = ?, email = ? WHERE id = ?", [$namaLengkap, $email, $userId]);
            $_SESSION['nama_lengkap'] = $namaLengkap;
            $_SESSION['email'] = $email;

            logActivity('update', 'users', $userId, null, ['nama_lengkap' => $namaLengkap, 'email' => $email]);

            successResponse([
                'id' => $userId,
                'nama_lengkap' => $namaLengkap,
                'email' => $email
            ], 'Profil berhasil diperbarui');
        } elseif ($id === 'password') {
            $currentPassword = $params['current_password'] ?? '';
            $newPassword = $params['new_password'] ?? '';
            $confirmPassword = $params['confirm_password'] ?? '';

            if (empty($currentPassword) || empty($newPassword)) {
                errorResponse('Password saat ini dan password baru wajib diisi');
            }

            if ($newPassword !== $confirmPassword) {
                errorResponse('Konfirmasi password tidak cocok');
            }

            if (strlen($newPassword) < 6) {
                errorResponse('Password baru minimal 6 karakter');
            }

            $user = $db->fetch("SELECT password FROM users WHERE id = ?", [$userId]);
            if (!password_verify($currentPassword, $user['password'])) {
                errorResponse('Password saat ini salah', 400);
            }

            $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
            $db->execute("UPDATE users SET password = ? WHERE id = ?", [$hashed, $userId]);

            logActivity('change_password', 'users', $userId);

            successResponse(null, 'Password berhasil diperbarui');
        } else {
            errorResponse('Endpoint auth tidak ditemukan', 404);
        }
        break;

    case 'GET':
        if ($id === 'me' || $id === 'check') {
            if (!isset($_SESSION['user_id'])) {
                jsonResponse([
                    'success' => false,
                    'message' => 'Silakan login terlebih dahulu.',
                    'data' => null
                ], 200);
            }

            $user = $db->fetch(
                "SELECT u.id, u.username, u.nama_lengkap, u.email, u.role_id, 
                        r.name as role_name, r.label as role_label 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.id = ? AND u.status = 'aktif' LIMIT 1",
                [$_SESSION['user_id']]
            );

            if (!$user) {
                session_destroy();
                jsonResponse([
                    'success' => false,
                    'message' => 'Sesi tidak valid atau akun dinonaktifkan.',
                    'data' => null
                ], 200);
            }

            $menus = getUserMenus($user['role_id']);
            $permissions = getUserPermissions($user['role_id']);
            $permCodes = array_column($permissions, 'kode');

            successResponse([
                'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'nama_lengkap' => $user['nama_lengkap'],
                    'email' => $user['email'],
                    'role' => $user['role_label'] ?? $user['role_name'],
                    'role_id' => (int)$user['role_id'],
                    'role_name' => $user['role_name'],
                    'role_label' => $user['role_label']
                ],
                'menus' => $menus,
                'permissions' => $permCodes,
                'csrf_token' => getCsrfToken()
            ]);
        } elseif ($id === 'csrf') {
            successResponse(['csrf_token' => getCsrfToken()]);
        } else {
            errorResponse('Aksi autentikasi tidak valid', 404);
        }
        break;

    default:
        errorResponse('Method not allowed', 405);
}
