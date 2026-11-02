/**
 * ตัวตรวจสุขภาพ SSO แบบปลายทางถึงปลายทาง
 *
 * ล็อกอินจริงด้วยบัญชี AD สำหรับทดสอบ ผ่าน Auth0 ไปยัง AD/LDAP Connector
 * แล้วเอาโทเคนที่ได้ไปเรียก Supabase ต่อ เพื่อให้ครอบคลุมทั้งเส้นที่พนักงานใช้จริง
 *
 * ออกแบบให้ "เงียบเมื่อปกติ ดังเมื่อพัง" — ไม่มีอะไรให้ใครต้องมานั่งเช็คเอง
 *
 * รหัสออกจากโปรแกรม
 *   0  ปกติทุกด่าน
 *   1  พัง — มีบางด่านไม่ผ่าน (GitHub จะส่งอีเมลแจ้งจากการที่ job ล้ม)
 *   2  พังเพราะรหัสผ่านของบัญชีทดสอบใช้ไม่ได้ — ห้ามรันซ้ำ ไม่งั้นบัญชีจะถูกล็อก
 *      (นโยบายโดเมนล็อกบัญชีหลังกรอกผิด 3 ครั้ง นาน 15 นาที — วัดไว้ 2 พ.ย. 2569)
 *      workflow จะปิดตัวเองเมื่อเจอรหัสนี้
 */

const need = (k) => {
  const v = process.env[k]
  if (!v) {
    console.error(`ขาดค่า ${k} — ตั้งใน GitHub Secrets ก่อน (ดู docs/SSO-PROBE-SETUP.md)`)
    process.exit(1)
  }
  return v
}

const DOMAIN = need('AUTH0_DOMAIN')
const AUDIENCE = need('AUTH0_AUDIENCE')
const REALM = need('AUTH0_AD_REALM')
const CLIENT_ID = need('AUTH0_PROBE_CLIENT_ID')
const CLIENT_SECRET = need('AUTH0_PROBE_CLIENT_SECRET')
const USERNAME = need('AUTH0_PROBE_USERNAME')
const PASSWORD = need('AUTH0_PROBE_PASSWORD')
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const MGMT_ID = process.env.AUTH0_MGMT_CLIENT_ID || ''
const MGMT_SECRET = process.env.AUTH0_MGMT_CLIENT_SECRET || ''
const PORTAL_CLIENT_ID = process.env.AUTH0_PORTAL_CLIENT_ID || ''

const steps = []
const add = (name, ok, detail) => {
  steps.push({ name, ok, detail })
  console.log(`${ok ? 'ผ่าน  ' : 'ไม่ผ่าน'} ${name}${detail ? ' — ' + detail : ''}`)
}

const ms = (t0) => Date.now() - t0 + ' ms'

function decodeJwt (token) {
  try {
    const seg = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(seg, 'base64').toString('utf8'))
  } catch { return null }
}

/** ด่าน 1 — ฟอร์มของ connection AD ยังขึ้นอยู่ (ตรวจได้โดยไม่ใช้รหัสผ่าน) */
async function checkAdFormRenders () {
  const t0 = Date.now()
  const q = new URLSearchParams({
    client_id: PORTAL_CLIENT_ID || CLIENT_ID,
    response_type: 'code',
    redirect_uri: 'https://company-portal-sso.vercel.app',
    scope: 'openid profile email',
    connection: REALM,
    state: 'probe',
    code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    code_challenge_method: 'S256',
  })
  try {
    const r1 = await fetch(`https://${DOMAIN}/authorize?${q}`, { redirect: 'manual' })
    const loc = r1.headers.get('location')
    if (!loc) return add('ฟอร์มล็อกอินของ AD', false, `/authorize ตอบ ${r1.status} โดยไม่ส่งต่อไปหน้าล็อกอิน`)
    const cookie = (r1.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
    const url = loc.startsWith('http') ? loc : `https://${DOMAIN}${loc}`
    const html = await (await fetch(url, { headers: { cookie } })).text()
    const hasUser = /name="username"/.test(html)
    const hasPass = /name="password"/.test(html)
    add('ฟอร์มล็อกอินของ AD', hasUser && hasPass,
      hasUser && hasPass ? ms(t0) : 'หน้าล็อกอินไม่มีช่อง username/password — connection อาจถูกปิดหรือหลุดจากแอป')
  } catch (e) {
    add('ฟอร์มล็อกอินของ AD', false, e.message)
  }
}

/** ด่าน 2 — ล็อกอินจริงทะลุถึง AD (ด่านที่สำคัญที่สุด) */
async function loginThroughAd () {
  const t0 = Date.now()
  const body = new URLSearchParams({
    grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
    realm: REALM,
    username: USERNAME,
    password: PASSWORD,
    audience: AUDIENCE,
    scope: 'openid profile email',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  })
  const r = await fetch(`https://${DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const text = await r.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* ไม่ใช่ JSON */ }

  if (!r.ok) {
    const code = json?.error || String(r.status)
    const msg = json?.error_description || text.slice(0, 200)
    const credentialProblem = code === 'invalid_grant' || /wrong|invalid.*(username|password)|locked/i.test(msg)
    add('ล็อกอินด้วยบัญชี AD', false, `${code} — ${msg}`)
    return { ok: false, credentialProblem }
  }

  const claims = decodeJwt(json.id_token) || {}
  // nickname ของ Auth0 = sAMAccountName ซึ่งเป็นค่าที่ทุกแอปใช้จับคู่ผู้ใช้
  const who = claims.nickname || claims.preferred_username || claims.sub || '(ไม่มีข้อมูล)'
  add('ล็อกอินด้วยบัญชี AD', true, `${who} · ${ms(t0)}`)
  return { ok: true, accessToken: json.access_token, claims }
}

/** ด่าน 3 — โทเคนใช้กับ Supabase ได้ (จับอาการนาฬิกาเพี้ยนแบบ 7 ก.ย. 2569) */
async function checkSupabaseAccepts (accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return add('Supabase รับโทเคน', true, 'ข้ามเพราะไม่ได้ตั้งค่าไว้')
  const t0 = Date.now()
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${accessToken}` },
    })
    const txt = await r.text()
    if (r.ok) return add('Supabase รับโทเคน', true, ms(t0))
    const skew = /future|iat|issued at|exp/i.test(txt)
    add('Supabase รับโทเคน', false,
      `HTTP ${r.status} ${txt.slice(0, 160)}${skew ? ' · เข้าข่ายนาฬิกาสองฝั่งเพี้ยน' : ''}`)
  } catch (e) {
    add('Supabase รับโทเคน', false, e.message)
  }
}

