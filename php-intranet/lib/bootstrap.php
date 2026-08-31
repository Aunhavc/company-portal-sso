<?php
/**
 * โหลด config + สร้าง Auth0 SDK และ PDO ให้ทุกไฟล์ใช้ร่วมกัน
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Auth0\SDK\Auth0;
use Auth0\SDK\Configuration\SdkConfiguration;

/** @return array<string, mixed> */
function portal_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $path = __DIR__ . '/../config.php';
    if (!is_file($path)) {
        http_response_code(500);
        exit('ไม่พบไฟล์ config.php — คัดลอกจาก config.example.php แล้วเติมค่าจริงก่อน');
    }

    $config = require $path;
    return $config;
}

function portal_auth0(): Auth0
{
    static $auth0 = null;
    if ($auth0 !== null) {
        return $auth0;
    }

    $cfg = portal_config()['auth0'];

    $auth0 = new Auth0(new SdkConfiguration([
        'domain'       => $cfg['domain'],
        'clientId'     => $cfg['clientId'],
        'clientSecret' => $cfg['clientSecret'],
        'redirectUri'  => $cfg['redirectUri'],
        'cookieSecret' => $cfg['cookieSecret'],
        'audience'     => !empty($cfg['audience']) ? [$cfg['audience']] : null,
        'scope'        => ['openid', 'profile', 'email'],
    ]));

    return $auth0;
}

function portal_db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $db = portal_config()['db'];
    $pdo = new PDO($db['dsn'], $db['username'], $db['password'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    return $pdo;
}

/**
 * ชื่อคอลัมน์/ตารางมาจากไฟล์ config ซึ่งฝังตรงลงใน SQL ไม่ได้ผ่าน placeholder
 * จึงต้องกรองให้เหลือเฉพาะอักขระที่ปลอดภัยก่อนใช้เสมอ
 */
function portal_ident(string $name): string
{
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $name)) {
        throw new InvalidArgumentException("ชื่อตาราง/คอลัมน์ไม่ถูกต้อง: {$name}");
    }
    return $name;
}

function portal_log(string $message): void
{
    error_log('[portal-sso] ' . $message);
}
