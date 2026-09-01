# ทำเว็บ Intranet บน IIS ให้เป็น HTTPS

เอกสารเลขที่ SSO-OPS-002 · สำหรับเซิร์ฟเวอร์ Windows Server + IIS ที่อยู่ในเครือข่ายภายใน

> **ทำไมต้องทำ:** พอร์ทัลกลางให้บริการผ่าน HTTPS หากระบบภายในเป็น HTTP
> เบราว์เซอร์จะปิดกั้นการตรวจสถานะตามนโยบาย Mixed Content ทำให้ป้ายสถานะบนการ์ด
> ขึ้นว่า "ตรวจสอบไม่ได้" ตลอดเวลา และโทเคนการยืนยันตัวตนจะวิ่งเป็นข้อความธรรมดาในวง LAN

---

## 1. เลือกแนวทาง

| แนวทาง | เหมาะกับ | ข้อจำกัด |
|---|---|---|
| **A. Let's Encrypt + DNS-01** ⭐ | ทุกองค์กรที่มีโดเมนของตัวเอง | ต้องเข้าถึงระบบจัดการ DNS ได้ |
| B. ใบรับรองจาก AD CS ภายใน | องค์กรที่มี Active Directory Certificate Services | ใช้ไม่ได้กับเครื่องที่ไม่ได้เข้าโดเมน เช่น มือถือ เครื่องส่วนตัว |
| C. ซื้อใบรับรองเชิงพาณิชย์ | องค์กรที่มีนโยบายต้องซื้อ | มีค่าใช้จ่ายรายปี ต้องต่ออายุเอง |

เอกสารนี้อธิบายแนวทาง **A** ซึ่งฟรี ต่ออายุอัตโนมัติ และเบราว์เซอร์ทุกตัวเชื่อถือทันที

---

## 2. สิ่งที่ต้องเตรียม

| # | รายการ | หมายเหตุ |
|---|---|---|
| 1 | ชื่อโดเมนสาธารณะ เช่น `erp.company.com` | ใช้โดเมนที่บริษัทมีอยู่แล้วได้ |
| 2 | ตั้ง DNS A record ชี้ไปยัง **private IP** ของเซิร์ฟเวอร์ | เช่น `erp.company.com → 192.168.0.50` ทำได้ปกติ ไม่ผิดหลักการ |
| 3 | สิทธิ์เข้าระบบจัดการ DNS ของโดเมน | ใช้สร้าง TXT record ตอนขอใบรับรอง |
| 4 | สิทธิ์ Administrator บนเซิร์ฟเวอร์ IIS | |

> **ไม่ต้องเปิดพอร์ตจากอินเทอร์เน็ตเข้ามาที่เซิร์ฟเวอร์**
> วิธี DNS-01 พิสูจน์ความเป็นเจ้าของโดเมนผ่าน DNS ไม่ใช่ผ่านการเรียกเว็บ
> เซิร์ฟเวอร์จึงยังคงอยู่หลังไฟร์วอลล์ตามเดิม

---

## 3. ขั้นตอนติดตั้ง

### 3.1 ตั้ง DNS

ที่ระบบจัดการ DNS ของโดเมนบริษัท เพิ่ม A record

```
erp.company.com.    A    192.168.0.50
```

ตรวจว่าตั้งถูกด้วยคำสั่งนี้บนเครื่องในวง LAN

```powershell
Resolve-DnsName erp.company.com
```

ต้องได้ IP ภายในกลับมา

### 3.2 ดาวน์โหลด win-acme

เครื่องมือมาตรฐานสำหรับขอใบรับรอง Let's Encrypt บน Windows ทำงานร่วมกับ IIS โดยตรง

```powershell
# รันบนเซิร์ฟเวอร์ IIS ด้วยสิทธิ์ Administrator
$dest = 'C:\win-acme'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$url = 'https://github.com/win-acme/win-acme/releases/latest/download/win-acme.v2.2.9.1701.x64.pluggable.zip'
Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\wacs.zip" -UseBasicParsing
Expand-Archive "$env:TEMP\wacs.zip" -DestinationPath $dest -Force
cd $dest
```

> หากลิงก์ไม่ตรง ให้ดูเวอร์ชันล่าสุดที่ https://github.com/win-acme/win-acme/releases
> เลือกไฟล์ที่ลงท้ายด้วย `x64.pluggable.zip` (ต้องเป็น pluggable จึงจะมีปลั๊กอิน DNS)

### 3.3 ขอใบรับรอง

```powershell
.\wacs.exe
```

ตอบตามลำดับนี้

| ขั้น | เลือก |
|---|---|
| เมนูหลัก | `M` — Create certificate (full options) |
| แหล่งที่มา | `2` — Manual input |
| ชื่อโฮสต์ | `erp.company.com` |
| วิธียืนยันตัวตน | เลือก **DNS** แล้วเลือกปลั๊กอินตามผู้ให้บริการ DNS ของคุณ |
| การเก็บใบรับรอง | Windows Certificate Store |
| การติดตั้ง | **IIS** แล้วเลือกเว็บไซต์ที่ต้องการผูก |

