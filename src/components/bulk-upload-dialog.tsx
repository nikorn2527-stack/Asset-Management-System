'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X, ArrowLeft } from 'lucide-react';

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  rowIndex: number;
  name: string;
  categoryName: string;
  purchasePrice: number;
  salvageValue: number;
  purchaseDate: string;
  usefulLifeYears: number;
  location: string;
  warrantyExpiry: string;
  description: string;
  sku: string;
  errors: string[];
  valid: boolean;
}

type Step = 1 | 2 | 3;

interface BatchResult {
  created: number;
  skipped: number;
  errors: string[];
}

function parseExcelFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
          header: 1,
        });

        if (jsonData.length <= 1) {
          resolve([]);
          return;
        }

        // Skip header row, parse data rows
        const rows: ParsedRow[] = jsonData.slice(1).map((row, index) => {
          const r = row as unknown[];
          return {
            rowIndex: index + 2,
            name: String(r[0] || '').trim(),
            categoryName: String(r[1] || '').trim(),
            purchasePrice: Number(r[2]) || 0,
            salvageValue: Number(r[3]) || 0,
            purchaseDate: String(r[4] || '').trim(),
            usefulLifeYears: Number(r[5]) || 5,
            location: String(r[6] || '').trim(),
            warrantyExpiry: String(r[7] || '').trim(),
            description: String(r[8] || '').trim(),
            sku: String(r[9] || '').trim(),
            errors: [],
            valid: true,
          };
        });

        // Skip completely empty rows and validate
        resolve(
          rows.filter((r) => r.name || r.categoryName).map((r) => {
            const errors: string[] = [];

            if (!r.name) {
              errors.push('ไม่มีชื่อครุภัณฑ์');
            }
            if (!r.categoryName) {
              errors.push('ไม่มีหมวดหมู่');
            }
            if (!r.purchasePrice || r.purchasePrice <= 0) {
              errors.push('ราคาซื้อไม่ถูกต้อง');
            }
            if (!r.purchaseDate || isNaN(new Date(r.purchaseDate).getTime())) {
              errors.push('วันที่ซื้อไม่ถูกต้อง');
            }

            return { ...r, errors, valid: errors.length === 0 };
          })
        );
      } catch {
        reject(new Error('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์'));
      }
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsArrayBuffer(file);
  });
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('th-TH').format(value);
}

