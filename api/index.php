<?php
// ============================================================
// CRUDWorks ERP — API FRONT CONTROLLER & DISPATCHER
// ============================================================

header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($origin)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load env, config & dependencies
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/redis.php';
require_once __DIR__ . '/config/invoice_helpers.php';
require_once __DIR__ . '/config/vault_helpers.php';
require_once __DIR__ . '/config/portal_helpers.php';
require_once __DIR__ . '/config/enterprise_helpers.php';
require_once __DIR__ . '/config/smtp_helpers.php';
require_once __DIR__ . '/config/accounting_helpers.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/middleware/rbac.php';
require_once __DIR__ . '/middleware/csrf.php';

// Start Session
if (session_status() === PHP_SESSION_NONE) {
    RedisManager::getInstance()->initSession();
    session_name(SESSION_NAME);
    ini_set('session.gc_maxlifetime', SESSION_LIFETIME);

    $isSecure = (isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) === 'on') ||
                (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') ||
                (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path' => '/',
        'domain' => '',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    session_start();
}

// CSRF Protection on state-changing requests
verifyCsrfToken();

// Parse route and method
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!is_array($input)) $input = [];

$params = array_merge($_GET, $_POST, $input);
unset($params['route']);

$segments = explode('/', $route);
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

// Global Response Helpers
function jsonResponse($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function successResponse($data = null, $message = 'Success', $code = 200)
{
    jsonResponse(['success' => true, 'message' => $message, 'data' => $data], $code);
}

function errorResponse($message = 'Error', $code = 400)
{
    jsonResponse(['success' => false, 'message' => $message, 'code' => $code], $code);
}

function paginatedResponse($arg1, $arg2, $arg3, $arg4, $arg5 = 15)
{
    if (is_array($arg1)) {
        $items = $arg1;
        $total = (int)$arg2;
        $page = max(1, (int)$arg3);
        $perPage = max(1, min(100, (int)$arg4));
        $extra = is_array($arg5) ? $arg5 : [];

        $pagination = [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => max(1, (int)ceil($total / $perPage))
        ];

        $response = [
            'success' => true,
            'data' => $items,
            'pagination' => $pagination,
            'extra' => $extra
        ];
        foreach ($extra as $k => $v) {
            if (!isset($response[$k])) {
                $response[$k] = $v;
            }
        }
        jsonResponse($response);
    }

    $db = Database::getInstance();
    $query = (string)$arg1;
    $countQuery = (string)$arg2;
    $params = is_array($arg3) ? $arg3 : [];
    $page = max(1, (int)$arg4);
    $perPage = max(1, min(100, (int)$arg5));
    $offset = ($page - 1) * $perPage;

    $total = (int)$db->count($countQuery, $params);
    $data = $db->fetchAll($query . " LIMIT $perPage OFFSET $offset", $params);

    jsonResponse([
        'success' => true,
        'data' => $data,
        'pagination' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => max(1, (int)ceil($total / $perPage))
        ]
    ]);
}

function cacheGet(string $key)
{
    $redis = RedisManager::getInstance();
    return $redis->isConnected() ? $redis->get($key) : false;
}

function cacheSet(string $key, $value, int $ttl = 300): void
{
    $redis = RedisManager::getInstance();
    if ($redis->isConnected()) {
        $redis->set($key, $value, $ttl);
    }
}

function initReportCache(string $prefix, string $subRoute, array $params, array $filterKeys = [], bool $allowRead = true, int $ttl = 300): callable
{
    $filters = [];
    foreach ($filterKeys as $k) {
        $filters[$k] = $params[$k] ?? '';
    }
    $cleanSub = preg_replace('/[^a-z0-9_-]/i', '', $subRoute);
    $cacheKey = "cache_{$prefix}_{$cleanSub}_" . md5(json_encode($filters));

    if ($allowRead && empty($params['fresh'])) {
        $cached = cacheGet($cacheKey);
        if ($cached !== false && is_array($cached)) {
            successResponse($cached);
        }
    }

    return static function ($payload, ?int $customTtl = null) use ($cacheKey, $ttl): void {
        if (is_array($payload)) {
            cacheSet($cacheKey, $payload, $customTtl ?? $ttl);
        }
        successResponse($payload);
    };
}

