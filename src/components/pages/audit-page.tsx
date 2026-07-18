'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  QrCode,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ClipboardList,
  Scan,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Package,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  assetId: string;
  asset?: {
    id: string;
    sku: string;
    name: string;
    category?: { name: string };
    location?: string | null;
    status: string;
    currentValue: number;
  };
  userId?: string | null;
  user?: { id: string; name: string; department?: string | null } | null;
  auditResult: string;
  notes?: string | null;
  location?: string | null;
  createdAt: string;
}

interface ScanResult {
  asset: {
    id: string;
    sku: string;
    name: string;
    status: string;
    currentValue: number;
    location?: string | null;
    category?: { name: string };
    description?: string | null;
    borrowRecords?: {
      id: string;
      user?: { id: string; name: string; department?: string | null };
      borrowDate: string;
      expectedReturnDate: string;
      status: string;
    }[];
    maintenanceLogs?: {
      id: string;
      description: string;
      date: string;
      status: string;
      performedBy?: string | null;
    }[];
  };
  latestAuditToday: {
    id: string;
    auditResult: string;
    user?: { id: string; name: string; role: string; department?: string | null };
    createdAt: string;
  } | null;
}

interface AuditSummary {
  totalScanned: number;
  foundNormal: number;
  foundDamaged: number;
  missing: number;
  scanRate: number;
  totalAssets: number;
}

