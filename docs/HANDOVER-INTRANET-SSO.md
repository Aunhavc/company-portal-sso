# เอกสารส่งมอบ — SSO ของระบบงานภายใน (Intranet SSO)

สำหรับผู้ดูแลระบบคนใหม่ที่มารับช่วงต่อ · ปรับปรุง 24 กันยายน 2569

อ่านหน้านี้หน้าเดียวจบ ถ้าต้องลงรายละเอียดค่อยตามลิงก์ท้ายหัวข้อ

---

## 1. ภาพรวมใน 30 วินาที

พนักงานล็อกอิน **Company Portal** ครั้งเดียว แล้วกดการ์ดเข้าระบบงานได้เลย

ระบบงานภายในไม่ได้ต่อกับ Auth0 แต่ใช้ **Windows Authentication ของ IIS** แทน
คือให้เว็บเซิร์ฟเวอร์บอก "คุณคือใคร" จากบัญชีที่ผู้ใช้ล็อกอินเข้าเครื่องอยู่แล้ว
พนักงานจึงไม่ต้องกรอกรหัสซ้ำ

> **เงื่อนไข 2 ข้อที่ต้องจำ**
> 1. **เครื่องพนักงานต้องล็อกอินวินโดวส์ด้วยบัญชี AD** เครื่องที่ล็อกอินด้วยบัญชี local
>    จะเจอกล่องขอรหัสเสมอ — ไม่ใช่ระบบพัง
> 2. **ที่อยู่เว็บต้องอยู่ในโซน Local intranet** ชื่อที่ไม่มีจุดอย่าง `sv000itd24` เข้าเงื่อนไขอยู่แล้ว
>    ส่วนชื่อที่มีจุดอย่าง `osticket.somjaiad01.local` ต้องประกาศเข้าโซนด้วย GPO — ดูหัวข้อ 4ข

---

## 2. รายการของทั้งหมด

| ระบบ | URL ที่การ์ดชี้ไป | เซิร์ฟเวอร์ | วิธีทำ SSO |
|---|---|---|---|
| Company Portal | https://company-portal-sso.vercel.app | Vercel | Auth0 (AD / Google) |
| SAP on Web | `http://sv000itd24/Sale/SAPWeb/` | `SV000ITD24` (192.168.0.24) | Windows Auth → โค้ดแอปอ่าน `AUTH_USER` เอง |
| Sale System (ขออนุมัติส่วนลดพิเศษ) | `http://sv000itd24/Sale/sso/login.php` | `SV000ITD24` (192.168.0.24) | Windows Auth ผ่าน **virtual directory `sso`** → โค้ดแอปอ่าน `AUTH_USER` เอง |
| osTicket | `http://osticket.somjaiad01.local/login.php` | `SV000ITDZZ` (192.168.0.250) | Windows Auth → ปลั๊กอิน HTTP Passthru |
| Knowledge Base (BookStack) | `http://192.168.0.127:6875` | `192.168.0.127` (Linux/Docker) | **OIDC ตรงกับ Auth0** — ไม่ผ่าน Windows Auth |
| AntBase | `https://app.antbase.co/login` | คลาวด์ (ผู้พัฒนาภายนอก) | **ยังไม่มี SSO** — ล็อกอินที่แอปเอง |
| Issue Hub | `https://somjai-issue-hub.lovable.app` | คลาวด์ (ผู้พัฒนาภายนอก) | **ยังไม่มี SSO** |
| Cashflow | `https://somjai-cashflow-live.pattanansap.chatgpt.site` | คลาวด์ (ผู้พัฒนาภายนอก) | **ยังไม่มี SSO** |
| Asset Registry | `https://asset-registry-hub.vercel.app/auth` | คลาวด์ (ผู้พัฒนาภายนอก) | **ยังไม่มี SSO** |

แอปคลาวด์ 4 ตัวลงทะเบียนเป็นการ์ดแล้ว 10 ก.ย. 2569 (เห็นเฉพาะผู้ดูแลระบบก่อน)
ยังทำ SSO ไม่ได้เพราะการตั้งค่าอยู่ในบัญชี Supabase ของผู้พัฒนา และผู้พัฒนาแจ้งว่าอยู่นอกขอบเขตงาน
คิดค่าใช้จ่ายเพิ่ม — **ระหว่างนี้ต้องพึ่ง `OFFBOARDING-CHECKLIST.md` ข้อ 6 เมื่อมีพนักงานลาออก**

ค่าคงที่อื่นที่ต้องรู้

| ค่า | รายละเอียด |
|---|---|
| โดเมน AD | `SOMJAIAD01.LOCAL` · DC หลัก `SV000ITD01` |
| ไฟร์วอลล์ | Zyxel USG FLEX 700 ที่ `192.168.0.254` |
| WAN1 | `somjai001.dyndns.biz` → True (interface `ge2_ppp`) |
| WAN2 | `somjai002.dyndns.biz` → 3BB (interface `ge1_ppp`) — เส้นที่ SSL VPN ใช้ออกเน็ต |
| VPN ที่ใช้จริง | SSL VPN (Zyxel SecuExtender) แบบ full tunnel · **ไม่ใช้ L2TP** |

---

## 3. SAP on Web — SSO ทำงานอย่างไร

โค้ดของแอป (`inc/auth.php`) อ่าน `AUTH_USER` / `LOGON_USER` อยู่แล้วตั้งแต่ผู้พัฒนาส่งมอบ
งานที่ทำคือ **เปิด Windows Authentication ที่ IIS** เท่านั้น ไม่ได้แก้โค้ดของ 3rd party เลย

- ไฟล์จริง: `C:\inetpub\wwwroot\Sale\SAPWeb\web.config` บน `SV000ITD24`
- ทั้งแอปเป็น Windows Auth · **คง Anonymous ไว้ที่** `login.php` `logout.php` `pda` `api_scan.php` `api_wms.php` `api_tr.php` `api_doc.php`
  (เครื่อง PDA ในคลังไม่ได้ join โดเมน ต้องใช้ PIN)
- ไฟล์สำรองอยู่ข้าง ๆ ชื่อ `web.config.bak-YYYYMMDD-HHmm`
- ผู้ใช้ต้องมีในตาราง `WEB_ADUser` ของแอป (จัดการที่หน้า `usermap.php`) ไม่งั้นถูกส่งไปหน้าล็อกอิน
- **คนที่ไม่มีบัญชี AD ใช้แอปนี้ไม่ได้เลย** — ทะเบียนผู้ใช้เป็นแคชของ AD เพิ่มคนเองไม่ได้

รายละเอียดเต็ม + วิธีย้อนกลับ: `C:\Users\aunha\projects\myrepo\SAPWeb\deploy\ENABLE-WINDOWS-AUTH.md`

---

## 3ก. Sale System (ขออนุมัติส่วนลดพิเศษ) — SSO ทำงานอย่างไร

ทำเมื่อ 24 กันยายน 2569 · **คนละแอปกับ SAP on Web** แม้จะอยู่เครื่องเดียวกัน

