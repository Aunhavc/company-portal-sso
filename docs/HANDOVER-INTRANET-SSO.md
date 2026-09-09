# เอกสารส่งมอบ — SSO ของระบบงานภายใน (Intranet SSO)

สำหรับผู้ดูแลระบบคนใหม่ที่มารับช่วงต่อ · ปรับปรุง 9 กันยายน 2569

อ่านหน้านี้หน้าเดียวจบ ถ้าต้องลงรายละเอียดค่อยตามลิงก์ท้ายหัวข้อ

---

## 1. ภาพรวมใน 30 วินาที

พนักงานล็อกอิน **Company Portal** ครั้งเดียว แล้วกดการ์ดเข้าระบบงานได้เลย

ระบบงานภายในไม่ได้ต่อกับ Auth0 แต่ใช้ **Windows Authentication ของ IIS** แทน
คือให้เว็บเซิร์ฟเวอร์บอก "คุณคือใคร" จากบัญชีที่ผู้ใช้ล็อกอินเข้าเครื่องอยู่แล้ว
พนักงานจึงไม่ต้องกรอกรหัสซ้ำ

> **เงื่อนไขเดียวที่ต้องจำ: เครื่องพนักงานต้องล็อกอินวินโดวส์ด้วยบัญชี AD**
> เครื่องที่ล็อกอินด้วยบัญชี local จะเจอกล่องขอรหัสเสมอ — ไม่ใช่ระบบพัง

---

## 2. รายการของทั้งหมด

| ระบบ | URL ที่การ์ดชี้ไป | เซิร์ฟเวอร์ | วิธีทำ SSO |
|---|---|---|---|
| Company Portal | https://company-portal-sso.vercel.app | Vercel | Auth0 (AD / Google) |
| SAP on Web | `http://sv000itd24/Sale/SAPWeb/` | `SV000ITD24` (192.168.0.24) | Windows Auth → โค้ดแอปอ่าน `AUTH_USER` เอง |
| osTicket | `http://osticket.somjaiad01.local/login.php` | `SV000ITDZZ` (192.168.0.250) | Windows Auth → ปลั๊กอิน HTTP Passthru |

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
foreach ($u in 'http://sv000itd24/Sale/SAPWeb/','http://osticket.somjaiad01.local/') {
  try { $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 10; "$u -> $($r.StatusCode)" }
  catch { "$u -> " + $_.Exception.Response.StatusCode.value__ + " " + $_.Exception.Response.Headers['WWW-Authenticate'] }
}

# 2) ทางเข้าเดิมของ osTicket ต้องยังเปิด Anonymous (ต้องได้ 200)
(Invoke-WebRequest 'http://192.168.0.250/osticket/' -UseBasicParsing).StatusCode

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

## 9. การตัดสินใจที่ตกลงกันแล้ว (อย่ารื้อโดยไม่ถาม)

- **AD เป็นตัวตนหลัก** ของทุกระบบ
- **ปล่อยผู้ใช้ที่มีแต่บัญชี Google ไว้ตามเดิม** ไม่ย้ายมา AD · เวลาจะเข้าระบบงานภายในให้กรอกบัญชี AD เองในกล่องของ Windows
- **ไม่ทำ account linking อัตโนมัติ** ในฐานข้อมูลพอร์ทัล (มี migration เขียนไว้แล้วแต่ตั้งใจไม่รัน)
- **ไม่บังคับ** ให้เครื่องผู้ดูแลเปลี่ยนไปล็อกอินด้วยบัญชี AD

---

## 10. งานที่ยังค้าง

| งาน | สถานะ |
|---|---|
| ทำ HTTPS ให้ระบบภายใน (SSO-OPS-002) | พักไว้ — ระหว่างนี้พอร์ทัลใช้การตรวจ IP แทน |
| LDAPS ของ Domain Controller | ใบรับรองหมดอายุตั้งแต่ 2566 — เป็นงานของทีม PKI |
| VPN L2TP | ต่อไม่ติด เลิกใช้แล้ว ใช้ SSL VPN แทน |
| คนที่ไม่มีบัญชี AD | ใช้ระบบงานภายในไม่ได้ ต้องสร้างบัญชี AD ให้ก่อนถ้าจำเป็น |
