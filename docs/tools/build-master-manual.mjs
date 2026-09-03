/**
 * สร้างคู่มือระบบฉบับสมบูรณ์ (.docx) — การจัดทำ การใช้งาน และการ Deploy
 *
 *   npm install && node build-master-manual.mjs
 *
 * ผลลัพธ์: ../คู่มือระบบ Company Portal ฉบับสมบูรณ์.docx
 *
 * เอกสารนี้ต่างจากอีกสองฉบับที่มีอยู่แล้ว:
 *   - SSO-OPS-001 เจาะจงเรื่อง "การเพิ่มระบบงานใหม่" เท่านั้น
 *   - SSO-USR-001 เขียนให้พนักงานทั่วไปอ่าน ไม่มีรายละเอียดทางเทคนิค
 *   - ฉบับนี้ (SSO-OPS-003) คือคู่มือส่งมอบงานฉบับสมบูรณ์สำหรับผู้ที่จะ
 *     รับช่วงดูแลระบบต่อ ครอบคลุมตั้งแต่สถาปัตยกรรม การพัฒนา การ deploy
 *     ไปจนถึงการใช้งานหน้าผู้ดูแลระบบทุกหน้า
 */
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, PageBreak,
  PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableOfContents,
  TableRow, TextRun, VerticalAlign, WidthType, convertMillimetersToTwip,
} from 'docx'
import { writeFileSync } from 'node:fs'

// ---------------------------------------------------------------------------
// ค่าคงที่ของเอกสาร
// ---------------------------------------------------------------------------
const DOC = {
  code: 'SSO-OPS-003',
  title: 'คู่มือระบบ Company Portal ฉบับสมบูรณ์',
  subtitle: 'การจัดทำ การใช้งาน และการ Deploy — สำหรับผู้รับช่วงดูแลระบบ',
  version: '1.0',
  date: '3 กันยายน 2569',
  owner: 'ฝ่ายเทคโนโลยีสารสนเทศ',
  classification: 'ภายในองค์กร — Internal Use Only',
  portalUrl: 'https://company-portal-sso.vercel.app',
}

const FONT = 'Tahoma'
const MONO = 'Consolas'
const NAVY = '1F3864'
const GREY = '595959'
const RULE = 'BFBFBF'
const HEAD_BG = 'E7E9F2'
const CODE_BG = 'F4F5F7'

// ---------------------------------------------------------------------------
// ตัวช่วยสร้างเนื้อหา (สูตรเดียวกับ build-manual.mjs)
// ---------------------------------------------------------------------------
const run = (text, o = {}) => new TextRun({ text, font: FONT, ...o })

const p = (text, o = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 300 },
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    ...o.paragraph,
    children: Array.isArray(text) ? text : [run(text, { size: 22, ...o.run })],
  })

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
    children: [run(text, { size: 30, bold: true, color: NAVY })],
  })

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    children: [run(text, { size: 25, bold: true, color: NAVY })],
  })

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [run(text, { size: 22, bold: true, color: GREY })],
  })

const bullet = (text, level = 0) =>
  new Paragraph({
    bullet: { level },
    spacing: { after: 80, line: 290 },
    children: [run(text, { size: 22 })],
  })

const numbered = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: 'steps', level },
    spacing: { after: 80, line: 290 },
    children: [run(text, { size: 22 })],
  })

const box = (color) => ({
  top: { style: BorderStyle.SINGLE, size: 4, color },
  bottom: { style: BorderStyle.SINGLE, size: 4, color },
  left: { style: BorderStyle.SINGLE, size: 4, color },
  right: { style: BorderStyle.SINGLE, size: 4, color },
})

const cap = (text) =>
  new Paragraph({
    spacing: { before: 60, after: 60 },
    alignment: AlignmentType.LEFT,
    children: [run(text, { size: 18, italics: true, color: GREY })],
  })

/** บล็อกโค้ด — พื้นเทา ฟอนต์ monospace */
const code = (lines, caption) => {
  const rows = (Array.isArray(lines) ? lines : lines.split('\n')).map(
    (line) =>
      new Paragraph({
        spacing: { after: 0, line: 250 },
        indent: { left: convertMillimetersToTwip(3) },
        children: [new TextRun({ text: line || ' ', font: MONO, size: 17 })],
      }),
  )
  const cell = new TableCell({
    shading: { type: ShadingType.CLEAR, fill: CODE_BG },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    borders: box(RULE),
    children: rows,
  })
  const out = [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [cell] })],
    }),
  ]
  if (caption) out.push(cap(caption))
  out.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
  return out
}

/** กล่องข้อความเน้น: warning / note / critical / tip */
const callout = (kind, title, text) => {
  const style = {
    critical: { fill: 'FDECEA', bar: 'C0392B', icon: '⛔' },
    warning: { fill: 'FEF7E6', bar: 'B7791F', icon: '⚠' },
    note: { fill: 'EAF2FB', bar: '1F5FA9', icon: 'ℹ' },
    tip: { fill: 'EAF7EF', bar: '1E7A46', icon: '💡' },
  }[kind]
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: style.bar },
            borders: box(style.bar),
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: style.fill },
            borders: box(style.fill),
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [run(`${style.icon}  ${title}`, { size: 21, bold: true, color: style.bar })],
              }),
              new Paragraph({
                spacing: { after: 0, line: 290 },
                alignment: AlignmentType.JUSTIFIED,
                children: [run(text, { size: 21 })],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

/** ตารางมาตรฐาน — ข้อความในเซลล์ที่ครอบด้วย ` จะแสดงเป็นฟอนต์ monospace */
const table = (headers, rows, widths) => {
  const total = widths ?? headers.map(() => Math.floor(100 / headers.length))
  const headRow = new TableRow({
    tableHeader: true,
    children: headers.map((htext, i) =>
      new TableCell({
        width: { size: total[i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: HEAD_BG },
        borders: box(RULE),
        margins: { top: 90, bottom: 90, left: 110, right: 110 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            spacing: { after: 0 },
            children: [run(htext, { size: 20, bold: true, color: NAVY })],
          }),
        ],
      }),
    ),
  })

  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map((cellText, i) =>
          new TableCell({
            width: { size: total[i], type: WidthType.PERCENTAGE },
            borders: box(RULE),
            margins: { top: 90, bottom: 90, left: 110, right: 110 },
            verticalAlign: VerticalAlign.TOP,
            children: String(cellText)
              .split('\n')
              .map((line) =>
                new Paragraph({
                  spacing: { after: 0, line: 280 },
                  children: line.startsWith('`') && line.endsWith('`') && line.length > 2
                    ? [new TextRun({ text: line.slice(1, -1), font: MONO, size: 17 })]
                    : [run(line, { size: 20 })],
                }),
              ),
          }),
        ),
      }),
  )

  return [
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headRow, ...bodyRows] }),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ]
}

const spacer = (after = 200) => new Paragraph({ spacing: { after }, children: [] })
const pageBreak = () => new Paragraph({ children: [new PageBreak()] })

