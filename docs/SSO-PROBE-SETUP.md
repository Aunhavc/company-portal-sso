# ตัวตรวจสุขภาพ SSO อัตโนมัติ — วิธีติดตั้งครั้งเดียวจบ

จัดทำ 2 พฤศจิกายน 2569 · รหัสเอกสาร SSO-OPS-003

> **ทำไมต้องมี** — ตั้งแต่เปิดใช้งานมา พนักงานแจ้งว่าล็อกอินไม่ได้ 3 ครั้ง และทั้งสามครั้ง
> **สาเหตุคนละเรื่องกันหมด** (นาฬิกาสองฝั่งเพี้ยน · กรอกชื่อผู้ใช้ผิดรูปแบบ · ไปโผล่ฟอร์มของ
> connection ที่ไม่ได้ใช้) ทุกครั้งต้องไล่หาสาเหตุใหม่ตั้งแต่ต้น เสียเวลาและรู้ช้ากว่าพนักงาน
> เอกสารนี้ทำให้ระบบบอกเราเองว่าพังตรงไหน **ก่อน** ที่จะมีใครโทรมา

---

## ตัวตรวจทำอะไร

รันบน GitHub Actions ของรีโปนี้ทุก 15 นาที — อยู่นอกองค์กร จึงจับได้แม้ตอนเน็ตหรือเครื่องในบ้านล่ม

| ด่าน | ตรวจอะไร | จับอาการแบบไหน |
|---|---|---|
| 1 | เรียก `/authorize?connection=somjai-ad` แล้วดูว่าได้ฟอร์มที่มีช่อง username/password | connection ถูกปิด หรือหลุดจากแอป |
| 2 | **ล็อกอินจริง** ด้วยบัญชี AD สำหรับทดสอบ ผ่าน Auth0 → คอนเนกเตอร์ → DC | คอนเนกเตอร์ล่ม · websocket หลุด · bind ไม่ได้ · ใบรับรองหมดอายุ |
| 3 | เอา access token ที่ได้ไปเรียก Supabase | นาฬิกาสองฝั่งเพี้ยนแบบ 7 ก.ย. 2569 ที่ทำให้ทุกคนเข้าไม่ได้ |

**ถ้าด่านใดไม่ผ่าน** job จะล้ม GitHub ส่งอีเมลหาเจ้าของรีโปเอง และในบันทึกของ job
จะมี **log 15 รายการล่าสุดของ Auth0** แปะมาให้ด้วย จึงรู้สาเหตุในข้อความเดียวไม่ต้องไปเปิดแดชบอร์ด

ไฟล์ที่เกี่ยวข้อง — `scripts/sso-probe.mjs` และ `.github/workflows/sso-probe.yml`

---

## ขั้นที่ 1 — สร้างบัญชี AD สำหรับทดสอบ

ห้ามใช้บัญชีพนักงานจริง เพราะรหัสผ่านจะต้องเก็บไว้ในระบบและห้ามหมดอายุ

```powershell
$ca = Get-Credential SOMJAIAD01\administrator
Invoke-Command -ComputerName SV000ITD01.SOMJAIAD01.LOCAL -Credential $ca -ScriptBlock {
  Import-Module ActiveDirectory
  $pw = Read-Host -AsSecureString 'รหัสผ่านของ svc.ssoprobe'
  New-ADUser -Name 'SSO Probe' -SamAccountName 'svc.ssoprobe' `
    -UserPrincipalName 'svc.ssoprobe@somjaiad01.local' `
    -AccountPassword $pw -Enabled $true -PasswordNeverExpires $true `
    -Description 'บัญชีสำหรับตัวตรวจสุขภาพ SSO — ห้ามใช้ล็อกอินจริง' `
    -EmailAddress 'svc.ssoprobe@somjaibiz.co.th'
  Add-ADGroupMember -Identity 'SSO-Portal-Users' -Members 'svc.ssoprobe'
}
```

**เหตุผลของแต่ละค่า**

- `PasswordNeverExpires` — นโยบายโดเมนบังคับเปลี่ยนรหัสทุก 90 วัน (ตรวจเมื่อ 2 พ.ย. 2569)
  ถ้าไม่ตั้งค่านี้ ตัวตรวจจะพังเองทุก 90 วันโดยที่ระบบไม่ได้มีปัญหาอะไร
- **ต้องอยู่ในกลุ่ม `SSO-Portal-Users`** ไม่งั้น Auth0 Action จะปฏิเสธตั้งแต่ก่อนออกโทเคน
  ตัวตรวจจะรายงานว่าพังทั้งที่ระบบปกติ
- **ต้องมีอีเมล** เพราะพอร์ทัลใช้อีเมลเป็นกุญแจในตาราง `profiles`

