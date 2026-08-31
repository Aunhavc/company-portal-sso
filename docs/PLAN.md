# แผน Implement ระบบ Hybrid SSO (Vercel + Supabase + Auth0 + PHP Intranet)

อ้างอิงจาก `sso-project.docx` — ต้นฉบับเป็น Deployment Guide ระดับแนวคิด
เอกสารนี้คือแผนลงมือจริง พร้อมจุดที่ต้องแก้จากต้นฉบับ

---

## 1. สถาปัตยกรรม

```
                     ┌──────────────────────┐
                     │      Auth0 (IdP)     │  ตัวตนกลางจุดเดียว
                     │  App#1  SPA  Portal  │
                     │  App#2  RWA  PHP     │
                     │  API    (audience)   │
                     └───┬──────────────┬───┘
           OIDC + PKCE   │              │  OIDC (code + client secret)
                         │              │
   ┌─────────────────────▼──┐      ┌────▼───────────────────────┐
   │  Portal SPA (Vercel)   │      │  PHP Intranet (ในบริษัท)   │
   │  Vite + React + TS     │      │  Vanilla PHP + auth0-php   │
   │  · ทะเบียนแอป           │      │  · auth-callback.php       │
   │  · ประกาศข่าวสาร        │─ping▶│  · auth-middleware.php     │
   │  · ตรวจสถานะ VPN        │      │  · ping.php (CORS)         │
   └───────────┬────────────┘      └────┬───────────────────────┘
   JWT RS256   │                        │ PDO
   (aud = API) │                        ▼
   ┌───────────▼────────────┐      ┌────────────────────────────┐
   │  Supabase (Postgres)   │      │  MySQL / SQL Server เดิม    │
   │  profiles              │      │  employees + auth0_id      │
   │  apps          + RLS   │      └────────────────────────────┘
   │  announcements         │
   └────────────────────────┘
```

**หลักการ:** Auth0 เป็นเจ้าของตัวตน · Supabase บังคับสิทธิ์ด้วย RLS ที่อ่าน JWT ของ Auth0 โดยตรง
(Third-Party Auth) · PHP แมป `auth0_id` เข้ากับพนักงานเดิม · หน้า Portal ไม่ hardcode รายการแอป
แต่อ่านจากตาราง `apps` ที่แก้ได้จากหน้า Admin

---

## 2. จุดที่แก้จากเอกสารต้นฉบับ (สำคัญ)

| # | ต้นฉบับ | ปัญหาจริง | สิ่งที่ทำในชุดนี้ |
|---|---|---|---|
| 1 | ตาราง Supabase ไม่มี RLS | anon key เปิดเผยใน bundle → ใครก็อ่าน/เขียนทั้งตารางได้ | เปิด RLS ทุกตาราง + policy ผูกกับ `auth.jwt() ->> 'sub'` |
| 2 | ให้ client `insert` ลง `profiles` เอง | client ปลอม `id`/`role` ได้ → ยกตัวเองเป็น admin | RPC `sync_profile()` (SECURITY DEFINER) อ่าน sub/email จาก JWT เอง + trigger กันแก้ `role` |
| 3 | ต่อ Supabase ด้วย anon key เฉย ๆ | Supabase ไม่รู้จัก user ของ Auth0 → RLS ใช้ไม่ได้ | เปิด **Third-Party Auth = Auth0** + ส่ง access token ผ่าน `accessToken()` callback |
| 4 | `fetch('http://<ip>')` จากหน้า HTTPS | **Mixed Content** เบราว์เซอร์บล็อกถาวร → ขึ้น "ตัดการเชื่อมต่อ" ตลอดแม้ต่อ VPN แล้ว | ต้องทำ intranet เป็น HTTPS (เฟส 5) และโค้ดตรวจจับเคสนี้แยกเป็นสถานะ `blocked` พร้อมอธิบายสาเหตุ |
| 5 | `mode:'no-cors'` อย่างเดียว | อ่าน response ไม่ได้ แยกไม่ออกว่าเซิร์ฟเวอร์ตอบจริงไหม | ยิงแบบ CORS ปกติก่อน (ping.php ส่ง header ให้) แล้ว fallback เป็น no-cors |
| 6 | `Access-Control-Allow-Origin: *` | เว็บใดก็ได้ใช้เครื่องพนักงานสำรวจเครือข่ายภายใน | allowlist origin เฉพาะโดเมน Portal |
| 7 | PHP เรียก `getCredentials()` ทันที | **บั๊ก** ไม่ได้เรียก `exchange()` → วนลูป login ไม่จบ | เรียก `$auth0->exchange()` เมื่อมี `?code=&state=` |
| 8 | `redirectUri => 'http://1.xx'` | ต้องเป็น URL ของ `auth-callback.php` เป๊ะ ๆ | อ่านจาก config เป็น path เต็ม |
| 9 | จับคู่บัญชีเดิมด้วย email ทันที | **ยึดบัญชีได้** ถ้า tenant เปิดสมัครเอง/social login | บังคับ `email_verified` + จำกัดโดเมนอีเมลก่อนผูก |
| 10 | สร้างพนักงานใหม่อัตโนมัติ | คนนอกที่สมัคร Auth0 ได้ = มีสิทธิ์ใน ERP ทันที | `autoProvision` ปิดเป็นค่าตั้งต้น |
| 11 | hardcode credential ในไฟล์ PHP | หลุดเข้า git | ย้ายไป `config.php` (gitignore) |
| 12 | ไม่มี logout | ออกจาก PHP แล้วเซสชัน Auth0 ยังอยู่ | `logout.php` ทำ RP-initiated logout |
| 13 | รายการแอปเขียนตายใน prompt (Card A / Card B) | เพิ่มแอปใหม่ต้องแก้โค้ดและ deploy ใหม่ทุกครั้ง | **ตาราง `apps` + หน้า Admin เพิ่ม/แก้/ซ่อนได้เอง** |
| 14 | ไม่มีการควบคุมสิทธิ์รายแอป | พนักงานทั่วไปเห็นระบบผู้ดูแล | `allowed_roles` ต่อแอป บังคับทั้งที่ UI และ RLS |

