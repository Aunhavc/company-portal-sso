<?php
/**
 * ตั้งค่าระบบ Intranet — คัดลอกไฟล์นี้เป็น config.php แล้วเติมค่าจริง
 * config.php ถูก gitignore ไว้แล้ว ห้าม commit
 */

return [
    // -------------------------------------------------------------------------
    // Auth0 — ใช้ค่าจากแอปตัวที่ 2 (ประเภท Regular Web Applications)
    // -------------------------------------------------------------------------
    'auth0' => [
        'domain'       => 'your-tenant.au.auth0.com',
        'clientId'     => 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'clientSecret' => 'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',

        // ต้องตรงกับ Allowed Callback URLs ใน Auth0 แบบตัวต่อตัว (รวม path เต็ม)
        'redirectUri'  => 'https://erp.company.local/auth-callback.php',

        // ปลายทางหลัง logout — ต้องอยู่ใน Allowed Logout URLs
        'logoutReturnTo' => 'https://erp.company.local/',

        // สุ่มด้วย: php -r "echo bin2hex(random_bytes(32));"
        'cookieSecret' => 'เปลี่ยนเป็นสตริงสุ่มยาวอย่างน้อย 32 ไบต์',

        // ถ้าตั้ง audience ที่ฝั่ง Portal ไว้ ให้ใส่ค่าเดียวกัน (ไม่บังคับสำหรับฝั่งนี้)
        'audience'     => null,
    ],

    // -------------------------------------------------------------------------
    // ฐานข้อมูลพนักงานเดิมของบริษัท
    // -------------------------------------------------------------------------
    'db' => [
        // MySQL / MariaDB
        'dsn'      => 'mysql:host=localhost;dbname=company_erp;charset=utf8mb4',
        // SQL Server ใช้แบบนี้แทน:
        // 'dsn'   => 'sqlsrv:Server=localhost;Database=company_erp',
        'username' => 'erp_app',
        'password' => 'CHANGE_ME',

        'table'    => 'employees',   // ตารางพนักงาน
        'idColumn' => 'id',
        'emailColumn'    => 'email',
        'nameColumn'     => 'name',
        'auth0IdColumn'  => 'auth0_id',
        // ถ้าตารางมีคอลัมน์บอกสถานะพนักงาน ให้ระบุ (เว้น null ถ้าไม่มี)
        'activeColumn'   => null,    // เช่น 'is_active'
    ],

    // -------------------------------------------------------------------------
    // นโยบายความปลอดภัยของการผูกบัญชี  ★ อ่านให้ครบก่อนแก้
    // -------------------------------------------------------------------------
    'security' => [
        // อนุญาตเฉพาะอีเมลโดเมนเหล่านี้ (ว่าง = อนุญาตทุกโดเมน — ไม่แนะนำ)
        'allowedEmailDomains' => ['company.com'],

        // บังคับให้ Auth0 ยืนยันอีเมลแล้วเท่านั้นจึงผูกกับบัญชีพนักงานเดิมได้
        // ปิดข้อนี้ = เปิดช่องให้ยึดบัญชีพนักงานผ่านการสมัคร social login ด้วยอีเมลเดียวกัน
        'requireVerifiedEmail' => true,

        // สร้างพนักงานใหม่อัตโนมัติเมื่อไม่พบในฐานข้อมูล
        // ปิดไว้เป็นค่าตั้งต้น — เปิดได้ก็ต่อเมื่อจำกัดโดเมนอีเมลแล้วเท่านั้น
        'autoProvision' => false,

        // Origin ของหน้า Portal ที่อนุญาตให้เรียก ping.php ได้ (CORS allowlist)
        'portalOrigins' => [
            'https://portal.company.com',
            'https://company-portal.vercel.app',
            'http://localhost:5173',
        ],
    ],
];