| รายการ | ค่า |
|---|---|
| โฟลเดอร์จริง | `C:\inetpub\wwwroot\Sale` (SAP on Web อยู่ในโฟลเดอร์ลูก `SAPWeb`) |
| ฐานข้อมูล | `Sale_Operation` บน `192.168.0.23` — ตาราง `Users` |
| ทางเข้าเดิม (ไม่แตะ) | `http://192.168.0.24/sale/login.php` — Anonymous · ฟอร์มของแอปเอง |
| ทางเข้า SSO (ของใหม่) | `http://sv000itd24/Sale/sso/login.php` — Windows Auth |

### ต้นเหตุที่ SSO ไม่ทำงานตอนเปลี่ยน URL การ์ด

โฟลเดอร์ `C:\inetpub\wwwroot\Sale` **ไม่มีไฟล์ `web.config` เลย** Windows Auth ที่ทำไว้เมื่อ 9 ก.ย.
อยู่ใน `web.config` ของโฟลเดอร์ลูก `SAPWeb` เท่านั้น จึงไม่ครอบถึงโฟลเดอร์แม่
IIS จึงเสิร์ฟ `/sale/login.php` แบบ Anonymous → `AUTH_USER` ว่าง → `api_user.php` คืน `nosso`
→ หน้า `login.php` ตกกลับไปที่ฟอร์มตามที่โค้ดเขียนไว้ (พฤติกรรมนี้ผู้พัฒนาตั้งใจออกแบบไว้แล้ว)

วัดได้จาก HTTP: `/Sale/SAPWeb/` ตอบ `401 + WWW-Authenticate: Negotiate, NTLM`
ส่วน `/sale/login.php` ตอบ `200` โดยไม่มีหัวข้อ `WWW-Authenticate` เลย

### วิธีที่เลือก — virtual directory ไม่ใช่การแก้ไฟล์ของแอป

สร้าง virtual directory ชื่อ `sso` ใต้แอป `Default Web Site/Sale` ชี้ไป**โฟลเดอร์เดิม**
แล้วเปิด Windows Auth เฉพาะ path นั้น ผลคือไฟล์เดียวกันมี 2 ทางเข้า คนละวิธียืนยันตัวตน

```powershell
$a = "$env:windir\system32\inetsrv\appcmd.exe"
& $a add vdir /app.name:"Default Web Site/Sale" /path:/sso /physicalPath:C:\inetpub\wwwroot\Sale
& $a set config "Default Web Site/Sale/sso" /section:windowsAuthentication   /enabled:true  /commit:apphost
& $a set config "Default Web Site/Sale/sso" /section:anonymousAuthentication /enabled:false /commit:apphost
```

**ทำไมถึงเลือกวิธีนี้ — เงื่อนไขที่ผู้ใช้ตั้งไว้คือ "แก้แค่ URL แล้วต้องไม่พังอีก"**

- ไม่มีไฟล์ใดถูกเพิ่มหรือแก้ในโฟลเดอร์ของแอปเลย แม้แต่ `web.config`
  ค่าตั้งอยู่ใน `applicationHost.config` ผู้พัฒนาส่งโค้ดชุดใหม่มาทับได้ไม่กระทบ
- ต้องเป็น **virtual directory ใต้ `/Sale`** ไม่ใช่ application แยกที่ระดับราก
  ลองแบบ application ชื่อ `/SaleSSO` ก่อนแล้ว **ไฟล์ `.php` ตอบ 404 ทั้งหมด**
  เพราะตัวจัดการ `PHP_via_FastCGI` ผูกไว้กับ `Default Web Site/Sale` เท่านั้น
  และไม่มี `web.config` ที่รากไซต์ให้สืบทอด — พอย้ายมาเป็น path ลูกก็สืบทอดได้เอง
  ข้อดีระยะยาวคือถ้าวันหน้าอัปเกรด PHP หรือแก้ค่าของแอปแม่ ตัว `sso` จะตามไปเองทุกครั้ง
- เครื่องที่ **ไม่ได้ join โดเมน** ยังใช้ `http://192.168.0.24/sale/login.php` เดิมได้ตามปกติ
  จาก IIS log 3 วันมีผู้ใช้กลุ่มนี้จริง — Android, iPhone, Mac และที่เปิดผ่าน LINE
  ถ้าเปิด Windows Auth ทั้งแอปคนกลุ่มนี้จะโดน 401 ใช้งานไม่ได้ทันที
- ย้อนกลับด้วยคำสั่งเดียว `appcmd delete vdir "Default Web Site/Sale/sso"`
  ไฟล์สำรอง `applicationHost.config.bak-salesso-<วันเวลา>` อยู่ในโฟลเดอร์ config ของ IIS

### เงื่อนไขที่ต้องครบ ไม่งั้นยังเจอฟอร์มล็อกอิน

1. **URL ต้องเป็นชื่อเครื่อง `sv000itd24` ห้ามเป็นเลข IP**
   วินโดวส์จัด URL ที่เป็นเลข IP ไว้โซน Internet จึงไม่ส่งตัวตนอัตโนมัติ จะเด้งกล่องขอรหัสแทน
2. **บัญชีที่ล็อกอินเข้าเครื่องวินโดวส์ ต้องเป็นคนเดียวกับที่ต้องการใช้แอป**
   ตัวตนของแอปกลุ่ม Windows Auth มาจากเซสชันวินโดวส์ ไม่ได้มาจากบัญชีที่ล็อกอินในพอร์ทัล
   เซสชัน Auth0 ของพอร์ทัลเป็นคุกกี้ของเว็บ `vercel.app` ส่งมาให้ IIS ไม่ได้
3. **ชื่อผู้ใช้ต้องมีในตาราง `Users` ของฐานข้อมูล `Sale_Operation`**
   ตรวจเมื่อ 24 ก.ย. 2569: ผู้ใช้ที่เปิดใช้งาน 251 คนจากทั้งหมด 255 คน
   และ **251 คนใช้รูปแบบ `ชื่อ.นามสกุล` ตรงกับ AD ครบทุกคน** พนักงานจึงเข้าได้ทันทีโดยไม่ต้องแก้ทะเบียน
   บัญชีผู้ดูแลอย่าง `itadmin` ไม่มีในทะเบียนนี้ ถ้าทดสอบด้วยบัญชีนั้นจะเจอฟอร์มล็อกอินเสมอ

### บทเรียนจากการทดสอบรอบแรกที่ไม่ผ่าน

ทดสอบที่เครื่อง `LT000ITD20` แล้วยังขึ้นฟอร์มให้กรอกรหัส ตรวจ IIS log พบว่าตัวตนที่วิ่งมาถึง
เซิร์ฟเวอร์เป็น `SOMJAIAD01\itadmin` ไม่ใช่ `Jakkapong.Duk` ตามที่ตั้งใจทดสอบ
สั่ง `whoami` ที่เครื่องนั้นได้ `somjaiad01\itadmin` ⇒ เครื่องล็อกอินวินโดวส์ค้างไว้ด้วยบัญชีผู้ดูแล
**พอล็อกอินวินโดวส์ด้วย `jakkapong.duk` จริง ๆ ก็เข้าได้ทันทีโดยไม่ต้องกรอกอะไร (ยืนยัน 24 ก.ย. 2569)**