export function BulkUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkUploadDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.filter((r) => !r.valid).length;

  const resetAndClose = useCallback(() => {
    setStep(1);
    setFile(null);
    setRows([]);
    setParseError(null);
    setLoading(false);
    setResult(null);
    setIsDragOver(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = selectedFile.name
      .substring(selectedFile.name.lastIndexOf('.'))
      .toLowerCase();

    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(ext)) {
      setParseError('รองรับเฉพาะไฟล์ .xlsx, .xls และ .csv');
      setFile(null);
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setParseError('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)');
      setFile(null);
      return;
    }

    try {
      const parsed = await parseExcelFile(selectedFile);
      if (parsed.length === 0) {
        setParseError('ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบแม่แบบ');
        setFile(null);
      } else {
        setRows(parsed);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ได้');
      setFile(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleNext = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setRows([]);
    setFile(null);
    setParseError(null);
    setResult(null);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const validRows = rows
        .filter((r) => r.valid)
        .map((r) => ({
          name: r.name,
          categoryName: r.categoryName,
          purchasePrice: r.purchasePrice,
          salvageValue: r.salvageValue,
          purchaseDate: r.purchaseDate,
          usefulLifeYears: r.usefulLifeYears,
          location: r.location || undefined,
          warrantyExpiry: r.warrantyExpiry || undefined,
          description: r.description || undefined,
          sku: r.sku || undefined,
        }));

      const res = await fetch('/api/assets/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: validRows }),
      });

      if (!res.ok) {
        throw new Error('เกิดข้อผิดพลาดในการนำเข้า');
      }

      const data: BatchResult = await res.json();
      setResult(data);
      setStep(3);

      if (data.created > 0) {
        onSuccess();
      }
    } catch {
      setParseError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/assets/template');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'asset-import-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // silent fail
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            อัปโหลดครุภัณฑ์หลายรายการ
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'เลือกไฟล์ Excel ที่มีข้อมูลครุภัณฑ์ที่ต้องการนำเข้า'}
            {step === 2 && 'ตรวจสอบข้อมูลก่อนนำเข้า'}
            {step === 3 && 'ผลการนำเข้า'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  s < step
                    ? 'bg-emerald-600 text-white'
                    : s === step
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-8 transition-colors ${
                    s < step ? 'bg-emerald-600' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
          <span className="text-xs text-muted-foreground ml-2">
            {step === 1 && 'เลือกไฟล์'}
            {step === 2 && 'ตรวจสอบ'}
            {step === 3 && 'ผลลัพธ์'}
          </span>
        </div>

        {/* Step 1: Upload Zone */}
        {step === 1 && (
          <div className="flex-1 flex flex-col gap-4">
            <Button
              variant="outline"
              className="w-fit"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลดแม่แบบ Excel
            </Button>

            <div
              className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors min-h-[200px] ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                  : file
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10'
                    : 'border-muted-foreground/25 hover:border-emerald-400 hover:bg-muted/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                  e.target.value = '';
                }}
              />

              {file ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
                  <div className="text-center">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setRows([]);
                      setParseError(null);
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    เปลี่ยนไฟล์
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="font-medium text-muted-foreground">
                      ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      รองรับ .xlsx, .xls, .csv (สูงสุด 10MB)
                    </p>
                  </div>
                </>
              )}
            </div>

            {parseError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end mt-auto pt-2">
              <Button onClick={handleNext} disabled={!file || !!parseError}>
                ถัดไป
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Validate */}
        {step === 2 && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary">
                พบ {rows.length} รายการ
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                ผ่านการตรวจสอบ {validCount} รายการ
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">
                  มีข้อผิดพลาด {errorCount} รายการ
                </Badge>
              )}
            </div>

            {/* Error list */}
            {errorCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium mb-1">
                      รายการที่มีข้อผิดพลาด:
                    </p>
                    {rows
                      .filter((r) => !r.valid)
                      .map((r) => (
                        <p key={r.rowIndex} className="text-sm">
                          • แถวที่ {r.rowIndex}: {r.errors.join(', ')}
                        </p>
                      ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden flex-1 min-h-0">
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16 text-center">แถว</TableHead>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead className="hidden sm:table-cell">หมวดหมู่</TableHead>
                      <TableHead className="text-right">ราคาซื้อ</TableHead>
                      <TableHead className="hidden md:table-cell">วันที่ซื้อ</TableHead>
                      <TableHead className="text-center">สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.rowIndex}
                        className={
                          !row.valid
                            ? 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
                            : ''
                        }
                      >
                        <TableCell className="text-center font-mono text-sm">
                          {row.rowIndex}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {row.name || '-'}
                          {!row.valid && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                              {row.errors.join(', ')}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {row.categoryName || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.purchasePrice
                            ? formatPrice(row.purchasePrice)
                            : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {row.purchaseDate || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.valid ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                              ถูกต้อง
                            </Badge>
                          ) : (
                            <Badge variant="destructive">ผิดพลาด</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between mt-auto pt-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                ย้อนกลับ
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {loading
                  ? 'กำลังนำเข้า...'
                  : `นำเข้า ${validCount} รายการ`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            {result.created > 0 && result.errors.length === 0 ? (
              <>
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    นำเข้าสำเร็จ {result.created} รายการ
                  </h3>
                  <p className="text-muted-foreground">
                    ครุภัณฑ์ทั้งหมดถูกบันทึกลงในระบบเรียบร้อยแล้ว
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">
                    {result.created > 0
                      ? `นำเข้าสำเร็จ ${result.created} รายการ`
                      : 'นำเข้าไม่สำเร็จ'}
                  </h3>
                  {result.skipped > 0 && (
                    <p className="text-amber-600 dark:text-amber-400">
                      ข้าม {result.skipped} รายการ (ข้อมูลซ้ำ)
                    </p>
                  )}
                  {result.errors.length > 0 && (
                    <div className="text-left max-w-md mx-auto mt-4">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                        รายละเอียดข้อผิดพลาด:
                      </p>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                        {result.errors.map((err, i) => (
                          <p
                            key={i}
                            className="text-sm text-red-600 dark:text-red-400"
                          >
                            • {err}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <Button onClick={resetAndClose} className="mt-4">
              เสร็จสิ้น
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}