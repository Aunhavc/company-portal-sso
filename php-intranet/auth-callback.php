<?php
/**
 * หน้าด่าน SSO ของระบบภายใน
 *
 * ทำ 3 อย่าง:
 *   1. ถ้ายังไม่มีเซสชัน → ส่งไป Auth0 (ถ้าพนักงานล็อกอินที่ Portal ไว้แล้ว
 *      Auth0 จะเด้งกลับมาทันทีโดยไม่ถามรหัสผ่าน = SSO)
 *   2. รับ ?code= กลับมาแล้วแลกเป็น token  ← ขั้นตอนนี้เอกสารต้นฉบับขาดไป ทำให้วนลูปไม่จบ
 *   3. แมป Auth0 user เข้ากับพนักงานในฐานข้อมูลเดิม แล้วออก session ของระบบภายใน
 */

declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
        'cookie_secure'   => !empty($_SERVER['HTTPS']),
    ]);
}

$config   = portal_config();
$auth0    = portal_auth0();
$security = $config['security'];

// ---------------------------------------------------------------------------
// 1) แลก authorization code เป็น token (ต้องทำก่อน getCredentials เสมอ)
// ---------------------------------------------------------------------------
if (isset($_GET['code'], $_GET['state'])) {
    try {
        $auth0->exchange();
    } catch (Throwable $e) {
        portal_log('exchange failed: ' . $e->getMessage());
        sso_fail('แลกเปลี่ยนสิทธิ์กับ Auth0 ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
}

// ---------------------------------------------------------------------------
// 2) ยังไม่มีเซสชัน → ส่งไปยืนยันตัวตน
// ---------------------------------------------------------------------------
$session = $auth0->getCredentials();

if ($session === null) {
    // จำหน้าที่ผู้ใช้ตั้งใจจะเข้า เพื่อพากลับมาหลังล็อกอิน
    $target = $_GET['return_to'] ?? 'dashboard.php';
    $_SESSION['sso_return_to'] = is_string($target) ? basename($target) : 'dashboard.php';

    header('Location: ' . $auth0->login());
    exit;
}

$claims = $session->user;
$auth0Id       = $claims['sub']            ?? null;
$email         = strtolower(trim((string) ($claims['email'] ?? '')));
$emailVerified = (bool) ($claims['email_verified'] ?? false);
$name          = $claims['name'] ?? $claims['nickname'] ?? $email;

if ($auth0Id === null || $email === '') {
    sso_fail('ข้อมูลผู้ใช้จาก Auth0 ไม่ครบถ้วน (ไม่พบ sub หรือ email)');
}

// ---------------------------------------------------------------------------
// 3) ตรวจนโยบายความปลอดภัยก่อนแตะฐานข้อมูล
// ---------------------------------------------------------------------------
$domains = $security['allowedEmailDomains'] ?? [];
if ($domains !== []) {
    $domain = substr(strrchr($email, '@') ?: '', 1);
    if (!in_array($domain, array_map('strtolower', $domains), true)) {
        portal_log("blocked login from disallowed domain: {$email}");
        sso_fail('บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบภายในองค์กร');
    }
}

$db    = $config['db'];
$table = portal_ident($db['table']);
$colId       = portal_ident($db['idColumn']);
$colEmail    = portal_ident($db['emailColumn']);
$colName     = portal_ident($db['nameColumn']);
$colAuth0    = portal_ident($db['auth0IdColumn']);
$colActive   = !empty($db['activeColumn']) ? portal_ident($db['activeColumn']) : null;

$pdo = portal_db();

// 3.1 เคยผูก auth0_id ไว้แล้ว — เส้นทางปกติ
$stmt = $pdo->prepare("SELECT * FROM {$table} WHERE {$colAuth0} = ? LIMIT 1");
$stmt->execute([$auth0Id]);
$employee = $stmt->fetch();

if (!$employee) {
    // 3.2 ยังไม่เคยผูก — จับคู่ด้วยอีเมลบริษัท
    //     ต้องยืนยันอีเมลแล้วเท่านั้น มิฉะนั้นผู้สมัครใหม่ที่ใช้อีเมลของพนักงาน
    //     จะยึดบัญชีในระบบ ERP ได้ทันที (ช่องโหว่ของโค้ดต้นฉบับ)
    if (($security['requireVerifiedEmail'] ?? true) && !$emailVerified) {
        sso_fail('อีเมลของบัญชีนี้ยังไม่ได้รับการยืนยัน กรุณายืนยันอีเมลก่อนเข้าใช้งาน');
    }

    $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE LOWER({$colEmail}) = ? LIMIT 1");
    $stmt->execute([$email]);
    $employee = $stmt->fetch();

    if ($employee) {
        // ผูกบัญชีกลางเข้ากับพนักงานเดิม
        $pdo->prepare("UPDATE {$table} SET {$colAuth0} = ? WHERE {$colId} = ?")
            ->execute([$auth0Id, $employee[$colId]]);
        portal_log("linked auth0 id to existing employee #{$employee[$colId]} ({$email})");
    } elseif ($security['autoProvision'] ?? false) {
        $pdo->prepare("INSERT INTO {$table} ({$colAuth0}, {$colEmail}, {$colName}) VALUES (?, ?, ?)")
            ->execute([$auth0Id, $email, $name]);
        $newId = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE {$colId} = ? LIMIT 1");
        $stmt->execute([$newId]);
        $employee = $stmt->fetch();
        portal_log("auto-provisioned new employee #{$newId} ({$email})");
    } else {
        sso_fail(
            'ไม่พบข้อมูลพนักงานที่ตรงกับอีเมล ' . htmlspecialchars($email, ENT_QUOTES) .
            ' ในระบบภายใน กรุณาติดต่อฝ่ายบุคคลเพื่อลงทะเบียนก่อนใช้งาน'
        );
    }
}

if ($colActive !== null && isset($employee[$colActive]) && !$employee[$colActive]) {
    sso_fail('บัญชีพนักงานนี้ถูกระงับการใช้งาน');
}

// ---------------------------------------------------------------------------
// 4) ออกเซสชันของระบบภายใน
// ---------------------------------------------------------------------------
session_regenerate_id(true);   // กัน session fixation

$_SESSION['is_logged_in'] = true;
$_SESSION['user_id']      = $employee[$colId];
$_SESSION['user_email']   = $email;
$_SESSION['user_name']    = $employee[$colName] ?? $name;
$_SESSION['auth0_id']     = $auth0Id;
$_SESSION['login_at']     = time();

$returnTo = $_SESSION['sso_return_to'] ?? 'dashboard.php';
unset($_SESSION['sso_return_to']);

header('Location: ' . $returnTo);
exit;

// ---------------------------------------------------------------------------
function sso_fail(string $message): never
{
    http_response_code(403);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!doctype html><html lang="th"><head><meta charset="utf-8">'
       . '<meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<title>เข้าสู่ระบบไม่สำเร็จ</title>'
       . '<style>body{font-family:system-ui,"Segoe UI",sans-serif;background:#f8fafc;display:grid;'
       . 'place-items:center;min-height:100vh;margin:0;padding:1rem}'
       . '.c{max-width:32rem;background:#fff;border:1px solid #e2e8f0;border-radius:1rem;'
       . 'padding:2rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}'
       . 'h1{font-size:1.125rem;margin:0 0 .75rem;color:#0f172a}'
       . 'p{color:#475569;line-height:1.7;margin:0 0 1.25rem;font-size:.9375rem}'
       . 'a{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;'
       . 'padding:.6rem 1.1rem;border-radius:.5rem;font-size:.875rem;font-weight:600}</style>'
       . '</head><body><div class="c"><h1>เข้าสู่ระบบไม่สำเร็จ</h1><p>'
       . htmlspecialchars($message, ENT_QUOTES, 'UTF-8')
       . '</p><a href="logout.php">ออกจากระบบแล้วลองใหม่</a></div></body></html>';
    exit;
}