⇒ ตรวจ `whoami` ที่เครื่องทดสอบก่อนเสมอ และดู cs-username ใน `C:\inetpub\logs\LogFiles\W3SVC1\`
เพราะ log บันทึกชื่อผู้ใช้ที่ผ่านการยืนยันตัวตนไว้ทุกคำขอ ตอบได้ทันทีว่าติดที่ IIS หรือที่ทะเบียนของแอป

### ค่าที่ตั้งในการ์ดของพอร์ทัล

| ช่องในฟอร์ม | ค่า |
|---|---|
| URL ปลายทาง | `http://sv000itd24/sale/login.php` |
| URL สำหรับเข้าผ่าน SSO | `http://sv000itd24/Sale/sso/login.php` |
| URL ตรวจสอบสถานะ | เว้นว่าง (แอปยังเป็น HTTP) |
| เปิดในแท็บใหม่ | ปิด |

พอร์ทัลใช้ `app.sso_url ?? app.url` (`web/src/pages/Portal.tsx`) จึงพาไปช่อง SSO ก่อนเสมอถ้ากรอกไว้

### ข้อสังเกตด้านความปลอดภัยที่พบระหว่างทาง (ยังไม่ได้แก้)

รหัสผ่านบัญชี `sa` ของ SQL Server ถูกเขียนฝังไว้ตรง ๆ ในไฟล์ PHP หลายไฟล์ของแอปนี้
เช่น `api_user.php` `api_coupon_manager.php` `api_discount.php` — ไม่เกี่ยวกับงาน SSO
แต่ควรแจ้งผู้พัฒนาให้ย้ายไปไฟล์ตั้งค่าที่อยู่นอก document root

---

## 4. osTicket — SSO ทำงานอย่างไร

osTicket มีผู้ใช้เดิมจำนวนมากที่เข้าทาง `http://192.168.0.250/osticket/` อยู่แล้ว
จึง **ไม่แตะของเดิมเลย** แต่สร้าง "ทางเข้าที่สอง" ขึ้นมาสำหรับผู้ใช้ที่มาจากพอร์ทัล

| | ทางเข้าเดิม | ทางเข้า SSO |
|---|---|---|
| URL | `http://192.168.0.250/osticket/` | `http://osticket.somjaiad01.local/` |
| ไซต์ใน IIS | `Default Web Site` | `osticket-sso` |
| การยืนยันตัวตน | Anonymous (เหมือนเดิม) | Windows Auth |
| ไฟล์/ฐานข้อมูล | **ชุดเดียวกัน** ตั๋วเดียวกัน | ชุดเดียวกัน |

จุดที่ต้องเข้าใจ ไม่งั้นแก้ผิดที่

- ตั้ง Windows Auth ไว้ที่ **`applicationHost.config` ระดับไซต์** ไม่ใช่ใน `web.config`
  เพราะ `web.config` อยู่ในโฟลเดอร์ที่ทั้งสองไซต์ใช้ร่วมกัน ถ้าใส่ตรงนั้นไซต์เดิมจะพังทันที
- ข้อยกเว้นที่คง Anonymous ไว้ในไซต์ SSO: `scp` (หน้าเจ้าหน้าที่) และ `api` (สร้างตั๋วด้วย API key)
- DNS: `osticket` เป็น **CNAME** ใน zone `somjaiad01.local` ชี้ไป `sv000itdzz.somjaiad01.local`
  (ใช้ CNAME เพื่อให้ Kerberos ทำงานได้โดยไม่ต้องลงทะเบียน SPN เพิ่ม)
- ปลั๊กอินที่ต้องเปิดใน osTicket: **HTTP Passthru Authentication** และ **LDAP Authentication and Lookup**
  (ทั้งคู่ติดตั้งและ Enabled อยู่แล้ว ดูที่ `scp/plugins.php`)

สคริปต์ที่ใช้สร้างไซต์: `C:\Users\aunha\projects\myrepo\osTicket\deploy\create-sso-site.ps1`

### เงื่อนไข 2 ข้อที่ทำให้ SSO ของ osTicket ทำงาน — ขาดข้อใดข้อหนึ่งไม่ได้

1. **URL ต้องชี้ที่ `/login.php`** ไม่ใช่หน้าแรก
   กลไก sign-on ฝั่งผู้ใช้ถูกเรียกที่หน้านี้เท่านั้น เข้าหน้าแรกตรง ๆ จะเป็น Guest
   (ทดสอบยืนยันแล้วทั้งสองแบบ: `/` = Guest · `/login.php` = เด้งเข้า tickets.php พร้อมชื่อผู้ใช้)
2. **ช่อง Username ของบัญชีผู้ใช้ต้องตรงกับชื่อผู้ใช้ AD**
   ปลั๊กอินรับ `SOMJAIAD01\Chokchai.Aun` แล้วตัดโดเมนออกเหลือ `chokchai.aun` จากนั้นค้นบัญชีด้วยชื่อนี้
   ตั้งค่าที่ staff panel > Users > เลือกคน > **Manage Account** > ช่อง Username

3. **โดเมน `somjaiad01.local` ต้องอยู่ในโซน Local intranet ของเครื่องผู้ใช้**
   เพิ่มข้อนี้ 24 ก.ย. 2569 หลังพบว่าเครื่องพนักงานบางเครื่องยังเด้งกล่องขอรหัสผ่านของเบราว์เซอร์
   รายละเอียดอยู่ในหัวข้อ **4ข** ด้านล่าง — แก้ครั้งเดียวด้วย GPO ครอบคลุมทุกเครื่อง

**การแก้ Username ไม่กระทบผู้ใช้เดิม** — ตรวจจากโค้ด `ClientAccount::lookupByUsername()` แล้ว
ถ้าสิ่งที่กรอกมีเครื่องหมาย @ ระบบจะค้นจากอีเมล ไม่แตะช่อง username เลย
คนที่ล็อกอินด้วยอีเมล (ค่าเริ่มต้นของ osTicket) จึงไม่ได้รับผลกระทบ
**กติกาเวลาแก้เป็นชุด: อัปเดตเฉพาะบัญชีที่ช่อง username ยังว่าง ห้ามทับค่าที่มีอยู่แล้ว**

ข้อมูลฐานข้อมูล osTicket (สำหรับงานแก้เป็นชุด): MySQL บนเครื่องเดียวกัน · ฐาน `osticket` ·
prefix `ost_` · ตารางที่เกี่ยวข้อง `ost_user` `ost_user_email` `ost_user_account` ·
php.exe อยู่ที่ `C:\Program Files\PHP\V.8.3.9\php.exe`

