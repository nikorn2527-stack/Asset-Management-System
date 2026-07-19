import type { BorrowRecord, WriteoffRecord } from '@/types';

// ─── New V2 Template Interfaces ─────────────────────────────────────────────

export interface BorrowFormTemplateData {
  documentNumber?: string;
  organizationName?: string;
  borrowerName: string;
  borrowerDepartment: string;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: string;
  notes?: string;
  approvedByName?: string;
  assets: Array<{
    sku: string;
    name: string;
    categoryName: string;
    currentValue: number;
    location: string;
  }>;
}

export interface WriteoffFormTemplateData {
  documentNumber?: string;
  organizationName?: string;
  assetSku: string;
  assetName: string;
  categoryName: string;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  reason: string;
  reasonLabel: string;
  description: string;
  date: string;
  approvedByName?: string;
}

// ─── New V2 Template Styles ─────────────────────────────────────────────────

const NOTO_FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">';

const FORM_V2_STYLES = `
  @page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Thai', 'Sarabun', sans-serif;
    font-size: 14px;
    line-height: 1.7;
    color: #1a1a1a;
    background: #fff;
    padding: 0;
  }
  .v2-container {
    max-width: 700px;
    margin: 0 auto;
    padding: 0;
  }
  .v2-header {
    border: 2px solid #333;
    border-bottom: none;
    padding: 16px 20px;
    text-align: center;
  }
  .v2-header .org-name {
    font-size: 16px;
    font-weight: 600;
    color: #1b5e20;
    margin-bottom: 6px;
  }
  .v2-header h1 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .v2-header .form-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #555;
  }
  .v2-header .form-meta .doc-num {
    font-family: monospace;
    background: #f5f5f5;
    padding: 2px 8px;
    border: 1px solid #ddd;
    border-radius: 3px;
    font-size: 12px;
  }
  .v2-border-wrap {
    border: 2px solid #333;
    border-top: none;
    padding: 20px;
  }
  .v2-section-title {
    font-size: 14px;
    font-weight: 700;
    margin: 18px 0 8px;
    padding-bottom: 4px;
    border-bottom: 2px solid #2e7d32;
    color: #1b5e20;
  }
  .v2-section-title:first-child { margin-top: 0; }
  .v2-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .v2-table th,
  .v2-table td {
    border: 1px solid #333;
    padding: 7px 10px;
    text-align: left;
    vertical-align: top;
  }
  .v2-table th {
    background: #e8f5e9;
    font-weight: 600;
    white-space: nowrap;
    width: 140px;
    color: #1b5e20;
  }
  .v2-table td {
    color: #333;
  }
  .v2-table .header-row th {
    background: #2e7d32;
    color: #fff;
    text-align: center;
    font-size: 13px;
    padding: 6px 8px;
    width: auto;
  }
  .v2-table .header-row + tr td {
    text-align: center;
  }
  .v2-table .col-no { width: 40px; text-align: center; }
  .v2-signature-section {
    margin-top: 36px;
    display: flex;
    justify-content: space-between;
    page-break-inside: avoid;
  }
  .v2-sig-box {
    text-align: center;
    width: 30%;
  }
  .v2-sig-box .sig-label {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 50px;
  }
  .v2-sig-box .sig-name {
    border-top: 1px dashed #333;
    padding-top: 4px;
    font-size: 13px;
    font-weight: 600;
    min-width: 140px;
    margin: 0 auto;
  }
  .v2-sig-box .sig-date {
    font-size: 11px;
    color: #666;
    margin-top: 4px;
  }
  .v2-sig-box .sig-role {
    font-size: 12px;
    color: #666;
    margin-top: 2px;
  }
  .v2-footer {
    margin-top: 32px;
    padding-top: 8px;
    border-top: 1px solid #ccc;
    font-size: 11px;
    color: #888;
    text-align: center;
  }
  .v2-footer .copy-notice {
    font-style: italic;
    font-size: 11px;
    color: #666;
    margin-bottom: 6px;
  }
  .v2-notes-box {
    background: #fafafa;
    border: 1px solid #ddd;
    padding: 10px 12px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .v2-notes-box .notes-label {
    font-weight: 600;
    color: #555;
    margin-bottom: 4px;
  }
`;

