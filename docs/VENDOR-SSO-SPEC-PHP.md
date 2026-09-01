# สเปกงาน — เชื่อมระบบ PHP ภายในองค์กรเข้ากับ Auth0 SSO

**สำหรับส่งให้ผู้พัฒนาภายนอก** · เอกสารเลขที่ SSO-VND-002 · เวอร์ชัน 1.0

> เอกสารนี้ใช้กับ **ระบบ PHP ที่ติดตั้งในเครือข่ายภายในองค์กร**
> หากเป็นแอป React/Vite บนคลาวด์ ให้ใช้เอกสาร SSO-VND-001 แทน

---

## 1. สิ่งที่ต้องการ

ระบบที่ท่านพัฒนามีระบบล็อกอินของตัวเอง พนักงานต้องจำรหัสผ่านแยกจากระบบอื่น
บริษัทได้ติดตั้งระบบยืนยันตัวตนกลาง (Auth0) แล้ว จึงต้องการให้ระบบเปลี่ยนมาใช้ระบบกลาง

**ผลลัพธ์ที่ต้องได้**

- พนักงานที่ล็อกอินพอร์ทัลกลางแล้ว เปิดระบบนี้ได้ทันทีโดยไม่ต้องกรอกรหัสผ่านซ้ำ
- ระบบไม่เก็บรหัสผ่านของผู้ใช้อีกต่อไป
- ปิดบัญชีที่ระบบกลางที่เดียว แล้วเข้าระบบนี้ไม่ได้ทันที
- ข้อมูลพนักงานและประวัติการทำงานเดิมทั้งหมด **ต้องไม่สูญหาย**

**ขอบเขต:** เฉพาะส่วนยืนยันตัวตนและควบคุมการเข้าถึงหน้า ไม่แตะฟังก์ชันธุรกิจเดิม

---

## 2. ข้อกำหนดเบื้องต้นที่ต้องมีก่อนเริ่ม

| # | ข้อกำหนด | ผู้รับผิดชอบ |
|---|---|---|
| 1 | PHP **8.1 ขึ้นไป** | ผู้พัฒนา |
| 2 | ติดตั้ง Composer ได้บนเซิร์ฟเวอร์ | ผู้พัฒนา |
| 3 | ระบบให้บริการผ่าน **HTTPS ด้วยใบรับรองที่เบราว์เซอร์เชื่อถือ** | บริษัท (ฝ่ายเครือข่าย) |
| 4 | มีชื่อโฮสต์ถาวร ไม่ใช้หมายเลขไอพี | บริษัท |
| 5 | ตารางพนักงานมีคอลัมน์อีเมล และ**อีเมลต้องไม่ซ้ำกัน** | ผู้พัฒนาตรวจสอบ |

> ⚠️ ข้อ 3 เป็น **ข้อบังคับ** หากระบบยังเป็น `http://` พอร์ทัลกลางจะตรวจสถานะไม่ได้
> เนื่องจากเบราว์เซอร์ปิดกั้นคำขอตามนโยบาย Mixed Content

**คำสั่งตรวจข้อ 5 — ต้องไม่มีผลลัพธ์**

```sql
SELECT LOWER(email) AS e, COUNT(*) FROM <ตารางพนักงาน>
GROUP BY LOWER(email) HAVING COUNT(*) > 1;
```

---

## 3. ค่าที่บริษัทจัดเตรียมให้

| ตัวแปร | ค่า |
|---|---|
| Auth0 Domain | `dev-j3byu1ifa062ozvk.us.auth0.com` |
| Client ID | *(สร้างเฉพาะระบบนี้ — แจ้งภายหลัง)* |
| Client Secret | *(ส่งผ่านช่องทางที่ปลอดภัย ไม่ส่งทางอีเมลปกติ)* |

**สิ่งที่ผู้พัฒนาต้องแจ้งกลับก่อนเริ่มงาน**

1. URL เต็มของไฟล์รับผลการยืนยันตัวตน เช่น `https://erp.company.com/auth-callback.php`
2. URL หน้าแรกของระบบ (สำหรับตั้งค่าปลายทางหลังออกจากระบบ)
3. ชื่อตารางพนักงาน และชื่อคอลัมน์ id / email / name
4. ระบบล็อกอินเดิมใช้วิธีใด และเก็บรหัสผ่านไว้ที่ตารางใด

---

## 4. งานที่ต้องทำ

### 4.1 ติดตั้งไลบรารี

```bash
composer require auth0/auth0-php
```

### 4.2 สร้างไฟล์ตั้งค่า `config.php`

**ต้องเพิ่มชื่อไฟล์นี้ใน `.gitignore` ห้าม commit เข้าระบบควบคุมเวอร์ชัน**