### สถานะการจับคู่ username (ทำแล้ว 9 ก.ย. 2569)

| | จำนวน |
|---|---|
| ผู้ใช้ทั้งหมดใน osTicket | 188 |
| มีบัญชีล็อกอิน | 183 |
| ตั้ง username ตรงกับ AD แล้ว | **82** (เดิม 28 + อัปเดตเป็นชุด 54) |
| ยังไม่มี username | 101 — **พนักงานที่ลาออกแล้ว** ค้างไว้เพราะยังมีตั๋ว ตั้งใจไม่แตะ |

- สคริปต์: `C:\Users\aunha\projects\myrepo\osTicket\deploy\map-usernames.php`
  ค่าเริ่มต้นเป็น **ทดลองรัน** ต้องใส่ `--apply` ถึงจะเขียนจริง · แตะเฉพาะบัญชีที่ username ว่าง
- ไฟล์ย้อนกลับของการอัปเดตครั้งนี้: `C:\Windows\Temp\ost-username-rollback.sql` บน `SV000ITDZZ`
- **มีพนักงานใหม่เข้ามาให้รันซ้ำได้** ขั้นตอน 2 คำสั่ง
  1. ดึงรายชื่อ AD (ไฟล์นี้มีอีเมลพนักงาน **ห้าม commit** ใช้เสร็จให้ลบ)
     ```powershell
     $ad = Invoke-Command -ComputerName SV000ITD01.SOMJAIAD01.LOCAL -Credential $ca -ScriptBlock {
       Import-Module ActiveDirectory
       Get-ADUser -Filter 'mail -like "*"' -Properties mail,sAMAccountName | Select-Object sAMAccountName,mail }
     $ad | Export-Csv "...\osTicket\deploy\ad-users.csv" -NoTypeInformation -Encoding UTF8
     ```
  2. รัน `map-usernames.php` แบบทดลองก่อน ดูตัวเลข แล้วค่อยใส่ `--apply`

**วิธีย้อนกลับทั้งหมด** (ของเดิมไม่เคยถูกแตะ จึงกลับสภาพ 100%)

```powershell
Invoke-Command -ComputerName SV000ITDZZ.SOMJAIAD01.LOCAL -Credential $ca -ScriptBlock {
  Import-Module WebAdministration; Remove-Website -Name 'osticket-sso'
}
```

---

## 4ก. Knowledge Base (BookStack) — SSO ทำงานอย่างไร

ต่างจาก SAP on Web และ osTicket ตรงที่ **ไม่ได้ใช้ Windows Authentication เลย**
BookStack คุยกับ Auth0 ด้วย OpenID Connect โดยตรง จึงใช้ได้ทุกเครื่องทุกเบราว์เซอร์
ไม่จำเป็นต้องล็อกอินวินโดวส์ด้วยบัญชี AD

| รายการ | ค่า |
|---|---|
| เครื่อง | `192.168.0.127` — Linux · เข้าทาง SSH ผู้ใช้ `administrator` |
| ตัวจริง | คอนเทนเนอร์ `bookstack-poc` พอร์ต **6875** · `/opt/bookstack-poc/docker-compose.yml` |
| ตัวสำรอง | คอนเทนเนอร์ `bookstack-ldap` พอร์ต **6876** · `/home/administrator/bookstack-ldap/docker-compose.yml` |
| เวอร์ชัน | BookStack v26.05.4 (linuxserver) |
| แอปใน Auth0 | `BookStack KB` — Regular Web Application |
| Client Secret | เก็บในไฟล์ `oidc.secret` ข้าง ๆ compose (สิทธิ์ 600) ผูกด้วย `env_file` **ไม่ใส่ลงใน compose** |

**เดิมเป็น `AUTH_METHOD=ldap`** — BookStack ถามรหัสผ่าน AD เอง ซึ่งเป็นแค่ "รหัสผ่านชุดเดียวกัน" ไม่ใช่ SSO
เปลี่ยนเป็น `AUTH_METHOD=oidc` เมื่อ 24 ก.ย. 2569

### กุญแจสำคัญ: `OIDC_EXTERNAL_ID_CLAIM=nickname`

BookStack จับคู่ผู้ใช้เดิมด้วยคอลัมน์ `users.external_auth_id`
สมัยใช้ LDAP ค่านี้ถูกเก็บเป็น **sAMAccountName** (เช่น `Chokchai.Aun`)

Auth0 ส่ง claim `nickname` มาเป็น sAMAccountName พอดี (ตรวจแล้วด้วย `OIDC_DUMP_USER_DETAILS=true`)
จึงชี้ให้ BookStack ใช้ claim นี้ ผลคือ **ไม่ต้องย้ายข้อมูลผู้ใช้เลย** และไม่เกิดบัญชีซ้ำ

> ถ้าไม่ตั้งค่านี้ BookStack จะใช้ `sub` (เช่น `ad|somjai-ad|a6c70288-…`) ซึ่งไม่ตรงกับของเดิม
> ผู้ใช้ทุกคนจะถูกสร้างเป็นบัญชีใหม่ **และเสียบทบาทกับสิทธิ์เอกสารทั้งหมด**

### ค่าที่ตั้งไว้ใน compose

```
- AUTH_METHOD=oidc
- AUTH_AUTO_INITIATE=true          # กดการ์ดแล้วเข้าเลย ไม่ต้องกดปุ่มล็อกอิน
- OIDC_NAME=SomjaiBiz SSO
- OIDC_DISPLAY_NAME_CLAIMS=name
- OIDC_EXTERNAL_ID_CLAIM=nickname
- OIDC_CLIENT_ID=<Client ID ของแอป BookStack KB>
- OIDC_ISSUER=https://dev-j3byu1ifa062ozvk.us.auth0.com/
- OIDC_ISSUER_DISCOVER=true
```

URL ที่ต้องมีในแอป Auth0 (ทั้งสองอินสแตนซ์)

- Allowed Callback URLs: `http://192.168.0.127:6876/oidc/callback,http://192.168.0.127:6875/oidc/callback`
- Allowed Logout URLs: `http://192.168.0.127:6876`, `…:6876/login`, `…:6876/login?prevent_auto_init=true` และชุดเดียวกันของ `6875`

### เข้าไม่ได้ทำอย่างไร

`AUTH_AUTO_INITIATE=true` ทำให้หน้า login เด้งไป Auth0 ทันที ถ้าต้องการหยุดวงจรนั้น ให้เปิด

```
http://192.168.0.127:6875/login?prevent_auto_init=true
```

ย้อนกลับเป็น LDAP ได้ด้วยไฟล์สำรองที่ชื่อ `docker-compose.yml.bak-oidc-<วันเวลา>` ข้าง ๆ ไฟล์จริง
แล้วสั่ง `sudo docker compose up -d` ในโฟลเดอร์นั้น

### ข้อจำกัดที่ต้องรู้