**ปลั๊กอิน DNS ที่รองรับ** — Cloudflare, Azure DNS, Route53, DigitalOcean, GoDaddy และอื่น ๆ
หากผู้ให้บริการ DNS ไม่มีในรายการ ให้เลือก **Manual DNS** แล้วสร้าง TXT record เองตามที่โปรแกรมบอก
(วิธี Manual ต้องทำมือทุกครั้งที่ต่ออายุ ทุก 60 วัน — ควรใช้ปลั๊กอินอัตโนมัติถ้าทำได้)

### 3.4 ตรวจการผูกใน IIS

```powershell
Import-Module WebAdministration
Get-WebBinding -Name '<ชื่อเว็บไซต์>' | Select-Object protocol, bindingInformation
```

ต้องเห็นบรรทัดที่มี `https` และพอร์ต `443`

### 3.5 บังคับให้ใช้ HTTPS เสมอ

เพิ่มใน `web.config` ของเว็บไซต์ เพื่อพาผู้ใช้ที่เข้าทาง HTTP ไปยัง HTTPS อัตโนมัติ

```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Redirect to HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="^OFF$" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

> ต้องติดตั้งโมดูล **URL Rewrite** ของ IIS ก่อน (ดาวน์โหลดฟรีจาก Microsoft)

### 3.6 การต่ออายุอัตโนมัติ

win-acme สร้าง Scheduled Task ให้เองตอนติดตั้ง ตรวจได้ด้วย

```powershell
Get-ScheduledTask -TaskName '*win-acme*' | Select-Object TaskName, State
```

ใบรับรองมีอายุ 90 วัน โปรแกรมจะต่ออายุให้อัตโนมัติเมื่อเหลือ 30 วัน

---

## 4. ตรวจรับ

| # | รายการตรวจ | ผลที่ต้องได้ |
|---|---|---|
| 1 | เปิด `https://erp.company.com` จากเครื่องในวง LAN | เปิดได้ ไม่มีคำเตือนเรื่องใบรับรอง |
| 2 | เปิด `http://erp.company.com` | ถูกพาไปยัง HTTPS อัตโนมัติ |
| 3 | เปิด `https://erp.company.com/ping.php` | ได้ JSON กลับมา |
| 4 | กดไอคอนกุญแจบนแถบที่อยู่ | ใบรับรองออกโดย Let's Encrypt และยังไม่หมดอายุ |
| 5 | เปิดจากมือถือที่ต่อ VPN | เปิดได้ ไม่มีคำเตือน |
| 6 | ตรวจ Scheduled Task | มีงานต่ออายุอัตโนมัติและสถานะ Ready |

---

## 5. หลังทำ HTTPS เสร็จ

### 5.1 อัปเดตรายการแอปบนพอร์ทัล

เข้าหน้า **จัดการแอป** แล้วแก้รายการของระบบนี้

| ช่อง | ค่าใหม่ |
|---|---|
| URL ปลายทาง | `https://erp.company.com/dashboard.php` |
| URL สำหรับเข้าผ่าน SSO | `https://erp.company.com/auth-callback.php` |
| URL ตรวจสอบสถานะ | `https://erp.company.com/ping.php` |

กดปุ่ม **ทดสอบ** ข้างช่องตรวจสอบสถานะ ต้องขึ้นว่าเชื่อมต่อได้

### 5.2 อัปเดต Auth0

เข้า Auth0 → Applications → แอปของระบบนี้ → แก้ให้เป็น `https://` ทั้งหมด

- Allowed Callback URLs → `https://erp.company.com/auth-callback.php`
- Allowed Logout URLs → `https://erp.company.com/`

### 5.3 เปิดคุกกี้แบบปลอดภัย

เมื่อเป็น HTTPS แล้ว คุกกี้เซสชันจะตั้ง `Secure` ได้อัตโนมัติ
โค้ดในสเปก SSO-VND-002 ใช้ `'cookie_secure' => !empty($_SERVER['HTTPS'])` อยู่แล้ว
จึงเปลี่ยนเองโดยไม่ต้องแก้อะไร — แต่ควรตรวจว่า IIS ส่งตัวแปร `HTTPS` มาถูกต้อง

---

## 6. ระหว่างที่ยังไม่ได้ทำ HTTPS

ยังทำ SSO ต่อได้ เพราะการกดลิงก์จากพอร์ทัลไปยังหน้า HTTP เป็นการเปลี่ยนหน้าทั้งหน้า
ซึ่งเบราว์เซอร์ไม่ปิดกั้น แต่ต้องยอมรับข้อจำกัดเหล่านี้

| ผลกระทบ | รายละเอียด |
|---|---|
| ป้ายสถานะไม่ทำงาน | **ให้เว้นช่อง "URL ตรวจสอบสถานะ" ว่างไว้** มิฉะนั้นการ์ดจะขึ้นป้ายเหลืองตลอดเวลา ดูเหมือนระบบเสีย |
| ความปลอดภัยลดลง | authorization code, โทเคน และคุกกี้เซสชันวิ่งเป็นข้อความธรรมดาในวง LAN |
| คุกกี้ตั้ง Secure ไม่ได้ | เพิ่มความเสี่ยงต่อการถูกขโมยเซสชัน |

ถือเป็นการยอมรับความเสี่ยงชั่วคราว ควรกำหนดกรอบเวลาแล้วเสร็จของการทำ HTTPS ให้ชัดเจน
