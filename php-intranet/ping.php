<?php
/**
 * จุดตรวจสถานะสำหรับหน้า Portal บนคลาวด์
 *
 * หน้า Portal ยิงมาที่ไฟล์นี้เป็นระยะ ถ้าตอบกลับได้แปลว่าเครื่องผู้ใช้
 * อยู่ในเครือข่ายภายใน (ต่อ VPN แล้ว) จึงเปลี่ยนการ์ดเป็นสีเขียว
 *
 * ไฟล์นี้ตั้งใจให้ "ยืนไฟล์เดียวได้" — ไม่พึ่ง composer และไม่พึ่งไฟล์อื่น
 * จึงคัดลอกไปวางที่ราก document root ของระบบงานอื่นได้ทันที
 * แก้เฉพาะรายการโดเมนใน $ALLOWED_ORIGINS ด้านล่าง
 *
 * ความปลอดภัย: ตอบ CORS เฉพาะ origin ที่อยู่ใน allowlist เท่านั้น
 * ห้ามใช้ '*' เพราะจะเปิดให้เว็บใดก็ได้ใช้เครื่องพนักงานสำรวจเครือข่ายภายใน
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// โดเมนของพอร์ทัลที่อนุญาต — แก้ให้ตรงกับที่ใช้งานจริง
// ---------------------------------------------------------------------------
$ALLOWED_ORIGINS = [
    'https://company-portal-sso.vercel.app',
    'https://portal.company.com',
    'http://localhost:5173',
];

// ถ้าติดตั้งอยู่ในโปรเจกต์ที่มี config.php ให้ใช้รายการจากไฟล์นั้นแทน
$configPath = __DIR__ . '/config.php';
if (is_file($configPath)) {
    $config = require $configPath;
    if (!empty($config['security']['portalOrigins']) && is_array($config['security']['portalOrigins'])) {
        $ALLOWED_ORIGINS = $config['security']['portalOrigins'];
    }
}

// ---------------------------------------------------------------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $ALLOWED_ORIGINS, true)) {
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
