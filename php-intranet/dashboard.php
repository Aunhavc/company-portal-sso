<?php
/**
 * ตัวอย่างหน้างานภายในที่ถูกป้องกันด้วย SSO
 * สังเกตบรรทัดแรก — แค่ require ไฟล์เดียวก็ปิดหน้านี้ให้คนนอกเข้าไม่ได้แล้ว
 */
require __DIR__ . '/auth-middleware.php';

$user = current_user();
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ระบบภายในองค์กร</title>
<style>
  :root { color-scheme: light }
  * { box-sizing: border-box }
  body { margin:0; font-family: "IBM Plex Sans Thai", system-ui, "Segoe UI", sans-serif;
         background:#f8fafc; color:#0f172a }
  header { background:#fff; border-bottom:1px solid #e2e8f0; padding:0 1.5rem }
  .bar { max-width:64rem; margin:0 auto; height:4rem; display:flex; align-items:center; gap:1rem }
  .logo { width:2.25rem; height:2.25rem; border-radius:.75rem; background:#059669; color:#fff;
          display:grid; place-items:center; font-weight:700; font-size:.875rem }
  .grow { flex:1 }
  .who { text-align:right; line-height:1.3 }
  .who b { display:block; font-size:.875rem }
  .who span { font-size:.75rem; color:#64748b }
  .out { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:.5rem;
         padding:.5rem .9rem; font-size:.8125rem; font-weight:600; text-decoration:none }
  main { max-width:64rem; margin:0 auto; padding:2rem 1.5rem }
  .ok { background:#ecfdf5; border:1px solid #a7f3d0; border-radius:1rem; padding:1.25rem 1.5rem;
        margin-bottom:1.5rem }
  .ok h1 { margin:0 0 .35rem; font-size:1.0625rem; color:#065f46 }
  .ok p { margin:0; color:#047857; font-size:.9375rem; line-height:1.7 }
  table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #e2e8f0;
          border-radius:1rem; overflow:hidden; font-size:.9375rem }
  th, td { text-align:left; padding:.85rem 1.25rem; border-bottom:1px solid #f1f5f9 }
  th { background:#f8fafc; color:#64748b; font-size:.8125rem; font-weight:600; width:14rem }
  tr:last-child td, tr:last-child th { border-bottom:0 }
  code { background:#f1f5f9; padding:.15rem .4rem; border-radius:.3rem; font-size:.8125rem }
</style>
</head>
<body>
<header>
  <div class="bar">
    <span class="logo">ERP</span>
    <strong>ระบบภายในองค์กร</strong>
    <span class="grow"></span>
    <span class="who">
      <b><?= htmlspecialchars((string) $user['name'], ENT_QUOTES, 'UTF-8') ?></b>
      <span><?= htmlspecialchars((string) $user['email'], ENT_QUOTES, 'UTF-8') ?></span>
    </span>
    <a class="out" href="logout.php">ออกจากระบบ</a>
  </div>
</header>

<main>
  <div class="ok">
    <h1>เข้าสู่ระบบสำเร็จผ่าน Single Sign-On</h1>
    <p>
      คุณเข้าถึงระบบภายในนี้ได้โดยไม่ต้องกรอกรหัสผ่านซ้ำ เพราะใช้เซสชันเดียวกับพอร์ทัลกลางบนคลาวด์
      บัญชี Auth0 ถูกจับคู่กับข้อมูลพนักงานในฐานข้อมูลเดิมของบริษัทเรียบร้อยแล้ว
    </p>
  </div>

  <table>
    <tr><th>รหัสพนักงาน (ฐานข้อมูลเดิม)</th><td><code><?= htmlspecialchars((string) $user['id'], ENT_QUOTES, 'UTF-8') ?></code></td></tr>
    <tr><th>อีเมล</th><td><?= htmlspecialchars((string) $user['email'], ENT_QUOTES, 'UTF-8') ?></td></tr>
    <tr><th>Auth0 User ID</th><td><code><?= htmlspecialchars((string) $user['auth0_id'], ENT_QUOTES, 'UTF-8') ?></code></td></tr>
    <tr><th>เข้าสู่ระบบเมื่อ</th><td><?= date('d/m/Y H:i:s', (int) ($_SESSION['login_at'] ?? time())) ?></td></tr>
  </table>
</main>
</body>
</html>
