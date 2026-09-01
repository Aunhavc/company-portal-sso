# สเปกงาน — เชื่อมแอปเข้ากับระบบยืนยันตัวตนกลาง (Auth0 SSO)

**สำหรับส่งให้ผู้พัฒนาภายนอก** · เอกสารเลขที่ SSO-VND-001 · เวอร์ชัน 1.0

---

## 1. สิ่งที่ต้องการ

ปัจจุบันแอปที่ท่านพัฒนามีระบบล็อกอินของตัวเอง พนักงานต้องจำรหัสผ่านแยกทุกแอป
บริษัทได้ติดตั้งระบบยืนยันตัวตนกลาง (Auth0) แล้ว จึงต้องการให้แอปเปลี่ยนมาใช้ระบบกลางแทน

**ผลลัพธ์ที่ต้องได้**

- พนักงานล็อกอินที่พอร์ทัลกลางครั้งเดียว แล้วเปิดแอปนี้ได้โดยไม่ต้องกรอกรหัสผ่านซ้ำ
- แอปไม่เก็บรหัสผ่านของผู้ใช้อีกต่อไป
- เมื่อพนักงานพ้นสภาพ บริษัทปิดบัญชีที่ระบบกลางที่เดียว แล้วเข้าแอปนี้ไม่ได้ทันที

**ขอบเขตงาน:** เฉพาะส่วนยืนยันตัวตน ไม่แตะฟังก์ชันธุรกิจเดิมของแอป

---

## 2. ค่าที่บริษัทจัดเตรียมให้

บริษัทจะส่งค่าเหล่านี้ให้เมื่อยืนยันรับงาน (ค่า Client ID จะสร้างแยกให้แต่ละแอป)

| ตัวแปร | ค่า |
|---|---|
| `VITE_AUTH0_DOMAIN` | `dev-j3byu1ifa062ozvk.us.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | *(บริษัทสร้างให้เฉพาะแอปนี้ — แจ้งภายหลัง)* |
| `VITE_AUTH0_AUDIENCE` | `https://api.company.local` |

> ค่าทั้งสามไม่ใช่ความลับ ปลอดภัยที่จะอยู่ในโค้ดฝั่งเบราว์เซอร์
> **บริษัทจะไม่ส่ง Client Secret ให้** และแอปประเภทนี้ไม่ต้องใช้

**สิ่งที่ผู้พัฒนาต้องแจ้งกลับก่อนเริ่มงาน**

1. URL ของแอปทั้ง production และ preview/staging (บริษัทต้องนำไปลงทะเบียนใน Auth0)
2. แอปใช้ระบบล็อกอินอะไรอยู่ปัจจุบัน (Supabase Auth / ระบบเขียนเอง / อื่น ๆ)
3. แอปมีข้อมูลผู้ใช้เดิมกี่รายการ และผูกกับตารางไหน

---

## 3. งานที่ต้องทำ

### 3.1 ติดตั้งไลบรารี

```bash
npm install @auth0/auth0-react
```

### 3.2 ครอบแอปด้วย Auth0Provider

ไฟล์ `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)
```

### 3.3 บังคับให้ล็อกอินก่อนเข้าใช้งาน

ไฟล์ `src/App.tsx` — ครอบเนื้อหาเดิมของแอปไว้ด้านใน

```tsx
import { useAuth0 } from '@auth0/auth0-react'

export default function App() {
  const { isLoading, isAuthenticated, error, loginWithRedirect, user, logout } = useAuth0()

  if (isLoading) return <div style={{ padding: 40 }}>กำลังตรวจสอบสิทธิ์…</div>

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h1>เข้าสู่ระบบไม่สำเร็จ</h1>
        <p>{error.message}</p>
        <button onClick={() => loginWithRedirect()}>ลองใหม่</button>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>ชื่อแอป</h1>
        <p>เข้าสู่ระบบด้วยบัญชีพนักงานของบริษัท</p>
        <button onClick={() => loginWithRedirect()}>เข้าสู่ระบบ</button>
      </div>
    )
  }

  // ── ผู้ใช้ล็อกอินแล้ว — ตรงนี้คือหน้าจอเดิมของแอป ──
  return (
    <>
      <header>
        {user?.name} ({user?.email})
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
          ออกจากระบบ
        </button>
      </header>
      {/* เนื้อหาเดิมของแอปทั้งหมดวางตรงนี้ */}
    </>
  )
}
```

### 3.4 กรณีแอปใช้ Supabase — ส่ง token ของ Auth0 ให้ Supabase

**ทำเฉพาะเมื่อแอปใช้ Supabase** ไฟล์ `src/lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js'

let getToken: (() => Promise<string>) | null = null

/** เรียกจากคอมโพเนนต์หลังจาก Auth0 พร้อมใช้งาน */
export function setAccessTokenProvider(fn: (() => Promise<string>) | null) {
  getToken = fn
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    accessToken: async () => {
      if (!getToken) return ''
      try { return await getToken() } catch { return '' }
    },
  },
)
```

แล้วเรียกใช้ใน `App.tsx`

```tsx
import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { setAccessTokenProvider } from './lib/supabase'

const { getAccessTokenSilently } = useAuth0()

useEffect(() => {
  setAccessTokenProvider(async () => getAccessTokenSilently())
  return () => setAccessTokenProvider(null)
}, [getAccessTokenSilently])
```

> บริษัทได้เปิด **Third-Party Auth (Auth0)** ที่ฝั่ง Supabase ไว้แล้ว
> และตั้ง Post-Login Action ที่ใส่ claim `role = 'authenticated'` ให้ token เรียบร้อย
> ผู้พัฒนาไม่ต้องดำเนินการเพิ่มในส่วนนี้

