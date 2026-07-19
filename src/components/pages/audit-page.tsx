'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { AuditRecord, AuditStatus, Asset } from '@/types';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardCheck,
  Plus,
  Search,
  Check,
  AlertTriangle,
  XCircle,
  QrCode,
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ScanLine,
  X,
  PackageCheck,
  PackageX,
  ShieldAlert,
  ListChecks,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ──────────────────────────────────────────────────────────────

const AUDIT_STATUS_BADGE: Record<string, string> = {
  NOT_CHECKED: 'bg-gray-100 text-gray-600 border-gray-200',
  FOUND_NORMAL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  FOUND_DAMAGED: 'bg-amber-100 text-amber-800 border-amber-200',
  MISSING: 'bg-red-100 text-red-800 border-red-200',
};

const AUDIT_STATUS_LABELS: Record<string, string> = {
  NOT_CHECKED: 'ยังไม่ตรวจ',
  FOUND_NORMAL: 'พบปกติ',
  FOUND_DAMAGED: 'ชำรุด',
  MISSING: 'สูญหาย',
};

const ASSET_STATUS_BADGE: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  BORROWED: 'bg-blue-100 text-blue-800 border-blue-200',
  MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-200',
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'พร้อมใช้งาน',
  BORROWED: 'ถูกยืม',
  MAINTENANCE: 'ซ่อมบำรุง',
};

