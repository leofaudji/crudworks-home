<?php
// AuthController.php
require_once __DIR__ . '/../config/totp_helpers.php';
$db = Database::getInstance();

switch ($method) {
    case 'POST':
        if ($id === 'login') {
            $username = trim($params['username'] ?? '');
            $password = trim($params['password'] ?? '');

            if (empty($username) || empty($password)) {
                errorResponse('Username dan kata sandi wajib diisi');
            }

            $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');

            // Rate limiting: maks 5 percobaan gagal per username+IP atau 15 per IP dalam 15 menit
            try {
                $failUserIp = (int)$db->count(
                    "SELECT COUNT(*) FROM login_attempts WHERE username = ? AND ip_address = ? AND attempted_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
                    [$username, $ip]
                );
                $failIp = (int)$db->count(
                    "SELECT COUNT(*) FROM login_attempts WHERE ip_address = ? AND attempted_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
                    [$ip]
                );
                if ($failUserIp >= 5 || $failIp >= 15) {
                    errorResponse('Terlalu banyak percobaan login gagal. Silakan coba lagi dalam 15 menit.', 429);
                }
            } catch (\Throwable $e) {
                // Abaikan jika tabel login_attempts belum dimigrasi
            }

            $recordFailedAttempt = static function () use ($db, $username, $ip) {
                try {
                    $db->execute("INSERT INTO login_attempts (username, ip_address) VALUES (?, ?)", [$username, $ip]);
                } catch (\Throwable $e) {}
            };

            $user = $db->fetch(
                "SELECT u.*, r.name as role_name, r.label as role_label 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.username = ? LIMIT 1",
                [$username]
            );

            if (!$user) {
                $recordFailedAttempt();
                errorResponse('Username atau kata sandi salah', 401);
            }

            if ($user['status'] !== 'aktif') {
                errorResponse('Akun Anda sedang dinonaktifkan. Hubungi administrator.', 403);
            }

            if (!password_verify($password, $user['password'])) {
                $recordFailedAttempt();
                logActivity('login_failed', 'users', (int)$user['id'], null, ['username' => $username, 'ip' => $ip]);
                errorResponse('Username atau kata sandi salah', 401);
            }

            // Verifikasi 2FA (TOTP) jika aktif pada akun ini
            if ((int)($user['totp_enabled'] ?? 0) === 1 && !empty($user['totp_secret'])) {
                $totpCode = preg_replace('/\D/', '', (string)($params['totp_code'] ?? ''));
                if ($totpCode === '') {
                    jsonResponse([
                        'success' => false,
                        'requires_2fa' => true,
                        'message' => 'Masukkan kode 6 digit dari aplikasi Authenticator'
                    ], 200);
                }
                if (!totpVerify((string)$user['totp_secret'], $totpCode)) {
                    $recordFailedAttempt();
                    errorResponse('Kode Authenticator (2FA) tidak valid atau kedaluwarsa', 401);
                }
            }

            // Bersihkan catatan gagal login & deteksi IP baru untuk notifikasi keamanan
            $isNewIp = false;
            try {
                $db->execute("DELETE FROM login_attempts WHERE username = ? AND ip_address = ?", [$username, $ip]);
                $hasHistory = (int)$db->count("SELECT COUNT(*) FROM user_sessions WHERE user_id = ?", [(int)$user['id']]) > 0;
                $seenIp = (int)$db->count("SELECT COUNT(*) FROM user_sessions WHERE user_id = ? AND ip_address = ?", [(int)$user['id'], $ip]) > 0;
                $isNewIp = $hasHistory && !$seenIp;
            } catch (\Throwable $e) {}

            // Setup session
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_regenerate_id(true);
            }
            $_SESSION['user_id'] = (int)$user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['nama_lengkap'] = $user['nama_lengkap'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['role_id'] = (int)$user['role_id'];
            $_SESSION['role_name'] = $user['role_name'];

            // Catat sesi aktif ke user_sessions
            try {
                $sid = session_id();
                $ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'), 0, 250);
                $db->execute(
                    "INSERT INTO user_sessions (user_id, session_id, ip_address, user_agent, is_revoked, last_activity, created_at)
                     VALUES (?, ?, ?, ?, 0, NOW(), NOW())
                     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), ip_address = VALUES(ip_address), user_agent = VALUES(user_agent), is_revoked = 0, last_activity = NOW()",
                    [(int)$user['id'], $sid, $ip, $ua]
                );
            } catch (\Throwable $e) {
                // Abaikan jika tabel belum tersedia
            }

            // Kirim peringatan email jika login dari IP baru (non-blocking)
            if ($isNewIp && !empty($user['email']) && function_exists('sendErpEmail')) {
                try {
                    $cfg = function_exists('getAppSettingsMap') ? getAppSettingsMap() : [];
                    if (!empty($cfg['smtp_host'])) {
                        $uaSafe = htmlspecialchars(substr((string)($_SERVER['HTTP_USER_AGENT'] ?? 'Browser'), 0, 120));
                        $timeStr = date('d/m/Y H:i:s');
                        $alertHtml = "<p>Halo <b>" . htmlspecialchars((string)$user['nama_lengkap']) . "</b>,</p>"
                            . "<p>Terdeteksi login baru ke akun <b>" . htmlspecialchars((string)$user['username']) . "</b> dari alamat IP baru:</p>"
                            . "<ul><li>IP Address: <b>" . htmlspecialchars($ip) . "</b></li><li>Waktu: <b>{$timeStr} WIB</b></li><li>Perangkat: {$uaSafe}</li></ul>"
                            . "<p>Jika ini bukan Anda, segera cabut sesi aktif dari menu <b>Keamanan Akun</b> dan ganti kata sandi Anda.</p>";
                        @sendErpEmail((string)$user['email'], (string)$user['nama_lengkap'], 'Peringatan Keamanan: Login dari IP Baru', $alertHtml, 'security', (int)$user['id']);
                    }
                } catch (\Throwable $e) {}
            }

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
                    'role_label' => $user['role_label'],
                    'totp_enabled' => (int)($user['totp_enabled'] ?? 0),
                    'preferences' => json_decode((string)($user['preferences_json'] ?? ''), true) ?: null
                ],
                'menus' => $menus,
                'permissions' => $permCodes,
                'csrf_token' => $csrfToken
            ], 'Login berhasil');
        } elseif ($id === 'logout') {
            $sid = session_id();
            if ($sid) {
                try {
                    $db->execute("UPDATE user_sessions SET is_revoked = 1 WHERE session_id = ?", [$sid]);
                } catch (\Throwable $e) {}
            }
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
        } elseif ($id === 'forgot-password') {
            $identifier = trim((string)($params['identifier'] ?? ''));
            if ($identifier === '') {
                errorResponse('Masukkan username atau email akun Anda', 422);
            }

            $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
            try {
                $ipReqs = (int)$db->count(
                    "SELECT COUNT(*) FROM login_attempts WHERE username = '__forgot__' AND ip_address = ? AND attempted_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
                    [$ip]
                );
                if ($ipReqs >= 5) {
                    errorResponse('Terlalu banyak permintaan reset. Coba lagi dalam 15 menit.', 429);
                }
                $db->execute("INSERT INTO login_attempts (username, ip_address) VALUES ('__forgot__', ?)", [$ip]);
            } catch (\Throwable $e) {}

            $user = $db->fetch(
                "SELECT id, username, nama_lengkap, email, status FROM users WHERE (username = ? OR email = ?) LIMIT 1",
                [$identifier, $identifier]
            );
            if ($user && $user['status'] === 'aktif' && !empty($user['email']) && filter_var($user['email'], FILTER_VALIDATE_EMAIL)) {
                $rawToken = bin2hex(random_bytes(24));
                $tokenHash = hash('sha256', $rawToken);
                $db->execute(
                    "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))",
                    [(int)$user['id'], $tokenHash]
                );
                $resetUrl = buildPublicAppUrl('#/reset-password?token=' . urlencode($rawToken));
                $cfg = function_exists('getAppSettingsMap') ? getAppSettingsMap() : [];
                $compName = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
                $hasLogo = function_exists('resolveCompanyEmailLogoPath') && resolveCompanyEmailLogoPath($cfg) !== null;
                $logoHtml = $hasLogo
                    ? "<div style='margin-bottom:12px'><img src='cid:company-logo' alt='{$compName}' style='max-height:36px;width:auto;display:inline-block;background:#ffffff;padding:6px 10px;border-radius:8px'></div>"
                    : '';
                $html = "<div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;color:#1e293b;background:#ffffff'>
                    <div style='background:#0f172a;color:#fff;padding:24px'>{$logoHtml}<h2 style='margin:0;font-size:18px'>Permintaan Reset Kata Sandi</h2></div>
                    <div style='padding:24px;line-height:1.6;font-size:14px'>
                        <p>Halo <b>" . htmlspecialchars((string)$user['nama_lengkap']) . "</b>,</p>
                        <p>Kami menerima permintaan reset kata sandi untuk akun <b>" . htmlspecialchars((string)$user['username']) . "</b>. Tautan di bawah berlaku selama <b>30 menit</b>:</p>
                        <p style='text-align:center;margin:24px 0'><a href='" . htmlspecialchars($resetUrl) . "' style='display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold'>Atur Ulang Kata Sandi</a></p>
                        <p style='font-size:12px;color:#64748b'>Abaikan email ini jika Anda tidak meminta reset kata sandi.</p>
                    </div></div>";
                if (function_exists('sendErpEmail')) {
                    @sendErpEmail((string)$user['email'], (string)$user['nama_lengkap'], "Reset Kata Sandi - {$compName}", $html, 'security', (int)$user['id']);
                }
                logActivity('forgot_password_request', 'users', (int)$user['id'], null, ['ip' => $ip]);
            }

            successResponse(null, 'Jika akun ditemukan dan memiliki email terdaftar, tautan reset kata sandi telah dikirim.');
        } elseif ($id === 'reset-password') {
            $token = trim((string)($params['token'] ?? ''));
            $newPass = (string)($params['new_password'] ?? '');
            if ($token === '' || strlen($newPass) < 6) {
                errorResponse('Token tidak valid atau kata sandi baru minimal 6 karakter', 422);
            }

            $tokenHash = hash('sha256', $token);
            $row = $db->fetch(
                "SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at >= NOW() LIMIT 1",
                [$tokenHash]
            );
            if (!$row) {
                errorResponse('Tautan reset kata sandi tidak valid atau sudah kedaluwarsa', 400);
            }

            $userId = (int)$row['user_id'];
            $db->execute("UPDATE users SET password = ? WHERE id = ?", [password_hash($newPass, PASSWORD_DEFAULT), $userId]);
            $db->execute("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [(int)$row['id']]);
            try {
                $db->execute("UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?", [$userId]);
                $db->execute("DELETE FROM login_attempts WHERE username = (SELECT username FROM users WHERE id = ? LIMIT 1)", [$userId]);
            } catch (\Throwable $e) {}
            logActivity('password_reset_success', 'users', $userId);
            successResponse(null, 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.');
        } elseif ($id === '2fa') {
            authCheck();
            $userId = (int)$_SESSION['user_id'];
            if ($action === 'setup') {
                $secret = totpGenerateSecret(16);
                $_SESSION['pending_totp_secret'] = $secret;
                $issuer = 'CRUDWorks ERP';
                $account = $_SESSION['email'] ?: $_SESSION['username'];
                $uri = totpGetOtpAuthUri($issuer, $account, $secret);
                $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' . rawurlencode($uri);
                successResponse(['secret' => $secret, 'otpauth_uri' => $uri, 'qr_url' => $qrUrl]);
            } elseif ($action === 'enable') {
                $secret = $_SESSION['pending_totp_secret'] ?? '';
                $code = preg_replace('/\D/', '', (string)($params['totp_code'] ?? ''));
                if ($secret === '') errorResponse('Sesi setup 2FA tidak ditemukan, silakan ulangi');
                if (!totpVerify($secret, $code)) errorResponse('Kode verifikasi 6 digit tidak valid', 422);
                $db->execute("UPDATE users SET totp_secret = ?, totp_enabled = 1 WHERE id = ?", [$secret, $userId]);
                unset($_SESSION['pending_totp_secret']);
                logActivity('enable_2fa', 'users', $userId);
                successResponse(['totp_enabled' => 1], '2FA Authenticator berhasil diaktifkan');
            } elseif ($action === 'disable') {
                $password = (string)($params['password'] ?? '');
                $uRow = $db->fetch("SELECT password FROM users WHERE id = ?", [$userId]);
                if (!$uRow || !password_verify($password, $uRow['password'])) {
                    errorResponse('Password konfirmasi salah', 422);
                }
                $db->execute("UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?", [$userId]);
                logActivity('disable_2fa', 'users', $userId);
                successResponse(['totp_enabled' => 0], '2FA Authenticator telah dinonaktifkan');
            } else {
                errorResponse('Sub-aksi 2FA tidak valid', 404);
            }
        } elseif ($id === 'sessions' && $action === 'revoke') {
            authCheck();
            $userId = (int)$_SESSION['user_id'];
            $currentSid = session_id();
            $targetId = (int)($params['id'] ?? 0);
            $revokeOthers = !empty($params['all_others']);

            if ($revokeOthers) {
                $db->execute("UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ? AND session_id != ?", [$userId, $currentSid]);
                logActivity('revoke_other_sessions', 'users', $userId);
                successResponse(null, 'Seluruh sesi perangkat lain berhasil dicabut');
            } elseif ($targetId > 0) {
                $db->execute("UPDATE user_sessions SET is_revoked = 1 WHERE id = ? AND user_id = ? AND session_id != ?", [$targetId, $userId, $currentSid]);
                logActivity('revoke_session', 'users', $userId, null, ['session_row_id' => $targetId]);
                successResponse(null, 'Sesi perangkat berhasil dicabut');
            } else {
                errorResponse('Target sesi tidak valid', 422);
            }
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
        } elseif ($id === 'preferences') {
            authCheck();
            $userId = (int)$_SESSION['user_id'];
            $hasCol = $db->fetch("SHOW COLUMNS FROM users LIKE 'preferences_json'");
            if (!$hasCol) {
                $db->execute("ALTER TABLE users ADD COLUMN preferences_json TEXT NULL AFTER totp_enabled");
            }
            $rawPrefs = is_array($params['preferences'] ?? null) ? $params['preferences'] : $params;
            $allowedKeys = [
                'app_nav_layout', 'app_windows_submenu_style', 'app_theme', 'app_dark_mode',
                'pref_font_size', 'keuangan_table_density', 'pref_table_grid_style',
                'pref_date_format', 'pref_num_separator', 'pref_num_decimals',
                'pref_num_currency_symbol', 'pref_start_page', 'pref_per_page', 'pref_reduced_motion'
            ];
            $clean = [];
            foreach ($allowedKeys as $k) {
                if (array_key_exists($k, $rawPrefs) && is_scalar($rawPrefs[$k])) {
                    $clean[$k] = mb_substr((string)$rawPrefs[$k], 0, 64);
                }
            }
            $db->execute(
                "UPDATE users SET preferences_json = ? WHERE id = ?",
                [json_encode($clean, JSON_UNESCAPED_UNICODE), $userId]
            );
            successResponse(['preferences' => $clean], 'Preferensi akun disinkronkan');
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

            $hasPrefCol = $db->fetch("SHOW COLUMNS FROM users LIKE 'preferences_json'");
            if (!$hasPrefCol) {
                $db->execute("ALTER TABLE users ADD COLUMN preferences_json TEXT NULL AFTER totp_enabled");
            }

            $user = $db->fetch(
                "SELECT u.id, u.username, u.nama_lengkap, u.email, u.role_id, u.totp_enabled, u.preferences_json,
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
                    'role_label' => $user['role_label'],
                    'totp_enabled' => (int)($user['totp_enabled'] ?? 0),
                    'preferences' => json_decode((string)($user['preferences_json'] ?? ''), true) ?: null
                ],
                'menus' => $menus,
                'permissions' => $permCodes,
                'csrf_token' => getCsrfToken()
            ]);
        } elseif ($id === 'sessions') {
            authCheck();
            $userId = (int)$_SESSION['user_id'];
            $currentSid = session_id();
            $rows = $db->fetchAll(
                "SELECT id, session_id, ip_address, user_agent, last_activity, created_at
                 FROM user_sessions
                 WHERE user_id = ? AND is_revoked = 0
                 ORDER BY last_activity DESC
                 LIMIT 20",
                [$userId]
            );
            $sessions = array_map(function ($r) use ($currentSid) {
                $isCurrent = ($r['session_id'] === $currentSid);
                unset($r['session_id']);
                $r['is_current'] = $isCurrent;
                return $r;
            }, $rows);
            successResponse($sessions);
        } elseif ($id === 'csrf') {
            successResponse(['csrf_token' => getCsrfToken()]);
        } else {
            errorResponse('Aksi autentikasi tidak valid', 404);
        }
        break;

    default:
        errorResponse('Method not allowed', 405);
}
