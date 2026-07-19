import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const headers = [
    'ชื่อครุภัณฑ์ *',
    'หมวดหมู่ *',
    'ราคาซื้อ (บาท) *',
    'ราคาซาก (บาท)',
    'วันที่ซื้อ (YYYY-MM-DD) *',
    'อายุการใช้งาน (ปี)',
    'สถานที่',
    'วันหมดประกัน (YYYY-MM-DD)',
    'รายละเอียด',
    'รหัส (SKU)',
  ];

  const exampleData = [
    [
      'เก้าอี้ออฟฟิศ Ergonomic',
      'เฟอร์นิเจอร์',
      12000,
      600,
      '2025-01-15',
      8,
      'ชั้น 2 สำนักงาน',
      '2030-01-15',
      'เก้าอี้ปรับได้',
      '',
    ],
    [
      'โน๊ตบุ๊ค Dell Latitude 5550',
      'คอมพิวเตอร์และอุปกรณ์',
      35000,
      3500,
      '2025-03-01',
      5,
      'ชั้น 2 ห้องคอมพิวเตอร์',
      '',
      '',
      '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
  ws['!cols'] = [
    { wch: 30 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 22 },
    { wch: 18 },
    { wch: 25 },
    { wch: 22 },
    { wch: 25 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'แม่แบบนำเข้าครุภัณฑ์');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="asset-import-template.xlsx"',
    },
  });
}