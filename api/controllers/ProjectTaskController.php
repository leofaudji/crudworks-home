<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';
require_once __DIR__ . '/../middleware/csrf.php';

$db = Database::getInstance();

// 1. Get Single Task Detail
if ($method === 'GET' && $id && is_numeric($id) && empty($action)) {
    authCheck();
    checkPermission('project.view');

    $task = $db->fetch(
        "SELECT t.*, p.nama_project, p.kode_project,
                pm.nama_milestone,
                u.nama_lengkap as assigned_nama, u.email as assigned_email
         FROM project_tasks t
         JOIN projects p ON t.project_id = p.id
         LEFT JOIN project_milestones pm ON t.milestone_id = pm.id
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE t.id = ?",
        [(int)$id]
    );

    if (!$task) {
        errorResponse('Tugas proyek tidak ditemukan', 404);
    }

    successResponse($task);
}

// 2. Quick Status Update (PATCH / PUT status)
if (($method === 'PUT' || $method === 'POST') && $id && is_numeric($id) && $action === 'status') {
    authCheck();
    checkPermission('project.edit');
    verifyCsrfToken();

    $newStatus = trim($params['status'] ?? '');
    $validStatuses = ['todo', 'in_progress', 'review', 'done'];
    if (!in_array($newStatus, $validStatuses, true)) {
        errorResponse('Status tugas tidak valid. Pilih: todo, in_progress, review, done', 422);
    }

    $existing = $db->fetch("SELECT * FROM project_tasks WHERE id = ?", [(int)$id]);
    if (!$existing) {
        errorResponse('Tugas proyek tidak ditemukan', 404);
    }

    $db->execute("UPDATE project_tasks SET status = ? WHERE id = ?", [$newStatus, (int)$id]);
    logActivity('update', 'project_tasks', (int)$id, "Mengubah status tugas '{$existing['judul_tugas']}' menjadi $newStatus");

    successResponse(['id' => (int)$id, 'status' => $newStatus], 'Status tugas berhasil diperbarui');
}

// 3. List Tasks (Kanban / Filtered)
if ($method === 'GET') {
    authCheck();
    checkPermission('project.view');

    $where = ["1=1"];
    $binds = [];

    if (!empty($params['project_id'])) {
        $where[] = "t.project_id = ?";
        $binds[] = (int)$params['project_id'];
    }
    if (!empty($params['milestone_id'])) {
        $where[] = "t.milestone_id = ?";
        $binds[] = (int)$params['milestone_id'];
    }
    if (!empty($params['status'])) {
        $where[] = "t.status = ?";
        $binds[] = $params['status'];
    }
    if (!empty($params['prioritas'])) {
        $where[] = "t.prioritas = ?";
        $binds[] = $params['prioritas'];
    }
    if (!empty($params['assigned_to'])) {
        $where[] = "t.assigned_to = ?";
        $binds[] = (int)$params['assigned_to'];
    }
    if (!empty($params['search'])) {
        $where[] = "(t.judul_tugas LIKE ? OR t.deskripsi LIKE ?)";
        $term = '%' . trim($params['search']) . '%';
        $binds[] = $term;
        $binds[] = $term;
    }

    $whereClause = implode(" AND ", $where);

    $tasks = $db->fetchAll(
        "SELECT t.*, p.nama_project, p.kode_project,
                pm.nama_milestone,
                u.nama_lengkap as assigned_nama, u.email as assigned_email
         FROM project_tasks t
         JOIN projects p ON t.project_id = p.id
         LEFT JOIN project_milestones pm ON t.milestone_id = pm.id
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE $whereClause
         ORDER BY t.urutan ASC, t.id DESC",
        $binds
    );

    // Compute Summary Stats
    $stats = [
        'total' => count($tasks),
        'todo' => 0,
        'in_progress' => 0,
        'review' => 0,
        'done' => 0,
        'total_hours' => 0.0
    ];

    foreach ($tasks as $t) {
        if (isset($stats[$t['status']])) {
            $stats[$t['status']]++;
        }
        $stats['total_hours'] += (float)$t['estimasi_jam'];
    }

    successResponse([
        'tasks' => $tasks,
        'stats' => $stats
    ]);
}