```php
<?php
return [
    'auth0' => [
        'domain'         => 'dev-j3byu1ifa062ozvk.us.auth0.com',
        'clientId'       => 'ค่าที่บริษัทแจ้ง',
        'clientSecret'   => 'ค่าที่บริษัทแจ้ง',
        'redirectUri'    => 'https://erp.company.com/auth-callback.php',
        'logoutReturnTo' => 'https://erp.company.com/',
        // สร้างด้วย: php -r "echo bin2hex(random_bytes(32));"
        'cookieSecret'   => 'ค่าสุ่มความยาวอย่างน้อย 32 ไบต์',
    ],
    'db' => [
        'dsn'      => 'mysql:host=localhost;dbname=xxx;charset=utf8mb4',
        'username' => 'xxx',
        'password' => 'xxx',
        'table'          => 'employees',
        'idColumn'       => 'id',
        'emailColumn'    => 'email',
        'nameColumn'     => 'name',
        'auth0IdColumn'  => 'auth0_id',
        'activeColumn'   => null,
    ],
    'security' => [
        // จำกัดเฉพาะโดเมนอีเมลของบริษัท
        'allowedEmailDomains'  => ['company.com'],
        // ต้องเป็น true เสมอ
        'requireVerifiedEmail' => true,
        // ห้ามเปิด เว้นแต่บริษัทอนุมัติเป็นลายลักษณ์อักษร
        'autoProvision'        => false,
    ],
];
```

### 4.3 เตรียมฐานข้อมูล

```sql
ALTER TABLE employees ADD COLUMN auth0_id VARCHAR(255) NULL;
CREATE UNIQUE INDEX ux_employees_auth0_id ON employees (auth0_id);
```

**ห้ามลบหรือแก้ไขข้อมูลพนักงานเดิม** — เพิ่มคอลัมน์เท่านั้น

### 4.4 ไฟล์รับผลการยืนยันตัวตน `auth-callback.php`

ทำหน้าที่ 3 อย่าง: แลกรหัสสิทธิ์เป็นโทเคน → ตรวจนโยบายความปลอดภัย → จับคู่พนักงานเดิม

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';

session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
    'cookie_secure'   => !empty($_SERVER['HTTPS']),
]);

$config   = portal_config();
$auth0    = portal_auth0();
$security = $config['security'];

// (1) แลกรหัสสิทธิ์เป็นโทเคน — ห้ามข้ามขั้นนี้
if (isset($_GET['code'], $_GET['state'])) {
    $auth0->exchange();
}

// (2) ยังไม่มีเซสชัน → ส่งไปยืนยันตัวตน
$session = $auth0->getCredentials();
if ($session === null) {
    $target = $_GET['return_to'] ?? 'dashboard.php';
    $_SESSION['sso_return_to'] = basename((string) $target);
    header('Location: ' . $auth0->login());
    exit;
}

// (3) อ่านข้อมูลตัวตน
$auth0Id       = $session->user['sub'];
$email         = strtolower(trim((string) ($session->user['email'] ?? '')));
$emailVerified = (bool) ($session->user['email_verified'] ?? false);
$name          = $session->user['name'] ?? $email;

// (4) ตรวจโดเมนอีเมล
$domains = $security['allowedEmailDomains'];
if ($domains !== []) {
    $domain = substr(strrchr($email, '@') ?: '', 1);
    if (!in_array(strtolower($domain), array_map('strtolower', $domains), true)) {
        sso_fail('บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบภายในองค์กร');
    }
}

$pdo = portal_db();

// (5) เคยผูกบัญชีแล้ว
$stmt = $pdo->prepare('SELECT * FROM employees WHERE auth0_id = ? LIMIT 1');
$stmt->execute([$auth0Id]);
$employee = $stmt->fetch();

if (!$employee) {
    // (6) ยังไม่เคยผูก — จับคู่ด้วยอีเมล
    //     ต้องเป็นอีเมลที่ยืนยันแล้วเท่านั้น
    if ($security['requireVerifiedEmail'] && !$emailVerified) {
        sso_fail('อีเมลของบัญชีนี้ยังไม่ได้รับการยืนยัน');
    }

    $stmt = $pdo->prepare('SELECT * FROM employees WHERE LOWER(email) = ? LIMIT 1');
    $stmt->execute([$email]);
    $employee = $stmt->fetch();

    if ($employee) {
        $pdo->prepare('UPDATE employees SET auth0_id = ? WHERE id = ?')
            ->execute([$auth0Id, $employee['id']]);
    } else {
        sso_fail('ไม่พบข้อมูลพนักงานที่ตรงกับอีเมลนี้ กรุณาติดต่อฝ่ายบุคคล');
    }
}