- ตัวแปร `LDAP_*` ยังคาอยู่ใน compose แต่ **ไม่มีผลแล้ว** เพราะ `AUTH_METHOD=oidc` — จงใจเก็บไว้เผื่อย้อนกลับ
- ผู้ใช้ที่ไม่มีบัญชี AD จะเข้าไม่ได้อีกต่อไป (เดิมก็เข้าไม่ได้อยู่แล้วเพราะเปิด LDAP ไว้)

### การผูกกลุ่ม AD เข้ากับบทบาทของ BookStack

Auth0 **ไม่ได้ส่งรายชื่อกลุ่มมาเอง** ต้องสั่งให้ส่งด้วย Action ชื่อ **`BookStack Groups`**
อยู่ใน Auth0 → Actions → Triggers → **Post Login** ลำดับปัจจุบันคือ

```
Start → Supabase claims → BookStack Groups → Complete
```

โค้ดของ Action (บรรทัดที่ 2 คือตัวล็อกให้ทำงานเฉพาะ BookStack แอปอื่นไม่กระทบ)

```js
exports.onExecutePostLogin = async (event, api) => {
  if (event.client.client_id !== '<Client ID ของแอป BookStack KB>') return;
  const ns = 'https://somjai.local/';
  const u = event.user;
  const groups = u.groups || (u.app_metadata && u.app_metadata.groups) || [];
  api.idToken.setCustomClaim(ns + 'groups', groups);
};
```

ฝั่ง BookStack ตั้งเพิ่ม 2 บรรทัด

```
- OIDC_USER_TO_GROUPS=true
- OIDC_GROUPS_CLAIM=https://somjai.local/groups
```

**จงใจไม่เปิด remove-from-groups** — บทบาทที่ผู้ดูแลตั้งมือไว้จะไม่ถูกถอดออกตอนล็อกอิน

ตารางการผูกที่ตั้งไว้แล้ว (คอลัมน์ `roles.external_auth_id` ในฐานข้อมูล BookStack)

| บทบาทใน BookStack | กลุ่มใน AD |
|---|---|
| Admin | `KB-Admins` |
| IT Editor | `KB-IT-Editors` |
| ACC Editor | `KB-ACC-Editors` |
| HR Editor | `KB-HR-Editors` |
| WH Editor | `KB-WH-Editors` |
| Payroll Confidential | `KB-Payroll-Confidential` |
| MKT Editor | `KB-MKT-Editors` |
| Sales Editor | `KB-Sales-Editors` |
| ONL Editor | `KB-ONL-Editors` |

**ต่อไปเพิ่มสิทธิ์ให้พนักงานด้วยการใส่เขาเข้ากลุ่มใน AD เท่านั้น** ไม่ต้องเข้าไปตั้งใน BookStack อีก
สิทธิ์จะถูกปรับตอนเขาล็อกอินครั้งถัดไป

บทบาท MKT / Sales / ONL สร้างโดยคัดลอกชุดสิทธิ์จาก `IT Editor` มาทั้งหมด (อย่างละ 6 สิทธิ์)
เมื่อแผนกเหล่านี้สร้างหนังสือของตัวเองแล้ว ให้ไปกำหนดสิทธิ์ระดับเนื้อหาในหน้าเว็บของ BookStack
ให้บทบาทของแผนกนั้นแก้ไขได้ ส่วนการอ่านนั้น `Viewer` ครอบคลุมให้ทุกคนอยู่แล้ว

### นโยบายการเข้าถึงเอกสาร

**หลักที่ตกลงไว้: พนักงานทุกคนอ่านได้ทุกเล่ม ยกเว้นเอกสารที่ถูกกำหนดให้ปกปิด**

- ผู้ใช้ใหม่ที่ล็อกอินครั้งแรกจะได้บทบาท **Viewer** อัตโนมัติ
  ตั้งที่ `settings.registration-role = 3` — **ถ้าไม่ตั้ง ผู้ใช้ใหม่จะไม่ได้บทบาทใดเลยและมองไม่เห็นอะไรทั้งสิ้น**
  (ดูโค้ด `app/Users/Models/User.php` → `attachDefaultRole()` เงื่อนไข `if ($roleId && …)`)
- บทบาท Viewer มีสิทธิ์ `book-view-all` `chapter-view-all` `page-view-all` `bookshelf-view-all`
- หนังสือและชั้นหนังสือของแต่ละแผนกเปิดให้ Viewer **อ่าน** ได้แล้ว ส่วนสิทธิ์แก้ไขยังเป็นของ Editor แผนกนั้น
- รายการที่ยังปิดอยู่ตั้งใจให้ปิด

| รายการ | ใครเข้าได้ |
|---|---|
| `HR-PAY Payroll (Confidential)` | Payroll Confidential เท่านั้น |
| `_ทดสอบระบบ (Admin เท่านั้น)` | Admin เท่านั้น |

**ผลทดสอบกับพนักงานจริง 24 ก.ย. 2569** — ใช้บัญชี `Jakkapong.Duk` ซึ่งไม่ได้อยู่ในกลุ่ม `KB-*` ใด ๆ

- เข้าได้ทันทีจากเครื่องที่ล็อกอินวินโดวส์ด้วยบัญชี AD โดยไม่ต้องกรอกรหัสผ่านซ้ำ
- เห็นหนังสือของทุกแผนก
- **ไม่เห็น** `HR-PAY Payroll (Confidential)` ในรายการเลย
- ฐานข้อมูลยืนยัน: ถูกสร้างเป็นผู้ใช้ใหม่ ได้บทบาท `Viewer` อย่างเดียว ไม่มีบทบาทจากกลุ่มติดมา

> **สำคัญ** — ถ้าแก้ตาราง `entity_permissions` ตรง ๆ ในฐานข้อมูล **ต้องสั่งคำนวณสิทธิ์ใหม่เสมอ**
> ไม่งั้นการแก้จะไม่มีผล เพราะ BookStack อ่านจากตารางแคช `joint_permissions`
> ```
> docker exec bookstack-poc sh -c "cd /app/www && php artisan bookstack:regenerate-permissions"
> ```
> ถ้าแก้ผ่านหน้าเว็บของ BookStack ระบบทำขั้นนี้ให้เอง

สคริปต์ที่ใช้งานอยู่บนเครื่อง `192.168.0.127`

| ไฟล์ | ทำอะไร |
|---|---|
| `/home/administrator/map-kb-roles.sh` | ผูกบทบาทกับกลุ่ม AD (แก้ SQL ได้ที่ `map-kb-roles.sql`) |
| `/home/administrator/check-kb-roles.sh` | ตรวจว่าผู้ใช้ได้บทบาทจากกลุ่มไหนบ้าง |
| `/home/administrator/set-default-role.sh` | ตั้งบทบาทเริ่มต้นของผู้ใช้ใหม่ + แสดงสิทธิ์อ่านของ Viewer |
| `/home/administrator/list-restricted.sh` | ดูว่าเนื้อหาใดถูกจำกัดสิทธิ์ และพนักงานทั่วไปอ่านได้หรือไม่ |
| `/home/administrator/open-read-access.sh` | เปิดสิทธิ์อ่านให้ Viewer (สำรองตารางเดิมและคำนวณสิทธิ์ใหม่ให้อัตโนมัติ) |
| `/home/administrator/add-dept-roles.sh` | สร้างบทบาทของแผนกใหม่ โดยคัดลอกสิทธิ์จาก `IT Editor` |
| `/home/administrator/set-oidc-secret.sh` | ใส่ Client Secret ใหม่โดยไม่ต้องพิมพ์ลงในคำสั่ง |

