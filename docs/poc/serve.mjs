/**
 * เสิร์ฟไฟล์ในโฟลเดอร์นี้ที่ http://localhost:8080
 * ใช้สำหรับ POC เท่านั้น — OAuth ต้องมี origin จริง เปิดไฟล์ด้วย file:// ใช้ไม่ได้
 * รัน: node docs/poc/serve.mjs   (กด Ctrl+C เพื่อหยุด)
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const PORT = Number(process.env.PORT || 8080)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' }

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const rel = url.pathname === '/' ? 'supabase-oidc-poc.html' : url.pathname.slice(1)
  // กัน path traversal: ยอมให้อ่านได้เฉพาะในโฟลเดอร์นี้
  const file = join(ROOT, normalize(rel).replace(/^(\.\.(\/|\\|$))+/, ''))
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('ไม่พบไฟล์: ' + rel)
  }
}).listen(PORT, () => {
  console.log('POC เปิดที่  http://localhost:' + PORT + '/')
  console.log('หยุดด้วย Ctrl+C')
})
