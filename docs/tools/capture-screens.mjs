/**
 * capture-screens.mjs — ถ่ายภาพหน้าจอจากระบบจริงที่ให้บริการอยู่
 *
 *   npm run capture
 *
 * ภาพถูกบันทึกลง ../screens/ แล้วนำไปประกอบในคู่มือทั้งสองเล่ม
 *
 * หมายเหตุ: ระบบ production ทำงานในโหมดสาธิต ข้อมูลแอปเก็บใน localStorage
 * ของเบราว์เซอร์ที่เปิดเท่านั้น การเพิ่มแอปในสคริปต์นี้จึงไม่กระทบผู้ใช้รายอื่น
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = process.env.PORTAL_URL || 'https://company-portal-sso.vercel.app'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'screens')

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p))

if (!CHROME) throw new Error('ไม่พบ Chrome หรือ Edge บนเครื่องนี้')
mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const shots = []

async function shot(page, name, target) {
  const file = join(OUT, name + '.png')
  const el = target ? await page.$(target) : null
  if (target && !el) throw new Error(`ไม่พบ element สำหรับภาพ ${name}: ${target}`)
  await (el ?? page).screenshot({ path: file, ...(el ? {} : { fullPage: false }) })
  shots.push(name)
  console.log('  ถ่าย', name)
  if (el) await el.dispose()
}

/** หาปุ่ม/ลิงก์จากข้อความภาษาไทย */
async function clickText(page, selector, text) {
  const ok = await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').includes(t))
      if (!el) return false
      el.click()
      return true
    },
    selector,
    text,
  )
  if (!ok) throw new Error(`ไม่พบ ${selector} ที่มีข้อความ "${text}"`)
  await wait(600)
}

async function fill(page, placeholder, value) {
  const ok = await page.evaluate(
    (ph, v) => {
      const el = [...document.querySelectorAll('input, textarea')].find((e) =>
        (e.placeholder || '').includes(ph),
      )
      if (!el) return false
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    },
    placeholder,
    value,
  )
  if (!ok) throw new Error(`ไม่พบช่องกรอกที่มี placeholder "${placeholder}"`)
  await wait(150)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--lang=th-TH', '--font-render-hinting=none', '--hide-scrollbars'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 2 })
  await page.emulateTimezone('Asia/Bangkok')

  console.log('เปิด', BASE)
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(1500)

  // ปิดแบนเนอร์โหมดสาธิต — ไม่ปรากฏในระบบที่ตั้งค่า Auth0/Supabase จริงแล้ว
  // จึงไม่ควรติดไปในภาพประกอบของคู่มือ
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="ปิดข้อความ"]')
    if (btn) btn.click()
  })
  await wait(400)

  // ── เตรียมข้อมูลตัวอย่างผ่านหน้าจอจริง เพื่อให้ภาพประกอบครบทุกกรณี ──────────
  await page.goto(BASE + '/admin/apps', { waitUntil: 'networkidle2' })
  await wait(1200)
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="ปิดข้อความ"]')
    if (btn) btn.click()
  })
  await wait(400)

  // ภาพที่ 1: หน้าทะเบียนระบบงาน (ก่อนเพิ่ม)
  await shot(page, '04-admin-registry')

  // ภาพที่ 2 และ 3: แบบฟอร์มเพิ่มแอป — ตอนว่าง และตอนกรอกแล้ว
  await clickText(page, 'button', 'เพิ่มแอปใหม่')
  await wait(700)
  await shot(page, '05-form-empty', '[role="dialog"]')

  await fill(page, 'เช่น ระบบจัดซื้อออนไลน์', 'ระบบคลังสินค้า (WMS)')
  await fill(page, 'อธิบายสั้น', 'รับ-จ่ายสต๊อก ตรวจนับ และจัดการตำแหน่งเก็บสินค้า')
  await clickText(page, '[role="dialog"] button', 'ระบบภายในองค์กร')
  await fill(page, 'https://erp.company.local/', 'https://wms.company.com/dashboard.php')
  await fill(page, 'auth-callback.php', 'https://wms.company.com/auth-callback.php')
  await fill(page, 'ping.php', 'https://wms.company.com/ping.php')
  await wait(400)
  await shot(page, '06-form-filled', '[role="dialog"]')

  await clickText(page, '[role="dialog"] button', 'เพิ่มแอป')
  await wait(1500)
  await shot(page, '07-admin-after-add')

  // ── หน้าหลัก ────────────────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle2' })
  await wait(4000) // รอผล probe สถานะ VPN ให้เสร็จก่อนถ่าย
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="ปิดข้อความ"]')
    if (btn) btn.click()
  })
  await wait(600)
  await shot(page, '01-portal-home')

  // การ์ดระบบงาน (โฟกัสเฉพาะกลุ่มการ์ด)
  const grid = await page.$('section[aria-labelledby="apps-heading"]')
  if (grid) {
    await grid.screenshot({ path: join(OUT, '02-app-cards.png') })
    shots.push('02-app-cards')
    console.log('  ถ่าย 02-app-cards')
    await grid.dispose()
  }

  // ฟีดประกาศข่าวสาร
  const feed = await page.$('section[aria-labelledby="ann-heading"]')
  if (feed) {
    await feed.screenshot({ path: join(OUT, '03-announcements.png') })
    shots.push('03-announcements')
    console.log('  ถ่าย 03-announcements')
    await feed.dispose()
  }

  // ── หน้าต่างแนะนำการเชื่อมต่อ VPN (กดการ์ดระบบภายในที่เข้าไม่ถึง) ──────────
  await clickText(page, 'section[aria-labelledby="apps-heading"] button', 'ระบบคลังสินค้า (WMS)')
  await wait(900)
  await shot(page, '08-vpn-modal', '[role="dialog"]')
  await page.keyboard.press('Escape')
  await wait(500)

  // ── หน้าต่างอ่านประกาศฉบับเต็ม ─────────────────────────────────────────
  await clickText(page, 'section[aria-labelledby="ann-heading"] button', 'VPN ประจำเดือน')
  await wait(900)
  await shot(page, '09-announcement-modal', '[role="dialog"]')
  await page.keyboard.press('Escape')

  console.log('\nถ่ายภาพเสร็จ', shots.length, 'ภาพ → ' + OUT)
} finally {
  await browser.close()
}
