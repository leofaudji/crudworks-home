<?php
declare(strict_types=1);

/**
 * Shared Project Lifecycle SQL subqueries and resolver (Single Source of Truth).
 */
function projectLifecycleSubqueriesSql(string $alias = 'p'): string
{
    return "
        (SELECT COUNT(*) FROM invoices WHERE project_id = {$alias}.id) as total_invoices,
        (SELECT COUNT(*) FROM quotations q WHERE q.project_id = {$alias}.id AND q.status IN ('draft','terkirim')) as quo_pending,
        (SELECT COUNT(*) FROM quotations q WHERE q.project_id = {$alias}.id AND q.status IN ('disetujui','dikonversi')) as quo_approved,
        (SELECT COUNT(*) FROM contracts k WHERE k.project_id = {$alias}.id AND k.status IN ('draft','terkirim')) as spk_pending,
        (SELECT COUNT(*) FROM contracts k WHERE k.project_id = {$alias}.id AND k.status = 'ditandatangani') as spk_signed,
        (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = {$alias}.id) as tasks_total,
        (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = {$alias}.id AND pt.status = 'done') as tasks_done,
        (SELECT COUNT(*) FROM project_basts b WHERE b.project_id = {$alias}.id AND b.status = 'draft') as bast_draft,
        (SELECT COUNT(*) FROM project_basts b WHERE b.project_id = {$alias}.id AND b.status = 'ditandatangani') as bast_signed,
        (SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = {$alias}.id AND pm.status = 'rencana' AND pm.invoice_id IS NULL) as ms_unbilled,
        (SELECT COUNT(*) FROM invoices i WHERE i.project_id = {$alias}.id AND i.sisa_tagihan > 0 AND i.status NOT IN ('batal','dibatalkan')) as inv_unpaid,
        (SELECT COALESCE(SUM(i.sisa_tagihan),0) FROM invoices i WHERE i.project_id = {$alias}.id AND i.sisa_tagihan > 0 AND i.status NOT IN ('batal','dibatalkan')) as inv_unpaid_amount,
        COALESCE((SELECT MAX(k.garansi_hari) FROM contracts k WHERE k.project_id = {$alias}.id AND k.status != 'dibatalkan'), 0) as warranty_days,
        (SELECT MAX(COALESCE(DATE(b.signed_at), b.tanggal_bast)) FROM project_basts b WHERE b.project_id = {$alias}.id AND b.status = 'ditandatangani') as warranty_start,
        (SELECT COUNT(*) FROM project_change_requests cr WHERE cr.project_id = {$alias}.id) as cr_count
    ";
}

function computeProjectWarranty(int $warrantyDays, ?string $warrantyStart): array
{
    if ($warrantyDays <= 0) {
        return ['active' => false, 'status' => 'none', 'days' => 0, 'start' => null, 'end' => null, 'days_left' => 0];
    }
    if (empty($warrantyStart)) {
        return ['active' => false, 'status' => 'pending_bast', 'days' => $warrantyDays, 'start' => null, 'end' => null, 'days_left' => $warrantyDays];
    }
    $startTs = strtotime($warrantyStart);
    if ($startTs === false) {
        return ['active' => false, 'status' => 'pending_bast', 'days' => $warrantyDays, 'start' => null, 'end' => null, 'days_left' => $warrantyDays];
    }
    $endTs = strtotime("+{$warrantyDays} days", $startTs);
    $todayTs = strtotime(date('Y-m-d'));
    $daysLeft = (int)floor(($endTs - $todayTs) / 86400);
    return [
        'active' => $daysLeft >= 0,
        'status' => $daysLeft >= 0 ? 'active' : 'expired',
        'days' => $warrantyDays,
        'start' => date('Y-m-d', $startTs),
        'end' => date('Y-m-d', $endTs),
        'days_left' => $daysLeft
    ];
}

function resolveProjectLifecyclePhase(array $row): string
{
    $invUnpaid = (int)($row['inv_unpaid'] ?? 0);
    $bastSigned = (int)($row['bast_signed'] ?? 0);
    $bastDraft = (int)($row['bast_draft'] ?? 0);
    $tasksTotal = (int)($row['tasks_total'] ?? 0);
    $tasksDone = (int)($row['tasks_done'] ?? 0);
    $msUnbilled = (int)($row['ms_unbilled'] ?? 0);
    $spkPending = (int)($row['spk_pending'] ?? 0);
    $spkSigned = (int)($row['spk_signed'] ?? 0);
    $quoApproved = (int)($row['quo_approved'] ?? 0);
    $quoPending = (int)($row['quo_pending'] ?? 0);
    $totalInv = (int)($row['total_invoices'] ?? 0);
    $status = (string)($row['status'] ?? '');

    if ($invUnpaid > 0) {
        return 'belum_dibayar';
    }
    if (($bastSigned > 0 || ($tasksTotal > 0 && $tasksDone === $tasksTotal)) && $msUnbilled > 0) {
        return 'termin_bayar';
    }
    if ($bastDraft > 0 || ($tasksTotal > 0 && $tasksDone === $tasksTotal && $bastSigned === 0)) {
        return 'belum_bast';
    }
    if ($tasksTotal > 0 && $tasksDone < $tasksTotal) {
        return 'digarap';
    }
    if ($spkPending > 0 || ($quoApproved > 0 && $spkSigned === 0 && $tasksTotal === 0)) {
        return 'spk';
    }
    if ($quoPending > 0 && $tasksTotal === 0 && $totalInv === 0) {
        return 'penawaran';
    }
    if ($status === 'selesai' || ($bastSigned > 0 && $invUnpaid === 0 && $totalInv > 0)) {
        return 'selesai';
    }
    if ($status === 'perencanaan') {
        return 'perencanaan';
    }
    return 'aktif';
}