/** เมื่อพัง — ดึง log ของ Auth0 มาแปะไว้ในรายงาน ให้รู้สาเหตุในข้อความเดียว */
async function dumpAuth0Logs () {
  if (!MGMT_ID || !MGMT_SECRET) {
    console.log('\n(ไม่ได้ตั้ง AUTH0_MGMT_* จึงดึง log ของ Auth0 มาให้ไม่ได้)')
    return
  }
  try {
    const tr = await fetch(`https://${DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: MGMT_ID,
        client_secret: MGMT_SECRET,
        audience: `https://${DOMAIN}/api/v2/`,
      }),
    })
    if (!tr.ok) { console.log('\nขอโทเคน Management API ไม่ผ่าน: HTTP ' + tr.status); return }
    const { access_token } = await tr.json()
    const lr = await fetch(`https://${DOMAIN}/api/v2/logs?per_page=15&sort=date:-1`, {
      headers: { authorization: `Bearer ${access_token}` },
    })
    if (!lr.ok) { console.log('\nอ่าน log ไม่ผ่าน: HTTP ' + lr.status); return }
    const rows = await lr.json()
    console.log('\n===== log ล่าสุดของ Auth0 (ใหม่ไปเก่า) =====')
    for (const e of rows) {
      console.log([
        e.date,
        e.type,
        e.connection || '-',
        e.user_name || e.user_id || '-',
        (e.description || '').slice(0, 90),
      ].join(' | '))
    }
  } catch (e) {
    console.log('\nดึง log ของ Auth0 ไม่ได้: ' + e.message)
  }
}

const t0 = Date.now()
console.log(`ตรวจสุขภาพ SSO · ${new Date().toISOString()} · tenant ${DOMAIN} · realm ${REALM}\n`)

await checkAdFormRenders()
const login = await loginThroughAd()
if (login.ok) await checkSupabaseAccepts(login.accessToken)
else add('Supabase รับโทเคน', false, 'ข้ามเพราะล็อกอินไม่ผ่าน')

const failed = steps.filter((s) => !s.ok)
console.log(`\nสรุป: ผ่าน ${steps.length - failed.length}/${steps.length} ด่าน · ใช้เวลา ${ms(t0)}`)

if (!failed.length) process.exit(0)

await dumpAuth0Logs()

// บอก workflow ว่าเป็นปัญหารหัสผ่านหรือไม่ · step output ยังอ่านได้แม้ step จะล้ม
if (process.env.GITHUB_OUTPUT) {
  const { appendFileSync } = await import('node:fs')
  appendFileSync(process.env.GITHUB_OUTPUT, `credential_problem=${login.credentialProblem ? 'true' : 'false'}\n`)
}

if (login.credentialProblem) {
  console.log('\n*** รหัสผ่านของบัญชีทดสอบใช้ไม่ได้ ***')
  console.log('workflow จะปิดตัวเองเพื่อไม่ให้บัญชีถูกล็อก (นโยบายโดเมน: ผิด 3 ครั้ง ล็อก 15 นาที)')
  console.log('แก้รหัสใน GitHub Secrets แล้วเปิด workflow กลับด้วย: gh workflow enable sso-probe.yml')
  process.exit(2)
}
process.exit(1)
