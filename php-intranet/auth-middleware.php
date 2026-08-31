<?php
/**
 * ยามเฝ้าประตูของทุกหน้าภายใน
 *
 * วางบรรทัดแรกสุดของทุกไฟล์ที่ต้องล็อกอินก่อนเข้า:
 *     <?php require __DIR__ . '/auth-middleware.php'; ?>
 *
 * ถ้ายังไม่ได้ล็อกอิน จะพาไป auth-callback.php และจำหน้าปลายทางไว้ให้
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
        'cookie_secure'   => !empty($_SERVER['HTTPS']),
    ]);
}

/** อายุเซสชันสูงสุด 8 ชั่วโมง แล้วบังคับยืนยันตัวตนใหม่ */
const PORTAL_SESSION_MAX_AGE = 8 * 60 * 60;

$loggedIn = ($_SESSION['is_logged_in'] ?? false) === true;
$expired  = $loggedIn && (time() - (int) ($_SESSION['login_at'] ?? 0)) > PORTAL_SESSION_MAX_AGE;

if (!$loggedIn || $expired) {
    if ($expired) {
        $_SESSION = [];
        session_destroy();
    }

    $returnTo = basename($_SERVER['SCRIPT_NAME'] ?? 'dashboard.php');
    header('Location: auth-callback.php?return_to=' . rawurlencode($returnTo));
    exit;
}

/** ข้อมูลผู้ใช้ปัจจุบัน — ใช้ได้ในทุกหน้าที่ require ไฟล์นี้ */
function current_user(): array
{
    return [
        'id'       => $_SESSION['user_id']    ?? null,
        'email'    => $_SESSION['user_email'] ?? '',
        'name'     => $_SESSION['user_name']  ?? '',
        'auth0_id' => $_SESSION['auth0_id']   ?? '',
    ];
}