function clearCache(array $types)
{
    $redis = RedisManager::getInstance();
    $map = [
        'clients'    => ['cache_client_*'],
        'invoices'   => ['cache_invoice_*', 'cache_report_*', 'cache_accounting_*', 'sidebar_menu_badges', 'dashboard_stats'],
        'payments'   => ['cache_payment_*', 'cache_report_*', 'cache_accounting_*', 'dashboard_stats'],
        'expenses'   => ['cache_report_*', 'cache_accounting_*', 'dashboard_stats'],
        'reports'    => ['cache_report_*'],
        'accounting' => ['cache_accounting_*'],
        'services'   => ['cache_services_list'],
        'settings'   => ['app_settings_*'],
    ];

    $toDelete = [];
    foreach ($types as $key => $val) {
        $type = is_numeric($key) ? $val : $key;
        $id = is_numeric($key) ? null : $val;

        if ($type === 'rbac') {
            $toDelete[$id ? "rbac_perms_{$id}" : 'rbac_perms_*'] = true;
            $toDelete[$id ? "rbac_menus_{$id}" : 'rbac_menus_*'] = true;
            continue;
        }
        foreach ($map[$type] ?? [] as $pattern) {
            $toDelete[$pattern] = true;
        }
    }

    foreach (array_keys($toDelete) as $pattern) {
        $redis->delete($pattern);
    }
}

function logActivity($action, $tableName = '', $recordId = null, $oldData = null, $newData = null)
{
    $db = Database::getInstance();
    $userId = $_SESSION['user_id'] ?? 1;

    if ($recordId === null && (strlen((string)$tableName) > 30 || strpos((string)$tableName, ' ') !== false)) {
        $newData = ['keterangan' => $tableName];
        $parts = explode('.', (string)$action);
        $tableName = $parts[0] ?? 'system';
    }

    try {
        $db->execute(
            "INSERT INTO audit_logs (user_id, aksi, tabel, record_id, data_lama, data_baru, ip_address, user_agent) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $userId,
                substr((string)$action, 0, 50),
                substr((string)($tableName ?: 'system'), 0, 50),
                is_numeric($recordId) ? (int)$recordId : null,
                $oldData ? json_encode($oldData, JSON_UNESCAPED_UNICODE) : null,
                $newData ? json_encode($newData, JSON_UNESCAPED_UNICODE) : null,
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                $_SERVER['HTTP_USER_AGENT'] ?? 'Internal Client'
            ]
        );
    } catch (\Throwable $e) {
        error_log("Gagal merekam audit log: " . $e->getMessage());
    }
}

// Concurrency: release PHP session lock for read-only GET requests
if ($method === 'GET' && !in_array($resource, ['auth'])) {
    session_write_close();
}

// Dispatch Controller
$controllerPath = __DIR__ . '/controllers/';