### 3.5 การย้ายผู้ใช้เดิม

ห้ามลบข้อมูลผู้ใช้เดิม ให้เพิ่มคอลัมน์สำหรับผูกบัญชีกลางแทน

```sql
alter table <ตารางผู้ใช้ของแอป> add column auth0_id text unique;
```

ครั้งแรกที่ผู้ใช้ล็อกอินด้วยบัญชีกลาง ให้จับคู่ด้วยอีเมล แล้วบันทึก `auth0_id` ไว้
ครั้งถัดไปจับคู่ด้วย `auth0_id` โดยตรง ข้อมูลและประวัติเดิมทั้งหมดยังอยู่ครบ

**เงื่อนไขความปลอดภัยที่ต้องทำ** — ก่อนผูกบัญชีเดิมด้วยอีเมล ต้องตรวจว่า
`user.email_verified === true` เท่านั้น มิฉะนั้นจะเปิดช่องให้ยึดบัญชีพนักงานได้

### 3.6 ปิดระบบล็อกอินเดิม

เมื่อทดสอบผ่านแล้ว ให้**ลบ**หน้าล็อกอินเดิม ช่องกรอกรหัสผ่าน และตารางรหัสผ่านออก
ห้ามเหลือช่องทางเข้าระบบด้วยรหัสผ่านไว้ในระบบที่ใช้งานจริง

---

## 4. เกณฑ์ตรวจรับ

ผู้พัฒนาต้องส่งมอบเมื่อผ่านครบทุกข้อ

| # | รายการทดสอบ | ผลที่ต้องได้ |
|---|---|---|
| 1 | เปิดแอปโดยยังไม่ล็อกอิน | ไม่เห็นข้อมูลใด ๆ แสดงหน้าให้เข้าสู่ระบบ |
| 2 | กดเข้าสู่ระบบ | ไปยังหน้ายืนยันตัวตนของบริษัทที่โดเมน `auth0.com` |
| 3 | ล็อกอินสำเร็จ | กลับเข้าแอปพร้อมชื่อและอีเมลที่ถูกต้อง |
| 4 | ล็อกอินพอร์ทัลกลางก่อน แล้วเปิดแอปนี้ | **เข้าได้ทันทีโดยไม่ถามรหัสผ่านซ้ำ** |
| 5 | ผู้ใช้เดิมล็อกอินด้วยอีเมลเดียวกัน | เห็นข้อมูลและประวัติเดิมครบ ไม่สูญหาย |
| 6 | กดออกจากระบบ | ออกจากทั้งแอปและระบบกลาง กดปุ่มย้อนกลับแล้วเข้าไม่ได้ |
| 7 | ค้นหาคำว่า password ในซอร์สโค้ด | ไม่พบระบบล็อกอินเดิมหลงเหลือ |
| 8 | ตรวจ environment variables | ไม่มี Client Secret หรือ service key อยู่ในโค้ดฝั่งเบราว์เซอร์ |

---

## 5. สิ่งที่ต้องส่งมอบ

1. โค้ดที่แก้ไขแล้ว deploy ขึ้น production
2. URL ของ preview/staging สำหรับให้บริษัททดสอบก่อนขึ้นจริง
3. รายงานผลการทดสอบตามตารางข้อ 4
4. รายชื่อ environment variables ที่ต้องตั้งค่า (ไม่ต้องส่งค่าจริง)
5. ยืนยันเป็นลายลักษณ์อักษรว่าได้ลบระบบล็อกอินเดิมออกแล้ว

---

## 6. ข้อควรระวัง

| หัวข้อ | รายละเอียด |
|---|---|
| **ห้ามใส่ Client Secret ในโค้ดฝั่งเบราว์เซอร์** | แอปประเภท SPA ใช้ Authorization Code + PKCE ไม่ต้องใช้ secret |
| **ห้ามใช้ Supabase service_role key ในเบราว์เซอร์** | ใช้ได้เฉพาะ anon/publishable key เท่านั้น |
| **ต้องแจ้ง URL ทุกตัวที่ต้องใช้งาน** | Auth0 ปฏิเสธ URL ที่ไม่ได้ลงทะเบียน รวมถึง URL ของ preview deployment |
| **อย่าเก็บ token ไว้ใน cookie ที่อ่านได้จาก JavaScript** | ใช้การตั้งค่าตามตัวอย่างในเอกสารนี้ |
| **การผูกบัญชีด้วยอีเมลต้องตรวจ email_verified** | มิฉะนั้นเปิดช่องให้ยึดบัญชีพนักงาน |

---

## 7. ตัวอย่างอ้างอิง

บริษัทได้ทำระบบนี้สำเร็จแล้วกับพอร์ทัลกลาง ซึ่งใช้สแตกเดียวกัน (React + Vite + Supabase)
ผู้พัฒนาสามารถดูโค้ดจริงที่ใช้งานอยู่ได้ที่

**https://github.com/Aunhavc/company-portal-sso**

ไฟล์ที่เกี่ยวข้องโดยตรง

| ไฟล์ | หน้าที่ |
|---|---|
| `web/src/lib/session.tsx` | ครอบ Auth0Provider และซิงค์โปรไฟล์ |
| `web/src/lib/supabase.ts` | ส่ง Auth0 token ให้ Supabase |
| `web/src/lib/env.ts` | อ่านและตรวจ environment variables |
| `web/.env.example` | รายชื่อตัวแปรทั้งหมด |

---

## 8. ผู้ประสานงาน

| บทบาท | ชื่อ / ติดต่อ |
|---|---|
| ผู้ดูแลระบบยืนยันตัวตนกลาง | ฝ่ายเทคโนโลยีสารสนเทศ |
| ผู้ตรวจรับงาน | |
| กำหนดส่งมอบ | |