> ⚠️ **นโยบายล็อกบัญชีของโดเมนคือกรอกผิด 3 ครั้ง ล็อก 15 นาที** (ตรวจเมื่อ 2 พ.ย. 2569)
> ตัวตรวจจึง **ปิด schedule ของตัวเองทันที** เมื่อเจอว่ารหัสผ่านใช้ไม่ได้ เพื่อไม่ให้รันซ้ำจนบัญชีถูกล็อก
> เปิดกลับด้วย `gh workflow enable sso-probe.yml` หลังแก้รหัสใน Secrets แล้ว

---

## ขั้นที่ 2 — สร้างแอปใน Auth0 สำหรับตัวตรวจ

**ห้ามเปิด password grant ที่แอปของพอร์ทัล** ให้สร้างแอปใหม่แยกไว้ เพื่อให้ช่องทางนี้
จำกัดอยู่แค่แอปตัวนี้ ถ้าวันหนึ่งต้องปิด ก็ปิดได้โดยไม่กระทบพนักงาน

1. เปิด `https://manage.auth0.com/dashboard/us/dev-j3byu1ifa062ozvk/applications`
2. กด **Create Application** มุมขวาบน
3. ช่อง **Name** ใส่ `SSO Probe` · เลือกประเภท **Machine to Machine Applications** → **Create**
4. หน้าถัดไปให้เลือก API — เลือก **Somjai Portal API** (audience `https://api.company.local`)
   แล้วกด **Authorize** โดยไม่ต้องติ๊ก scope ใดเลย
5. ไปแท็บ **Settings** ของแอปนี้ เลื่อนลงสุด กด **Advanced Settings** → แท็บ **Grant Types**
   ติ๊ก **Password** เพิ่ม (ของเดิมที่ติ๊กอยู่ไม่ต้องเอาออก) แล้วกด **Save Changes**
6. ยังอยู่แท็บ Settings ให้คัดลอก **Client ID** และ **Client Secret** เก็บไว้ใส่ใน GitHub

**ตั้ง connection เริ่มต้นของ tenant** เพื่อให้ grant นี้ยิงไปที่ AD ได้

7. ไปที่ **Settings** ของ tenant `https://manage.auth0.com/dashboard/us/dev-j3byu1ifa062ozvk/tenant`
8. แท็บ **General** หัวข้อ **API Authorization Settings** ช่อง **Default Directory**
   ใส่ `somjai-ad` แล้วกด **Save**
   ถ้าไม่ตั้งค่านี้ Auth0 จะตอบ `unsupported_credential_type` หรือ `invalid_request`

---

## ขั้นที่ 3 — สร้างแอป Machine-to-Machine สำหรับอ่าน log

เพื่อให้ตัวตรวจแปะสาเหตุมาให้ในรายงาน และให้ผู้ดูแลอ่าน log ได้โดยไม่ต้องเปิดแดชบอร์ด

1. หน้า **Applications** → **Create Application** → ชื่อ `SSO Log Reader`
   → ประเภท **Machine to Machine Applications** → **Create**
2. เลือก API ชื่อ **Auth0 Management API**
3. ช่องค้นหา permission พิมพ์ `read:logs` แล้วติ๊กเฉพาะ **`read:logs`** กับ **`read:logs_users`**
   **ห้ามติ๊กอย่างอื่น** แอปนี้ไม่ควรมีสิทธิ์แก้ไขอะไรเลย
4. กด **Authorize** แล้วคัดลอก **Client ID** / **Client Secret** จากแท็บ Settings

---

## ขั้นที่ 4 — ใส่ค่าใน GitHub Secrets

เปิด `https://github.com/Aunhavc/company-portal-sso/settings/secrets/actions`
กด **New repository secret** แล้วใส่ทีละตัวตามตารางนี้

| ชื่อ secret | ค่า |
|---|---|
| `AUTH0_DOMAIN` | `dev-j3byu1ifa062ozvk.us.auth0.com` |
| `AUTH0_AUDIENCE` | `https://api.company.local` |
| `AUTH0_AD_REALM` | `somjai-ad` |
| `AUTH0_PORTAL_CLIENT_ID` | `ZcdkFTwgGdUlqz8ioSO34SDuziudy9PW` |
| `AUTH0_PROBE_CLIENT_ID` | Client ID ของแอป `SSO Probe` |
| `AUTH0_PROBE_CLIENT_SECRET` | Client Secret ของแอป `SSO Probe` |
| `AUTH0_PROBE_USERNAME` | `svc.ssoprobe` — **ชื่อเปล่า ๆ ห้ามใส่ `somjaiad01\` นำหน้า** |
| `AUTH0_PROBE_PASSWORD` | รหัสผ่านของ `svc.ssoprobe` |
| `AUTH0_MGMT_CLIENT_ID` | Client ID ของแอป `SSO Log Reader` |
| `AUTH0_MGMT_CLIENT_SECRET` | Client Secret ของแอป `SSO Log Reader` |
| `SUPABASE_URL` | `https://qgejyuifktbijcyjwcmx.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key ของโปรเจกต์พอร์ทัล |

