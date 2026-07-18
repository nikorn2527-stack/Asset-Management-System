export interface BorrowReturnFormData {
  id: string;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string | null;
  notes?: string | null;
  status: string;
  asset: {
    sku: string;
    name: string;
    category?: { name: string };
    location?: string | null;
    purchasePrice: number;
  };
  user: {
    name: string;
    department?: string | null;
    phone?: string | null;
  };
  approvedBy?: { name: string } | null;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.getMonth() + 1;
  const year = d.getFullYear() + 543;
  const thaiMonths = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  return `${day} ${thaiMonths[month]} ${year}`;
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('th-TH').format(Math.round(num));
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติ',
  REJECTED: 'ปฏิเสธ',
  RETURNED: 'คืนแล้ว',
  OVERDUE: 'เกินกำหนด',
};

export function printBorrowReturnForm(record: BorrowReturnFormData): void {
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบยืม-คืนครุภัณฑ์</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Sarabun', sans-serif;
      font-size: 14px;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 20mm;
      margin: 0 auto;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 10mm 15mm; }
    }
    .header {
      text-align: center;
      border-bottom: 3px double #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .header .org {
      font-size: 16px;
      font-weight: 500;
      color: #444;
    }
    .header .doc-no {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid #333;
      padding: 6px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f0fdf4;
      font-weight: 600;
      font-size: 13px;
      white-space: nowrap;
      width: 140px;
    }
    td {
      font-size: 13px;
    }
    .asset-table th {
      background-color: #f0fdf4;
      text-align: center;
      font-size: 12px;
      padding: 5px 8px;
    }
    .asset-table td {
      text-align: center;
      font-size: 13px;
      padding: 8px;
    }
    .asset-table .name-cell {
      text-align: left;
    }
    .section-title {
      font-size: 15px;
      font-weight: 600;
      margin: 20px 0 8px 0;
      padding-left: 8px;
      border-left: 4px solid #059669;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      padding: 0 10px;
    }
    .sig-block {
      text-align: center;
      width: 30%;
    }
    .sig-label {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 60px;
    }
    .sig-name {
      font-size: 14px;
      font-weight: 600;
      border-bottom: 1px solid #333;
      padding: 0 20px 2px;
      display: inline-block;
      min-width: 120px;
    }
    .sig-date {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .notes-section {
      margin-top: 16px;
    }
    .notes-section .note-content {
      min-height: 40px;
      padding: 6px 10px;
      border: 1px solid #333;
      border-top: none;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-returned { background-color: #d1fae5; color: #065f46; }
    .status-approved { background-color: #d1fae5; color: #065f46; }
    .status-pending { background-color: #fef3c7; color: #92400e; }
    .status-rejected { background-color: #fee2e2; color: #991b1b; }
    .status-overdue { background-color: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="org">หน่วยงานต้นสังกัด</div>
      <h1>ใบยืม-คืนครุภัณฑ์</h1>
      <div class="doc-no">เลขที่เอกสาร: ${record.id.slice(0, 8).toUpperCase()}</div>
    </div>

    <div class="section-title">รายละเอียดครุภัณฑ์</div>
    <table class="asset-table">
      <thead>
        <tr>
          <th style="width:50px">ลำดับ</th>
          <th>รหัสครุภัณฑ์</th>
          <th>ชื่อครุภัณฑ์</th>
          <th>หมวดหมู่</th>
          <th>สถานที่ตั้ง</th>
          <th style="width:120px">ราคา (บาท)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td style="font-family: monospace; font-weight: 600;">${record.asset.sku}</td>
          <td class="name-cell">${record.asset.name}</td>
          <td>${record.asset.category?.name || '-'}</td>
          <td>${record.asset.location || '-'}</td>
          <td>${formatCurrency(record.asset.purchasePrice)}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">รายละเอียดการยืม-คืน</div>
    <table>
      <tr>
        <th>ผู้ยืม</th>
        <td>${record.user.name}</td>
      </tr>
      <tr>
        <th>แผนก</th>
        <td>${record.user.department || '-'}</td>
      </tr>
      <tr>
        <th>เบอร์โทรศัพท์</th>
        <td>${record.user.phone || '-'}</td>
      </tr>
      <tr>
        <th>วันที่ยืม</th>
        <td>${formatDate(record.borrowDate)}</td>
      </tr>
      <tr>
        <th>กำหนดคืน</th>
        <td>${formatDate(record.expectedReturnDate)}</td>
      </tr>
      <tr>
        <th>วันที่คืนจริง</th>
        <td>${record.actualReturnDate ? formatDate(record.actualReturnDate) : '-'}</td>
      </tr>
      <tr>
        <th>ผู้อนุมัติ</th>
        <td>${record.approvedBy?.name || '-'}</td>
      </tr>
      <tr>
        <th>สถานะ</th>
        <td><span class="status-badge status-${record.status.toLowerCase()}">${STATUS_LABELS[record.status] || record.status}</span></td>
      </tr>
    </table>

    ${record.notes ? `
    <div class="notes-section">
      <div class="section-title">หมายเหตุ</div>
      <table>
        <tr>
          <th>หมายเหตุ</th>
        </tr>
      </table>
      <div class="note-content">${record.notes}</div>
    </div>
    ` : ''}

    <div class="signature-area">
      <div class="sig-block">
        <div class="sig-label">ลงชื่อผู้ยืม</div>
        <div class="sig-name">${record.user.name}</div>
        <div class="sig-date">วันที่ ...../...../........</div>
      </div>
      <div class="sig-block">
        <div class="sig-label">ลงชื่อผู้อนุมัติ</div>
        <div class="sig-name">${record.approvedBy?.name || '................................'}</div>
        <div class="sig-date">วันที่ ...../...../........</div>
      </div>
      <div class="sig-block">
        <div class="sig-label">ลงชื่อผู้รับคืน</div>
        <div class="sig-name">${record.status === 'RETURNED' ? record.user.name : '................................'}</div>
        <div class="sig-date">วันที่ ${record.actualReturnDate ? formatDate(record.actualReturnDate).replace(/ /g, ' / ') : '...../...../........'}</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}