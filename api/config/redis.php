<?php

class RedisManager
{
    private static $instance = null;
    private $redis = null;
    private $socket = null;
    private $connected = false;
    private $mode = 'fallback';
    private $lastError = '';

    private function __construct()
    {
        $pass = (REDIS_PASS === 'null' || REDIS_PASS === '' || REDIS_PASS === false) ? null : REDIS_PASS;

        if (class_exists('Redis')) {
            try {
                $this->redis = new Redis();
                if (strpos(REDIS_HOST, '/') === 0) {
                    $this->connected = @$this->redis->connect(REDIS_HOST);
                } else {
                    $this->connected = @$this->redis->connect(REDIS_HOST, (int)REDIS_PORT, 1.5);
                }

                if ($this->connected) {
                    if ($pass !== null && !$this->redis->auth($pass)) {
                        $this->connected = false;
                        $this->lastError = 'Autentikasi password Redis (REDIS_PASS) ditolak';
                        $this->redis = null;
                        return;
                    }
                    $this->redis->select((int)REDIS_DB);
                    $this->redis->setOption(Redis::OPT_PREFIX, REDIS_PREFIX);
                    $this->redis->setOption(Redis::OPT_SERIALIZER, Redis::SERIALIZER_PHP);
                    $this->mode = 'phpredis';
                } else {
                    $this->lastError = 'phpredis gagal terhubung ke ' . REDIS_HOST . ':' . REDIS_PORT;
                }
            } catch (\Throwable $e) {
                $this->connected = false;
                $this->lastError = $e->getMessage();
                $this->redis = null;
            }
            return;
        }

        // Fallback pure-PHP TCP RESP2 client when phpredis extension is not enabled
        try {
            $dsn = (strpos(REDIS_HOST, '/') === 0)
                ? 'unix://' . REDIS_HOST
                : 'tcp://' . REDIS_HOST . ':' . (int)REDIS_PORT;
            $fp = @stream_socket_client($dsn, $errno, $errstr, 1.5);
            if ($fp) {
                stream_set_timeout($fp, 2);
                $this->socket = $fp;
                if ($pass !== null) {
                    $this->respCmd(['AUTH', (string)$pass]);
                }
                if ((int)REDIS_DB > 0) {
                    $this->respCmd(['SELECT', (string)(int)REDIS_DB]);
                }
                $pong = $this->respCmd(['PING']);
                $this->connected = ($pong === 'PONG');
                if ($this->connected) {
                    $this->mode = 'tcp-resp2';
                } else {
                    $this->lastError = 'Respons PING Redis tidak valid';
                }
            } else {
                $this->lastError = trim(($errstr ?: 'Koneksi ditolak') . " ({$dsn})");
            }
        } catch (\Throwable $e) {
            $this->connected = false;
            $this->lastError = $e->getMessage();
            if (is_resource($this->socket)) {
                @fclose($this->socket);
            }
            $this->socket = null;
        }
    }

    private function respCmd(array $args)
    {
        if (!is_resource($this->socket)) {
            throw new \RuntimeException('Redis socket closed');
        }
        $cmd = '*' . count($args) . "\r\n";
        foreach ($args as $arg) {
            $s = (string)$arg;
            $cmd .= '$' . strlen($s) . "\r\n" . $s . "\r\n";
        }
        $written = @fwrite($this->socket, $cmd);
        if ($written === false) {
            throw new \RuntimeException('Redis write failed');
        }
        return $this->respRead();
    }

    private function respRead()
    {
        $line = @fgets($this->socket);
        if ($line === false) {
            throw new \RuntimeException('Redis read failed');
        }
        $line = rtrim($line, "\r\n");
        $prefix = $line[0] ?? '';
        $payload = substr($line, 1);

        switch ($prefix) {
            case '+':
                return $payload;
            case '-':
                throw new \RuntimeException('Redis error: ' . $payload);
            case ':':
                return (int)$payload;
            case '$':
                $len = (int)$payload;
                if ($len < 0) return null;
                $data = '';
                $need = $len + 2;
                while (strlen($data) < $need) {
                    $chunk = @fread($this->socket, $need - strlen($data));
                    if ($chunk === false || $chunk === '') {
                        throw new \RuntimeException('Redis bulk read timeout');
                    }
                    $data .= $chunk;
                }
                return substr($data, 0, $len);
            case '*':
                $count = (int)$payload;
                if ($count < 0) return null;
                $items = [];
                for ($i = 0; $i < $count; $i++) {
                    $items[] = $this->respRead();
                }
                return $items;
            default:
                return null;
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function isConnected()
    {
        return $this->connected;
    }

    public function getMode(): string
    {
        return $this->mode;
    }

    public function getLastError(): string
    {
        return $this->lastError;
    }

    public function get($key)
    {
        if (!$this->connected) return false;
        try {
            if ($this->redis !== null) {
                return $this->redis->get($key);
            }
            $raw = $this->respCmd(['GET', REDIS_PREFIX . $key]);
            if ($raw === null) return false;
            return @unserialize($raw);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function set($key, $value, $ttl = 3600)
    {
        if (!$this->connected) return false;
        try {
            if ($this->redis !== null) {
                return $this->redis->set($key, $value, $ttl);
            }
            $payload = serialize($value);
            if ($ttl > 0) {
                return $this->respCmd(['SETEX', REDIS_PREFIX . $key, (string)(int)$ttl, $payload]) === 'OK';
            }
            return $this->respCmd(['SET', REDIS_PREFIX . $key, $payload]) === 'OK';
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function delete($key)
    {
        if (!$this->connected) return false;
        try {
            if ($this->redis !== null) {
                if (strpos($key, '*') !== false) {
                    $keys = $this->redis->keys($key);
                    if (!empty($keys)) {
                        return $this->redis->del($keys);
                    }
                    return true;
                }
                return $this->redis->del($key);
            }
            $fullKey = REDIS_PREFIX . $key;
            if (strpos($key, '*') !== false) {
                $keys = $this->respCmd(['KEYS', $fullKey]);
                if (!empty($keys) && is_array($keys)) {
                    return $this->respCmd(array_merge(['DEL'], $keys));
                }
                return true;
            }
            return $this->respCmd(['DEL', $fullKey]);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function flush()
    {
        if (!$this->connected) return false;
        try {
            if ($this->redis !== null) {
                return $this->redis->flushDB();
            }
            return $this->respCmd(['FLUSHDB']) === 'OK';
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function initSession()
    {
        if (!$this->connected || $this->redis === null) return false;

        try {
            ini_set('session.save_handler', 'redis');
            if (strpos(REDIS_HOST, '/') === 0) {
                $savePath = "unix://" . REDIS_HOST . "?prefix=" . REDIS_PREFIX . "session:";
            } else {
                $savePath = "tcp://" . REDIS_HOST . ":" . REDIS_PORT . "?prefix=" . REDIS_PREFIX . "session:";
            }

            $pass = (REDIS_PASS === 'null' || REDIS_PASS === '' || REDIS_PASS === false) ? null : REDIS_PASS;
            if ($pass !== null) {
                $savePath .= "&auth=" . urlencode($pass);
            }

            ini_set('session.save_path', $savePath);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
}
