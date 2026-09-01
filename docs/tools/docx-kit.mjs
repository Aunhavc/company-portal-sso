/**
 * docx-kit.mjs — ส่วนประกอบเอกสารที่ใช้ร่วมกันทุกคู่มือ
 * (หัวข้อ ตาราง บล็อกโค้ด กล่องข้อความเน้น หน้าปก header/footer)
 */
import {
  AlignmentType, BorderStyle, Footer, Header, HeadingLevel, ImageRun, PageBreak,
  PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun,
  VerticalAlign, WidthType, convertMillimetersToTwip,
} from 'docx'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const FONT = 'Tahoma'          // รองรับภาษาไทยและมีอยู่ในทุกเครื่อง Windows
export const MONO = 'Consolas'
export const NAVY = '1F3864'
export const GREY = '595959'
export const RULE = 'BFBFBF'
export const HEAD_BG = 'E7E9F2'
export const CODE_BG = 'F4F5F7'

export const run = (text, o = {}) => new TextRun({ text, font: FONT, ...o })

export const p = (text, o = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 300 },
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    ...o.paragraph,
    children: Array.isArray(text) ? text : [run(text, { size: 22, ...o.run })],
  })

export const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
    children: [run(text, { size: 30, bold: true, color: NAVY })],
  })

export const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    children: [run(text, { size: 25, bold: true, color: NAVY })],
  })

export const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [run(text, { size: 22, bold: true, color: GREY })],
  })

export const bullet = (text, level = 0) =>
  new Paragraph({
    bullet: { level },
    spacing: { after: 80, line: 290 },
    children: [run(text, { size: 22 })],
  })

export const numbered = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: 'steps', level },
    spacing: { after: 80, line: 290 },
    children: [run(text, { size: 22 })],
  })

export const cap = (text) =>
  new Paragraph({
    spacing: { before: 60, after: 60 },
    alignment: AlignmentType.LEFT,
    children: [run(text, { size: 18, italics: true, color: GREY })],
  })

export const box = (color) => ({
  top: { style: BorderStyle.SINGLE, size: 4, color },
  bottom: { style: BorderStyle.SINGLE, size: 4, color },
  left: { style: BorderStyle.SINGLE, size: 4, color },
  right: { style: BorderStyle.SINGLE, size: 4, color },
})

export const spacer = (after = 200) => new Paragraph({ spacing: { after }, children: [] })
export const pageBreak = () => new Paragraph({ children: [new PageBreak()] })

// ---------------------------------------------------------------------------
// ภาพประกอบ
// ---------------------------------------------------------------------------
const SCREENS = join(dirname(fileURLToPath(import.meta.url)), '..', 'screens')

/** อ่านขนาดจริงของไฟล์ PNG จากส่วนหัว IHDR */
function pngSize(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('ไม่ใช่ไฟล์ PNG')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

let figureNo = 0
export const resetFigureCounter = () => { figureNo = 0 }

/**
 * ภาพประกอบพร้อมคำบรรยายและเลขที่ภาพ
 * ภาพถ่ายที่ deviceScaleFactor 2 จึงย่อลงครึ่งหนึ่งเพื่อให้คมบนกระดาษ
 *
 * @param {string} name   ชื่อไฟล์ใน docs/screens (ไม่ต้องใส่ .png)
 * @param {string} caption คำบรรยายใต้ภาพ
 * @param {number} maxWidth ความกว้างสูงสุดเป็นพิกเซล (พื้นที่พิมพ์ ≈ 620)
 */
export const figure = (name, caption, maxWidth = 600) => {
  const data = readFileSync(join(SCREENS, name + '.png'))
  const { width, height } = pngSize(data)
  const w = Math.min(maxWidth, width / 2)
  const h = Math.round((height / width) * w)
  figureNo += 1

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      children: [
        new ImageRun({ type: 'png', data, transformation: { width: Math.round(w), height: h } }),
      ],
      border: box(RULE),
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [
        run(`ภาพที่ ${figureNo}  `, { size: 18, bold: true, color: NAVY }),
        run(caption, { size: 18, color: GREY }),
      ],
    }),
  ]
}

/** บล็อกโค้ด — พื้นเทา ฟอนต์ monospace */
export const code = (lines, caption) => {
  const rows = (Array.isArray(lines) ? lines : lines.split('\n')).map(
    (line) =>
      new Paragraph({
        spacing: { after: 0, line: 250 },
        indent: { left: convertMillimetersToTwip(3) },
        children: [new TextRun({ text: line || ' ', font: MONO, size: 17 })],
      }),
  )
  const out = [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [new TableCell({
          shading: { type: ShadingType.CLEAR, fill: CODE_BG },
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          borders: box(RULE),
          children: rows,
        })],
      })],
    }),
  ]
  if (caption) out.push(cap(caption))
  out.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
  return out
}

/** กล่องข้อความเน้น: critical / warning / note / tip */
export const callout = (kind, title, text) => {
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
export const table = (headers, rows, widths) => {
  const w = widths ?? headers.map(() => Math.floor(100 / headers.length))

  const headRow = new TableRow({
    tableHeader: true,
    children: headers.map((t, i) =>
      new TableCell({
        width: { size: w[i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: HEAD_BG },
        borders: box(RULE),
        margins: { top: 90, bottom: 90, left: 110, right: 110 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ spacing: { after: 0 }, children: [run(t, { size: 20, bold: true, color: NAVY })] })],
      }),
    ),
  })

  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map((cellText, i) =>
          new TableCell({
            width: { size: w[i], type: WidthType.PERCENTAGE },
            borders: box(RULE),
            margins: { top: 90, bottom: 90, left: 110, right: 110 },
            verticalAlign: VerticalAlign.TOP,
            children: String(cellText).split('\n').map((line) =>
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

/** หน้าปกมาตรฐาน */
export const coverPage = (DOC, rows) => [
  spacer(1400),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run(DOC.classification.toUpperCase(), { size: 18, bold: true, color: 'C0392B', characterSpacing: 30 })],
  }),
  spacer(600),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 140 },
    children: [run(DOC.title, { size: 44, bold: true, color: NAVY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 500 },
    children: [run(DOC.subtitle, { size: 26, color: GREY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 700 },
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 10 } },
    children: [],
  }),
  ...table(['รายการ', 'รายละเอียด'], rows, [32, 68]),
  pageBreak(),
]

/** header + footer ที่มีเลขหน้า */
export const chrome = (DOC) => ({
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
})

/** ค่าตั้งต้นของเอกสาร: ขนาดหน้า ระยะขอบ สไตล์หัวข้อ เลขลำดับขั้นตอน */
export const docDefaults = {
  numbering: {
    config: [{
      reference: 'steps',
      levels: [{
        level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 720, hanging: 340 } } },
      }],
    }],
  },
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 30, bold: true, color: NAVY } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 25, bold: true, color: NAVY } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 22, bold: true, color: GREY } },
    ],
  },
}

export const pageProperties = {
  page: {
    size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
    margin: {
      top: convertMillimetersToTwip(25), bottom: convertMillimetersToTwip(22),
      left: convertMillimetersToTwip(25), right: convertMillimetersToTwip(20),
    },
  },
}