---

## 3. ลำดับงาน

### เฟส 0 — Auth0 (ทำก่อนทุกอย่าง)
ดูรายละเอียดทุกช่องที่ `docs/AUTH0-SETUP.md`
1. สร้าง tenant · 2. สร้าง App#1 (SPA) และ App#2 (Regular Web App)
3. สร้าง **API** (audience) — ต้นฉบับไม่มี แต่จำเป็นสำหรับข้อ 2.3
4. เพิ่ม **Post-Login Action** ใส่ claim `role = 'authenticated'`
5. ปิดการสมัครเอง + เปิด Attack Protection (+ MFA ถ้าต้องการ)

### เฟส 1 — Supabase
1. สร้างโปรเจกต์ (region สิงคโปร์)
2. SQL Editor → รัน `supabase/migrations/0001_init.sql` แล้ว `0002_seed.sql`
3. Authentication → Sign In / Providers → **Third Party Auth → Auth0** ใส่ domain
4. Project Settings → API → เก็บ `Project URL` + `anon public key`
5. ล็อกอิน Portal หนึ่งครั้ง แล้วรัน `0003_make_admin.sql` (แก้อีเมลก่อน)

### เฟส 2 — Portal (โฟลเดอร์ `web/`)
```bash
cd web
npm install
npm run dev          # เปิดใช้งานได้ทันทีในโหมดสาธิต
cp .env.example .env # แล้วเติมค่าจริงเพื่อสลับเป็นโหมดจริง
```
เพิ่ม `http://localhost:5173` ใน Auth0 App#1 → Allowed Callback / Logout / Web Origins

### เฟส 3 — Deploy ขึ้น Vercel
```bash
cd web
vercel link
vercel env add VITE_AUTH0_DOMAIN      # ทำซ้ำให้ครบทั้ง 6 ตัว (Production + Preview)
vercel --prod
```
เอา URL ที่ได้กลับไปใส่ Auth0 App#1 ทั้ง 4 ช่อง แล้วใส่ลง `php-intranet/config.php` → `portalOrigins`

### เฟส 4 — PHP Intranet
1. รัน `php-intranet/sql/0001_alter_employees.sql` (ตรวจอีเมลซ้ำก่อน)
2. `composer install`
3. `cp config.example.php config.php` แล้วเติมค่า
4. Auth0 App#2 → Allowed Callback URLs = `https://erp.company.local/auth-callback.php`
5. แปะ `require __DIR__.'/auth-middleware.php';` บรรทัดแรกของทุกหน้าภายใน