ไฟล์สำรองตารางสิทธิ์เดิมอยู่ที่ `/home/administrator/entity_permissions-backup-<วันเวลา>.sql`

---

## 4ข. โซน Local intranet — เงื่อนไขร่วมของทุกระบบที่ใช้ Windows Auth

เพิ่ม 24 กันยายน 2569 · **ใช้กับ SAP on Web · osTicket · Sale System** (ไม่เกี่ยวกับ Knowledge Base ซึ่งใช้ OIDC)

### อาการ

กดการ์ดแล้วเบราว์เซอร์เด้งกล่องขอ username/password ของตัวเอง ทั้งที่บัญชีนั้นอยู่ใน AD
และทั้งที่เครื่องล็อกอินวินโดวส์ด้วยบัญชีนั้นอยู่แล้ว

### ต้นเหตุ

วินโดวส์จะส่งตัวตนให้เว็บอัตโนมัติเฉพาะที่อยู่ซึ่งถูกจัดอยู่ใน **โซน Local intranet** เท่านั้น
ถ้าตกไปอยู่โซน Internet ค่าเริ่มต้นคือ **ถามรหัสผ่านเสมอ**

ค่าที่อ่านได้จริงจากเครื่อง `LT000ITD20` (ผู้ใช้ `jakkapong.duk`) ก่อนแก้

| ค่าในรีจิสทรี | ที่อ่านได้ | ความหมาย |
|---|---|---|
| Chrome `AuthServerAllowlist` | ไม่ได้ตั้ง | Chrome ยึดตามโซนของวินโดวส์ |
| `ZoneMap\AutoDetect` | **0** | การตรวจหาเครือข่ายภายในอัตโนมัติปิดอยู่ |
| `ZoneMap\IntranetName` | 1 | ถือเป็นเครือข่ายภายในเฉพาะ **ชื่อที่ไม่มีจุด** |
| `ZoneMap\Domains` (ทั้งของผู้ใช้และ GPO) | ว่าง | ไม่เคยมีใครประกาศ `somjaiad01.local` ไว้ |

⇒ `sv000itd24` ไม่มีจุด จึงเป็น Local intranet เข้าได้เงียบ
⇒ `osticket.somjaiad01.local` มีจุด จึงตกไปโซน Internet ถูกถามรหัสทุกครั้ง

ยืนยันจากเครื่องผู้ใช้ด้วย `[System.Security.Policy.Zone]::CreateFromUrl(...)` ได้ผล
`SALE = Intranet` / `OSTICKET = Internet` ตรงกับค่าในรีจิสทรีทุกประการ

### วิธีแก้ — GPO ระดับโดเมน ทำครั้งเดียวครอบคลุมทุกเครื่อง

GPO ชื่อ **`Intranet Zone - somjaiad01.local`** ผูกที่ `DC=SOMJAIAD01,DC=LOCAL`
ตั้งค่ารีจิสทรีเดียว

```
HKLM\SOFTWARE\Policies\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\somjaiad01.local
  ค่า  *  (REG_DWORD) = 1      ← 1 = โซน Local intranet
```

```powershell
$n = 'Intranet Zone - somjaiad01.local'
$k = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\somjaiad01.local'
New-GPO -Name $n | Out-Null
Set-GPRegistryValue -Name $n -Key $k -ValueName '*' -Type DWord -Value 1 | Out-Null
New-GPLink -Name $n -Target 'DC=SOMJAIAD01,DC=LOCAL' -LinkEnabled Yes
```

- มีผลในรอบรีเฟรชนโยบายถัดไป (ปกติไม่เกิน 90 นาที) หรือสั่ง `gpupdate /force`
- **แต่ละเครื่องต้องปิด-เปิด Chrome หนึ่งครั้ง** เพราะ Chrome อ่านค่าโซนตอนเริ่มทำงานเท่านั้น
- ถอนออกด้วย `Remove-GPLink` แล้ว `Remove-GPO -Name '<ชื่อ>'`
- ครอบคลุมทุกชื่อที่ลงท้าย `.somjaiad01.local` รวมถึงระบบที่จะทำ SSO ในอนาคต

### หลักฐานว่าแก้แล้วได้ผล

IIS log ของไซต์ `osticket-sso` เครื่องเดียวกัน บัญชีเดียวกัน

```
08:36:03  /login.php   user=-                         401.2   ← ก่อนแก้ ถูกถามแล้วไม่มีคำตอบ
08:55:52  /login.php   user=-                         401.2   ← หลังแก้ IIS ถาม
08:55:53  /login.php   user=SOMJAIAD01\Jakkapong.Duk  302.0   ← วินโดวส์ตอบเองใน 1 วินาที
08:55:53  /tickets.php user=SOMJAIAD01\Jakkapong.Duk  200.0
```

### วิธีวินิจฉัยเรื่องนี้ในอนาคต — อย่าเดา

```powershell
# รันที่เครื่องผู้ใช้ ขณะล็อกอินด้วยบัญชีนั้น — ต้องได้ Intranet ทุกอัน
@{OSTICKET='http://osticket.somjaiad01.local/login.php';SALE='http://sv000itd24/Sale/sso/login.php'}.GetEnumerator() |
  % { '{0,-9}= {1}' -f $_.Key, [System.Security.Policy.Zone]::CreateFromUrl($_.Value).SecurityZone }
```

อ่าน IIS log ของไซต์นั้นประกอบเสมอ — ช่อง `cs-username` บอกชื่อผู้ใช้ที่ผ่านการยืนยันตัวตนทุกคำขอ

| รูปแบบใน log | แปลว่า |
|---|---|
| `401.2` แล้วมีคำขอรอบสองพร้อมชื่อผู้ใช้ ภายใน 1-2 วินาที | SSO ทำงานปกติ |
| `401.2` แล้วเงียบ ไม่มีคำขอตามมา | เบราว์เซอร์ไม่ส่งตัวตน = เรื่องโซน |
| มีชื่อผู้ใช้แต่แอปยังให้ล็อกอิน | ตัวตนถึงแอปแล้ว = เรื่องทะเบียนผู้ใช้ของแอป |

---

## 5. Company Portal — สิ่งที่ผู้ดูแลต้องรู้