try {
    switch ($resource) {
        case 'auth':
            require_once $controllerPath . 'AuthController.php';
            break;

        case 'menus':
            authCheck();
            if ($id === 'badges' || ($params['action'] ?? '') === 'badges') {
                $redis = RedisManager::getInstance();
                $cached = $redis->get('sidebar_menu_badges');
                if ($cached && is_array($cached)) {
                    successResponse($cached);
                }

                $db = Database::getInstance();
                $badges = [];
                try {
                    $badges['#/invoices'] = (int)$db->count("SELECT COUNT(*) FROM invoices WHERE status = 'jatuh_tempo' OR (status = 'dikirim' AND tanggal_jatuh_tempo < CURDATE())");
                    $badges['#/recurring'] = (int)$db->count("SELECT COUNT(*) FROM recurring_invoices WHERE status = 'aktif' AND berikutnya_dibuat_at <= CURDATE()");
                } catch (\Throwable $e) {
                    $badges['#/invoices'] = 0;
                    $badges['#/recurring'] = 0;
                }

                $redis->set('sidebar_menu_badges', $badges, 30);
                successResponse($badges);
            }
            successResponse(getUserMenus($_SESSION['role_id']));
            break;

        case 'dashboard':
            require_once $controllerPath . 'DashboardController.php';
            break;

        case 'clients':
            require_once $controllerPath . 'ClientController.php';
            break;

        case 'projects':
            require_once $controllerPath . 'ProjectController.php';
            break;

        case 'project-tasks':
        case 'tasks':
            require_once $controllerPath . 'ProjectTaskController.php';
            break;

        case 'basts':
        case 'project-basts':
            require_once $controllerPath . 'BastController.php';
            break;

        case 'services':
            require_once $controllerPath . 'ServiceController.php';
            break;

        case 'invoices':
            require_once $controllerPath . 'InvoiceController.php';
            break;

        case 'quotations':
            require_once $controllerPath . 'QuotationController.php';
            break;

        case 'contracts':
            require_once $controllerPath . 'ContractController.php';
            break;

        case 'knowledge-base':
            require_once $controllerPath . 'KnowledgeBaseController.php';
            break;

        case 'public-invoice':
            require_once $controllerPath . 'PublicInvoiceController.php';
            break;

        case 'public-quotation':
            require_once $controllerPath . 'PublicQuotationController.php';
            break;

        case 'public-status':
            require_once $controllerPath . 'PublicStatusController.php';
            break;

        case 'client-portal':
            require_once $controllerPath . 'ClientPortalController.php';
            break;

        case 'portal-auth':
            require_once $controllerPath . 'PortalAuthController.php';
            break;

        case 'tickets':
            require_once $controllerPath . 'TicketController.php';
            break;

        case 'payments':
            require_once $controllerPath . 'PaymentController.php';
            break;

        case 'expenses':
            require_once $controllerPath . 'ExpenseController.php';
            break;

        case 'maintenance':
            require_once $controllerPath . 'MaintenanceController.php';
            break;

        case 'company-assets':
            require_once $controllerPath . 'CompanyAssetController.php';
            break;

        case 'credentials':
            require_once $controllerPath . 'CredentialController.php';
            break;

        case 'timesheets':
            require_once $controllerPath . 'TimesheetController.php';
            break;

        case 'bank-accounts':
            require_once $controllerPath . 'BankAccountController.php';
            break;

        case 'recurring':
            require_once $controllerPath . 'RecurringController.php';
            break;

        case 'reports':
            require_once $controllerPath . 'ReportController.php';
            break;

        case 'accounting':
            require_once $controllerPath . 'AccountingController.php';
            break;

        case 'users':
            require_once $controllerPath . 'UserController.php';
            break;

        case 'roles':
            require_once $controllerPath . 'RoleController.php';
            break;

        case 'settings':
            require_once $controllerPath . 'SettingsController.php';
            break;

        case 'audit':
            require_once $controllerPath . 'AuditController.php';
            break;

        case 'backup':
            require_once $controllerPath . 'BackupController.php';
            break;

        case 'payment-gateway':
            require_once $controllerPath . 'PaymentGatewayController.php';
            break;

        case 'notifications':
            require_once $controllerPath . 'NotificationController.php';
            break;

        case 'webhooks':
        case 'api-keys':
            require_once $controllerPath . 'IntegrationController.php';
            break;

        default:
            errorResponse('Endpoint API tidak ditemukan: /' . $route, 404);
    }
} catch (PDOException $e) {
    $msg = $e->getMessage();
    if ($e->getCode() == 23000 || $e->getCode() == '23000' || strpos($msg, '1451') !== false) {
        errorResponse('Data tidak dapat dihapus karena masih terhubung dengan data aktif di modul lain (seperti penawaran, faktur, atau proyek). Hapus data terkait terlebih dahulu atau ubah status menjadi Nonaktif.', 400);
    }
    errorResponse('Kesalahan Database: ' . $msg, 500);
} catch (\Throwable $e) {
    errorResponse('Terjadi kesalahan internal: ' . $e->getMessage(), 500);
}
