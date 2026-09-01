# Company Portal — Hybrid SSO

พอร์ทัลกลางของพนักงาน: เข้าสู่ระบบครั้งเดียวแล้วใช้ได้ทุกระบบ ทั้งระบบบนคลาวด์และระบบภายในองค์กร
สร้างตาม `sso-project.docx` โดยแก้ช่องโหว่และข้อผิดพลาดของต้นฉบับไว้แล้ว (ดู `docs/PLAN.md` หัวข้อ 2)

**Vercel** (หน้าเว็บ) · **Supabase** (ฐานข้อมูล + RLS) · **Auth0** (ตัวตนกลาง) · **PHP** (ระบบภายใน)

---

## เริ่มใช้งานใน 30 วินาที

```bash
cd web
npm install
npm run dev
```

เปิด `http://localhost:5173` — ใช้งานได้ทันทีใน **โหมดสาธิต** ไม่ต้องตั้งค่าอะไรก่อน
(ข้อมูลเก็บใน localStorage · เพิ่ม/แก้/ลบแอปได้จริง)

เมื่อพร้อมต่อของจริง: `cp .env.example .env` แล้วเติมค่า — ระบบสลับเป็นโหมดจริงอัตโนมัติ

---

## สิ่งที่ได้

### หน้าหลัก (`/`)
- การ์ดระบบงานจัดกลุ่มตามหมวดหมู่ · ค้นหา + กรอง คลาวด์/ภายใน
- ป้ายสถานะสด: 🟢 เชื่อมต่อแล้ว (+latency) · ⚪ ยังไม่ได้ต่อ VPN · 🟡 ตรวจสอบไม่ได้
- คลิกระบบภายในตอนไม่ได้ต่อ VPN → หน้าต่างสอนต่อ VPN ทีละขั้น
- ฟีดประกาศข่าวสารจากฐานข้อมูล คลิกอ่านเต็มได้

### หน้าจัดการแอป (`/admin/apps` — เฉพาะ admin)
- **เพิ่มแอปใหม่ได้ไม่จำกัด ทั้งฝั่งอินเทอร์เน็ตและอินทราเน็ต โดยไม่ต้องแก้โค้ดหรือ deploy ใหม่**
- ฟอร์มมีตัวอย่างการ์ดสดขณะพิมพ์ · ปุ่มทดสอบการเชื่อมต่อ · เลือกไอคอน/สี
- สวิตช์เปิด-ปิดแอป · กำหนดว่าใครเห็นได้ (บังคับที่ระดับฐานข้อมูลด้วย ไม่ใช่แค่ซ่อน UI)

---

## โครงสร้าง

```
SSO/
├── docs/
│   ├── PLAN.md            แผน implement + ตารางจุดที่แก้จากเอกสารต้นฉบับ
│   ├── AUTH0-SETUP.md     ค่าที่ต้องกรอกใน Auth0 ทีละช่อง
│   ├── ADD-NEW-APP.md     วิธีเพิ่มแอปใหม่ (สำหรับผู้ดูแลระบบ)
│   └── TEST-PLAN.md       เช็กลิสต์ทดสอบก่อน Go-Live
├── web/                   Portal SPA — Vite + React 19 + TS + Tailwind 4 → Vercel
│   ├── src/lib/           env · session (Auth0/demo) · api · supabase · demoStore
│   ├── src/components/    AppCard · AppGrid · AppFormModal · VpnHelpModal · …
│   └── src/pages/         Portal · AdminApps · Login
├── supabase/migrations/   0001 schema+RLS+RPC · 0002 seed · 0003 ตั้ง admin
└── php-intranet/          ping.php · auth-callback.php · auth-middleware.php · logout.php
```

---

## ติดตั้งจริง (สรุป)

| เฟส | ทำอะไร | อ่านที่ |
|---|---|---|
| 0 | ตั้ง Auth0: 2 Applications + 1 API + Post-Login Action | `docs/AUTH0-SETUP.md` |
| 1 | Supabase: รัน migration + เปิด Third-Party Auth = Auth0 | `docs/PLAN.md` §3 |
| 2 | ตั้ง `web/.env` แล้วทดสอบ local | `web/.env.example` |
| 3 | `vercel --prod` แล้วเอา URL กลับไปใส่ Auth0 | `docs/PLAN.md` §3 |
| 4 | PHP: `composer install` + `config.php` + `ALTER TABLE` | `php-intranet/` |
| 5 | ทำ intranet ให้เป็น **HTTPS** (บังคับ) | `docs/PLAN.md` §3 เฟส 5 |
| 6 | ทดสอบตามเช็กลิสต์ | `docs/TEST-PLAN.md` |

---

## ข้อควรระวังที่สำคัญที่สุด

> **ระบบภายในต้องให้บริการผ่าน HTTPS**
> หน้า Portal รันบน HTTPS ถ้า `health_url` เป็น `http://` เบราว์เซอร์จะบล็อกคำขอทิ้ง (Mixed Content)
> ทำให้ป้ายสถานะขึ้น "ตรวจสอบไม่ได้" ตลอดแม้ต่อ VPN แล้ว — เอกสารต้นฉบับไม่ได้ระบุข้อนี้ไว้
> วิธีแก้ที่แนะนำ: DNS สาธารณะชี้ private IP + Let's Encrypt แบบ DNS-01 challenge

> **Vercel Hobby ห้ามใช้เชิงพาณิชย์** — ต้องขึ้นแผน Pro ตั้งแต่วันแรก

---

## สถานะการตรวจสอบ

| รายการ | ผล |
|---|---|
| `npm run build` (tsc + vite) | ผ่าน ไม่มี error |
| `tsc --noEmit` | ผ่าน |
| ชุดทดสอบเรนเดอร์จริงบน DOM (14 กรณี) | ผ่าน 14/14 ไม่มี runtime error |
| `php -l` ทุกไฟล์ PHP (PHP 8.3) | ผ่านทั้ง 7 ไฟล์ |
| `ping.php` ทำงานแบบยืนไฟล์เดียว | ผ่าน (ไม่ต้องมี composer) |
| คู่มือทั้งสองเล่มเปิดด้วย Microsoft Word | ผ่าน · ภาพประกอบ 16 ภาพไม่มีภาพเสีย |
| SQL migration | ยังไม่ได้รันจริง — ต้องรันบน Supabase project ของจริง |

## ภาพประกอบในคู่มือ

ภาพทั้งหมดใน `docs/screens/` ถ่ายจากระบบที่ให้บริการจริงด้วยสคริปต์
`docs/tools/capture-screens.mjs` (ขับ Chrome ผ่าน puppeteer-core)
ถ่ายใหม่ได้ด้วย `cd docs/tools && npm run capture && npm run build:all`