// (7) ออกเซสชันของระบบ
session_regenerate_id(true);
$_SESSION['is_logged_in'] = true;
$_SESSION['user_id']      = $employee['id'];
$_SESSION['user_email']   = $email;
$_SESSION['user_name']    = $employee['name'] ?? $name;
$_SESSION['auth0_id']     = $auth0Id;
$_SESSION['login_at']     = time();

$returnTo = $_SESSION['sso_return_to'] ?? 'dashboard.php';
unset($_SESSION['sso_return_to']);
header('Location: ' . $returnTo);
exit;
```

> **ข้อผิดพลาดที่พบบ่อยที่สุด** คือลืมเรียก `exchange()` ในขั้น (1)
> อาการคือระบบวนกลับไปหน้ายืนยันตัวตนซ้ำไม่สิ้นสุด

### 4.5 ไฟล์ควบคุมการเข้าถึง `auth-middleware.php`

```php
<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
        'cookie_secure'   => !empty($_SERVER['HTTPS']),
    ]);
}

const PORTAL_SESSION_MAX_AGE = 8 * 60 * 60;   // 8 ชั่วโมง

$loggedIn = ($_SESSION['is_logged_in'] ?? false) === true;
$expired  = $loggedIn && (time() - (int) ($_SESSION['login_at'] ?? 0)) > PORTAL_SESSION_MAX_AGE;

if (!$loggedIn || $expired) {
    if ($expired) { $_SESSION = []; session_destroy(); }
    $returnTo = basename($_SERVER['SCRIPT_NAME'] ?? 'dashboard.php');
    header('Location: auth-callback.php?return_to=' . rawurlencode($returnTo));
    exit;
}
```

**ต้องเรียกใช้ที่บรรทัดแรกสุดของ *ทุกหน้า* ที่ต้องล็อกอินก่อนเข้า**

```php
<?php require __DIR__ . '/auth-middleware.php'; ?>
```

### 4.6 ไฟล์ออกจากระบบ `logout.php`

```php
<?php
require_once __DIR__ . '/lib/bootstrap.php';
session_start();
$_SESSION = [];
session_destroy();
header('Location: ' . portal_auth0()->logout(portal_config()['auth0']['logoutReturnTo']));
exit;
```

### 4.7 ไฟล์ตรวจสถานะ `ping.php`

ให้พอร์ทัลกลางตรวจว่าเครื่องพนักงานเข้าถึงระบบได้หรือยัง (ต่อ VPN แล้วหรือไม่)

```php
<?php
declare(strict_types=1);