// ─── Constants ──────────────────────────────────────────────────
const RESULT_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }>; btnClass: string }> = {
  FOUND_NORMAL: {
    label: 'พบ / สภาพปกติ',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle,
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  FOUND_DAMAGED: {
    label: 'พบ / ชำรุด',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: AlertTriangle,
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  MISSING: {
    label: 'สูญหาย',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    btnClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'พร้อมใช้งาน',
  BORROWED: 'กำลังยืม',
  MAINTENANCE: 'ซ่อมบำรุง',
  WRITEOFF: 'ตัดจำหน่าย',
};

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  BORROWED: 'bg-blue-100 text-blue-800 border-blue-200',
  MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-200',
  WRITEOFF: 'bg-gray-100 text-gray-800 border-gray-200',
};

const ITEMS_PER_PAGE = 20;

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('th-TH').format(Math.round(val));

const formatDateTime = (dateStr: string) =>
  format(new Date(dateStr), 'd MMM yyyy HH:mm', { locale: th });

// ─── Component ──────────────────────────────────────────────────
export function AuditPage() {
  const currentUser = useAuthStore((s) => s.currentUser);

  // Tab 1: Scan state
  const [skuInput, setSkuInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const [todayCount, setTodayCount] = useState(0);

  // Audit action dialog
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [auditLocation, setAuditLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tab 2: History state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [resultFilter, setResultFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ─── Fetch today's count ──────────────────────────────────────
  const fetchTodayCount = useCallback(async () => {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const params = new URLSearchParams({
        dateFrom: dateStr,
        dateTo: dateStr,
      });
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTodayCount(data.total || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTodayCount();
  }, [fetchTodayCount]);

  // ─── Scan / Lookup ────────────────────────────────────────────
  const handleScan = async () => {
    const sku = skuInput.trim();
    if (!sku) {
      toast.error('กรุณาระบุรหัส SKU');
      return;
    }

    setScanning(true);
    setScanError('');
    setScanResult(null);

    try {
      const res = await fetch(`/api/audit/scan?sku=${encodeURIComponent(sku)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ไม่พบครุภัณฑ์');
      }
      const data: ScanResult = await res.json();
      setScanResult(data);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'ไม่สามารถค้นหาได้');
      toast.error(err instanceof Error ? err.message : 'ไม่สามารถค้นหาได้');
    } finally {
      setScanning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  // ─── Audit Action ─────────────────────────────────────────────
  const openAuditDialog = (result: string) => {
    if (!scanResult) return;
    setSelectedResult(result);
    setAuditNotes('');
    setAuditLocation(scanResult.asset.location || '');
    setShowAuditDialog(true);
  };

  const handleAuditSubmit = async () => {
    if (!scanResult || !selectedResult) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: scanResult.asset.id,
          auditResult: selectedResult,
          notes: auditNotes || undefined,
          location: auditLocation || undefined,
          userId: currentUser?.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ไม่สามารถบันทึกได้');
      }

      const config = RESULT_CONFIG[selectedResult];
      toast.success('บันทึกการตรวจสอบสำเร็จ', {
        description: `${scanResult.asset.name} — ${config.label}`,
      });

      setShowAuditDialog(false);
      setScanResult(null);
      setSkuInput('');
      fetchTodayCount();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ไม่สามารถบันทึกได้');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── History & Summary ────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (resultFilter && resultFilter !== 'all') params.set('result', resultFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs || []);
      setHistoryTotal(data.total || 0);
      setHistoryTotalPages(data.totalPages || 1);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลประวัติได้');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, resultFilter, dateFrom, dateTo]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/audit/summary?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data);
    } catch {
      toast.error('ไม่สามารถโหลดสรุปผลได้');
    } finally {
      setSummaryLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchHistory();
    fetchSummary();
  }, [fetchHistory, fetchSummary]);

  const handleHistoryFilterChange = () => {
    setHistoryPage(1);
  };

  const handleDateFromChange = (val: string) => {
    setDateFrom(val);
    setHistoryPage(1);
  };

  const handleDateToChange = (val: string) => {
    setDateTo(val);
    setHistoryPage(1);
  };

  // ─── Render helpers ───────────────────────────────────────────
  const lastBorrow = scanResult?.asset.borrowRecords?.find(
    (b) => b.status === 'APPROVED' || b.status === 'OVERDUE'
  );
  const lastMaintenance = scanResult?.asset.maintenanceLogs?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <QrCode className="h-6 w-6 text-emerald-600" />
          ตรวจนับครุภัณฑ์
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          สแกน QR Code เพื่อตรวจสอบสภาพครุภัณฑ์
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scan" className="gap-1.5">
            <Scan className="h-4 w-4" />
            สแกน QR Code
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            ประวัติการตรวจนับ
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Scan ─────────────────────────────────────── */}
        <TabsContent value="scan" className="space-y-4 mt-4">
          {/* Today counter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ตรวจแล้ววันนี้</p>
                  <p className="text-xl font-bold text-emerald-700">{todayCount} รายการ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SKU Input */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3">
                <Label htmlFor="sku-input" className="text-base font-medium">
                  กรอกรหัสครุภัณฑ์ (SKU)
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sku-input"
                      placeholder="เช่น AST-00001"
                      value={skuInput}
                      onChange={(e) => setSkuInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-10 text-base h-12"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    onClick={handleScan}
                    disabled={scanning || !skuInput.trim()}
                    className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    {scanning ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                    ค้นหา
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scan Error */}
          {scanError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="text-red-700 text-sm">{scanError}</p>
              </CardContent>
            </Card>
          )}

          {/* Scan Result — Asset Card */}
          {scanResult && (
            <Card className="border-emerald-200">
              <CardContent className="p-4 md:p-6 space-y-4">
                {/* Asset Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-mono mb-1">
                      {scanResult.asset.sku}
                    </p>
                    <h3 className="text-lg font-bold truncate">
                      {scanResult.asset.name}
                    </h3>
                    {scanResult.asset.category && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {scanResult.asset.category.name}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={STATUS_BADGE[scanResult.asset.status] || ''}>
                    {STATUS_LABELS[scanResult.asset.status] || scanResult.asset.status}
                  </Badge>
                </div>

                {/* Asset Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      สถานที่
                    </p>
                    <p className="text-sm font-medium">
                      {scanResult.asset.location || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      มูลค่าปัจจุบัน
                    </p>
                    <p className="text-sm font-medium">
                      {formatCurrency(scanResult.asset.currentValue)} บาท
                    </p>
                  </div>
                </div>

                {/* Last Borrow Info */}
                {lastBorrow && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      ข้อมูลการยืมล่าสุด
                    </p>
                    <p className="text-sm">
                      ผู้ยืม: <span className="font-medium">{lastBorrow.user?.name || '-'}</span>
                      {lastBorrow.user?.department && (
                        <span className="text-muted-foreground"> — {lastBorrow.user.department}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      วันยืม: {formatDateTime(lastBorrow.borrowDate)}
                    </p>
                  </div>
                )}

                {/* Last Maintenance Info */}
                {lastMaintenance && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      ข้อมูลการซ่อมบำรุงล่าสุด
                    </p>
                    <p className="text-sm">
                      {lastMaintenance.performedBy
                        ? `ผู้ดำเนินการ: ${lastMaintenance.performedBy}`
                        : lastMaintenance.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      วันที่: {format(new Date(lastMaintenance.date), 'd MMM yyyy', { locale: th })}
                      {lastMaintenance.status === 'IN_PROGRESS' && (
                        <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0">
                          กำลังดำเนินการ
                        </Badge>
                      )}
                    </p>
                  </div>
                )}

                {/* Today's Audit Status */}
                {scanResult.latestAuditToday && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-800">
                        ตรวจแล้ววันนี้ — {
                          RESULT_CONFIG[scanResult.latestAuditToday.auditResult]?.label ||
                          scanResult.latestAuditToday.auditResult
                        }
                      </p>
                      <p className="text-xs text-emerald-600">
                        โดย {scanResult.latestAuditToday.user?.name || '-'}
                        {scanResult.latestAuditToday.user?.department && ` · ${scanResult.latestAuditToday.user.department}`}
                        {' · '}
                        {formatDateTime(scanResult.latestAuditToday.createdAt)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Audit Action Buttons */}
                <div className="pt-2 border-t space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    บันทึกผลการตรวจสอบ
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['FOUND_NORMAL', 'FOUND_DAMAGED', 'MISSING'] as const).map((result) => {
                      const config = RESULT_CONFIG[result];
                      const Icon = config.icon;
                      return (
                        <Button
                          key={result}
                          size="lg"
                          className={`${config.btnClass} h-14 text-base font-semibold gap-2 w-full`}
                          onClick={() => openAuditDialog(result)}
                        >
                          <Icon className="h-5 w-5" />
                          {config.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Tab 2: History ──────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {summaryLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-7 w-12" />
                  </CardContent>
                </Card>
              ))
            ) : summary ? (
              <>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">ตรวจสอบทั้งหมด</p>
                    <p className="text-xl font-bold">{summary.totalScanned}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <p className="text-xs text-muted-foreground">พบ / ปกติ</p>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">{summary.foundNormal}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <p className="text-xs text-muted-foreground">พบ / ชำรุด</p>
                    </div>
                    <p className="text-xl font-bold text-amber-700">{summary.foundDamaged}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-red-600" />
                      <p className="text-xs text-muted-foreground">สูญหาย</p>
                    </div>
                    <p className="text-xl font-bold text-red-700">{summary.missing}</p>
                  </CardContent>
                </Card>
                <Card className="col-span-2 lg:col-span-1">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">อัตราการตรวจนับ</p>
                    <p className="text-xl font-bold text-teal-700">{summary.scanRate}%</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      จากทั้งหมด {summary.totalAssets} รายการ
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <Select
                    value={resultFilter}
                    onValueChange={(val) => {
                      setResultFilter(val);
                      handleHistoryFilterChange();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ผลการตรวจสอบ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      <SelectItem value="FOUND_NORMAL">พบ / สภาพปกติ</SelectItem>
                      <SelectItem value="FOUND_DAMAGED">พบ / ชำรุด</SelectItem>
                      <SelectItem value="MISSING">สูญหาย</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    placeholder="วันที่เริ่มต้น"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleDateToChange(e.target.value)}
                    placeholder="วันที่สิ้นสุด"
                  />
                </div>
              </div>

              {/* History Table */}
              <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-medium text-muted-foreground">วันที่/เวลา</TableHead>
                        <TableHead className="font-medium text-muted-foreground">ครุภัณฑ์</TableHead>
                        <TableHead className="font-medium text-muted-foreground">ผลการตรวจ</TableHead>
                        <TableHead className="font-medium text-muted-foreground">ผู้ตรวจ</TableHead>
                        <TableHead className="font-medium text-muted-foreground">สถานที่</TableHead>
                        <TableHead className="font-medium text-muted-foreground">หมายเหตุ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-5 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            ไม่พบข้อมูลการตรวจนับ
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => {
                          const config = RESULT_CONFIG[log.auditResult];
                          return (
                            <TableRow key={log.id}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatDateTime(log.createdAt)}
                              </TableCell>
                              <TableCell>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate max-w-[200px]">
                                    {log.asset?.name || '-'}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {log.asset?.sku || '-'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={config?.badgeClass || ''}>
                                  {config?.label || log.auditResult}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {log.user?.name || '-'}
                              </TableCell>
                              <TableCell className="text-sm max-w-[120px] truncate">
                                {log.location || '-'}
                              </TableCell>
                              <TableCell className="text-sm max-w-[150px] truncate">
                                {log.notes || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden space-y-2">
                  {historyLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-3 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-1/3" />
                        </CardContent>
                      </Card>
                    ))
                  ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      ไม่พบข้อมูลการตรวจนับ
                    </div>
                  ) : (
                    logs.map((log) => {
                      const config = RESULT_CONFIG[log.auditResult];
                      return (
                        <Card key={log.id}>
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">
                                  {log.asset?.name || '-'}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {log.asset?.sku || '-'}
                                </p>
                              </div>
                              <Badge variant="outline" className={`${config?.badgeClass || ''} shrink-0 text-[11px]`}>
                                {config?.label || log.auditResult}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>{formatDateTime(log.createdAt)}</span>
                              {log.user?.name && <span>โดย {log.user.name}</span>}
                              {log.location && <span>📍 {log.location}</span>}
                            </div>
                            {log.notes && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {log.notes}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Pagination */}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    หน้า {historyPage} จาก {historyTotalPages} ({historyTotal} รายการ)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: historyTotalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (historyTotalPages <= 5) return true;
                        if (p === 1 || p === historyTotalPages) return true;
                        if (Math.abs(p - historyPage) <= 1) return true;
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
                            variant={historyPage === p ? 'default' : 'outline'}
                            size="sm"
                            className={historyPage === p ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            onClick={() => setHistoryPage(p as number)}
                          >
                            {p}
                          </Button>
                        )
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      disabled={historyPage >= historyTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Audit Action Dialog ───────────────────────────────── */}
      <Dialog open={showAuditDialog} onOpenChange={(open) => {
        setShowAuditDialog(open);
        if (!open) {
          setAuditNotes('');
          setAuditLocation('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>บันทึกผลการตรวจสอบ</DialogTitle>
            <DialogDescription>
              {scanResult && (
                <>
                  {scanResult.asset.name} ({scanResult.asset.sku})
                  {selectedResult && (
                    <Badge
                      variant="outline"
                      className={`ml-2 ${RESULT_CONFIG[selectedResult]?.badgeClass || ''}`}
                    >
                      {RESULT_CONFIG[selectedResult]?.label || selectedResult}
                    </Badge>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>สถานที่ที่ตรวจพบ</Label>
              <Input
                placeholder="ระบุสถานที่ (ถ้าต่างจากข้อมูลเดิม)"
                value={auditLocation}
                onChange={(e) => setAuditLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Textarea
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAuditDialog(false);
                  setAuditNotes('');
                  setAuditLocation('');
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleAuditSubmit}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                ยืนยัน
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}