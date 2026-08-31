<?php
/**
 * ออกจากระบบ — ล้างทั้งเซสชันของระบบภายในและเซสชันกลางที่ Auth0
 * (เอกสารต้นฉบับไม่มีขั้นตอนนี้ ทำให้ออกจากระบบแล้วยังล็อกอินกลับเข้ามาได้ทันที)
 */

declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => time() - 42000,
        'path'     => $params['path'],
        'domain'   => $params['domain'],
        'secure'   => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'] ?: 'Lax',
    ]);
}

session_destroy();

$returnTo = portal_config()['auth0']['logoutReturnTo'];

header('Location: ' . portal_auth0()->logout($returnTo));
exit;
