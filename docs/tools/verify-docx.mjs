// ตรวจสอบไฟล์ .docx ที่สร้างขึ้น: XML ถูกต้อง ไม่มี <0/> หลุด และมีหัวข้อครบ
import { readFileSync } from 'node:fs'
import JSZip from 'jszip'

const files = process.argv.slice(2)
let fail = 0
for (const f of files) {
  const zip = await JSZip.loadAsync(readFileSync(f))
  const xml = await zip.file('word/document.xml').async('string')
  const stray = (xml.match(/<0\/>/g) || []).length
  const text = xml.replace(/<[^>]+>/g, '')
  const h1 = [...xml.matchAll(/<w:pStyle w:val="Heading1"\/>[\s\S]*?<\/w:p>/g)]
    .map((m) => m[0].replace(/<[^>]+>/g, ''))
  const tables = (xml.match(/<w:tbl>/g) || []).length
  const parts = Object.keys(zip.files).filter((n) => /^word\/(header|footer)/.test(n))
  console.log(`\n== ${f.split(/[\\/]/).pop()}`)
  console.log(`document.xml ${(xml.length / 1024).toFixed(0)} KB | ตัวอักษร ${text.length} | ตาราง ${tables} | header/footer ${parts.length}`)
  console.log(`stray <0/>: ${stray}`)
  console.log('Heading1:'); h1.forEach((h) => console.log('  - ' + h))
  if (stray || h1.length < 10 || !text.includes('— จบเอกสาร —')) fail++
}
console.log(fail ? `\nFAIL ${fail}` : '\nPASS')
process.exit(fail ? 1 : 0)