const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">';

const BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a1a;
    background: #fff;
    padding: 0;
  }
  .container {
    max-width: 680px;
    margin: 0 auto;
    padding: 20px 10px;
  }
  .header {
    text-align: center;
    border-bottom: 3px double #333;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .header h1 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .header .org-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .header .form-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #555;
  }
  .header .ref-code {
    font-family: monospace;
    background: #f5f5f5;
    padding: 2px 8px;
    border: 1px solid #ddd;
    border-radius: 3px;
    font-size: 12px;
  }
  .section-title {
    font-size: 15px;
    font-weight: 700;
    margin: 16px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #ccc;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 13px;
  }
  th, td {
    border: 1px solid #999;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #e8f5e9;
    font-weight: 600;
    white-space: nowrap;
    width: 140px;
    color: #1b5e20;
  }
  td {
    color: #333;
  }
  .asset-table th {
    background: #2e7d32;
    color: #fff;
    text-align: center;
    font-size: 13px;
    padding: 6px 8px;
  }
  .asset-table td {
    text-align: center;
  }
  .signature-section {
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
    page-break-inside: avoid;
  }
  .signature-box {
    text-align: center;
    width: 30%;
  }
  .signature-box .label {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 60px;
  }
  .signature-box .name {
    border-top: 1px solid #333;
    padding-top: 4px;
    font-size: 13px;
    font-weight: 600;
    min-width: 150px;
    margin: 0 auto;
  }
  .signature-box .role {
    font-size: 12px;
    color: #666;
    margin-top: 2px;
  }
  .footer {
    margin-top: 40px;
    padding-top: 8px;
    border-top: 1px solid #ccc;
    font-size: 11px;
    color: #888;
    text-align: center;
  }
  .notes-section {
    background: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 10px 12px;
    margin-bottom: 16px;
    font-size: 13px;
  }
  .notes-section .label {
    font-weight: 600;
    color: #555;
    margin-bottom: 4px;
  }
`;

function generateRefCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REF-${y}${m}${d}-${rand}`;
}

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatThaiDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH').format(Math.round(value)) + ' บาท';
}

function safeStr(val: unknown, fallback = '-'): string {
  if (val === null || val === undefined || val === '') return fallback;
  return String(val);
}

export interface BorrowFormData {
  record: BorrowRecord;
}

export interface WriteoffFormData {
  record: WriteoffRecord;
}

// ─── V2 Template Functions ──────────────────────────────────────────────────

