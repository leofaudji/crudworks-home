<?php
// ServiceController.php

authCheck();
$db = Database::getInstance();

if ($id && is_numeric($id)) {
    $serviceId = (int)$id;

    if ($method === 'GET') {
        checkPermission('service.manage');
        $service = $db->fetch("SELECT * FROM services WHERE id = ?", [$serviceId]);
        if (!$service) errorResponse('Layanan tidak ditemukan', 404);
        successResponse($service);
    }

    if ($method === 'PUT') {
        checkPermission('service.manage');
        $service = $db->fetch("SELECT * FROM services WHERE id = ?", [$serviceId]);
        if (!$service) errorResponse('Layanan tidak ditemukan', 404);

        $namaLayanan = trim($params['nama_layanan'] ?? '');
        $kategori = in_array($params['kategori'] ?? '', ['hosting', 'domain', 'maintenance', 'development', 'konsultasi', 'lainnya']) ? $params['kategori'] : 'hosting';
        $deskripsi = trim($params['deskripsi'] ?? '');
        $hargaStandar = (float)($params['harga_standar'] ?? 0);
        $siklusTagihan = in_array($params['siklus_tagihan'] ?? '', ['one_time', 'bulanan', 'triwulan', 'semester', 'tahunan']) ? $params['siklus_tagihan'] : 'bulanan';
        $status = in_array($params['status'] ?? '', ['aktif', 'nonaktif']) ? $params['status'] : 'aktif';

        if (empty($namaLayanan) || $hargaStandar < 0) {
            errorResponse('Nama layanan dan tarif standar valid wajib diisi');
        }

        $db->execute(
            "UPDATE services SET nama_layanan = ?, kategori = ?, deskripsi = ?, harga_standar = ?, siklus_tagihan = ?, status = ? WHERE id = ?",
            [$namaLayanan, $kategori, $deskripsi, $hargaStandar, $siklusTagihan, $status, $serviceId]
        );

        clearCache(['services']);
        logActivity('update', 'services', $serviceId, $service, $params);
        successResponse(['id' => $serviceId], 'Layanan berhasil diperbarui');
    }

    if ($method === 'DELETE') {
        checkPermission('service.manage');
        $service = $db->fetch("SELECT * FROM services WHERE id = ?", [$serviceId]);
        if (!$service) errorResponse('Layanan tidak ditemukan', 404);

        $db->execute("DELETE FROM services WHERE id = ?", [$serviceId]);
        clearCache(['services']);
        logActivity('delete', 'services', $serviceId, $service);
        successResponse(null, 'Layanan berhasil dihapus');
    }

    errorResponse('Metode tidak didukung', 405);
}

// Collection level: /api/services
if ($method === 'GET') {
    checkPermission('service.manage');

    if (isset($params['all']) && $params['all'] == '1') {
        $services = $db->fetchAll("SELECT * FROM services WHERE status = 'aktif' ORDER BY nama_layanan ASC");
        successResponse($services);
    }

    $page = (int)($params['page'] ?? 1);
    $perPage = (int)($params['per_page'] ?? PER_PAGE);
    $search = trim($params['search'] ?? '');
    $kategori = trim($params['kategori'] ?? '');

    $where = [];
    $bindings = [];

    if (!empty($search)) {
        $where[] = "(nama_layanan LIKE ? OR kode_layanan LIKE ?)";
        $searchPattern = "%$search%";
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
    }

    if (!empty($kategori)) {
        $where[] = "kategori = ?";
        $bindings[] = $kategori;
    }

    $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $countQuery = "SELECT COUNT(*) FROM services $whereSql";
    $query = "SELECT * FROM services $whereSql ORDER BY id DESC";

    paginatedResponse($query, $countQuery, $bindings, $page, $perPage);
}

if ($method === 'POST') {
    checkPermission('service.manage');

    $namaLayanan = trim($params['nama_layanan'] ?? '');
    $kategori = in_array($params['kategori'] ?? '', ['hosting', 'domain', 'maintenance', 'development', 'konsultasi', 'lainnya']) ? $params['kategori'] : 'hosting';
    $deskripsi = trim($params['deskripsi'] ?? '');
    $hargaStandar = (float)($params['harga_standar'] ?? 0);
    $siklusTagihan = in_array($params['siklus_tagihan'] ?? '', ['one_time', 'bulanan', 'triwulan', 'semester', 'tahunan']) ? $params['siklus_tagihan'] : 'bulanan';
    $status = in_array($params['status'] ?? '', ['aktif', 'nonaktif']) ? $params['status'] : 'aktif';

    if (empty($namaLayanan) || $hargaStandar < 0) {
        errorResponse('Nama layanan dan tarif standar valid wajib diisi');
    }

    // Generate kode layanan otomatis (SRV-0001)
    $lastService = $db->fetch("SELECT kode_layanan FROM services WHERE kode_layanan LIKE 'SRV-%' ORDER BY id DESC LIMIT 1");
    if ($lastService && !empty($lastService['kode_layanan'])) {
        $lastNum = (int)str_replace('SRV-', '', $lastService['kode_layanan']);
        $nextNum = $lastNum + 1;
    } else {
        $nextNum = 1;
    }
    $kodeLayanan = 'SRV-' . str_pad((string)$nextNum, 4, '0', STR_PAD_LEFT);

    $newId = $db->insert(
        "INSERT INTO services (kode_layanan, nama_layanan, kategori, deskripsi, harga_standar, siklus_tagihan, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        [$kodeLayanan, $namaLayanan, $kategori, $deskripsi, $hargaStandar, $siklusTagihan, $status]
    );

    clearCache(['services']);
    logActivity('create', 'services', $newId, null, $params);
    successResponse(['id' => $newId, 'kode_layanan' => $kodeLayanan], 'Layanan berhasil ditambahkan');
}

errorResponse('Metode tidak didukung', 405);