- หน้าจัดการแอปคือที่เดียวที่เพิ่ม/แก้การ์ดได้ ไม่ต้องแก้โค้ดหรือ deploy ใหม่
- การ์ดของระบบภายในจะผ่าน **หน้ากลาง `/launch/<slug>`** ซึ่งตรวจก่อนว่าเครื่องอยู่ในเครือข่ายบริษัทหรือไม่
  ถ้าไม่อยู่ จะขึ้นหน้าแจ้งให้ต่อ VPN — ผู้ใช้จะไม่มีทางเจอหน้า error ของเบราว์เซอร์
- ค่าที่ใช้ตรวจอยู่ในการ์ด **ตั้งค่าองค์กร** ช่อง "ชื่อ DynDNS / IP สาธารณะของบริษัท"
  ปัจจุบันคือ `somjai001.dyndns.biz somjai002.dyndns.biz` — **ต้องมีครบทั้งสองชื่อ**
- **อย่าติ๊ก "เปิดในแท็บใหม่"** สำหรับการ์ดระบบภายใน เพราะ Chrome จะบล็อกป๊อปอัป
  ผู้ใช้จะกดแล้วเงียบสนิทโดยไม่มีข้อความอะไรเลย
- **อย่ากรอก "URL ตรวจสอบสถานะ"** ถ้าระบบงานยังเป็น HTTP การ์ดจะขึ้นป้ายเหลืองตลอด

รายละเอียด: `docs/NETWORK-CHECK-AND-VPN.md` · `docs/ADD-NEW-APP.md`

---

## 6. ตรวจสุขภาพประจำ (รันได้จากเครื่องผู้ดูแล)

```powershell
# 1) ระบบงานภายในยังบังคับ Windows Auth อยู่ไหม (ต้องได้ 401 + Negotiate,NTLM)
foreach ($u in 'http://sv000itd24/Sale/SAPWeb/','http://sv000itd24/Sale/sso/login.php','http://osticket.somjaiad01.local/') {
  try { $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 10; "$u -> $($r.StatusCode)" }
  catch { "$u -> " + $_.Exception.Response.StatusCode.value__ + " " + $_.Exception.Response.Headers['WWW-Authenticate'] }
}

# 2) ทางเข้าเดิมต้องยังเปิด Anonymous (ต้องได้ 200 ทั้งคู่ — ไม่งั้นเครื่องที่ไม่ได้ join โดเมนใช้ไม่ได้)
(Invoke-WebRequest 'http://192.168.0.250/osticket/' -UseBasicParsing).StatusCode
(Invoke-WebRequest 'http://192.168.0.24/sale/login.php' -UseBasicParsing).StatusCode

# 3) พอร์ทัลยังรู้จักเครือข่ายบริษัทไหม (ต้องได้ inside:true เมื่อรันจากใน LAN)
Invoke-RestMethod 'https://company-portal-sso.vercel.app/api/network-check?host=somjai001.dyndns.biz,somjai002.dyndns.biz'
```

ที่ Zyxel: `MONITOR → Network Status → DDNS Status` ทั้ง `DDNS_True` และ `DDNS_3BB` ต้องเป็น **Success**

---

## 7. อาการ → สาเหตุ → วิธีแก้

| อาการที่ผู้ใช้แจ้ง | สาเหตุที่พบบ่อยที่สุด | วิธีแก้ |
|---|---|---|
| กดการ์ดแล้วไม่เกิดอะไรขึ้น (Chrome) | ตัวบล็อกป๊อปอัป | ปิดตัวเลือก "เปิดในแท็บใหม่" ของการ์ดนั้น |
| เข้าระบบงานแล้วยังเจอฟอร์มล็อกอิน | เครื่องล็อกอินวินโดวส์ด้วยบัญชี local | ให้ล็อกอินเครื่องด้วยบัญชี AD หรือกรอก `SOMJAIAD01\ชื่อผู้ใช้` ในกล่องที่เด้ง |
| เบราว์เซอร์เด้งกล่องขอ username/password เอง ทั้งที่ล็อกอินเครื่องด้วยบัญชี AD แล้ว | URL เป็นชื่อที่มีจุด หรือเป็นเลข IP → ตกไปโซน Internet | ดูหัวข้อ **4ข** · ตรวจด้วย `[System.Security.Policy.Zone]::CreateFromUrl('<url>').SecurityZone` ต้องได้ `Intranet` |
| เข้าแอปได้รอบแรก พอเปิดหน้าใหม่ถูกถามรหัสอีก | รอบแรกคือ "พิมพ์รหัสเอง" ไม่ใช่ SSO — โซนยังผิดอยู่ | เหมือนข้อบน · ดูใน IIS log ว่า `401.2` แล้วมีคำขอรอบสองพร้อมชื่อผู้ใช้ภายใน 1-2 วินาทีหรือไม่ |
| SAPWeb เด้งกลับหน้าล็อกอินทั้งที่กรอกถูก | ผู้ใช้ยังไม่ถูก map ใน `WEB_ADUser` | เพิ่มที่หน้า `usermap.php` ของแอป |
| "trust relationship with the primary domain failed" ตอนล็อกอิน | **บริการ Netlogon บนเครื่องนั้นหยุดทำงาน** | `Set-Service Netlogon -StartupType Automatic; Start-Service Netlogon` แล้ว `Test-ComputerSecureChannel` ต้องได้ True — **เช็กข้อนี้ก่อนคิดจะ rejoin โดเมนเสมอ** |
| พอร์ทัลบอก "อยู่นอกเครือข่าย" ทั้งที่ต่อ VPN แล้ว | VPN เป็น split tunnel หรือออกทาง WAN ที่ยังไม่ได้ลงทะเบียน | เปิด full tunnel ที่ Zyxel และเพิ่มชื่อ DynDNS ของ WAN นั้นในตั้งค่าองค์กร · ตรวจด้วย `https://api.ipify.org` |
| พอร์ทัลขึ้น "อีเมลนี้ผูกกับช่องทางเข้าสู่ระบบอื่น" | ผู้ใช้กดปุ่มล็อกอินผิดช่องทาง | กดปุ่ม "ออกจากระบบ แล้วเข้าใหม่" บนหน้านั้น แล้วเข้าด้วยช่องทางเดิม |
| หน้าเว็บบน IIS ตอบ 500 ไม่มีข้อความใด ๆ | ใส่ `<authentication>` ใน `web.config` โดยยังไม่ปลดล็อก section | `appcmd unlock config /section:...` ทั้ง anonymous และ windows |

---

## 8. ข้อห้าม

- **ห้ามใส่ค่า authentication ลงใน `web.config` ของโฟลเดอร์ osTicket** — ไฟล์นั้นใช้ร่วมกับไซต์เดิม จะกระทบผู้ใช้ทั้งหมดทันที
- **ห้ามเปิด Windows Auth ทับไซต์เดิมของ osTicket** (`192.168.0.250/osticket/`) คนที่ไม่มีบัญชี AD จะแจ้งปัญหาไม่ได้เลย
- **ห้ามเอา Anonymous ออกจาก** `pda` และ `api_*` ของ SAPWeb — เครื่อง PDA ในคลังจะใช้งานไม่ได้ทั้งหมด
- **ห้าม commit** ไฟล์ config ของระบบ 3rd party หรือไฟล์ที่มีรหัสผ่านเข้า repo สาธารณะ