function formatThaiDateV2(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrencyV2(value: number): string {
  return new Intl.NumberFormat('th-TH').format(Math.round(value)) + ' บาท';
}

function safeStrV2(val: unknown, fallback = '-'): string {
  if (val === null || val === undefined || val === '') return fallback;
  return String(val);
}

function generateRefCodeV2(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REF-${y}${m}${d}-${rand}`;
}

export function generateBorrowFormHtml(data: BorrowFormTemplateData): string {
  const refCode = data.documentNumber || generateRefCodeV2();
  const orgName = data.organizationName || 'ระบบบริหารจัดการครุภัณฑ์';
  const now = new Date().toLocaleString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const statusLabels: Record<string, string> = {
    PENDING: 'รออนุมัติ', APPROVED: 'อนุมัติ', REJECTED: 'ปฏิเสธ',
    RETURNED: 'คืนแล้ว', OVERDUE: 'เกินกำหนด',
  };
  const statusLabel = statusLabels[data.status] || data.status;

  const assetRows = data.assets.map((a, i) => `
        <tr>
          <td class="col-no">${i + 1}</td>
          <td style="font-family:monospace;">${safeStrV2(a.sku)}</td>
          <td style="font-weight:600;">${safeStrV2(a.name)}</td>
          <td>${safeStrV2(a.categoryName)}</td>
          <td style="text-align:right;">${formatCurrencyV2(a.currentValue)}</td>
          <td>${safeStrV2(a.location)}</td>
        </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  ${NOTO_FONT_LINK}
  <style>${FORM_V2_STYLES}</style>
</head>
<body>
  <div class="v2-container">
    <div class="v2-header">
      <div class="org-name">${orgName}</div>
      <h1>แบบฟอร์มคำขอยืม-คืนครุภัณฑ์</h1>
      <div class="form-meta">
        <span>เลขที่เอกสาร: <span class="doc-num">${refCode}</span></span>
        <span>วันที่ออก: ${now}</span>
      </div>
    </div>
    <div class="v2-border-wrap">
      <div class="v2-section-title">ข้อมูลผู้ยืม</div>
      <table class="v2-table">
        <tr>
          <th>ชื่อผู้ยืม</th>
          <td>${safeStrV2(data.borrowerName)}</td>
          <th>แผนก</th>
          <td>${safeStrV2(data.borrowerDepartment)}</td>
        </tr>
        <tr>
          <th>วันที่ยืม</th>
          <td>${formatThaiDateV2(data.borrowDate)}</td>
          <th>วันคืนที่คาด</th>
          <td>${formatThaiDateV2(data.expectedReturnDate)}</td>
        </tr>
        ${data.actualReturnDate ? `
        <tr>
          <th>วันที่คืนจริง</th>
          <td colspan="3">${formatThaiDateV2(data.actualReturnDate)}</td>
        </tr>` : ''}
        <tr>
          <th>สถานะ</th>
          <td colspan="3"><strong>${statusLabel}</strong></td>
        </tr>
      </table>

      <div class="v2-section-title">รายละเอียดครุภัณฑ์</div>
      <table class="v2-table">
        <thead>
          <tr class="header-row">
            <th class="col-no">ลำดับ</th>
            <th>รหัส</th>
            <th>ชื่อครุภัณฑ์</th>
            <th>หมวดหมู่</th>
            <th>มูลค่า</th>
            <th>สถานที่</th>
          </tr>
        </thead>
        <tbody>
          ${assetRows}
        </tbody>
      </table>

      ${data.notes ? `
      <div class="v2-section-title">หมายเหตุ</div>
      <div class="v2-notes-box">
        <div class="notes-label">หมายเหตุ:</div>
        ${data.notes}
      </div>` : ''}

      <div class="v2-signature-section">
        <div class="v2-sig-box">
          <div class="sig-label">ลงชื่อ ผู้ขอยืม</div>
          <div class="sig-name">${safeStrV2(data.borrowerName, '................................')}</div>
          <div class="sig-role">(${safeStrV2(data.borrowerDepartment, '.................................')})</div>
          <div class="sig-date">วันที่ ...../...../........</div>
        </div>
        <div class="v2-sig-box">
          <div class="sig-label">ลงชื่อ ผู้อนุมัติ</div>
          <div class="sig-name">${safeStrV2(data.approvedByName, '................................')}</div>
          <div class="sig-role">(${data.approvedByName ? 'ผู้มีอำนาจอนุมัติ' : '.................................'})</div>
          <div class="sig-date">วันที่ ...../...../........</div>
        </div>
        <div class="v2-sig-box">
          <div class="sig-label">ลงชื่อ ผู้รับคืน</div>
          <div class="sig-name">................................</div>
          <div class="sig-role">(................................)</div>
          <div class="sig-date">วันที่ ...../...../........</div>
        </div>
      </div>
    </div>

    <div class="v2-footer">
      <div class="copy-notice">ใบนี้เป็นสำเนาที่ถูกต้อง จัดทำโดยระบบบริหารจัดการครุภัณฑ์</div>
      <div>เลขที่อ้างอิง: ${refCode} | วันที่จัดทำ: ${now}</div>
    </div>
  </div>
</body>
</html>`;
}

export function generateWriteoffFormHtml(data: WriteoffFormTemplateData): string {
  const refCode = data.documentNumber || generateRefCodeV2();
  const orgName = data.organizationName || 'ระบบบริหารจัดการครุภัณฑ์';
  const now = new Date().toLocaleString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const originalValue = data.purchasePrice;
  const currentValue = data.currentValue;
  const accumulatedDep = Math.max(0, originalValue - currentValue);

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  ${NOTO_FONT_LINK}
  <style>${FORM_V2_STYLES}</style>
</head>
<body>
  <div class="v2-container">
    <div class="v2-header">
      <div class="org-name">${orgName}</div>
      <h1>แบบฟอร์มการตัดจำหน่ายครุภัณฑ์</h1>
      <div class="form-meta">
        <span>เลขที่เอกสาร: <span class="doc-num">${refCode}</span></span>
        <span>วันที่ออก: ${now}</span>
      </div>
    </div>
    <div class="v2-border-wrap">
      <div class="v2-section-title">รายละเอียดครุภัณฑ์</div>
      <table class="v2-table">
        <tr>
          <th>รหัสครุภัณฑ์</th>
          <td style="font-family:monospace;">${safeStrV2(data.assetSku)}</td>
          <th>ชื่อครุภัณฑ์</th>
          <td style="font-weight:600;">${safeStrV2(data.assetName)}</td>
        </tr>
        <tr>
          <th>หมวดหมู่</th>
          <td>${safeStrV2(data.categoryName)}</td>
          <th>วันที่จัดซื้อ</th>
          <td>${formatThaiDateV2(data.purchaseDate)}</td>
        </tr>
        <tr>
          <th>ราคาซื้อ</th>
          <td>${formatCurrencyV2(data.purchasePrice)}</td>
          <th>มูลค่าปัจจุบัน</th>
          <td>${formatCurrencyV2(data.currentValue)}</td>
        </tr>
      </table>

      <div class="v2-section-title">รายละเอียดการตัดจำหน่าย</div>
      <table class="v2-table">
        <tr>
          <th>สาเหตุ</th>
          <td><strong>${safeStrV2(data.reasonLabel)}</strong> ${data.reason ? `(${data.reason})` : ''}</td>
          <th>วันที่</th>
          <td>${formatThaiDateV2(data.date)}</td>
        </tr>
        <tr>
          <th>รายละเอียด</th>
          <td colspan="3">${safeStrV2(data.description)}</td>
        </tr>
        <tr>
          <th>ผู้อนุมัติ</th>
          <td colspan="3">${safeStrV2(data.approvedByName, 'ยังไม่ได้รับการอนุมัติ')}</td>
        </tr>
      </table>

      <div class="v2-section-title">รายละเอียดทางบัญชี</div>
      <table class="v2-table">
        <tr>
          <th>มูลค่าต้นทุน (ราคาซื้อ)</th>
          <td style="text-align:right;">${formatCurrencyV2(originalValue)}</td>
        </tr>
        <tr>
          <th>ค่าเสื่อมราคาสะสม</th>
          <td style="text-align:right;">${formatCurrencyV2(accumulatedDep)}</td>
        </tr>
        <tr>
          <th>มูลค่าปัจจุบัน (มูลค่าสุทธิ)</th>
          <td style="text-align:right;"><strong>${formatCurrencyV2(currentValue)}</strong></td>
        </tr>
      </table>

      <div class="v2-signature-section">
        <div class="v2-sig-box">
          <div class="sig-label">ลงชื่อ ผู้ตรวจสอบ</div>
          <div class="sig-name">................................</div>
          <div class="sig-role">(ผู้ตรวจสอบครุภัณฑ์)</div>
          <div class="sig-date">วันที่ ...../...../........</div>
        </div>
        <div class="v2-sig-box">
          <div class="sig-label">ลงชื่อ ผู้อนุมัติ</div>
          <div class="sig-name">${safeStrV2(data.approvedByName, '................................')}</div>
          <div class="sig-role">(${data.approvedByName ? 'ผู้มีอำนาจอนุมัติ' : '.................................'})</div>
          <div class="sig-date">วันที่ ...../...../........</div>
        </div>
        <div class="v2-sig-box">
          <div class="sig-label">ลงชื่อ ผู้บริหาร</div>
          <div class="sig-name">................................</div>
          <div class="sig-role">(ผู้บริหาร/ผู้อำนวยการ)</div>
          <div class="sig-date">วันที่ ...../...../........</div>
        </div>
      </div>
    </div>

    <div class="v2-footer">
      <div class="copy-notice">เอกสารฉบับนี้จัดทำเพื่อเป็นหลักฐานการตัดจำหน่ายครุภัณฑ์ตามระเบียบ</div>
      <div>เลขที่อ้างอิง: ${refCode} | วันที่จัดทำ: ${now}</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Legacy Template Functions ──────────────────────────────────────────────

export function generateBorrowFormHTML(data: BorrowFormData): string {
  const { record } = data;
  const refCode = generateRefCode();
  const now = new Date().toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const asset = record.asset;
  const user = record.user;
  const approvedBy = record.approvedBy;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  ${FONT_LINK}
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="org-name">ระบบบริหารจัดการครุภัณฑ์</div>
      <h1>แบบฟอร์มขอยืมครุภัณฑ์</h1>
      <div class="form-meta">
        <span>เลขที่เอกสาร: <span class="ref-code">${refCode}</span></span>
        <span>วันที่ออก: ${now}</span>
      </div>
    </div>

    <div class="section-title">ข้อมูลผู้ขอยืม</div>
    <table>
      <tr>
        <th>ชื่อผู้ขอยืม</th>
        <td>${safeStr(user?.name)}</td>
        <th>แผนก</th>
        <td>${safeStr(user?.department)}</td>
      </tr>
      <tr>
        <th>อีเมล</th>
        <td colspan="3">${safeStr(user?.email)}</td>
      </tr>
    </table>

    <div class="section-title">รายละเอียดการยืม</div>
    <table>
      <tr>
        <th>วันที่ขอยืม</th>
        <td>${record.borrowDate ? formatThaiDate(record.borrowDate) : '-'}</td>
        <th>วันคืนที่คาด</th>
        <td>${record.expectedReturnDate ? formatThaiDate(record.expectedReturnDate) : '-'}</td>
      </tr>
      <tr>
        <th>สถานะ</th>
        <td colspan="3">
          ${record.status === 'PENDING' ? 'รออนุมัติ' :
            record.status === 'APPROVED' ? 'อนุมัติ' :
            record.status === 'REJECTED' ? 'ปฏิเสธ' :
            record.status === 'RETURNED' ? 'คืนแล้ว' :
            record.status === 'OVERDUE' ? 'เกินกำหนด' : record.status}
        </td>
      </tr>
    </table>

    <div class="section-title">รายละเอียดครุภัณฑ์</div>
    <table class="asset-table">
      <thead>
        <tr>
          <th>รหัสครุภัณฑ์</th>
          <th>ชื่อครุภัณฑ์</th>
          <th>หมวดหมู่</th>
          <th>มูลค่า</th>
          <th>สถานที่</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-family:monospace;">${safeStr(asset?.sku)}</td>
          <td style="font-weight:600;">${safeStr(asset?.name)}</td>
          <td>${safeStr(asset?.category?.name)}</td>
          <td>${asset?.purchasePrice != null ? formatCurrency(asset.purchasePrice) : '-'}</td>
          <td>${safeStr(asset?.location)}</td>
        </tr>
      </tbody>
    </table>

    ${record.notes ? `
    <div class="section-title">หมายเหตุ</div>
    <div class="notes-section">
      ${record.notes}
    </div>
    ` : ''}

    <div class="signature-section">
      <div class="signature-box">
        <div class="label">ลงชื่อ ผู้ขอยืม</div>
        <div class="name">${safeStr(user?.name)}</div>
        <div class="role">(${safeStr(user?.department, '-')})</div>
      </div>
      <div class="signature-box">
        <div class="label">ลงชื่อ ผู้อนุมัติ</div>
        <div class="name">${safeStr(approvedBy?.name, '................................')}</div>
        <div class="role">(${approvedBy?.department || '.................................'})</div>
      </div>
      <div class="signature-box">
        <div class="label">ลงชื่อ ผู้จัดเก็บ</div>
        <div class="name">................................</div>
        <div class="role">(................................)</div>
      </div>
    </div>

    <div class="footer">
      เอกสารนี้จัดทำโดยระบบบริหารจัดการครุภัณฑ์ | เลขที่อ้างอิง: ${refCode} | วันที่จัดทำ: ${now}
    </div>
  </div>
</body>
</html>`;
}

export function generateReturnFormHTML(data: BorrowFormData): string {
  const { record } = data;
  const refCode = generateRefCode();
  const now = new Date().toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const asset = record.asset;
  const user = record.user;
  const approvedBy = record.approvedBy;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  ${FONT_LINK}
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="org-name">ระบบบริหารจัดการครุภัณฑ์</div>
      <h1>แบบฟอร์มคืนครุภัณฑ์</h1>
      <div class="form-meta">
        <span>เลขที่เอกสาร: <span class="ref-code">${refCode}</span></span>
        <span>วันที่ออก: ${now}</span>
      </div>
    </div>

    <div class="section-title">ข้อมูลผู้คืน</div>
    <table>
      <tr>
        <th>ชื่อผู้คืน</th>
        <td>${safeStr(user?.name)}</td>
        <th>แผนก</th>
        <td>${safeStr(user?.department)}</td>
      </tr>
      <tr>
        <th>อีเมล</th>
        <td colspan="3">${safeStr(user?.email)}</td>
      </tr>
    </table>

    <div class="section-title">รายละเอียดการคืน</div>
    <table>
      <tr>
        <th>วันที่ยืม</th>
        <td>${record.borrowDate ? formatThaiDate(record.borrowDate) : '-'}</td>
        <th>วันคืนที่คาด</th>
        <td>${record.expectedReturnDate ? formatThaiDate(record.expectedReturnDate) : '-'}</td>
      </tr>
      <tr>
        <th>วันที่คืนจริง</th>
        <td colspan="3">${record.actualReturnDate ? formatThaiDateTime(record.actualReturnDate) : '-'}</td>
      </tr>
      <tr>
        <th>ผู้อนุมัติการยืม</th>
        <td colspan="3">${safeStr(approvedBy?.name)}</td>
      </tr>
    </table>

    <div class="section-title">รายละเอียดครุภัณฑ์</div>
    <table class="asset-table">
      <thead>
        <tr>
          <th>รหัสครุภัณฑ์</th>
          <th>ชื่อครุภัณฑ์</th>
          <th>หมวดหมู่</th>
          <th>มูลค่า</th>
          <th>สถานที่</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-family:monospace;">${safeStr(asset?.sku)}</td>
          <td style="font-weight:600;">${safeStr(asset?.name)}</td>
          <td>${safeStr(asset?.category?.name)}</td>
          <td>${asset?.purchasePrice != null ? formatCurrency(asset.purchasePrice) : '-'}</td>
          <td>${safeStr(asset?.location)}</td>
        </tr>
      </tbody>
    </table>

    ${record.notes ? `
    <div class="section-title">หมายเหตุ</div>
    <div class="notes-section">
      ${record.notes}
    </div>
    ` : ''}

    <div class="notes-section" style="margin-top:16px;">
      <div class="label">สภาพครุภัณฑ์ที่คืน</div>
      <div>ครุภัณฑ์อยู่ในสภาพสมบูรณ์ พร้อมใช้งานต่อไป</div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="label">ลงชื่อ ผู้คืนครุภัณฑ์</div>
        <div class="name">${safeStr(user?.name)}</div>
        <div class="role">(${safeStr(user?.department, '-')})</div>
      </div>
      <div class="signature-box">
        <div class="label">ลงชื่อ ผู้รับคืน/ตรวจสอบ</div>
        <div class="name">................................</div>
        <div class="role">(................................)</div>
      </div>
      <div class="signature-box">
        <div class="label">ลงชื่อ ผู้อนุมัติ</div>
        <div class="name">${safeStr(approvedBy?.name, '................................')}</div>
        <div class="role">(${approvedBy?.department || '.................................'})</div>
      </div>
    </div>

    <div class="footer">
      เอกสารนี้จัดทำโดยระบบบริหารจัดการครุภัณฑ์ | เลขที่อ้างอิง: ${refCode} | วันที่จัดทำ: ${now}
    </div>
  </div>
</body>
</html>`;
}

export function generateWriteoffFormHTML(data: WriteoffFormData): string {
  const { record } = data;
  const refCode = generateRefCode();
  const now = new Date().toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const asset = record.asset;
  const approvedBy = record.approvedBy;

  const reasonLabels: Record<string, string> = {
    DAMAGED: 'ชำรุด',
    LOST: 'สูญหาย',
    DEPRECIATED: 'เสื่อมสภาพ',
    OTHER: 'อื่นๆ',
  };

  const originalValue = asset?.purchasePrice ?? 0;
  const currentValue = asset?.currentValue ?? 0;
  const accumulatedDep = Math.max(0, originalValue - currentValue);
  const purchaseDate = asset?.purchaseDate ? formatThaiDate(asset.purchaseDate) : '-';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  ${FONT_LINK}
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="org-name">ระบบบริหารจัดการครุภัณฑ์</div>
      <h1>รายงานการตัดจำหน่ายครุภัณฑ์</h1>
      <div class="form-meta">
        <span>เลขที่เอกสาร: <span class="ref-code">${refCode}</span></span>
        <span>วันที่ออก: ${now}</span>
      </div>
    </div>

    <div class="section-title">รายละเอียดครุภัณฑ์</div>
    <table class="asset-table">
      <thead>
        <tr>
          <th>รหัสครุภัณฑ์</th>
          <th>ชื่อครุภัณฑ์</th>
          <th>หมวดหมู่</th>
          <th>วันที่จัดซื้อ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-family:monospace;">${safeStr(asset?.sku)}</td>
          <td style="font-weight:600;">${safeStr(asset?.name)}</td>
          <td>${safeStr(asset?.category?.name)}</td>
          <td>${purchaseDate}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">ข้อมูลทางการเงิน</div>
    <table>
      <tr>
        <th>มูลค่าต้นทุน</th>
        <td>${formatCurrency(originalValue)}</td>
        <th>มูลค่าปัจจุบัน</th>
        <td>${formatCurrency(currentValue)}</td>
      </tr>
      <tr>
        <th>ค่าเสื่อมราคาสะสม</th>
        <td>${formatCurrency(accumulatedDep)}</td>
        <th>อายุการใช้งาน</th>
        <td>${safeStr(asset?.usefulLifeYears)} ปี</td>
      </tr>
      <tr>
        <th>มูลค่าซาก</th>
        <td>${asset?.salvageValue != null ? formatCurrency(asset.salvageValue) : '-'}</td>
        <th>สถานที่เก็บ</th>
        <td>${safeStr(asset?.location)}</td>
      </tr>
    </table>

    <div class="section-title">รายละเอียดการตัดจำหน่าย</div>
    <table>
      <tr>
        <th>วันที่ขอตัดจำหน่าย</th>
        <td>${record.date ? formatThaiDate(record.date) : '-'}</td>
        <th>สาเหตุ</th>
        <td><strong>${reasonLabels[record.reason] || record.reason}</strong></td>
      </tr>
      <tr>
        <th>รายละเอียด</th>
        <td colspan="3">${record.description}</td>
      </tr>
      <tr>
        <th>ผู้อนุมัติ</th>
        <td colspan="3">${safeStr(approvedBy?.name, '-')}
          ${approvedBy?.department ? `(${approvedBy.department})` : ''}
        </td>
      </tr>
      <tr>
        <th>สถานะ</th>
        <td colspan="3">
          ${record.status === 'PENDING' ? 'รออนุมัติ' :
            record.status === 'APPROVED' ? 'อนุมัติแล้ว - ครุภัณฑ์ถูกตัดจำหน่ายแล้ว' :
            record.status === 'REJECTED' ? 'ปฏิเสธ' : record.status}
        </td>
      </tr>
    </table>

    <div class="signature-section">
      <div class="signature-box">
        <div class="label">ลงชื่อ ผู้ขอตัดจำหน่าย</div>
        <div class="name">................................</div>
        <div class="role">(................................)</div>
      </div>
      <div class="signature-box">
        <div class="label">ลงชื่อ ผู้ตรวจสอบ</div>
        <div class="name">................................</div>
        <div class="role">(................................)</div>
      </div>
      <div class="signature-box">
        <div class="label">ลงชื่อ ผู้อนุมัติ</div>
        <div class="name">${safeStr(approvedBy?.name, '................................')}</div>
        <div class="role">(${approvedBy?.department || '.................................'})</div>
      </div>
    </div>

    <div class="footer">
      เอกสารนี้จัดทำโดยระบบบริหารจัดการครุภัณฑ์ | เลขที่อ้างอิง: ${refCode} | วันที่จัดทำ: ${now}
    </div>
  </div>
</body>
</html>`;
}