ค่าเหล่านี้มองไม่เห็นในหน้าเว็บและไม่ปรากฏในบันทึกของ job (GitHub ปิดบังให้อัตโนมัติ)

---

## ขั้นที่ 5 — ทดลองรันด้วยมือก่อน

อย่ารอให้ schedule รันเอง ให้สั่งรันทันทีเพื่อดูว่าค่าครบ

1. เปิด `https://github.com/Aunhavc/company-portal-sso/actions/workflows/sso-probe.yml`
2. กดปุ่ม **Run workflow** ด้านขวา → เลือก branch `main` → กด **Run workflow** สีเขียว
3. รอราว 1 นาที แล้วกดเข้าไปดูผล ควรเห็นสามบรรทัดนี้

```
ผ่าน   ฟอร์มล็อกอินของ AD — 420 ms
ผ่าน   ล็อกอินด้วยบัญชี AD — svc.ssoprobe · 1120 ms
ผ่าน   Supabase รับโทเคน — 310 ms

สรุป: ผ่าน 3/3 ด่าน
```

**ถ้าด่านที่ 2 ไม่ผ่าน** ให้ดูข้อความต่อท้าย

| ข้อความ | ความหมาย | แก้ที่ |
|---|---|---|
| `unauthorized_client` | ยังไม่ได้ติ๊ก Password ใน Grant Types | ขั้นที่ 2 ข้อ 5 |
| `unsupported_credential_type` หรือ `invalid_request` | ยังไม่ได้ตั้ง Default Directory | ขั้นที่ 2 ข้อ 8 |
| `invalid_grant` | ชื่อผู้ใช้หรือรหัสผ่านไม่ถูก (หรือใส่ `somjaiad01\` นำหน้า) | Secrets ขั้นที่ 4 |
| `access_denied` พร้อมข้อความไทย | บัญชีไม่อยู่ในกลุ่ม `SSO-Portal-Users` | ขั้นที่ 1 |

---

## เวลาได้อีเมลแจ้งว่าพัง ให้ดูอะไร

อีเมลจาก GitHub จะมีลิงก์ไปหน้า job — เปิดแล้วอ่านจากบนลงล่าง

1. **บรรทัด `ไม่ผ่าน`** บอกว่าพังด่านไหน ซึ่งบอกชั้นของปัญหาได้ทันที
2. **ตาราง log ของ Auth0** ท้ายรายงาน คอลัมน์ `connection` สำคัญที่สุด
   - เป็น `somjai-ad` → ไปถึง AD แล้ว ปัญหาอยู่ที่บัญชีหรือกลุ่ม
   - เป็น `Username-Password-Authentication` → **กรอกผิดฟอร์ม** ไม่ใช่ระบบพัง
   - ไม่มี log เลย → คำขอไปไม่ถึง Auth0 เลย ให้ดูที่ตัวพอร์ทัลหรือเครือข่าย
3. ถ้าต้องดูลึกกว่านั้น log ของคอนเนกเตอร์อยู่ที่
   `C:\Program Files (x86)\Auth0\AD LDAP Connector\logs.log` บน `SV000ITD36-X`
   ซึ่งเขียนเหตุผลเป็นภาษาคนตรง ๆ เช่น `Reason: wrong username`

---

## ค่าใช้จ่ายและข้อจำกัด

- GitHub Actions ของรีโปสาธารณะ **ใช้ได้ไม่จำกัดและไม่มีค่าใช้จ่าย**
- GitHub อาจเลื่อน schedule ให้ช้ากว่า 15 นาทีได้ในช่วงที่มีงานเยอะทั้งระบบ
  ตัวตรวจนี้ใช้เฝ้าระบบ ไม่ได้ใช้วัด SLA จึงยอมรับได้
- ตัวตรวจนี้ยืนยันว่า **ระบบ** ทำงาน ไม่ได้ยืนยันว่าพนักงานคนใดคนหนึ่งเข้าได้
  ถ้าตัวตรวจผ่านแต่มีคนเข้าไม่ได้ ให้ไล่ที่ตัวบัญชีนั้น — ดูหัวข้อ "เวลาได้อีเมลแจ้ง" ข้อ 2