$ALLOWED_ORIGINS = ['https://company-portal-sso.vercel.app'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
echo json_encode(['status' => 'online', 'timestamp' => gmdate('c')]);
```

> **ห้ามใช้ `Access-Control-Allow-Origin: *`** เพราะจะเปิดให้เว็บไซต์ภายนอกใด ๆ
> ใช้เครื่องคอมพิวเตอร์ของพนักงานเป็นช่องทางสำรวจเครือข่ายภายในองค์กร

### 4.8 ปิดระบบล็อกอินเดิม

เมื่อทดสอบผ่านแล้ว ให้ลบหน้าล็อกอินเดิม ช่องกรอกรหัสผ่าน และคอลัมน์เก็บรหัสผ่านออก
ห้ามเหลือช่องทางเข้าระบบด้วยรหัสผ่านไว้ในระบบที่ใช้งานจริง

---

## 5. เกณฑ์ตรวจรับ

| # | รายการทดสอบ | ผลที่ต้องได้ |
|---|---|---|
| 1 | เปิด `ping.php` โดยตรงขณะต่อ VPN | ได้ JSON และรหัสสถานะ 200 |
| 2 | เปิดหน้าที่ต้องล็อกอินโดยยังไม่ล็อกอิน | ถูกนำไปยืนยันตัวตน ไม่เห็นเนื้อหาหน้านั้นเลย |
| 3 | ล็อกอินครั้งแรกด้วยบัญชีพนักงานที่มีอยู่เดิม | เข้าได้ และคอลัมน์ `auth0_id` ถูกบันทึก |
| 4 | ผู้ใช้เดิมเห็นข้อมูลและประวัติเดิม | ครบถ้วน ไม่สูญหาย |
| 5 | ล็อกอินซ้ำครั้งที่สอง | ไม่ถูกถามรหัสผ่าน |
| 6 | ล็อกอินพอร์ทัลกลางก่อน แล้วเปิดระบบนี้ | **เข้าได้ทันทีโดยไม่ถามรหัสผ่าน** |
| 7 | ล็อกอินด้วยอีเมลนอกโดเมนที่อนุญาต | ถูกปฏิเสธพร้อมข้อความชี้แจง |
| 8 | ล็อกอินด้วยอีเมลที่ไม่มีในตารางพนักงาน | ถูกปฏิเสธ ไม่สร้างบัญชีใหม่อัตโนมัติ |
| 9 | กดออกจากระบบ แล้วกดปุ่มย้อนกลับ | เข้าหน้าที่ป้องกันไว้ไม่ได้ |
| 10 | ค้นหาไฟล์ทั้งโปรเจกต์ | ไม่พบระบบล็อกอินเดิมหลงเหลือ |
| 11 | ตรวจ repository | ไม่มี `config.php` หรือ Client Secret อยู่ในระบบควบคุมเวอร์ชัน |
| 12 | เปิดระบบผ่าน `https://` | ใบรับรองถูกต้อง เบราว์เซอร์ไม่ขึ้นคำเตือน |

---

## 6. สิ่งที่ต้องส่งมอบ

1. โค้ดที่แก้ไขแล้ว ติดตั้งบนเซิร์ฟเวอร์ทดสอบ
2. URL ของระบบทดสอบสำหรับให้บริษัทตรวจรับ
3. รายงานผลการทดสอบตามตารางข้อ 5
4. คำสั่ง SQL ที่ใช้เปลี่ยนแปลงฐานข้อมูล พร้อมคำสั่งย้อนกลับ
5. ยืนยันเป็นลายลักษณ์อักษรว่าได้ลบระบบล็อกอินเดิมและคอลัมน์รหัสผ่านออกแล้ว

---

## 7. ข้อควรระวังด้านความปลอดภัย

| # | มาตรการ | เหตุผล |
|---|---|---|
| 1 | ตรวจ `email_verified` ก่อนผูกบัญชีพนักงานเดิม | ไม่ตรวจ = ผู้ไม่ประสงค์ดีสมัครด้วยอีเมลพนักงานแล้วยึดบัญชีได้ |
| 2 | จำกัดโดเมนอีเมลที่อนุญาต | กันบุคคลภายนอกเข้าถึงระบบภายใน |
| 3 | ปิดการสร้างพนักงานใหม่อัตโนมัติ | ควบคุมให้เพิ่มพนักงานผ่านฝ่ายบุคคลเท่านั้น |
| 4 | เรียก `session_regenerate_id(true)` หลังล็อกอินสำเร็จ | ป้องกัน Session Fixation |
| 5 | คุกกี้เซสชันต้องเป็น HttpOnly, Secure, SameSite=Lax | ลดความเสี่ยงถูกขโมยเซสชันและ CSRF |
| 6 | `config.php` ต้องอยู่นอกระบบควบคุมเวอร์ชัน | ป้องกัน Client Secret รั่วไหล |
| 7 | Callback URL ต้องเป็น path เต็มถึงชื่อไฟล์ | ใส่แค่โดเมนจะทำให้ยืนยันตัวตนล้มเหลว |
| 8 | บันทึกเหตุการณ์เข้าสู่ระบบและการถูกปฏิเสธ | ใช้ตรวจสอบย้อนหลัง |

---

## 8. โค้ดอ้างอิงที่ใช้งานได้จริง

บริษัทมีชุดโค้ดที่ทดสอบแล้วให้ใช้เป็นต้นแบบ ดาวน์โหลดได้ที่

**https://github.com/Aunhavc/company-portal-sso/tree/main/php-intranet**

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/bootstrap.php` | โหลด config + สร้าง Auth0 client และ PDO |
| `auth-callback.php` | ตัวอย่างเต็มพร้อมการจัดการข้อผิดพลาด |
| `auth-middleware.php` | ยามเฝ้าประตูของทุกหน้า |
| `logout.php` | ออกจากระบบทั้งสองระดับ |
| `ping.php` | ตรวจสถานะ ใช้ได้ทันทีโดยไม่ต้องมี composer |
| `config.example.php` | เทมเพลตค่าตั้งค่าทั้งหมด |
| `sql/0001_alter_employees.sql` | คำสั่งเปลี่ยนแปลงฐานข้อมูล พร้อมคำสั่งตรวจข้อมูลซ้ำ |

คู่มือฉบับเต็มพร้อมคำอธิบายทีละขั้น อยู่ในเอกสาร **SSO-OPS-001 บทที่ 5**

---

## 9. ผู้ประสานงาน

| บทบาท | ชื่อ / ติดต่อ |
|---|---|
| ผู้ดูแลระบบยืนยันตัวตนกลาง | ฝ่ายเทคโนโลยีสารสนเทศ |
| ผู้ดูแลเครือข่ายและใบรับรอง HTTPS | |
| ผู้ตรวจรับงาน | |
| กำหนดส่งมอบ | |
