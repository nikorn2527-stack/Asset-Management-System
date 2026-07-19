'use client';

import { useEffect, useState, useCallback } from 'react';
import type { MaintenanceLog, MaintenanceStatus, Asset } from '@/types';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  Wrench,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Search,
  Coins,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const STATUS_BADGE: Record<MaintenanceStatus, string> = {
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จสิ้น',
};

const ITEMS_PER_PAGE = 10;

export function MaintenancePage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const isStaffOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF';

  // Data
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);

  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(ITEMS_PER_PAGE) });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/maintenance?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const fetchedLogs: MaintenanceLog[] = data.logs || [];

      // If there's a search query, filter client-side
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const filtered = fetchedLogs.filter(
          (log) =>
            log.asset?.sku?.toLowerCase().includes(q) ||
            log.asset?.name?.toLowerCase().includes(q)
        );
        setLogs(filtered);
      } else {
        setLogs(fetchedLogs);
      }

      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);

      // Calculate total cost from all logs
      const allCost = fetchedLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
      setTotalCost(allCost);
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value);
    setPage(1);
  };

  // Fetch all assets for dialog
  const openAddDialog = async () => {
    setShowAddDialog(true);
    try {
      const res = await fetch('/api/assets?limit=100');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllAssets(data.assets || []);
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดรายการครุภัณฑ์ได้', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedAssetId('');
    setDescription('');
    setCost('');
    setPerformedBy('');
  };

  const handleAddSubmit = async () => {
    if (!selectedAssetId || !description) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetId,
          description,
          cost: cost ? parseFloat(cost) : 0,
          performedBy: performedBy || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast({ title: 'เพิ่มบันทึกสำเร็จ', description: 'บันทึกซ่อมบำรุงถูกเพิ่มแล้ว' });
      setShowAddDialog(false);
      resetForm();
      fetchLogs();
    } catch (err) {
      toast({ title: 'เกิดข้อผิดพลาด', description: err instanceof Error ? err.message : 'ไม่สามารถเพิ่มบันทึกได้', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (log: MaintenanceLog) => {
    if (!log.assetId) return;
    setActionLoading(log.id);
    try {
      // Update asset status back to AVAILABLE
      const res = await fetch(`/api/assets/${log.assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'AVAILABLE' }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'เสร็จสิ้น', description: 'ครุภัณฑ์พร้อมใช้งานแล้ว' });
      fetchLogs();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถอัปเดตสถานะได้', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-emerald-600" />
            บันทึกซ่อมบำรุง
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            จัดการบันทึกการซ่อมบำรุงครุภัณฑ์ ({total} รายการ)
          </p>
        </div>
        {isStaffOrAdmin && (
          <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มบันทึกซ่อมบำรุง
          </Button>
        )}
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Wrench className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">จำนวนทั้งหมด</p>
                <p className="text-xl font-bold">{total} รายการ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Coins className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ค่าใช้จ่ายรวม</p>
                <p className="text-xl font-bold">{new Intl.NumberFormat('th-TH').format(Math.round(totalCost))} บาท</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Wrench className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">กำลังดำเนินการ</p>
                <p className="text-xl font-bold">{logs.filter((l) => l.status === 'IN_PROGRESS').length} รายการ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหารหัสหรือชื่อครุภัณฑ์..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="IN_PROGRESS">กำลังดำเนินการ</SelectItem>
                <SelectItem value="COMPLETED">เสร็จสิ้น</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium text-muted-foreground">รหัสครุภัณฑ์</TableHead>
                  <TableHead className="font-medium text-muted-foreground">ชื่อครุภัณฑ์</TableHead>
                  <TableHead className="font-medium text-muted-foreground">รายละเอียด</TableHead>
                  <TableHead className="font-medium text-muted-foreground text-right">ค่าใช้จ่าย</TableHead>
                  <TableHead className="font-medium text-muted-foreground">สถานะ</TableHead>
                  <TableHead className="font-medium text-muted-foreground">วันที่</TableHead>
                  {isStaffOrAdmin && (
                    <TableHead className="font-medium text-muted-foreground text-right">การดำเนินการ</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: isStaffOrAdmin ? 7 : 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isStaffOrAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {log.asset?.sku || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.asset?.name || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {new Intl.NumberFormat('th-TH').format(Math.round(log.cost || 0))} บาท
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE[log.status]}>
                          {STATUS_LABELS[log.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.date ? format(new Date(log.date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      {isStaffOrAdmin && (
                        <TableCell className="text-right">
                          {log.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8 px-2"
                              onClick={() => handleComplete(log)}
                              disabled={actionLoading === log.id}
                            >
                              {actionLoading === log.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 mr-1" />
                              )}
                              เสร็จสิ้น
                            </Button>
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
                      <span key={`dots-${idx}`} className="text-muted-foreground px-1">...</span>
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

      {/* Add Maintenance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มบันทึกซ่อมบำรุง</DialogTitle>
            <DialogDescription>บันทึกรายละเอียดการซ่อมบำรุงครุภัณฑ์</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>ครุภัณฑ์ <span className="text-red-500">*</span></Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกครุภัณฑ์" />
                </SelectTrigger>
                <SelectContent className="max-h-60 custom-scrollbar">
                  {allAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      <span className="font-mono text-xs mr-2">{asset.sku}</span>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="ระบุรายละเอียดการซ่อมบำรุง"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>ค่าใช้จ่าย (บาท)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>ผู้ดำเนินการ</Label>
              <Input
                placeholder="ชื่อผู้ดำเนินการ/ช่าง"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleAddSubmit}
                disabled={!selectedAssetId || !description || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                บันทึก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}