### เฟส 5 — ทำ Intranet ให้เป็น HTTPS (บังคับ — แก้ข้อ 2.4)
- **แนะนำ:** จด DNS สาธารณะ `erp.company.com` ชี้ **private IP** แล้วออกใบรับรอง
  Let's Encrypt ด้วย **DNS-01 challenge** (ไม่ต้องเปิดพอร์ตออกอินเทอร์เน็ต)
  → เบราว์เซอร์เชื่อถือทันที ไม่ต้องแตะเครื่องพนักงาน
- ทางเลือก: Internal CA (AD CS) + push root cert ผ่าน GPO
- **ห้าม** ใช้ self-signed โดยไม่ push CA — probe จะถูกบล็อกเงียบ ๆ

### เฟส 6 — ทดสอบก่อน Go-Live
ทำตาม `docs/TEST-PLAN.md`

---

## 4. Flow ตอนใช้งานจริง

1. พนักงานเปิด `https://portal.company.com` → redirect ไป Auth0
2. ล็อกอินด้วยอีเมลบริษัท (+ MFA) → กลับมาพร้อม ID token + access token
3. Portal เรียก `rpc('sync_profile')` → Supabase สร้าง/อัปเดต `profiles` จาก claim ใน JWT
4. Portal โหลด `apps` (กรองตาม `allowed_roles` ด้วย RLS) และ `announcements`
5. แอปที่มี `health_url` จะถูก probe ทุก 45 วินาที และตอนกลับมาโฟกัสหน้าต่าง
   - ตอบ 200 → ป้ายเขียว "เชื่อมต่อแล้ว" + latency
   - timeout → ป้ายเทา "ยังไม่ได้ต่อ VPN" · คลิกแล้วเปิด modal สอนต่อ VPN
   - mixed content → ป้ายเหลือง "ตรวจสอบไม่ได้" + บอกสาเหตุทางเทคนิค
6. คลิกการ์ด → ถ้ามี `sso_url` จะไป URL นั้น (`auth-callback.php`) → Auth0 เห็นเซสชันเดิม
   → เด้งกลับทันที **โดยไม่ถามรหัสผ่านซ้ำ**
7. PHP แมป `auth0_id` → `employees.id` → ตั้ง `$_SESSION` → เข้าหน้างาน

---

## 5. การเพิ่มแอปใหม่ (สิ่งที่ทำได้โดยไม่ต้องแก้โค้ด)

หน้า `/admin/apps` → ปุ่ม **เพิ่มแอปใหม่** → กรอกฟอร์ม → บันทึก → ขึ้นหน้าหลักทันที
รายละเอียดแต่ละช่องอยู่ที่ `docs/ADD-NEW-APP.md`

---

## 6. ค่าใช้จ่าย

| บริการ | แผน | ราคา/เดือน |
|---|---|---|
| Auth0 | Free ≤7,500 MAU (250 คนเหลือเฟือ) — MFA แบบ OTP app ฟรี, push/SMS ต้องเสียเงิน | 0 |
| Supabase | Free 500MB → Pro ถ้าต้องการ backup รายวัน + PITR | 0 / $25 |
| Vercel | **Pro** (Hobby ห้ามใช้เชิงพาณิชย์) | $20/user |
| **รวม** | | **$20–45** |

---

## 7. ความเสี่ยงที่ต้องเฝ้า

| ความเสี่ยง | ผลกระทบ | การรับมือ |
|---|---|---|
| ยังไม่ได้ทำ HTTPS ให้ intranet | ป้ายสถานะไม่ทำงานเลย | ปิดเฟส 5 ให้จบก่อน Go-Live |
| อีเมลซ้ำในตาราง employees | จับคู่บัญชีผิดคน | รัน query ตรวจใน `sql/0001_alter_employees.sql` ก่อน |
| Auth0 tenant เปิดให้สมัครเอง | คนนอกเข้าระบบภายในได้ | ปิด Sign Ups + จำกัด `allowedEmailDomains` |
| ลืมใส่ Post-Login Action | Supabase ปฏิเสธทุก request (RLS) | หน้าจอจะขึ้นข้อความบอกสาเหตุพร้อมเช็กลิสต์ให้แล้ว |
| Vercel Hobby ใช้งานเชิงพาณิชย์ | ผิดเงื่อนไขบริการ อาจถูกระงับ | ขึ้น Pro ตั้งแต่วันแรก |
