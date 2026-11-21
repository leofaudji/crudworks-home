<?php

class RedisManager
{
    private static $instance = null;
    private $redis = null;
    private $connected = false;

    private function __construct()
    {
        if (!class_exists('Redis')) {
            // phpredis extension not installed, silently fallback
            return;
        }

        try {
            $this->redis = new Redis();
            $pass = (REDIS_PASS === 'null' || REDIS_PASS === '' || REDIS_PASS === false) ? null : REDIS_PASS;

            if (strpos(REDIS_HOST, '/') === 0) {
                $this->connected = @$this->redis->connect(REDIS_HOST);
            } else {
                $this->connected = @$this->redis->connect(REDIS_HOST, (int)REDIS_PORT, 1.5);
            }

            if ($this->connected) {
                if ($pass !== null) {
                    $this->redis->auth($pass);
                }
                $this->redis->select((int)REDIS_DB);
                $this->redis->setOption(Redis::OPT_PREFIX, REDIS_PREFIX);
                $this->redis->setOption(Redis::OPT_SERIALIZER, Redis::SERIALIZER_PHP);
            }
        } catch (\Throwable $e) {
            $this->connected = false;
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

    public function get($key)
    {
        if (!$this->connected) return false;
        try {
            return $this->redis->get($key);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function set($key, $value, $ttl = 3600)
    {
        if (!$this->connected) return false;
        try {
            return $this->redis->set($key, $value, $ttl);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function delete($key)
    {
        if (!$this->connected) return false;
        try {
            if (strpos($key, '*') !== false) {
                $keys = $this->redis->keys($key);
                if (!empty($keys)) {
                    return $this->redis->del($keys);
                }
                return true;
            }
            return $this->redis->del($key);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function flush()
    {
        if (!$this->connected) return false;
        try {
            return $this->redis->flushDB();
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function initSession()
    {
        if (!$this->connected) return false;

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