---

## 8ก. ความเสี่ยงที่รับทราบแล้ว — LDAPS ของ Domain Controller หมดอายุ

**สถานะ (ตรวจจริง 9 ก.ย. 2569 โดยจับ TLS ที่พอร์ต 636)**

| DC | IP | ใบรับรองหมดอายุ |
|---|---|---|
| SV000ITD01 | 192.168.0.10 | 11 ก.ค. 2566 |
| SV000ITD12 | 192.168.31.19 | 11 ก.ค. 2566 |

- ผู้ออกใบรับรองคือ CA ภายใน `CN=SOMJAIAD01-SV000ITDXX-CA` เครื่อง `SV000ITDXX` = 192.168.99.113
  **เครื่องนั้นเข้าถึงไม่ได้แล้ว** (พอร์ต 135/445/443/80 ปิดหมด) — ถูกปลดระวางไปพร้อมผู้ดูแลระบบที่ลาออก
  จึงต่ออายุใบรับรองจาก CA เดิมไม่ได้
- **ไม่มีผลกับระบบที่ใช้งานอยู่** — ทุกระบบใช้ LDAP พอร์ต 389 · การเชื่อมต่อที่ Windows ทำเอง
  (Kerberos/NTLM) เข้ารหัสในตัวอยู่แล้ว

**จุดที่ยังเปิดความเสี่ยง:** ปลั๊กอิน LDAP ของ osTicket ยังเปิด "authentication of staff members" ไว้
ใครที่เลือกกรอก **รหัสผ่าน AD** ที่หน้าล็อกอินเดิม รหัสนั้นจะวิ่งแบบอ่านได้ (simple bind) ภายในวง LAN

**การตัดสินใจ 9 ก.ย. 2569: รับความเสี่ยงนี้ไว้ ยังไม่ปิด** — เป็นสภาพที่เป็นมา 2 ปีแล้ว
และการเข้าผ่าน SSO ไม่ได้ส่งรหัสผ่านเลย

**วิธีปิดเมื่อพร้อม (3 คลิก ไม่ต้องแก้โค้ด)**
1. `http://192.168.0.250/osticket/scp/plugins.php` → LDAP Authentication and Lookup → instance → Config
2. เอาติ๊ก **Enable authentication of staff members** ออก (คง Client ไว้)
3. Save Changes

**ก่อนปิดต้องรู้:** เจ้าหน้าที่ 9 คน มี 7 คนที่มีรหัสผ่านของ osTicket เอง (ไม่กระทบ)
อีก 2 คนคือ `Chokchai.Aun` และ `Vippawanee.Vid` ไม่มีรหัสผ่าน — ทั้งคู่ตกลงว่าจะใช้ SSO อย่างเดียว
เข้าที่ `http://osticket.somjaiad01.local/scp/` (ทดสอบผ่านแล้วสำหรับ Chokchai.Aun)

**ถ้าจะแก้ที่ต้นเหตุจริง ๆ** ต้องตั้ง AD CS ใหม่บนเซิร์ฟเวอร์ที่มีอยู่ แล้วให้ DC ออกใบรับรองใหม่
เป็นงานครึ่งวันถึงหนึ่งวัน และ **ต้องมีผู้รับผิดชอบดูแลต่อ** ไม่งั้นอีก 2 ปีจะหมดอายุซ้ำ

> **ประเด็นที่ใหญ่กว่าเรื่องใบรับรอง:** ปัจจุบันไม่มีผู้รับผิดชอบ Active Directory และ PKI
> ต่อจากผู้ดูแลระบบที่ลาออก ซึ่งกระทบทั้ง DC สองเครื่อง การสำรองข้อมูล การกู้คืน
> และการเปิด-ปิดบัญชีพนักงาน ควรเสนอผู้บริหารให้มอบหมายผู้รับผิดชอบชัดเจน

---

## 9. การตัดสินใจที่ตกลงกันแล้ว (อย่ารื้อโดยไม่ถาม)

- **AD เป็นตัวตนหลัก** ของทุกระบบ
- **ปล่อยผู้ใช้ที่มีแต่บัญชี Google ไว้ตามเดิม** ไม่ย้ายมา AD · เวลาจะเข้าระบบงานภายในให้กรอกบัญชี AD เองในกล่องของ Windows
- **ไม่ทำ account linking อัตโนมัติ** ในฐานข้อมูลพอร์ทัล (มี migration เขียนไว้แล้วแต่ตั้งใจไม่รัน)
- **ไม่บังคับ** ให้เครื่องผู้ดูแลเปลี่ยนไปล็อกอินด้วยบัญชี AD
- **Knowledge Base เปิดให้ทุกบัญชี AD อ่านได้ ไม่จำกัดเฉพาะสมาชิกกลุ่ม `SSO-Portal-Users`**
  ตกลงไว้ 24 ก.ย. 2569 · ตอนนั้น AD มีบัญชีที่เปิดใช้งาน 282 บัญชี อยู่ในกลุ่มพอร์ทัล 250 บัญชี
  อีก 32 บัญชี (รวมบัญชีระบบอย่าง `Administrator` และ `itadmin`) จึงอ่าน Knowledge Base ได้ด้วย
  ถือว่ารับความเสี่ยงนี้ไว้โดยตั้งใจ เพราะเนื้อหาที่ต้องปกปิดถูกกั้นไว้ที่ระดับเอกสารอยู่แล้ว
  **ถ้าวันหนึ่งต้องการจำกัด** ให้เพิ่มเงื่อนไขในโค้ดของ Auth0 Action `BookStack Groups`
  ให้ปฏิเสธผู้ที่ไม่มี `SSO-Portal-Users` อยู่ในรายชื่อกลุ่ม

---

## 10. งานที่ยังค้าง

| งาน | สถานะ |
|---|---|
| ทำ HTTPS ให้ระบบภายใน (SSO-OPS-002) | พักไว้ — ระหว่างนี้พอร์ทัลใช้การตรวจ IP แทน |
| LDAPS ของ Domain Controller | ใบรับรองหมดอายุตั้งแต่ 2566 — เป็นงานของทีม PKI |
| VPN L2TP | ต่อไม่ติด เลิกใช้แล้ว ใช้ SSL VPN แทน |
| คนที่ไม่มีบัญชี AD | ใช้ระบบงานภายในไม่ได้ ต้องสร้างบัญชี AD ให้ก่อนถ้าจำเป็น |
| GPO `Intranet Zone - somjaiad01.local` | **ยังไม่ได้สร้าง** — ตอนนี้แก้ไว้ที่เครื่อง `LT000ITD20` เครื่องเดียวเพื่อพิสูจน์ว่าได้ผล ต้องสร้าง GPO เพื่อให้ครอบคลุมทุกเครื่อง (คำสั่งอยู่ในหัวข้อ 4ข) |
