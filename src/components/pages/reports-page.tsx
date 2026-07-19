'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileSpreadsheet,
  FileText,
  Calculator,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Loader2,
  BarChart3,
  ClipboardList,
  FileX2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateBorrowFormHtml, generateWriteoffFormHtml } from '@/lib/pdf-templates';
import { generatePdfFromHtml } from '@/lib/pdf-client';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const fmt = (num: number) => new Intl.NumberFormat('th-TH').format(Math.round(num));

export function ReportsPage() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<{ originalValue: number; totalDepreciation: number; currentValue: number } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [formPdfLoading, setFormPdfLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        setSummary(data.depreciationSummary);
      } catch {
        toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลสรุปได้', variant: 'destructive' });
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [toast]);

  const exportToExcel = async (type: string) => {
    setExporting(type);
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      let rows: Record<string, unknown>[] = [];
      const dateStr = new Date().toISOString().split('T')[0];

      if (type === 'assets') {
        rows = data.map((item: Record<string, unknown>) => ({
          'รหัส': item.sku,
          'ชื่อครุภัณฑ์': item.name,
          'หมวดหมู่': (item.category as Record<string, string>)?.name || '-',
          'สถานะ': item.status,
          'ราคาซื้อ': item.purchasePrice,
          'มูลค่าปัจจุบัน': item.currentValue,
          'สถานที่ตั้ง': item.location || '-',
          'วันที่ซื้อ': item.purchaseDate,
        }));
      } else if (type === 'depreciation') {
        rows = data.map((item: Record<string, unknown>) => ({
          'รหัส': item.sku,
          'ชื่อครุภัณฑ์': item.name,
          'หมวดหมู่': item.category,
          'วันที่ซื้อ': item.purchaseDate,
          'ราคาซื้อ': item.purchasePrice,
          'ราคาซาก': item.salvageValue,
          'อายุการใช้งาน(ปี)': item.usefulLifeYears,
          'ค่าเสื่อมราคาต่อปี': item.annualDepreciation,
          'ค่าเสื่อมราคารวม': item.totalDepreciation,
          'มูลค่าปัจจุบัน': item.currentValue,
          'อายุการใช้งานที่ผ่านมา(ปี)': item.yearsElapsed,
          'อายุการใช้งานคงเหลือ(ปี)': item.remainingLife,
          '% ค่าเสื่อมราคา': item.depreciationPercent,
        }));
      } else if (type === 'borrow') {
        rows = data.map((item: Record<string, unknown>) => ({
          'รหัส': item.id,
          'ชื่อครุภัณฑ์': (item.asset as Record<string, string>)?.name || '-',
          'ผู้ยืม': (item.user as Record<string, string>)?.name || '-',
          'วันยืม': item.borrowDate,
          'วันคืนคาด': item.expectedReturnDate,
          'วันคืนจริง': item.actualReturnDate || '-',
          'สถานะ': item.status,
          'หมายเหตุ': item.notes || '-',
        }));
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'รายงาน');
      XLSX.writeFile(wb, `report-${type}-${dateStr}.xlsx`);
      toast({ title: 'ส่งออก Excel สำเร็จ' });
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถส่งออกไฟล์ได้', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = async (type: string) => {
    setExporting(type);
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      const doc = new jsPDF({ orientation: 'landscape' });
      const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

      let titleText = 'Asset Report';
      if (type === 'depreciation') titleText = 'Depreciation Report';
      else if (type === 'borrow') titleText = 'Borrow/Return Report';

      doc.setFontSize(16);
      doc.text(titleText, 14, 20);
      doc.setFontSize(10);
      doc.text(`Date: ${dateStr}`, 14, 28);

      let headers: string[] = [];
      let colWidths: number[] = [];
      let mapRow: (item: Record<string, unknown>) => string[] = () => [];

      if (type === 'assets') {
        headers = ['SKU', 'Name', 'Category', 'Status', 'Price', 'Current Value'];
        colWidths = [25, 70, 45, 30, 35, 35];
        mapRow = (item) => [
          String(item.sku || ''),
          String(item.name || ''),
          String((item.category as Record<string, string>)?.name || '-'),
          String(item.status || ''),
          fmt(Number(item.purchasePrice || 0)),
          fmt(Number(item.currentValue || 0)),
        ];
      } else if (type === 'depreciation') {
        headers = ['SKU', 'Name', 'Category', 'Purchase', 'Salvage', 'Life(yr)', 'Annual Dep', 'Total Dep', 'Current', 'Elapsed', 'Remaining', '% Dep'];
        colWidths = [22, 50, 35, 28, 24, 20, 26, 26, 26, 22, 24, 18];
        mapRow = (item) => [
          String(item.sku || ''),
          String(item.name || ''),
          String(item.category || ''),
          fmt(Number(item.purchasePrice || 0)),
          fmt(Number(item.salvageValue || 0)),
          String(item.usefulLifeYears || ''),
          fmt(Number(item.annualDepreciation || 0)),
          fmt(Number(item.totalDepreciation || 0)),
          fmt(Number(item.currentValue || 0)),
          String(item.yearsElapsed || ''),
          String(item.remainingLife || ''),
          String(item.depreciationPercent || '') + '%',
        ];
      } else if (type === 'borrow') {
        headers = ['ID', 'Asset', 'Borrower', 'Borrow Date', 'Expected Return', 'Actual Return', 'Status'];
        colWidths = [22, 55, 45, 40, 45, 45, 30];
        mapRow = (item) => [
          String(item.id?.substring(0, 8) || ''),
          String((item.asset as Record<string, string>)?.name || '-'),
          String((item.user as Record<string, string>)?.name || '-'),
          String(item.borrowDate || '').substring(0, 10),
          String(item.expectedReturnDate || '').substring(0, 10),
          String(item.actualReturnDate || '-').substring(0, 10),
          String(item.status || ''),
        ];
      }

      let y = 38;
      const startX = 14;

      // Draw header row
      doc.setFillColor(16, 185, 129);
      doc.rect(startX, y - 5, 277, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      let x = startX;
      headers.forEach((h, i) => {
        doc.text(h, x + 2, y);
        x += colWidths[i];
      });
      y += 8;

      // Draw data rows
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      const items = Array.isArray(data) ? data : [];
      items.forEach((item: Record<string, unknown>) => {
        if (y > 180) {
          doc.addPage();
          y = 20;
        }
        x = startX;
        const cells = mapRow(item);
        cells.forEach((cell, i) => {
          const maxLen = Math.floor(colWidths[i] / 2);
          const truncated = cell.length > maxLen ? cell.substring(0, maxLen) + '..' : cell;
          doc.text(truncated, x + 2, y);
          x += colWidths[i];
        });
        y += 6;
      });

      const dateFileStr = new Date().toISOString().split('T')[0];
      doc.save(`report-${type}-${dateFileStr}.pdf`);
      toast({ title: 'ส่งออก PDF สำเร็จ' });
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถส่งออกไฟล์ได้', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const calculateDepreciation = async () => {
    setCalculating(true);
    setCalcResult(null);
    try {
      const res = await fetch('/api/depreciation', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
      } else {
        setCalcResult(data.message || `อัปเดต ${data.updated} รายการสำเร็จ`);
        toast({ title: 'คำนวณค่าเสื่อมราคาสำเร็จ', description: data.message });
        // Refresh summary
        const dashRes = await fetch('/api/dashboard');
        const dashData = await dashRes.json();
        setSummary(dashData.depreciationSummary);
      }
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถคำนวณค่าเสื่อมราคาได้', variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  const handleGenerateBorrowFormPdf = async () => {
    setFormPdfLoading('borrow');
    try {
      const res = await fetch('/api/borrow?status=APPROVED,RETURNED,OVERDUE&limit=100');
      if (!res.ok) throw new Error('Failed to fetch borrow records');
      const data = await res.json();
      const records: Array<Record<string, unknown>> = data.records || [];

      if (records.length === 0) {
        toast({ title: 'ไม่พบข้อมูล', description: 'ไม่มีรายการยืมที่อนุมัติ/คืนแล้ว/เกินกำหนด', variant: 'destructive' });
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const allHtmlParts: string[] = [];
      const reasonLabels: Record<string, string> = {
        DAMAGED: 'ชำรุด', LOST: 'สูญหาย', DEPRECIATED: 'เสื่อมสภาพ', OTHER: 'อื่นๆ',
      };

      records.forEach((rec) => {
        const user = rec.user as Record<string, string> | undefined;
        const asset = rec.asset as Record<string, unknown> | undefined;
        const category = asset?.category as Record<string, string> | undefined;
        const approvedBy = rec.approvedBy as Record<string, string> | null | undefined;

        if (!asset) return;

        allHtmlParts.push(generateBorrowFormHtml({
          borrowerName: user?.name || '-',
          borrowerDepartment: user?.department || '-',
          borrowDate: String(rec.borrowDate || ''),
          expectedReturnDate: String(rec.expectedReturnDate || ''),
          actualReturnDate: rec.actualReturnDate ? String(rec.actualReturnDate) : undefined,
          status: String(rec.status || ''),
          notes: rec.notes ? String(rec.notes) : undefined,
          approvedByName: approvedBy?.name || undefined,
          assets: [{
            sku: String(asset.sku || ''),
            name: String(asset.name || ''),
            categoryName: category?.name || '-',
            currentValue: Number(asset.currentValue || 0),
            location: String(asset.location || '-'),
          }],
        }));
      });

      if (allHtmlParts.length === 0) {
        toast({ title: 'ไม่พบข้อมูล', description: 'ไม่มีข้อมูลครุภัณฑ์สำหรับสร้าง PDF', variant: 'destructive' });
        return;
      }

      const combinedHtml = allHtmlParts.join('<div style="page-break-after: always;"></div>');
      await generatePdfFromHtml(combinedHtml, `แบบฟอร์มยืมครุภัณฑ์_${dateStr}`);
      toast({ title: 'สำเร็จ', description: `สร้าง PDF แบบฟอร์มยืมครุภัณฑ์ ${allHtmlParts.length} รายการเรียบร้อย` });
    } catch (err) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err instanceof Error ? err.message : 'ไม่สามารถสร้าง PDF ได้',
        variant: 'destructive',
      });
    } finally {
      setFormPdfLoading(null);
    }
  };

  const handleGenerateWriteoffFormPdf = async () => {
    setFormPdfLoading('writeoff');
    try {
      const res = await fetch('/api/writeoff?status=APPROVED&limit=100');
      if (!res.ok) throw new Error('Failed to fetch writeoff records');
      const data = await res.json();
      const records: Array<Record<string, unknown>> = data.records || [];

      if (records.length === 0) {
        toast({ title: 'ไม่พบข้อมูล', description: 'ไม่มีรายการตัดจำหน่ายที่อนุมัติแล้ว', variant: 'destructive' });
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const allHtmlParts: string[] = [];
      const reasonLabels: Record<string, string> = {
        DAMAGED: 'ชำรุด', LOST: 'สูญหาย', DEPRECIATED: 'เสื่อมสภาพ', OTHER: 'อื่นๆ',
      };

      records.forEach((rec) => {
        const asset = rec.asset as Record<string, unknown> | undefined;
        const category = asset?.category as Record<string, string> | undefined;
        const approvedBy = rec.approvedBy as Record<string, string> | null | undefined;

        if (!asset) return;

        const reason = String(rec.reason || '');
        allHtmlParts.push(generateWriteoffFormHtml({
          assetSku: String(asset.sku || '-'),
          assetName: String(asset.name || '-'),
          categoryName: category?.name || '-',
          purchasePrice: Number(asset.purchasePrice || 0),
          currentValue: Number(asset.currentValue || 0),
          purchaseDate: String(asset.purchaseDate || '-'),
          reason,
          reasonLabel: reasonLabels[reason] || reason,
          description: String(rec.description || '-'),
          date: String(rec.date || ''),
          approvedByName: approvedBy?.name || undefined,
        }));
      });

      if (allHtmlParts.length === 0) {
        toast({ title: 'ไม่พบข้อมูล', description: 'ไม่มีข้อมูลครุภัณฑ์สำหรับสร้าง PDF', variant: 'destructive' });
        return;
      }

      const combinedHtml = allHtmlParts.join('<div style="page-break-after: always;"></div>');
      await generatePdfFromHtml(combinedHtml, `แบบฟอร์มตัดจำหน่าย_${dateStr}`);
      toast({ title: 'สำเร็จ', description: `สร้าง PDF แบบฟอร์มตัดจำหน่าย ${allHtmlParts.length} รายการเรียบร้อย` });
    } catch (err) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err instanceof Error ? err.message : 'ไม่สามารถสร้าง PDF ได้',
        variant: 'destructive',
      });
    } finally {
      setFormPdfLoading(null);
    }
  };

  const isLoading = (type: string) => exporting === type;

  return (
    <div className="space-y-6">
      {/* Section 1: Summary Reports */}
      <div>
        <h2 className="text-lg font-semibold mb-4">รายงานสรุป</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loadingSummary ? (
            <>
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </>
          ) : summary ? (
            <>
              <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex-shrink-0 p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">มูลค่าครุภัณฑ์ทั้งหมด</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 truncate">
                      ฿{fmt(summary.originalValue)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex-shrink-0 p-3 rounded-full bg-red-100 dark:bg-red-900/50">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">มูลค่าค่าเสื่อมราคารวม</p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-300 truncate">
                      ฿{fmt(summary.totalDepreciation)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-teal-200 bg-teal-50/50 dark:bg-teal-950/20 dark:border-teal-900">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex-shrink-0 p-3 rounded-full bg-teal-100 dark:bg-teal-900/50">
                    <TrendingUp className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">มูลค่าปัจจุบัน</p>
                    <p className="text-xl font-bold text-teal-700 dark:text-teal-300 truncate">
                      ฿{fmt(summary.currentValue)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>

      {/* Section 2: Export Reports */}
      <div>
        <h2 className="text-lg font-semibold mb-4">ส่งออกรายงาน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Full Asset Report */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base">รายงานครุภัณฑ์ทั้งหมด</CardTitle>
                  <CardDescription>ส่งออกรายการครุภัณฑ์ทั้งหมดพร้อมรายละเอียด</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => exportToExcel('assets')}
                disabled={isLoading('assets-excel')}
              >
                {isLoading('assets-excel') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                )}
                Excel
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => exportToPDF('assets')}
                disabled={isLoading('assets-pdf')}
              >
                {isLoading('assets-pdf') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 text-red-600" />
                )}
                PDF
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Depreciation Report */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                  <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base">รายงานค่าเสื่อมราคา</CardTitle>
                  <CardDescription>รายงานค่าเสื่อมราคาสายตรงของครุภัณฑ์ทั้งหมด</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => exportToExcel('depreciation')}
                disabled={isLoading('depreciation-excel')}
              >
                {isLoading('depreciation-excel') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                )}
                Excel
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => exportToPDF('depreciation')}
                disabled={isLoading('depreciation-pdf')}
              >
                {isLoading('depreciation-pdf') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 text-red-600" />
                )}
                PDF
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Borrow/Return Report */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50">
                  <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-base">รายงานการยืม-คืน</CardTitle>
                  <CardDescription>ประวัติการยืมและคืนครุภัณฑ์</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => exportToExcel('borrow')}
                disabled={isLoading('borrow')}
              >
                {isLoading('borrow') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                )}
                Excel
              </Button>
            </CardContent>
          </Card>

          {/* Card 4: Calculate Depreciation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                  <Calculator className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-base">คำนวณค่าเสื่อมราคา</CardTitle>
                  <CardDescription>อัปเดตมูลค่าค่าเสื่อมราคาของครุภัณฑ์ทั้งหมด</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={calculateDepreciation}
                disabled={calculating}
              >
                {calculating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4" />
                )}
                คำนวณ
              </Button>
              {calcResult && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{calcResult}</p>
              )}
            </CardContent>
          </Card>

          {/* Card 5: Borrow Form PDF */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50">
                  <ClipboardList className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-base">พิมพ์แบบฟอร์มยืมครุภัณฑ์</CardTitle>
                  <CardDescription>สร้างไฟล์ PDF แบบฟอร์มยืมครุภัณฑ์สำหรับระเบียบ</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleGenerateBorrowFormPdf}
                disabled={formPdfLoading === 'borrow'}
              >
                {formPdfLoading === 'borrow' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 text-teal-600" />
                )}
                สร้าง PDF
              </Button>
            </CardContent>
          </Card>

          {/* Card 6: Writeoff Form PDF */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                  <FileX2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-base">พิมพ์แบบฟอร์มตัดจำหน่าย</CardTitle>
                  <CardDescription>สร้างไฟล์ PDF แบบฟอร์มตัดจำหน่ายครุภัณฑ์</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleGenerateWriteoffFormPdf}
                disabled={formPdfLoading === 'writeoff'}
              >
                {formPdfLoading === 'writeoff' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 text-red-600" />
                )}
                สร้าง PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}