// ---------------------------------------------------------------------------
// หน้าปก
// ---------------------------------------------------------------------------
const cover = [
  spacer(1200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [run(DOC.classification.toUpperCase(), { size: 18, bold: true, color: 'C0392B', characterSpacing: 30 })],
  }),
  spacer(500),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 140 },
    children: [run(DOC.title, { size: 40, bold: true, color: NAVY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 500 },
    children: [run(DOC.subtitle, { size: 24, color: GREY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 10 } },
    spacing: { after: 700 },
    children: [],
  }),
  ...table(
    ['รายการ', 'รายละเอียด'],
    [
      ['รหัสเอกสาร', DOC.code],
      ['ชื่อระบบ', 'Company Portal — Hybrid Single Sign-On'],
      ['ที่อยู่ระบบ (Production)', DOC.portalUrl],
      ['ที่เก็บซอร์สโค้ด (GitHub, public)', 'github.com/Aunhavc/company-portal-sso'],
      ['เวอร์ชันเอกสาร', DOC.version],
      ['วันที่มีผลบังคับใช้', DOC.date],
      ['หน่วยงานเจ้าของเอกสาร', DOC.owner],
      ['ชั้นความลับ', DOC.classification],
      ['เอกสารที่เกี่ยวข้อง', 'SSO-OPS-001 (เพิ่มระบบงานใหม่), SSO-USR-001 (คู่มือพนักงาน),\nSSO-OPS-002 (HTTPS สำหรับ IIS)'],
    ],
    [32, 68],
  ),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// การควบคุมเอกสาร
// ---------------------------------------------------------------------------
const control = [
  h1('การควบคุมเอกสาร'),
  h2('วัตถุประสงค์ของเอกสาร'),
  p(
    'เอกสารฉบับนี้จัดทำขึ้นเพื่อส่งมอบความรู้ทั้งหมดเกี่ยวกับระบบ Company Portal ให้แก่ผู้ที่จะรับช่วงดูแล ' +
      'พัฒนา หรือ deploy ระบบนี้ต่อ ไม่ว่าจะเป็นทีมงานภายในที่เพิ่งเข้ามารับผิดชอบ หรือทีมพัฒนาภายนอกที่รับจ้างดูแลต่อ ' +
      'เนื้อหาครอบคลุมตั้งแต่สถาปัตยกรรมของระบบ วิธีพัฒนาต่อ วิธี deploy ไปจนถึงวิธีใช้งานหน้าจัดการทุกหน้าในฐานะผู้ดูแลระบบ',
  ),
  h2('ประวัติการแก้ไข'),
  ...table(
    ['เวอร์ชัน', 'วันที่', 'ผู้แก้ไข', 'รายละเอียดการเปลี่ยนแปลง'],
    [
      [
        '1.0',
        DOC.date,
        DOC.owner,
        'จัดทำฉบับแรก ครอบคลุมสถาปัตยกรรม การพัฒนา ฐานข้อมูล การยืนยันตัวตน ' +
          'การ deploy คู่มือผู้ดูแลระบบทุกหน้า การแก้ไขปัญหาที่พบบ่อย และงานที่ยังค้างอยู่',
      ],
    ],
    [12, 16, 22, 50],
  ),
  h2('การแจกจ่ายเอกสาร'),
  ...table(
    ['หน่วยงาน', 'วัตถุประสงค์การใช้งาน'],
    [
      ['ฝ่ายเทคโนโลยีสารสนเทศ', 'ดูแล พัฒนาต่อ และ deploy ระบบ'],
      ['ผู้รับช่วงดูแลระบบ (ภายในหรือภายนอก)', 'ทำความเข้าใจระบบทั้งหมดก่อนรับช่วงต่อ'],
      ['ผู้ดูแลระบบพอร์ทัล (Portal Administrator)', 'ใช้งานหน้าจัดการแอป ผู้ใช้ และประกาศ'],
      ['ผู้บริหารฝ่าย IT', 'ทราบภาพรวมสถานะและงานที่ยังค้างอยู่'],
    ],
    [40, 60],
  ),
  callout(
    'note',
    'ข้อกำหนดการใช้เอกสาร',
    'เอกสารฉบับนี้จัดชั้นความลับระดับ "ภายในองค์กร" ห้ามเผยแพร่ต่อบุคคลภายนอกโดยไม่ได้รับอนุญาต ' +
      'แม้ตัวซอร์สโค้ดบน GitHub จะเป็น public repository แต่ค่าตั้งค่าจริง (Client Secret, Service Role Key, ' +
      'รหัสผ่านบัญชีบริการ) ไม่เคยถูกเก็บไว้ในซอร์สโค้ดหรือเอกสารนี้เลย ต้องขอจากผู้ดูแลระบบโดยตรง',
  ),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// สารบัญ
// ---------------------------------------------------------------------------
const toc = [
  h1('สารบัญ'),
  new TableOfContents('สารบัญ', { hyperlink: true, headingStyleRange: '1-3' }),
  spacer(200),
  cap('หมายเหตุ: หากสารบัญไม่แสดงตัวเลขหน้า ให้คลิกขวาที่สารบัญแล้วเลือก "Update Field" → "Update entire table"'),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// 1. ภาพรวมระบบ
// ---------------------------------------------------------------------------
const ch1 = [
  h1('1. ภาพรวมระบบ'),

  h2('1.1 Company Portal คืออะไร'),
  p(
    'Company Portal เป็นเว็บพอร์ทัลกลางที่รวมระบบงานทั้งหมดขององค์กรไว้ในที่เดียว ทั้งระบบบนคลาวด์ (internet) ' +
      'และระบบภายในองค์กร (intranet) พนักงานล็อกอินเพียงครั้งเดียวด้วยบัญชีเดียว (Single Sign-On) แล้วเข้าใช้งาน ' +
      'ทุกระบบที่มีสิทธิ์ได้ทันทีโดยไม่ต้องกรอกรหัสผ่านซ้ำ',
  ),
  p('ระบบสร้างขึ้นให้ "เพิ่มระบบงานใหม่ได้โดยไม่ต้อง deploy โค้ดใหม่" — รายการแอป ผู้ใช้ ประกาศ และค่าตั้งค่าองค์กร ทั้งหมดเป็นข้อมูลในฐานข้อมูล ไม่ใช่ค่าที่ฝังในโค้ด'),

  h2('1.2 ส่วนประกอบหลักของระบบ'),
  ...table(
    ['ส่วนประกอบ', 'บทบาท', 'ผู้ให้บริการ'],
    [
      ['เว็บแอป (Frontend)', 'หน้าเว็บที่พนักงานและผู้ดูแลระบบใช้งาน', 'Vercel (React SPA)'],
      ['ฐานข้อมูล', 'เก็บรายชื่อแอป ผู้ใช้ ประกาศ ค่าตั้งค่า พร้อม Row Level Security', 'Supabase (PostgreSQL)'],
      ['ผู้ให้บริการยืนยันตัวตน (IdP)', 'ตรวจสอบตัวตนผู้ใช้ ออก JSON Web Token', 'Auth0'],
      ['ตัวเชื่อม Active Directory', 'ให้พนักงานล็อกอินด้วยบัญชี Windows เดิม', 'Auth0 AD/LDAP Connector (ติดตั้งในองค์กร)'],
      ['ที่เก็บซอร์สโค้ด', 'เวอร์ชันโค้ดและ migration ทั้งหมด', 'GitHub (public repository)'],
    ],
    [26, 46, 28],
  ),

  h2('1.3 เส้นทางการล็อกอิน (ภาพรวม)'),
  numbered('พนักงานเปิดพอร์ทัล กดปุ่ม "เข้าสู่ระบบด้วยบัญชีพนักงาน (AD)" หรือ "เข้าสู่ระบบด้วยวิธีอื่น" (Google)'),
  numbered('เบราว์เซอร์ไปที่ Auth0 — ถ้าเลือก AD, Auth0 คุยกับ AD/LDAP Connector ที่ติดตั้งในองค์กรผ่านช่องทางขาออกเท่านั้น (ไม่ต้องเปิดพอร์ตเข้า ไม่ต้อง VPN)'),
  numbered('Auth0 รัน Post-Login Action ตรวจว่าบัญชี AD อยู่ในกลุ่ม SSO-Portal-Users หรือไม่ ถ้าไม่อยู่ จะถูกปฏิเสธก่อนออก token'),
  numbered('Auth0 ออก access token กลับมาที่เว็บแอป'),
  numbered('เว็บแอปเรียก Supabase RPC "sync_profile" เพื่อสร้าง/อัปเดตโปรไฟล์ — บัญชี AD เปิดใช้งานทันที บัญชีอื่นต้องรอผู้ดูแลอนุมัติ'),
  numbered('Supabase ตรวจสอบ token ผ่าน Third-Party Auth (เชื่อถือ Auth0 เป็น JWT issuer) แล้วใช้ Row Level Security ตัดสินว่าแถวไหนเห็นได้'),
  spacer(100),
  callout(
    'tip',
    'ทำไมต้องผ่านหลายขั้นตอน',
    'การแยกชั้นแบบนี้ทำให้ Auth0 ไม่ต้องรู้จักโครงสร้างฐานข้อมูล และ Supabase ไม่ต้องรู้วิธีคุยกับ Active Directory ' +
      'แต่ละส่วนรับผิดชอบเรื่องของตัวเองเท่านั้น การเปลี่ยนผู้ให้บริการยืนยันตัวตนในอนาคตจึงไม่กระทบโครงสร้างฐานข้อมูล',
  ),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// 2. สถาปัตยกรรมและการพัฒนา (การจัดทำ)
// ---------------------------------------------------------------------------
const ch2 = [
  h1('2. สถาปัตยกรรมซอฟต์แวร์และการพัฒนา'),

  h2('2.1 เทคโนโลยีที่ใช้'),
  ...table(
    ['ชั้น', 'เทคโนโลยี', 'หมายเหตุ'],
    [
      ['Framework', 'Vite + React 19 + TypeScript', 'สร้างเป็น Single Page Application (SPA)'],
      ['UI', 'Tailwind CSS 4 (@tailwindcss/vite)', 'ไม่มีไฟล์ config แยก ตั้งค่าผ่าน @theme ใน index.css'],
      ['Routing', 'react-router-dom 7', 'client-side routing ล้วน'],
      ['ยืนยันตัวตน', '@auth0/auth0-react', 'ครอบ Auth0 SPA SDK'],
      ['ฐานข้อมูล', '@supabase/supabase-js', 'ต่อ Supabase ผ่าน PostgREST + Third-Party Auth'],
      ['ทดสอบ', 'Vitest', 'ทดสอบตรรกะล้วน ไม่ render DOM จริง'],
      ['Deploy', 'Vercel CLI', 'build แบบ static แล้ว deploy เป็น prebuilt output'],
    ],
    [20, 34, 46],
  ),

  h2('2.2 โครงสร้างโฟลเดอร์ของ repository'),
  ...code(
    [
      'SSO/',
      '├── web/                   เว็บแอปหลัก (React + Vite)',
      '│   ├── src/',
      '│   │   ├── lib/           ตรรกะล้วน ไม่ผูกกับ React — ทดสอบได้โดยตรง',
      '│   │   │   ├── api.ts         ชั้นเข้าถึงข้อมูล สลับ Supabase จริง/โหมดสาธิต',
      '│   │   │   ├── demoStore.ts   คลังข้อมูลจำลอง (localStorage) สำหรับโหมดสาธิต',
      '│   │   │   ├── auth0Config.ts ค่าตั้งต้นของ Auth0Provider',
      '│   │   │   ├── announcements.ts  ตรรกะประกาศ/หมวดหมู่/กำหนดเวลา',
      '│   │   │   ├── users.ts       ตรรกะอนุมัติ/สิทธิ์ผู้ใช้',
      '│   │   │   └── __tests__/     เทสต์ของทุกไฟล์ข้างบน',
      '│   │   ├── pages/         หน้าเว็บ (Portal, AdminApps, AdminUsers, AdminAnnouncements, Login)',
      '│   │   ├── components/    ส่วนประกอบ UI ที่ใช้ซ้ำได้',
      '│   │   └── hooks/         custom hooks เช่น useApps, useAnnouncements',
      '│   └── vitest.config.ts',
      '├── supabase/',
      '│   └── migrations/        ไฟล์ SQL เรียงเลข 0001–0007 (ดูบทที่ 3)',
      '├── docs/                  เอกสารทั้งหมด รวมทั้งไฟล์นี้',
      '│   └── tools/              สคริปต์สร้างเอกสาร .docx',
      '├── scripts/               สคริปต์ PowerShell/Bash สำหรับงานดูแลระบบ',
      '└── php-intranet/          ตัวอย่างโค้ด PHP สำหรับแอป intranet ที่จะต่อ SSO',
    ],
  ),

  h2('2.3 หลักการออกแบบที่สำคัญ'),
  h3('2.3.1 แยกตรรกะออกจาก React ทุกครั้งที่ทำได้'),
  p(
    'ไฟล์ใน src/lib/*.ts เป็นฟังก์ชันล้วน (pure function) ไม่พึ่ง React state หรือ DOM ทำให้ทดสอบได้โดยตรงด้วย Vitest ' +
      'โดยไม่ต้อง render component จริง ตัวอย่างเช่น การตรวจสอบฟอร์ม (validateAnnouncement) การเรียงลำดับ (sortAnnouncements) ' +
      'และการตัดสินสิทธิ์ (blockReason ในหน้าจัดการผู้ใช้) ล้วนอยู่ในไฟล์ lib แยกจาก component',
  ),
  h3('2.3.2 โหมดสาธิต (Demo Mode)'),
  p(
    'ถ้ายังไม่ได้ตั้งค่า environment variables ของ Auth0/Supabase ให้ครบ ระบบจะสลับไปใช้ demoStore.ts ' +
      'ซึ่งเก็บข้อมูลจำลองใน localStorage ของเบราว์เซอร์แทน ทำให้เปิดดูหน้าตาระบบได้ทันทีโดยไม่ต้องตั้งค่าอะไรเลย ' +
      'ตัวแปร isLive ใน src/lib/env.ts เป็นตัวตัดสินว่าจะใช้โหมดไหน — โค้ดในชั้น api.ts ทุกฟังก์ชันมีทั้งสองสาขาเสมอ',
  ),
  h3('2.3.3 ฐานข้อมูลเป็นแหล่งความจริงเดียว (data-driven)'),
  p(
    'รายชื่อแอป หมวดหมู่ประกาศ และค่าตั้งค่าองค์กร ล้วนเก็บในตาราง ไม่ใช่ค่าคงที่ในโค้ด การเพิ่มแอปใหม่หรือหมวดหมู่ใหม่ ' +
      'จึงทำผ่านหน้าเว็บได้เลยโดยไม่ต้องแก้โค้ดหรือ deploy ใหม่',
  ),

  h2('2.4 การตั้งค่าเครื่องพัฒนา'),
  numbered('ติดตั้ง Node.js (แนะนำเวอร์ชัน 22 ขึ้นไป)'),
  numbered('clone repository แล้วเข้าโฟลเดอร์ web'),
  numbered('รัน npm install'),
  numbered('คัดลอก .env.example เป็น .env.local แล้วกรอกค่า (ดูตารางตัวแปรที่ภาคผนวก ก) — ถ้าปล่อยว่างไว้ ระบบจะเข้าโหมดสาธิตอัตโนมัติ'),
  numbered('รัน npm run dev แล้วเปิด http://localhost:5173'),
  spacer(100),
  ...code(
    ['npm install', 'npm run dev          # เปิดเว็บสำหรับพัฒนา (hot reload)', 'npm run verify       # typecheck + test + build ก่อน commit ทุกครั้ง'],
    'คำสั่งที่ใช้บ่อยที่สุด',
  ),

  h2('2.5 ระบบทดสอบอัตโนมัติ'),
  p(
    'ทุกการเปลี่ยนแปลงโค้ดต้องผ่าน npm run verify (typecheck → vitest → build) ก่อน deploy เสมอ ' +
      'นี่คือกฎที่ยึดถือมาตลอดโปรเจกต์หลังจากเคยปล่อยบั๊กขึ้น production เพราะไม่มีการทดสอบมาก่อน',
  ),
  callout(
    'tip',
    'วิธีพิสูจน์ว่าเทสต์ใช้ได้จริง ไม่ใช่แค่เขียนให้ผ่าน',
    'แนวทางที่ใช้ตลอดโปรเจกต์คือ "mutation testing แบบมือ": หลังเขียนเทสต์เสร็จ ให้จงใจใส่บั๊กเดิมกลับเข้าไปในโค้ด ' +
      'ชั่วคราว แล้วรันเทสต์อีกครั้ง ถ้าเทสต์ไม่แดงเลย แปลว่าเทสต์นั้นตรวจจับอะไรไม่ได้จริง ต้องเขียนใหม่ ' +
      'จากนั้นค่อยคืนโค้ดที่ถูกต้อง วิธีนี้ใช้ยืนยันคุณภาพเทสต์ทุกฟีเจอร์ที่เพิ่มเข้ามาในระบบนี้',
  ),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// 3. ฐานข้อมูล
// ---------------------------------------------------------------------------
const ch3 = [
  h1('3. ฐานข้อมูล (Supabase / PostgreSQL)'),

  h2('3.1 ตารางหลัก'),
  ...table(
    ['ตาราง', 'เก็บอะไร', 'RLS สรุป'],
    [
      ['profiles', 'โปรไฟล์พนักงานที่ซิงค์จาก Auth0 (id คือ Auth0 sub)', 'เห็นเฉพาะของตัวเอง ผู้ดูแลเห็นทั้งหมด'],
      ['apps', 'ทะเบียนระบบงานที่แสดงบนพอร์ทัล (internet/intranet)', 'พนักงานเห็นเฉพาะที่เปิดใช้งานและมีสิทธิ์'],
      ['announcements', 'ประกาศข่าวสาร พร้อมกำหนดวันเริ่ม/สิ้นสุด', 'พนักงานเห็นเฉพาะที่เผยแพร่และอยู่ในช่วงเวลา'],
      ['announcement_categories', 'หมวดหมู่ประกาศที่ผู้ดูแลจัดการเอง', 'อ่านได้ทุกคนที่ล็อกอิน แก้ไขเฉพาะผู้ดูแล'],
      ['settings', 'ค่าตั้งค่าองค์กร (ชื่อบริษัท โลโก้ เบอร์ติดต่อ)', 'อ่านได้แม้ยังไม่ล็อกอิน (หน้าล็อกอินต้องใช้)'],
    ],
    [22, 46, 32],
  ),

  h2('3.2 หลักการของ Row Level Security (RLS)'),
  p(
    'ทุกตารางเปิด RLS ไว้เสมอ — ต่อให้มีคน "ยิง API ตรง ๆ" ข้ามหน้าเว็บไปโดยรู้ URL/Key ของ Supabase ' +
      'ก็ยังเห็นได้เฉพาะแถวที่ policy อนุญาตเท่านั้น ด่านความปลอดภัยที่แท้จริงของระบบนี้อยู่ที่ RLS ในฐานข้อมูล ' +
      'ไม่ใช่การซ่อนปุ่มในหน้าเว็บ',
  ),
  callout(
    'critical',
    'ห้ามปิด RLS หรือใช้ service_role key ฝั่งเบราว์เซอร์เด็ดขาด',
    'service_role key ข้าม RLS ได้ทั้งหมด ถ้าหลุดไปอยู่ในโค้ดฝั่งเบราว์เซอร์ ใครก็ตามเปิด Developer Tools ' +
      'จะเห็นและใช้สิทธิ์สูงสุดของฐานข้อมูลได้ทันที เว็บแอปนี้ใช้เฉพาะ anon/publishable key เท่านั้น',
  ),

  h2('3.3 รายการ Migration'),
  ...table(
    ['ไฟล์', 'สรุป'],
    [
      ['0001_init.sql', 'สร้างตารางหลักทั้งหมด (profiles, apps, announcements) พร้อม RLS และฟังก์ชัน sync_profile()'],
      ['0002_seed.sql', 'ข้อมูลตัวอย่าง — แอป NeoPOS (จริง) และแอป intranet แบบร่าง 4 รายการ'],
      ['0003_make_admin.sql', 'ตั้งผู้ดูแลระบบคนแรกจากอีเมล'],
      ['0004_fix_profile_guard.sql', 'แก้ trigger ที่เคยรีเซ็ตสิทธิ์ admin เวลาแก้ไขผ่าน SQL Editor'],
      ['0005_settings.sql', 'ตารางค่าตั้งค่าองค์กร (ชื่อบริษัท โลโก้) แก้ได้จากหน้าเว็บ'],
      ['0006_access_approval.sql', 'ด่านอนุมัติผู้ใช้ — บัญชีนอก AD ต้องรอผู้ดูแลอนุมัติก่อนเห็นข้อมูลใด ๆ'],
      ['0007_announcement_categories_schedule.sql', 'หมวดหมู่ประกาศที่จัดการเองได้ + กำหนดวันเริ่ม/สิ้นสุดประกาศ'],
    ],
    [40, 60],
  ),
  callout(
    'warning',
    'ลำดับสำคัญ: รัน migration ก่อน deploy โค้ดเสมอ',
    'โค้ดฝั่งหน้าเว็บที่เพิ่มเข้ามาใหม่มักอ้างอิงถึงตาราง/คอลัมน์ที่ migration ล่าสุดสร้างขึ้น ถ้า deploy โค้ดก่อนรัน ' +
      'migration บน Supabase เว็บไซต์จริงจะพังทันที (querying คอลัมน์ที่ยังไม่มีอยู่จริง) ทุกครั้งที่มี migration ใหม่ ' +
      'ต้องรันบน Supabase SQL Editor ให้เสร็จและตรวจยืนยันก่อน แล้วค่อย deploy โค้ด',
  ),

  h2('3.4 วิธีรัน Migration ใหม่'),
  numbered('เปิด Supabase Dashboard → SQL Editor → New query'),
  numbered('เปิดไฟล์ migration จากเครื่อง คัดลอกทั้งไฟล์ (ทุกไฟล์เขียนให้รันซ้ำได้ปลอดภัย — idempotent)'),
  numbered('วางแล้วกด Run — ต้องขึ้น "Success. No rows returned"'),
  numbered('รัน query ตรวจยืนยันเฉพาะของ migration นั้น (แต่ละไฟล์มักมี comment บอกวิธีตรวจไว้)'),
  numbered('ตรวจผ่านแล้วจึง deploy โค้ดฝั่งหน้าเว็บ'),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// 4. การยืนยันตัวตน
// ---------------------------------------------------------------------------
const ch4 = [
  h1('4. ระบบยืนยันตัวตน — Auth0 และ Active Directory'),

  h2('4.1 องค์ประกอบใน Auth0'),
  ...table(
    ['รายการ', 'บทบาท'],
    [
      ['Application (SPA)', 'ตัวแทนเว็บแอปพอร์ทัลใน Auth0 — มี Client ID ที่ฝังในโค้ดฝั่งเบราว์เซอร์ได้ (ไม่ใช่ความลับ)'],
      ['API + Audience', 'บังคับให้ Auth0 ออก JWT แบบ RS256 ที่ตรวจสอบลายเซ็นได้ ถ้าไม่มีจะได้ opaque token ที่ Supabase ตรวจไม่ได้'],
      ['Post-Login Action ("Supabase claims")', 'ใส่ custom claims (role, email) และตรวจสมาชิกกลุ่ม AD ก่อนอนุญาตให้ล็อกอิน'],
      ['Database Connection', 'ช่องทางอีเมล+รหัสผ่านของ Auth0 เอง — ยังไม่เปิดใช้งานจริงในระบบนี้'],
      ['Google Connection', 'ช่องทาง "เข้าสู่ระบบด้วยวิธีอื่น" สำหรับพนักงานที่ไม่มีบัญชี AD'],
      ['AD/LDAP Connection ("somjai-ad")', 'ช่องทางหลัก ผูกกับ Active Directory ขององค์กรผ่าน Connector'],
    ],
    [30, 70],
  ),

  h2('4.2 AD/LDAP Connector'),
  p(
    'เป็นโปรแกรมขนาดเล็ก (Node.js) ที่ติดตั้งบนเซิร์ฟเวอร์ Windows ในวง LAN ทำหน้าที่เป็นสะพานเชื่อมระหว่าง Auth0 ' +
      'บนอินเทอร์เน็ตกับ Active Directory ภายในองค์กร เชื่อมต่อออกไปหา Auth0 ผ่านช่องทางขาออก (WebSocket) เท่านั้น ' +
      'จึงไม่ต้องเปิดพอร์ตรับการเชื่อมต่อจากอินเทอร์เน็ตเข้ามาเลย และพนักงานไม่ต้องต่อ VPN ก่อนล็อกอิน',
  ),
  ...table(
    ['รายการ', 'ค่า'],
    [
      ['หน้าตั้งค่า Connector', 'http://localhost:8357 (เข้าได้เฉพาะจากเครื่องที่ติดตั้งเท่านั้น)'],
      ['บัญชีที่ Connector ใช้ผูกกับ AD', 'บัญชีสิทธิ์อ่านอย่างเดียว (Domain Users) ไม่ใช่ Domain Admin'],
      ['LDAP Connection String', 'ldap:// พอร์ต 389 (ชั่วคราว — ดูหมายเหตุด้านล่าง)'],
      ['กลุ่มควบคุมสิทธิ์', 'SSO-Portal-Users — เฉพาะสมาชิกกลุ่มนี้เข้าพอร์ทัลผ่าน AD ได้'],
    ],
    [38, 62],
  ),
  callout(
    'warning',
    'ตอนนี้ใช้ LDAP ไม่เข้ารหัส (พอร์ต 389) ชั่วคราว',
    'ควรเป็น LDAPS (พอร์ต 636) แต่ใบรับรองของ Domain Controller ที่ใช้งานอยู่หมดอายุไปตั้งแต่ปี 2566 ' +
      'ซึ่งเป็นเรื่องที่ทีมดูแล PKI/AD CS ขององค์กรต้องแก้ ไม่ใช่ขอบเขตของโปรเจกต์นี้ ระหว่างนี้รหัสผ่านของพนักงาน ' +
      'วิ่งเป็นข้อความไม่เข้ารหัสในวง LAN ระหว่างเครื่อง Connector กับ Domain Controller เท่านั้น (ไม่ออกนอกองค์กร) ' +
      'ดูรายละเอียดที่บทที่ 8 งานที่ยังค้างอยู่',
  ),

  h2('4.3 การเพิ่มพนักงานให้เข้าพอร์ทัลผ่าน AD ได้'),
  p('ต้องทำสองอย่างให้ครบ มิฉะนั้นพนักงานจะล็อกอินไม่ผ่าน:'),
  bullet('บัญชี AD ต้องมีอีเมลกรอกไว้ (ช่อง E-mail) — ใช้เป็น claim email ที่พอร์ทัลต้องการ'),
  bullet('ต้องอยู่ในกลุ่ม AD ชื่อ SSO-Portal-Users — ไม่งั้น Auth0 จะปฏิเสธก่อนออก token เลย'),
  p('มีสคริปต์ scripts/Add-PortalUser.ps1 ทำทั้งสองอย่างในคำสั่งเดียว ดูวิธีใช้ที่บทที่ 6.5'),

  h2('4.4 ระบบอนุมัติผู้ใช้ (ช่องทางที่ไม่ใช่ AD)'),
  p(
    'พนักงานที่ไม่มีบัญชี AD เข้าได้ด้วย Google แต่ระบบจะสร้างโปรไฟล์ในสถานะ "รออนุมัติ" ' +
      'ให้อัตโนมัติ (is_active = false) จนกว่าผู้ดูแลจะกดอนุมัติในหน้า "จัดการผู้ใช้" — ด่านนี้บังคับที่ระดับ RLS ' +
      'ไม่ใช่แค่ซ่อนที่หน้าเว็บ คนที่ยังไม่อนุมัติจะอ่านตาราง apps และ announcements ไม่ได้เลยไม่ว่าจะพยายามทางไหน',
  ),
  ...table(
    ['ช่องทาง', 'เมื่อล็อกอินครั้งแรก'],
    [
      ['AD (อยู่ในกลุ่ม SSO-Portal-Users)', 'เปิดใช้งานทันที (is_active = true)'],
      ['Google หรือช่องทางอื่น', 'สร้างโปรไฟล์แต่ is_active = false — ต้องรอผู้ดูแลอนุมัติ'],
    ],
    [40, 60],
  ),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// 5. การ Deploy
// ---------------------------------------------------------------------------
const ch5 = [
  h1('5. การ Deploy ขึ้นใช้งานจริง'),

  h2('5.1 Environment Variables ที่ต้องตั้งบน Vercel'),
  ...table(
    ['ตัวแปร', 'ใช้ทำอะไร'],
    [
      ['VITE_AUTH0_DOMAIN', 'โดเมนของ Auth0 tenant'],
      ['VITE_AUTH0_CLIENT_ID', 'Client ID ของ Auth0 Application (SPA)'],
      ['VITE_AUTH0_AUDIENCE', 'Identifier ของ Auth0 API — บังคับให้ได้ JWT แบบ RS256'],
      ['VITE_AUTH0_AD_CONNECTION', 'ชื่อ connection ของ AD (เช่น somjai-ad) — ควบคุมปุ่ม "บัญชีพนักงาน (AD)"'],
      ['VITE_AUTH0_CONNECTION', 'ถ้าตั้งไว้ จะบังคับ connection เดียวสำหรับปุ่ม "เข้าสู่ระบบด้วยวิธีอื่น" (ปกติปล่อยว่าง)'],
      ['VITE_SUPABASE_URL', 'URL ของโปรเจกต์ Supabase'],
      ['VITE_SUPABASE_ANON_KEY', 'anon/publishable key — ไม่ใช่ความลับ ใช้คู่กับ RLS เท่านั้น'],
      ['VITE_COMPANY_NAME', 'ชื่อสำรองตอนหน้าล็อกอินอ่านค่าจาก Supabase ไม่ได้'],
    ],
    [32, 68],
  ),
  callout(
    'critical',
    'ห้ามตั้งค่า service_role key หรือ Client Secret เป็น VITE_* เด็ดขาด',
    'ตัวแปรที่ขึ้นต้นด้วย VITE_ จะถูกฝังลงในไฟล์ JavaScript ที่ทุกคนเปิดดูได้จากเบราว์เซอร์ ' +
      'ใช้ได้เฉพาะค่าที่ตั้งใจให้เป็นสาธารณะเท่านั้น (anon key, Client ID, ชื่อ connection)',
  ),

  h2('5.2 ขั้นตอน Build และ Deploy'),
  numbered('ตรวจว่ามี migration ใหม่ที่ยังไม่ได้รันบน Supabase หรือไม่ ถ้ามีให้รันและตรวจยืนยันให้เสร็จก่อน (ดูบทที่ 3.4)'),
  numbered('รัน npm run verify ในโฟลเดอร์ web — ต้องผ่านทั้ง typecheck, เทสต์ทั้งหมด และ build'),
  numbered('รัน vercel build --prod --yes เพื่อ build ไฟล์ static'),
  numbered('รัน vercel deploy --prebuilt --prod --yes --scope <team> เพื่อ deploy ขึ้น production'),
  numbered('เปิดเว็บไซต์จริงทดสอบ (Incognito) ว่าทำงานถูกต้อง'),
  spacer(100),
  ...code(
    [
      'cd web',
      'npm run verify',
      'npx vercel build --prod --yes',
      'npx vercel deploy --prebuilt --prod --yes --scope ci-o',
    ],
    'ลำดับคำสั่งมาตรฐานสำหรับ deploy หนึ่งรอบ',
  ),

  h2('5.3 Checklist ก่อน Deploy ทุกครั้ง'),
  ...table(
    ['ลำดับ', 'รายการตรวจสอบ'],
    [
      ['1', 'มี migration ใหม่ไหม — ถ้ามี รันบน Supabase และตรวจยืนยันสำเร็จก่อนเสมอ'],
      ['2', 'npm run verify ผ่านทั้งหมด (typecheck, เทสต์, build)'],
      ['3', 'ถ้าแก้ตรรกะสำคัญ ได้ทดสอบด้วยการใส่บั๊กกลับเข้าไปแล้วดูว่าเทสต์จับได้จริง'],
      ['4', 'ตรวจว่าไม่มีความลับ (key, password) หลุดไปในไฟล์ที่จะ commit'],
      ['5', 'หลัง deploy แล้ว เปิดเว็บไซต์จริงทดสอบ golden path อย่างน้อยหนึ่งรอบ'],
    ],
    [10, 90],
  ),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// 6. คู่มือผู้ดูแลระบบ
// ---------------------------------------------------------------------------
const ch6 = [
  h1('6. คู่มือผู้ดูแลระบบ (การใช้งาน)'),
  p('บัญชีที่มีสิทธิ์ "ผู้ดูแลระบบ" (role = admin) จะเห็นเมนู "จัดการแอป", "จัดการผู้ใช้" และ "จัดการประกาศ" เพิ่มจากพนักงานทั่วไป'),

  h2('6.1 หน้าจัดการแอป (/admin/apps)'),
  bullet('เพิ่มแอปใหม่ทั้งฝั่งอินเทอร์เน็ตและอินทราเน็ต — กรอกชื่อ, URL, ไอคอน, สีเน้น, กลุ่มผู้ใช้ที่เห็นได้'),
  bullet('ถ้าแอปต้องผ่าน SSO handshake ก่อนเข้าใช้งาน ให้กรอกช่อง "URL สำหรับเข้าผ่าน SSO" แยกจาก URL ปกติ'),
  bullet('ช่อง "URL ตรวจสอบสถานะ" ใช้แสดงป้ายเขียว/เหลืองบนการ์ด — ถ้าแอปยังเป็น HTTP ให้เว้นว่างไว้ก่อน มิฉะนั้นจะขึ้นป้ายเหลืองตลอด'),
  bullet('ปิดใช้งานแอป (แทนการลบ) ด้วยสวิตช์ "เปิดใช้งาน" — ข้อมูลยังอยู่ แค่ไม่แสดงบนหน้าหลัก'),

  h2('6.2 หน้าจัดการผู้ใช้ (/admin/users)'),
  bullet('แท็บ "รออนุมัติ" แสดงเฉพาะบัญชีที่ยังไม่ได้เปิดใช้งาน (ปกติคือบัญชี Google)'),
  bullet('กด "อนุมัติ" เพื่อเปิดใช้งาน หรือ "ระงับการใช้งาน" เพื่อปิดสิทธิ์ชั่วคราว'),
  bullet('เปลี่ยนสิทธิ์ระหว่าง "พนักงาน" กับ "ผู้ดูแลระบบ" ได้จาก dropdown'),
  callout(
    'note',
    'ด่านป้องกันในตัว',
    'ระบบห้ามแก้ไขบัญชีของตัวเอง และห้ามถอดสิทธิ์หรือระงับผู้ดูแลระบบคนสุดท้ายที่ยังใช้งานได้ — ' +
      'กันไม่ให้เผลอลบสิทธิ์ตัวเองจนต้องกลับไปแก้ด้วย SQL',
  ),

  h2('6.3 หน้าจัดการประกาศ (/admin/announcements)'),
  bullet('เพิ่ม/แก้ไข/ลบประกาศ — เลือกหมวดหมู่ ปักหมุด และเลือกว่าจะเผยแพร่ทันทีหรือเก็บเป็นฉบับร่าง'),
  bullet('กำหนด "วันเริ่มแสดง" และ "วันสิ้นสุด" ได้ — ปล่อยว่างทั้งคู่ = แสดงตลอดไปตั้งแต่เผยแพร่'),
  bullet('พ้นวันสิ้นสุดแล้ว ประกาศหายไปจากหน้าหลักเองโดยอัตโนมัติ ไม่ต้องมาลบทีหลัง'),
  h3('จัดการหมวดหมู่ (การ์ด "จัดการหมวดหมู่" ในหน้าเดียวกัน)'),
  bullet('เพิ่มหมวดหมู่ใหม่ได้เอง — พิมพ์ชื่อ เลือกสี กด "+ เพิ่มหมวดหมู่"'),
  bullet('แก้ไขชื่อ/สีของหมวดหมู่เดิมได้ทุกเมื่อ'),
  bullet('ลบหมวดหมู่ที่ยังมีประกาศใช้งานอยู่ไม่ได้ — ต้องย้ายประกาศไปหมวดอื่นก่อน ระบบกันไว้ทั้งที่หน้าเว็บและระดับฐานข้อมูล'),

  h2('6.4 ตั้งค่าองค์กร'),
  p('ปรับชื่อบริษัทและโลโก้ได้จากการ์ด "ตั้งค่าองค์กร" ในหน้าจัดการแอป — มีผลทันทีทั้งบนหัวเว็บและหน้าล็อกอิน โดยไม่ต้อง deploy ใหม่'),

  h2('6.5 การเพิ่มพนักงานใหม่เข้าใช้พอร์ทัลผ่าน AD'),
  p('ใช้สคริปต์ Add-PortalUser.ps1 ซึ่งตั้งอีเมลและเพิ่มเข้ากลุ่ม SSO-Portal-Users ให้ในคำสั่งเดียว รันซ้ำได้อย่างปลอดภัย'),
  ...code(
    [
      '# พนักงานมีบัญชี AD อยู่แล้ว แค่ยังเข้าพอร์ทัลไม่ได้',
      '.\\Add-PortalUser.ps1 -Username somchai.jai -Email somchai.jai@somjai.co.th',
      '',
      '# พนักงานใหม่ ยังไม่เคยมีบัญชี AD มาก่อน',
      '.\\Add-PortalUser.ps1 -New -Username somchai.jai -FullName \'Somchai Jaidee\' -Email somchai.jai@somjai.co.th',
    ],
    'รันบนเซิร์ฟเวอร์ที่ติดตั้ง AD/LDAP Connector ด้วยสิทธิ์ Administrator',
  ),
  callout(
    'tip',
    'รูปแบบชื่อผู้ใช้ตอนล็อกอิน',
    'พนักงานต้องพิมพ์ชื่อผู้ใช้เปล่า ๆ เช่น somchai.jai ห้ามใส่ชื่อโดเมนนำหน้า (เช่น SOMJAIAD01\\somchai.jai) ' +
      'เพราะ Connector ค้นหาด้วย sAMAccountName โดยตรง',
  ),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// 7. การแก้ไขปัญหาที่พบบ่อย
// ---------------------------------------------------------------------------
const ch7 = [
  h1('7. การแก้ไขปัญหาที่พบบ่อย'),
  p('รวบรวมจากปัญหาที่พบจริงระหว่างพัฒนาและตั้งค่าระบบ พร้อมสาเหตุและวิธีแก้'),
  ...table(
    ['อาการ', 'สาเหตุ', 'วิธีแก้'],
    [
      [
        '"เชื่อมต่อฐานข้อมูลไม่สำเร็จ: Missing Refresh Token"',
        'Auth0Provider ไม่ได้ขอ scope offline_access ทั้งที่เปิด useRefreshTokens',
        'ตรวจว่า scope มี offline_access และเปิด "Allow Offline Access" ที่ API ใน Auth0 แล้ว',
      ],
      [
        'ผู้ใช้ล็อกอินค้าง ต้องล้างแคชเบราว์เซอร์เอง',
        'แคชโทเคนเก่าไม่มี refresh token (ล็อกอินไว้ก่อนเปิด offline_access)',
        'ระบบมีกลไกล้างแคชและพาไปล็อกอินใหม่อัตโนมัติอยู่แล้ว ถ้ายังไม่หาย ให้กดปุ่ม "เข้าสู่ระบบใหม่" ที่ขึ้นมา',
      ],
      [
        '"JWT issued at future" (PGRST303)',
        'นาฬิกาของเซิร์ฟเวอร์ Auth0 กับ Supabase คลาดเคลื่อนกันชั่วคราว',
        'ลองล็อกอินใหม่อีกครั้ง ถ้าเป็นซ้ำต่อเนื่องต้องแจ้ง Supabase Support (เป็นเรื่องฝั่งเซิร์ฟเวอร์เขา)',
      ],
      [
        'หน้าล็อกอินอ่านชื่อบริษัท/โลโก้ไม่ได้ ขึ้นค่า default แทน',
        'ฟังก์ชันขอ token คืนสตริงว่างตอนยังไม่ล็อกอิน supabase-js ส่ง Authorization header ผิดรูป',
        'ต้องคืน anon key แทนสตริงว่างเสมอเมื่อยังไม่ล็อกอิน (แก้แล้วในโค้ดปัจจุบัน)',
      ],
      [
        '"ForbiddenError: invalid csrf token" ที่หน้าตั้งค่า Connector',
        'แท็บเบราว์เซอร์เปิดค้างจากก่อนบริการรีสตาร์ต โทเคนหมดอายุ',
        'กด F5 โหลดหน้า http://localhost:8357 ใหม่ก่อนแก้ค่าทุกครั้ง',
      ],
      [
        '"cannot bind to ldap" ตอนตั้งค่า Connector',
        'รหัสผ่านของบัญชีบริการผิด (พิมพ์ผิดตอนใส่ในฟอร์ม)',
        'ตั้งรหัสผ่านใหม่ด้วย Set-ADAccountPassword แล้วทดสอบ bind ด้วย PowerShell ก่อนเอาไปใส่ในฟอร์ม',
      ],
      [
        'ล็อกอิน AD ไม่ผ่าน ทั้งที่รหัสผ่านถูก',
        'พิมพ์ชื่อผู้ใช้แบบ DOMAIN\\username ซึ่ง Connector ไม่รองรับ',
        'ใช้ sAMAccountName เปล่า ๆ เท่านั้น เช่น jakkapong.duk',
      ],
      [
        'LDAPS (พอร์ต 636) ทำให้ Connector ตายเงียบ ๆ',
        'ใบรับรองของ Domain Controller หมดอายุหรือเครื่อง Connector ไม่เชื่อถือ CA ที่ออกใบรับรอง',
        'ตรวจด้วยการทำ TLS handshake ตรงจากเครื่อง Connector ก่อนเสมอ อย่าเดา ถ้าใบรับรองหมดอายุต้องแจ้งทีม PKI',
      ],
      [
        'ช่อง select ในหน้าจัดการ (สิทธิ์/หมวดหมู่) ไม่แสดงข้อความ',
        'padding ของ select แน่นเกินไป ตัดข้อความในบางเบราว์เซอร์ (พบใน Windows Chrome)',
        'กำหนดความสูงคงที่ (h-9) และสีพื้นหลัง/ตัวอักษรชัดเจน แทนการพึ่ง padding บีบแน่น',
      ],
    ],
    [26, 34, 40],
  ),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// 8. งานที่ยังค้างอยู่
// ---------------------------------------------------------------------------
const ch8 = [
  h1('8. งานที่ยังค้างอยู่'),
  ...table(
    ['งาน', 'สถานะ', 'รายละเอียด'],
    [
      [
        'เปลี่ยน AD/LDAP Connector ไปใช้ LDAPS',
        'พักไว้ — รอทีมอื่น',
        'ใบรับรองของ Domain Controller (SV000ITD12) หมดอายุตั้งแต่ 11 ก.ค. 2566 ต้องให้ทีมดูแล ' +
          'AD CS/PKI ต่ออายุก่อน ไม่ใช่งานที่แก้จากฝั่งพอร์ทัลได้',
      ],
      [
        'ทำ HTTPS ให้เว็บ intranet บน IIS',
        'พักไว้ — ยังไม่มีความจำเป็น',
        'ยังไม่มีแอป intranet จริงเชื่อมเข้าพอร์ทัล (มีแต่ตัวอย่างร่าง 4 รายการที่ปิดใช้งานอยู่) คู่มืออยู่ที่ SSO-OPS-002 พร้อมใช้เมื่อถึงเวลา',
      ],
      [
        'เชื่อมต่อ NeoPOS เข้ากับ Auth0',
        'พักไว้ตามคำสั่ง',
        'โค้ดฝั่ง NeoPOS เขียนเสร็จแล้วในอีก repository (myrepo) แต่ยังไม่ deploy ตามที่ผู้ดูแลระบบสั่งให้คงไว้ที่เดิมก่อน',
      ],
      [
        'กรอกอีเมลให้พนักงานที่ยังไม่มีใน AD',
        'ไม่ต้องทำ ตามคำสั่ง',
        'พนักงานกลุ่มนี้ (ประมาณ 7 คน) จะเข้าพอร์ทัลผ่านช่องทาง Google แทน และต้องรอผู้ดูแลอนุมัติทุกครั้งที่เป็นบัญชีใหม่',
      ],
    ],
    [26, 20, 54],
  ),
  pageBreak(),
]

// ---------------------------------------------------------------------------
// ภาคผนวก
// ---------------------------------------------------------------------------
const appendix = [
  h1('ภาคผนวก ก — Environment Variables ทั้งหมด'),
  ...table(
    ['ตัวแปร', 'จำเป็นสำหรับ'],
    [
      ['VITE_AUTH0_DOMAIN', 'โหมดจริง'],
      ['VITE_AUTH0_CLIENT_ID', 'โหมดจริง'],
      ['VITE_AUTH0_AUDIENCE', 'โหมดจริง'],
      ['VITE_AUTH0_AD_CONNECTION', 'ปุ่มล็อกอินด้วย AD (ไม่ตั้งก็ได้ แต่จะไม่มีปุ่มนี้)'],
      ['VITE_AUTH0_CONNECTION', 'ทางเลือก — บังคับ connection เดียว'],
      ['VITE_SUPABASE_URL', 'โหมดจริง'],
      ['VITE_SUPABASE_ANON_KEY', 'โหมดจริง'],
      ['VITE_COMPANY_NAME', 'ทางเลือก — ค่าสำรอง'],
      ['VITE_HEALTH_POLL_SECONDS', 'ทางเลือก — ค่าเริ่มต้น 45 วินาที'],
      ['VITE_HEALTH_TIMEOUT_MS', 'ทางเลือก — ค่าเริ่มต้น 2500 มิลลิวินาที'],
    ],
    [40, 60],
  ),

  h1('ภาคผนวก ข — สิ่งที่ผู้รับช่วงดูแลต้องขอสิทธิ์เข้าถึง'),
  ...table(
    ['ระบบ', 'สิทธิ์ที่ต้องขอ'],
    [
      ['Vercel', 'สมาชิกทีม (team) ที่ project เชื่อมอยู่ — ดู deployment และแก้ environment variables'],
      ['Auth0', 'สิทธิ์ผู้ดูแล tenant — แก้ Application, API, Actions, Connections'],
      ['Supabase', 'เจ้าของหรือผู้ดูแลโปรเจกต์ — เข้า SQL Editor และดู logs'],
      ['GitHub', 'สิทธิ์ push เข้า repository (เป็น public แล้ว อ่านได้ทุกคนแต่เขียนต้องได้รับเชิญ)'],
      ['Active Directory', 'สิทธิ์จัดการกลุ่ม SSO-Portal-Users และดูแลเครื่องที่ติดตั้ง AD/LDAP Connector'],
    ],
    [24, 76],
  ),

  h1('ภาคผนวก ค — รายการตรวจสอบส่งมอบงาน'),
  ...table(
    ['ลำดับ', 'รายการ', 'ผล'],
    [
      ['1', 'ได้รับสิทธิ์เข้าถึงครบทั้ง 5 ระบบตามภาคผนวก ข', ''],
      ['2', 'clone repository และรัน npm run dev ขึ้นสำเร็จบนเครื่องตัวเอง', ''],
      ['3', 'รัน npm run verify ผ่านทั้งหมดบนเครื่องตัวเอง', ''],
      ['4', 'เข้าใจลำดับ "migration ก่อน โค้ดทีหลัง" ก่อน deploy ทุกครั้ง', ''],
      ['5', 'ทดลองเพิ่ม/แก้ไข/ลบ แอป ผู้ใช้ และประกาศจากหน้าเว็บจริงแล้วอย่างน้อยหนึ่งรอบ', ''],
      ['6', 'ทราบตำแหน่งเอกสารที่เกี่ยวข้องทั้งหมด (SSO-OPS-001/002/003, SSO-USR-001)', ''],
      ['7', 'ทราบรายการงานที่ยังค้างอยู่ตามบทที่ 8', ''],
    ],
    [8, 74, 18],
  ),
  spacer(400),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run('— จบเอกสาร —', { size: 20, color: GREY })],
  }),
]

// ---------------------------------------------------------------------------
// ประกอบเอกสาร
// ---------------------------------------------------------------------------
const doc = new Document({
  creator: DOC.owner,
  title: DOC.title,
  description: DOC.subtitle,
  numbering: {
    config: [
      {
        reference: 'steps',
        levels: [
          { level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720, hanging: 340 } } } },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 30, bold: true, color: NAVY } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 25, bold: true, color: NAVY } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 22, bold: true, color: GREY } },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
          margin: {
            top: convertMillimetersToTwip(25), bottom: convertMillimetersToTwip(22),
            left: convertMillimetersToTwip(25), right: convertMillimetersToTwip(20),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              tabStops: [{ type: 'right', position: 9600 }],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
              children: [
                run(`${DOC.code}  |  ${DOC.title}`, { size: 16, color: GREY }),
                run('\t' + DOC.classification, { size: 16, color: 'C0392B' }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              tabStops: [{ type: 'right', position: 9600 }],
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
              children: [
                run(`เวอร์ชัน ${DOC.version}  |  ${DOC.date}`, { size: 16, color: GREY }),
                new TextRun({ text: '\tหน้า ', font: FONT, size: 16, color: GREY }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GREY }),
                new TextRun({ text: ' จาก ', font: FONT, size: 16, color: GREY }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GREY }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...cover, ...control, ...toc,
        ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...ch6, ...ch7, ...ch8, ...appendix,
      ],
    },
  ],
})

const out = new URL('../คู่มือระบบ Company Portal ฉบับสมบูรณ์.docx', import.meta.url)
const buffer = await Packer.toBuffer(doc)
writeFileSync(out, buffer)
console.log('สร้างเอกสารแล้ว:', decodeURIComponent(out.pathname).replace(/^\//, ''))
console.log('ขนาด:', (buffer.length / 1024).toFixed(1), 'KB')