// 4. Create Task
if ($method === 'POST') {
    authCheck();
    checkPermission('project.edit');
    verifyCsrfToken();

    $projectId = (int)($params['project_id'] ?? 0);
    $judulTugas = trim($params['judul_tugas'] ?? '');
    $milestoneId = !empty($params['milestone_id']) ? (int)$params['milestone_id'] : null;
    $deskripsi = trim($params['deskripsi'] ?? '');
    $prioritas = trim($params['prioritas'] ?? 'sedang');
    $status = trim($params['status'] ?? 'todo');
    $assignedTo = !empty($params['assigned_to']) ? (int)$params['assigned_to'] : null;
    $estimasiJam = (float)($params['estimasi_jam'] ?? 0.0);
    $deadline = !empty($params['deadline']) ? trim($params['deadline']) : null;

    if ($projectId <= 0) {
        errorResponse('Proyek wajib dipilih', 422);
    }
    if (empty($judulTugas)) {
        errorResponse('Judul tugas wajib diisi', 422);
    }

    $validPriorities = ['rendah', 'sedang', 'tinggi', 'mendesak'];
    if (!in_array($prioritas, $validPriorities, true)) $prioritas = 'sedang';

    $validStatuses = ['todo', 'in_progress', 'review', 'done'];
    if (!in_array($status, $validStatuses, true)) $status = 'todo';

    // Verify Project
    $project = $db->fetch("SELECT id FROM projects WHERE id = ?", [$projectId]);
    if (!$project) {
        errorResponse('Proyek tidak ditemukan', 404);
    }

    $currentUser = $_SESSION['user_id'] ?? null;

    $taskId = $db->insert(
        "INSERT INTO project_tasks (
            project_id, milestone_id, judul_tugas, deskripsi, prioritas,
            status, assigned_to, estimasi_jam, deadline, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            $projectId, $milestoneId, $judulTugas, $deskripsi ?: null, $prioritas,
            $status, $assignedTo, $estimasiJam, $deadline, $currentUser
        ]
    );

    logActivity('create', 'project_tasks', (int)$taskId, "Menambahkan tugas proyek baru: '$judulTugas'");

    successResponse(['id' => (int)$taskId], 'Tugas proyek berhasil ditambahkan', 201);
}

// 5. Update Task
if ($method === 'PUT' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('project.edit');
    verifyCsrfToken();

    $existing = $db->fetch("SELECT * FROM project_tasks WHERE id = ?", [(int)$id]);
    if (!$existing) {
        errorResponse('Tugas proyek tidak ditemukan', 404);
    }

    $judulTugas = trim($params['judul_tugas'] ?? $existing['judul_tugas']);
    $milestoneId = array_key_exists('milestone_id', $params) ? (!empty($params['milestone_id']) ? (int)$params['milestone_id'] : null) : $existing['milestone_id'];
    $deskripsi = array_key_exists('deskripsi', $params) ? trim($params['deskripsi'] ?? '') : $existing['deskripsi'];
    $prioritas = trim($params['prioritas'] ?? $existing['prioritas']);
    $status = trim($params['status'] ?? $existing['status']);
    $assignedTo = array_key_exists('assigned_to', $params) ? (!empty($params['assigned_to']) ? (int)$params['assigned_to'] : null) : $existing['assigned_to'];
    $estimasiJam = array_key_exists('estimasi_jam', $params) ? (float)$params['estimasi_jam'] : (float)$existing['estimasi_jam'];
    $deadline = array_key_exists('deadline', $params) ? (!empty($params['deadline']) ? trim($params['deadline']) : null) : $existing['deadline'];

    if (empty($judulTugas)) {
        errorResponse('Judul tugas wajib diisi', 422);
    }

    $db->execute(
        "UPDATE project_tasks SET
            milestone_id = ?, judul_tugas = ?, deskripsi = ?, prioritas = ?,
            status = ?, assigned_to = ?, estimasi_jam = ?, deadline = ?
         WHERE id = ?",
        [
            $milestoneId, $judulTugas, $deskripsi ?: null, $prioritas,
            $status, $assignedTo, $estimasiJam, $deadline, (int)$id
        ]
    );

    logActivity('update', 'project_tasks', (int)$id, "Memperbarui tugas proyek: '$judulTugas'");

    successResponse(['id' => (int)$id], 'Tugas proyek berhasil diperbarui');
}

// 6. Delete Task
if ($method === 'DELETE' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('project.edit');
    verifyCsrfToken();

    $existing = $db->fetch("SELECT * FROM project_tasks WHERE id = ?", [(int)$id]);
    if (!$existing) {
        errorResponse('Tugas proyek tidak ditemukan', 404);
    }

    $db->execute("DELETE FROM project_tasks WHERE id = ?", [(int)$id]);
    logActivity('delete', 'project_tasks', (int)$id, "Menghapus tugas proyek: '{$existing['judul_tugas']}'");

    successResponse(['id' => (int)$id], 'Tugas proyek berhasil dihapus');
}

errorResponse('Metode tidak diizinkan', 405);
