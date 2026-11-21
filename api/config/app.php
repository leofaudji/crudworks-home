<?php
// Set default timezone
date_default_timezone_set("Asia/Jakarta");

// Application Configuration
define('APP_NAME', getenv('APP_NAME') ?: 'CRUDWorks ERP');
define('APP_VERSION', '1.4.0');
define('APP_URL', getenv('APP_URL') ?: 'http://crudworks-home.test');

// Session
define('SESSION_NAME', getenv('SESSION_NAME') ?: 'CRUDWORKS_SESSID');
define('SESSION_LIFETIME', (int)(getenv('SESSION_LIFETIME') ?: 86400)); // 24 hours

// Pagination default
define('PER_PAGE', 15);

// Redis Configuration
define('REDIS_HOST', getenv('REDIS_HOST') ?: '127.0.0.1');
define('REDIS_PORT', (int)(getenv('REDIS_PORT') ?: 6379));
define('REDIS_PASS', getenv('REDIS_PASS') ?: null);
define('REDIS_DB', (int)(getenv('REDIS_DB') ?: 0));
define('REDIS_PREFIX', getenv('REDIS_PREFIX') ?: 'crudworks_');

// Path Integrasi app-git
define('APP_GIT_PATH', getenv('APP_GIT_PATH') ?: 'd:/laragon/www/app-git');
define('APP_GIT_URL', getenv('APP_GIT_URL') ?: 'http://app-git.test');
