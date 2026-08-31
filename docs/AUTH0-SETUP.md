# ตั้งค่า Auth0 — กรอกตามทีละช่อง

สมมติว่า
- Portal บน Vercel = `https://portal.company.com`
- ระบบภายใน = `https://erp.company.local`

---

## 1. Application #1 — Portal (SPA)

**Applications → Create Application → Single Page Web Applications**
ชื่อ: `Company Portal - Internet`

| ช่อง | ค่าที่กรอก |
|---|---|
| Allowed Callback URLs | `https://portal.company.com, http://localhost:5173` |
| Allowed Logout URLs | `https://portal.company.com, http://localhost:5173` |
| Allowed Web Origins | `https://portal.company.com, http://localhost:5173` |
| Allowed Origins (CORS) | `https://portal.company.com, http://localhost:5173` |
| Refresh Token Rotation | เปิด (Rotating) |
| Token Endpoint Auth Method | None |

> ถ้าใช้ Vercel Preview Deployment ให้เพิ่ม URL ของแต่ละ preview ด้วย
> หรือใช้ custom domain คงที่สำหรับ preview

เก็บค่า → `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`

---

## 2. Application #2 — ระบบภายใน (Regular Web App)

**Applications → Create Application → Regular Web Applications**
ชื่อ: `ERP System - Intranet`

| ช่อง | ค่าที่กรอก |
|---|---|
| Allowed Callback URLs | `https://erp.company.local/auth-callback.php` |
| Allowed Logout URLs | `https://erp.company.local/` |
| Token Endpoint Auth Method | Post |

เก็บค่า → `domain`, `clientId`, `clientSecret` ลงใน `php-intranet/config.php`

> **สำคัญ:** Callback ต้องเป็น path เต็มถึงไฟล์ `auth-callback.php`
> ไม่ใช่แค่ IP หรือโดเมนเปล่าอย่างที่เอกสารต้นฉบับเขียนไว้

---

## 3. API (audience) — ขั้นตอนที่เอกสารต้นฉบับไม่มี

**APIs → Create API**

| ช่อง | ค่า |
|---|---|
| Name | `Company Portal API` |
| Identifier | `https://api.company.local` (ไม่ต้องมีจริง ใช้เป็นชื่อเท่านั้น) |
| Signing Algorithm | **RS256** |

เก็บ Identifier → `VITE_AUTH0_AUDIENCE`

**ทำไมจำเป็น:** ถ้าไม่ระบุ audience ตอนล็อกอิน Auth0 จะคืน access token แบบ opaque
(สตริงทึบ ไม่ใช่ JWT) ซึ่ง Supabase ถอดรหัสไม่ได้ → RLS มองไม่เห็นผู้ใช้ → ทุก query ว่างเปล่า

---

## 4. Post-Login Action — ขั้นตอนที่เอกสารต้นฉบับไม่มี

**Actions → Library → Build Custom** · Trigger: `Login / Post Login` · ชื่อ: `Supabase claims`

```js
exports.onExecutePostLogin = async (event, api) => {
  if (event.authorization) {
    // Supabase บังคับให้ JWT มี claim role = 'authenticated'
    api.accessToken.setCustomClaim('role', 'authenticated');
    // RPC sync_profile() อ่าน email จาก access token
    api.accessToken.setCustomClaim('email', event.user.email);
    api.accessToken.setCustomClaim('email_verified', event.user.email_verified);
  }
};
```

กด **Deploy** แล้วไปที่ **Actions → Triggers → post-login** ลาก Action นี้เข้าไปในสาย แล้วกด Apply

---

## 5. ความปลอดภัยของ Tenant

| เมนู | ตั้งค่า | เหตุผล |
|---|---|---|
| Authentication → Database → Username-Password-Authentication → **Disable Sign Ups** | เปิด | กันคนนอกสมัครเองแล้วได้สิทธิ์เข้าระบบภายใน |
| Security → Attack Protection → Brute-force Protection | เปิด | |
| Security → Attack Protection → Suspicious IP Throttling | เปิด | |
| Security → Multi-factor Auth → One-time Password | เปิด (Always) | ฟรีในแผน Free · push/SMS ต้องเสียเงิน |
| Branding → Universal Login | ใส่โลโก้ + สีบริษัท | ให้พนักงานมั่นใจว่าไม่ใช่หน้าฟิชชิง |

**ทางเลือกที่ดีกว่าสำหรับ 250 คน:** ถ้าบริษัทมี Microsoft 365 / Google Workspace อยู่แล้ว
ให้ตั้ง **Enterprise Connection** (Azure AD / Google Workspace) แทนการสร้างรหัสผ่านชุดใหม่
แล้วใส่ชื่อ connection ลงใน `VITE_AUTH0_CONNECTION` เพื่อข้ามหน้าเลือกวิธีล็อกอิน

---

## 6. เช็กลิสต์ก่อนไปเฟสถัดไป

- [ ] App#1 (SPA) สร้างแล้ว + ใส่ URL ครบทั้ง 4 ช่อง
- [ ] App#2 (RWA) สร้างแล้ว + callback ชี้ไป `auth-callback.php`
- [ ] API สร้างแล้ว ใช้ RS256
- [ ] Post-Login Action deploy แล้วและอยู่ใน trigger post-login
- [ ] ปิด Sign Ups แล้ว
- [ ] คัดลอก Domain / Client ID / Client Secret / Audience เก็บไว้ครบ
