<?php
/**
 * จุดตรวจสถานะสำหรับหน้า Portal บนคลาวด์
 *
 * หน้า Portal จะยิงมาที่ไฟล์นี้เป็นระยะ ถ้าตอบกลับได้แปลว่าเครื่องผู้ใช้
 * อยู่ในเครือข่ายภายใน (ต่อ VPN แล้ว) จึงเปลี่ยนการ์ดเป็นสีเขียว
 *
 * ความปลอดภัย: ตอบ CORS เฉพาะ origin ที่อยู่ใน allowlist เท่านั้น
 * (ต้นฉบับใช้ '*' ซึ่งเปิดให้เว็บใดก็ได้ใช้เครื่องพนักงานสำรวจเครือข่ายภายใน)
 */

declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';

$allowed = portal_config()['security']['portalOrigins'] ?? [];
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

echo json_encode([
    'status'    => 'online',
    'network'   => 'Intranet VPN Connected',
    'server'    => gethostname(),
    'timestamp' => gmdate('c'),
], JSON_UNESCAPED_UNICODE);