const ITEMS_PER_PAGE = 10;

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditSummary {
  totalAssets: number;
  checked: number;
  foundNormal: number;
  foundDamaged: number;
  missing: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AuditPage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const isStaffOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF';

  // ── State: Year ──
  const currentThaiYear = new Date().getFullYear() + 543;
  const [selectedYear, setSelectedYear] = useState<number>(currentThaiYear);

  // ── State: Table Data ──
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [summary, setSummary] = useState<AuditSummary>({
    totalAssets: 0,
    checked: 0,
    foundNormal: 0,
    foundDamaged: 0,
    missing: 0,
  });

  // ── State: Filters ──
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [skuSearch, setSkuSearch] = useState('');

  // ── State: Scan Mode ──
  const [scanMode, setScanMode] = useState(false);
  const [scanSku, setScanSku] = useState('');
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanNotes, setScanNotes] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  // ── State: New Audit Dialog ──
  const [showNewAuditDialog, setShowNewAuditDialog] = useState(false);
  const [newAuditYear, setNewAuditYear] = useState<number>(currentThaiYear);
  const [initializing, setInitializing] = useState(false);

  // ── Year options (current year ± 3) ──
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentThaiYear - 3 + i);

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(selectedYear),
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });
      if (statusFilter && statusFilter !== 'NOT_CHECKED') {
        params.set('status', statusFilter);
      } else if (statusFilter === 'NOT_CHECKED') {
        params.set('status', 'NOT_CHECKED');
      }
      if (skuSearch.trim()) {
        params.set('sku', skuSearch.trim());
      }

      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRecords(data.records || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);

      if (data.summary) {
        setSummary(data.summary);
      }
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลการตรวจนับได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedYear, page, statusFilter, skuSearch, toast]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value);
    setPage(1);
  };

  const handleSkuSearch = (value: string) => {
    setSkuSearch(value);
    setPage(1);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setPage(1);
    setStatusFilter('');
    setSkuSearch('');
  };

  // ── Quick action: update audit status from table row ──
  const handleQuickAudit = async (record: AuditRecord, status: AuditStatus) => {
    setActionLoading(record.id);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: record.assetId,
          auditYear: selectedYear,
          status,
          auditorId: currentUser?.id || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast({
        title: 'บันทึกผลสำเร็จ',
        description: `${record.asset?.sku || ''} - ${AUDIT_STATUS_LABELS[status]}`,
      });
      fetchAuditData();
    } catch (err) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err instanceof Error ? err.message : 'ไม่สามารถบันทึกผลได้',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Scan mode: look up asset by SKU ──
  const handleScanLookup = async () => {
    const sku = scanSku.trim();
    if (!sku) return;
    setScanLoading(true);
    setScannedAsset(null);
    setScanNotes('');
    try {
      const res = await fetch(`/api/assets?sku=${encodeURIComponent(sku)}&limit=1`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const assets: Asset[] = data.assets || [];
      if (assets.length > 0 && assets[0].status !== 'WRITEOFF') {
        setScannedAsset(assets[0]);
      } else if (assets.length > 0 && assets[0].status === 'WRITEOFF') {
        toast({
          title: 'ไม่สามารถตรวจนับได้',
          description: 'ครุภัณฑ์นี้ถูกตัดจำหน่ายแล้ว',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'ไม่พบครุภัณฑ์',
          description: `ไม่พบรหัส ${sku} ในระบบ`,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถค้นหาครุภัณฑ์ได้',
        variant: 'destructive',
      });
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanSubmit = async (status: AuditStatus) => {
    if (!scannedAsset) return;
    setScanSubmitting(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: scannedAsset.id,
          auditYear: selectedYear,
          status,
          auditorId: currentUser?.id || undefined,
          notes: scanNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast({
        title: 'บันทึกผลสำเร็จ',
        description: `${scannedAsset.sku} - ${AUDIT_STATUS_LABELS[status]}`,
      });
      // Reset for next scan
      setScannedAsset(null);
      setScanSku('');
      setScanNotes('');
      scanInputRef.current?.focus();
      // Refresh table data
      fetchAuditData();
    } catch (err) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err instanceof Error ? err.message : 'ไม่สามารถบันทึกผลได้',
        variant: 'destructive',
      });
    } finally {
      setScanSubmitting(false);
    }
  };

  // ── New audit dialog ──
  const handleStartNewAudit = async () => {
    setInitializing(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          auditYear: newAuditYear,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast({
        title: 'เริ่มตรวจนับสำเร็จ',
        description: `เริ่มตรวจนับปี ${newAuditYear} แล้ว`,
      });
      setShowNewAuditDialog(false);
      setSelectedYear(newAuditYear);
      setPage(1);
      setStatusFilter('');
      setSkuSearch('');
    } catch (err) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err instanceof Error ? err.message : 'ไม่สามารถเริ่มตรวจนับได้',
        variant: 'destructive',
      });
    } finally {
      setInitializing(false);
    }
  };

  // ── Toggle scan mode ──
  const toggleScanMode = () => {
    setScanMode((prev) => {
      if (!prev) {
        // Entering scan mode
        setScanSku('');
        setScannedAsset(null);
        setScanNotes('');
        setTimeout(() => scanInputRef.current?.focus(), 100);
      }
      return !prev;
    });
  };

  // ─── Computed ─────────────────────────────────────────────────────────────

  const checkedPercent = summary.totalAssets > 0
    ? Math.round((summary.checked / summary.totalAssets) * 100)
    : 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-600" />
            ตรวจนับประจำปี
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            ครุภัณฑ์ทั้งหมด {new Intl.NumberFormat('th-TH').format(summary.totalAssets)} รายการ
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStaffOrAdmin && (
            <Button
              onClick={toggleScanMode}
              variant={scanMode ? 'default' : 'outline'}
              className={scanMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}
            >
              {scanMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  ปิดโหมดสแกน
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  สแกน QR Code
                </>
              )}
            </Button>
          )}
          {isStaffOrAdmin && (
            <Button
              onClick={() => {
                setNewAuditYear(currentThaiYear);
                setShowNewAuditDialog(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              เริ่มตรวจนับปีใหม่
            </Button>
          )}
        </div>
      </div>

      {/* ── Year Selector ── */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium whitespace-nowrap">ปีการตรวจนับ:</Label>
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => handleYearChange(Number(v))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="เลือกปี" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                พ.ศ. {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── QR Scan Mode ── */}
      {scanMode && isStaffOrAdmin && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-emerald-600" />
              โหมดสแกน QR Code — ปี {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Simulated camera view area */}
            <div className="relative rounded-xl border-2 border-dashed border-emerald-300 bg-white/60 flex flex-col items-center justify-center py-8 px-4 min-h-[160px]">
              <Camera className="h-12 w-12 text-emerald-400 mb-3" />
              <p className="text-sm text-muted-foreground text-center">
                ยินดีต้อนรับสู่โหมดสแกน — ใส่รหัสครุภัณฑ์ด้านล่างเพื่อเริ่มตรวจนับ
              </p>
            </div>

            {/* SKU input fallback */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={scanInputRef}
                  placeholder="กรอกรหัสครุภัณฑ์ (SKU) เช่น AST-00001"
                  value={scanSku}
                  onChange={(e) => setScanSku(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleScanLookup();
                    }
                  }}
                  className="pl-9 font-mono"
                  disabled={scanLoading || scanSubmitting}
                />
              </div>
              <Button
                onClick={handleScanLookup}
                disabled={!scanSku.trim() || scanLoading || scanSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {scanLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                ค้นหา
              </Button>
            </div>

            {/* Scanned asset card */}
            {scannedAsset && (
              <Card className="border-emerald-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 shrink-0">
                      <PackageCheck className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">
                          {scannedAsset.sku}
                        </span>
                        {scannedAsset.status && ASSET_STATUS_BADGE[scannedAsset.status] && (
                          <Badge variant="outline" className={ASSET_STATUS_BADGE[scannedAsset.status]}>
                            {ASSET_STATUS_LABELS[scannedAsset.status] || scannedAsset.status}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium mt-0.5 truncate">
                        {scannedAsset.name}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        {scannedAsset.category && (
                          <span>หมวด: {scannedAsset.category.name}</span>
                        )}
                        {scannedAsset.location && (
                          <span>สถานที่: {scannedAsset.location}</span>
                        )}
                        {scannedAsset.currentValue != null && (
                          <span>มูลค่า: {new Intl.NumberFormat('th-TH').format(Math.round(scannedAsset.currentValue))} บาท</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">หมายเหตุ (ถ้ามี)</Label>
                    <Textarea
                      placeholder="ระบุหมายเหตุเพิ่มเติม..."
                      value={scanNotes}
                      onChange={(e) => setScanNotes(e.target.value)}
                      rows={2}
                      disabled={scanSubmitting}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleScanSubmit('FOUND_NORMAL')}
                      disabled={scanSubmitting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {scanSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      พบปกติ
                    </Button>
                    <Button
                      onClick={() => handleScanSubmit('FOUND_DAMAGED')}
                      disabled={scanSubmitting}
                      variant="outline"
                      className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-50"
                    >
                      {scanSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 mr-2" />
                      )}
                      ชำรุด
                    </Button>
                    <Button
                      onClick={() => handleScanSubmit('MISSING')}
                      disabled={scanSubmitting}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-800 hover:bg-red-50"
                    >
                      {scanSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      สูญหาย
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <ListChecks className="h-5 w-5 text-gray-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">รวมทั้งหมด</p>
                <p className="text-xl font-bold">
                  {loading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    new Intl.NumberFormat('th-TH').format(summary.totalAssets)
                  )}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>ตรวจแล้ว</span>
                <span>{loading ? <Skeleton className="h-3 w-10 inline-block" /> : `${checkedPercent}%`}</span>
              </div>
              <Progress
                value={loading ? 0 : checkedPercent}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Found Normal */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <PackageCheck className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">พบปกติ</p>
                <p className="text-xl font-bold text-emerald-700">
                  {loading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    new Intl.NumberFormat('th-TH').format(summary.foundNormal)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Found Damaged */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <ShieldAlert className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ชำรุด</p>
                <p className="text-xl font-bold text-amber-700">
                  {loading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    new Intl.NumberFormat('th-TH').format(summary.foundDamaged)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Missing */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <PackageX className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">สูญหาย</p>
                <p className="text-xl font-bold text-red-700">
                  {loading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    new Intl.NumberFormat('th-TH').format(summary.missing)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Asset List Table ── */}
      <Card>
        <CardContent className="p-4 md:p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหารหัสครุภัณฑ์ (SKU)..."
                value={skuSearch}
                onChange={(e) => handleSkuSearch(e.target.value)}
                className="pl-9 font-mono"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="ผลการตรวจ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="NOT_CHECKED">ยังไม่ตรวจ</SelectItem>
                <SelectItem value="FOUND_NORMAL">พบปกติ</SelectItem>
                <SelectItem value="FOUND_DAMAGED">ชำรุด</SelectItem>
                <SelectItem value="MISSING">สูญหาย</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium text-muted-foreground w-[100px]">สถานะ</TableHead>
                  <TableHead className="font-medium text-muted-foreground w-[120px]">รหัส</TableHead>
                  <TableHead className="font-medium text-muted-foreground">ชื่อครุภัณฑ์</TableHead>
                  <TableHead className="font-medium text-muted-foreground hidden md:table-cell">หมวดหมู่</TableHead>
                  <TableHead className="font-medium text-muted-foreground hidden lg:table-cell">สถานที่</TableHead>
                  <TableHead className="font-medium text-muted-foreground w-[120px]">ผลตรวจ</TableHead>
                  <TableHead className="font-medium text-muted-foreground hidden sm:table-cell">หมายเหตุ</TableHead>
                  {isStaffOrAdmin && (
                    <TableHead className="font-medium text-muted-foreground text-right">ดำเนินการ</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: isStaffOrAdmin ? 8 : 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isStaffOrAdmin ? 8 : 7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <ClipboardCheck className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      <p>ไม่พบข้อมูลการตรวจนับ</p>
                      {summary.totalAssets === 0 && (
                        <p className="text-xs mt-1">
                          กด &quot;เริ่มตรวจนับปีใหม่&quot; เพื่อเริ่มตรวจนับ
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      {/* Asset Status */}
                      <TableCell>
                        {record.asset?.status && ASSET_STATUS_BADGE[record.asset.status] ? (
                          <Badge
                            variant="outline"
                            className={`${ASSET_STATUS_BADGE[record.asset.status]} text-[11px]`}
                          >
                            {ASSET_STATUS_LABELS[record.asset.status] || record.asset.status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* SKU */}
                      <TableCell className="font-mono text-sm">
                        {record.asset?.sku || '-'}
                      </TableCell>

                      {/* Name */}
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {record.asset?.name || '-'}
                      </TableCell>

                      {/* Category */}
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {record.asset?.category?.name || '-'}
                      </TableCell>

                      {/* Location */}
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {record.asset?.location || '-'}
                      </TableCell>

                      {/* Audit Result */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${AUDIT_STATUS_BADGE[record.status]} text-[11px]`}
                        >
                          {record.status === 'NOT_CHECKED' && '⏳ '}
                          {record.status === 'FOUND_NORMAL' && '✅ '}
                          {record.status === 'FOUND_DAMAGED' && '⚠️ '}
                          {record.status === 'MISSING' && '❌ '}
                          {AUDIT_STATUS_LABELS[record.status]}
                        </Badge>
                      </TableCell>

                      {/* Notes */}
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[150px] truncate">
                        {record.notes || '-'}
                      </TableCell>

                      {/* Quick Actions */}
                      {isStaffOrAdmin && (
                        <TableCell className="text-right">
                          {record.status === 'NOT_CHECKED' ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => handleQuickAudit(record, 'FOUND_NORMAL')}
                                disabled={actionLoading === record.id}
                                title="พบปกติ"
                              >
                                {actionLoading === record.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
                                onClick={() => handleQuickAudit(record, 'FOUND_DAMAGED')}
                                disabled={actionLoading === record.id}
                                title="ชำรุด"
                              >
                                <AlertTriangle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-1.5 text-red-700 border-red-300 hover:bg-red-50"
                                onClick={() => handleQuickAudit(record, 'MISSING')}
                                disabled={actionLoading === record.id}
                                title="สูญหาย"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {record.auditor?.name || 'ตรวจแล้ว'}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                หน้า {page} จาก {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 5) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - page) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="text-muted-foreground px-1">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={page === p ? 'default' : 'outline'}
                        size="sm"
                        className={page === p ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        onClick={() => setPage(p as number)}
                      >
                        {p}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Start New Audit Dialog ── */}
      <Dialog
        open={showNewAuditDialog}
        onOpenChange={(open) => {
          setShowNewAuditDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เริ่มตรวจนับปีใหม่</DialogTitle>
            <DialogDescription>
              ระบบจะดึงครุภัณฑ์ทั้งหมดที่ยังไม่ถูกตัดจำหน่ายมาสร้างรายการตรวจนับเริ่มต้น
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>ปีการตรวจนับ (พ.ศ.)</Label>
              <Select
                value={String(newAuditYear)}
                onValueChange={(v) => setNewAuditYear(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกปี" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      พ.ศ. {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">หมายเหตุ</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-amber-700">
                <li>ครุภัณฑ์ที่มีสถานะ &quot;ตัดจำหน่าย&quot; จะไม่ถูกนำมาตรวจนับ</li>
                <li>หากปีนี้มีข้อมูลอยู่แล้ว จะสร้างรายการใหม่เพิ่มเติม</li>
                <li>รายการที่ตรวจแล้วจะไม่ถูกเปลี่ยนแปลง</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowNewAuditDialog(false)}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleStartNewAudit}
                disabled={initializing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {initializing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                เริ่มตรวจนับ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}