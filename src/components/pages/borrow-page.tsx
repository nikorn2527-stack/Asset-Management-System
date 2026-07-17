'use client';

import { useEffect, useState, useCallback } from 'react';
import type { BorrowRecord, BorrowStatus, Asset } from '@/types';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ArrowLeftRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const STATUS_BADGE: Record<BorrowStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  RETURNED: 'bg-emerald-50 text-emerald-700 border-emerald-200 outline',
  OVERDUE: 'bg-red-100 text-red-800 border-red-300 animate-pulse',
};

const STATUS_LABELS: Record<BorrowStatus, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติ',
  REJECTED: 'ปฏิเสธ',
  RETURNED: 'คืนแล้ว',
  OVERDUE: 'เกินกำหนด',
};

const ITEMS_PER_PAGE = 10;

export function BorrowPage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const isStaffOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF';

  // Data
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');

  // Dialog
  const [showBorrowDialog, setShowBorrowDialog] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getStatusParam = useCallback(() => {
    switch (activeTab) {
      case 'pending': return 'PENDING';
      case 'active': return 'APPROVED,OVERDUE';
      case 'history': return 'RETURNED,REJECTED';
      default: return '';
    }
  }, [activeTab]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(ITEMS_PER_PAGE) });
      const status = getStatusParam();
      if (status) params.set('status', status);

      const res = await fetch(`/api/borrow?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRecords(data.records || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, getStatusParam, toast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };

  // Fetch available assets for dialog
  const openBorrowDialog = async () => {
    setShowBorrowDialog(true);
    try {
      const res = await fetch('/api/assets?status=AVAILABLE&limit=100');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAvailableAssets(data.assets || []);
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดรายการครุภัณฑ์ได้', variant: 'destructive' });
    }
  };

  const resetBorrowForm = () => {
    setSelectedAssetId('');
    setExpectedReturnDate('');
    setNotes('');
  };

  const handleBorrowSubmit = async () => {
    if (!selectedAssetId || !expectedReturnDate || !currentUser) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetId,
          userId: currentUser.id,
          expectedReturnDate,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast({ title: 'ส่งคำขอสำเร็จ', description: 'คำขอยืมครุภัณฑ์ถูกส่งแล้ว' });
      setShowBorrowDialog(false);
      resetBorrowForm();
      fetchRecords();
    } catch (err) {
      toast({ title: 'เกิดข้อผิดพลาด', description: err instanceof Error ? err.message : 'ไม่สามารถส่งคำขอได้', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'return') => {
    if (!currentUser) return;
    setActionLoading(id);
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'approve' || action === 'reject') {
        body.approvedById = currentUser.id;
      }
      if (action === 'return') {
        body.actualReturnDate = new Date().toISOString();
      }
      const res = await fetch(`/api/borrow/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      const label = action === 'approve' ? 'อนุมัติ' : action === 'reject' ? 'ปฏิเสธ' : 'รับคืน';
      toast({ title: `${label}สำเร็จ` });
      fetchRecords();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถดำเนินการได้', variant: 'destructive' });
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
            <ArrowLeftRight className="h-6 w-6 text-emerald-600" />
            ระบบยืม-คืนครุภัณฑ์
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            จัดการคำขอยืมและคืนครุภัณฑ์ ({total} รายการ)
          </p>
        </div>
        {currentUser?.role === 'USER' && (
          <Button onClick={openBorrowDialog} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            ขอยืมครุภัณฑ์
          </Button>
        )}
      </div>

      {/* Tabs & Table */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">คำขอยืมทั้งหมด</TabsTrigger>
              <TabsTrigger value="pending">รออนุมัติ</TabsTrigger>
              <TabsTrigger value="active">กำลังยืม</TabsTrigger>
              <TabsTrigger value="ประวัติ">ประวัติ</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-medium text-muted-foreground">รหัสครุภัณฑ์</TableHead>
                      <TableHead className="font-medium text-muted-foreground">ชื่อครุภัณฑ์</TableHead>
                      <TableHead className="font-medium text-muted-foreground">ผู้ยืม</TableHead>
                      <TableHead className="font-medium text-muted-foreground">วันยืม</TableHead>
                      <TableHead className="font-medium text-muted-foreground">วันคืนที่คาด</TableHead>
                      <TableHead className="font-medium text-muted-foreground">สถานะ</TableHead>
                      <TableHead className="font-medium text-muted-foreground text-right">การดำเนินการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          ไม่พบข้อมูล
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono text-sm">
                            {record.asset?.sku || '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {record.asset?.name || '-'}
                          </TableCell>
                          <TableCell>{record.user?.name || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {record.borrowDate ? format(new Date(record.borrowDate), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {record.expectedReturnDate ? format(new Date(record.expectedReturnDate), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={STATUS_BADGE[record.status]}
                            >
                              {STATUS_LABELS[record.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isStaffOrAdmin && record.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8 px-2"
                                    onClick={() => handleAction(record.id, 'approve')}
                                    disabled={actionLoading === record.id}
                                  >
                                    {actionLoading === record.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3 mr-1" />
                                    )}
                                    อนุมัติ
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-700 border-red-300 hover:bg-red-50 h-8 px-2"
                                    onClick={() => handleAction(record.id, 'reject')}
                                    disabled={actionLoading === record.id}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    ปฏิเสธ
                                  </Button>
                                </>
                              )}
                              {isStaffOrAdmin && (record.status === 'APPROVED' || record.status === 'OVERDUE') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-teal-700 border-teal-300 hover:bg-teal-50 h-8 px-2"
                                  onClick={() => handleAction(record.id, 'return')}
                                  disabled={actionLoading === record.id}
                                >
                                  {actionLoading === record.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                  )}
                                  รับคืน
                                </Button>
                              )}
                            </div>
                          </TableCell>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Borrow Request Dialog */}
      <Dialog open={showBorrowDialog} onOpenChange={(open) => { setShowBorrowDialog(open); if (!open) resetBorrowForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ขอยืมครุภัณฑ์</DialogTitle>
            <DialogDescription>เลือกครุภัณฑ์ที่ต้องการยืมและระบุวันคืนที่คาด</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>ครุภัณฑ์ <span className="text-red-500">*</span></Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกครุภัณฑ์ที่พร้อมใช้งาน" />
                </SelectTrigger>
                <SelectContent className="max-h-60 custom-scrollbar">
                  {availableAssets.length === 0 ? (
                    <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                      ไม่มีครุภัณฑ์พร้อมใช้งาน
                    </div>
                  ) : (
                    availableAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <span className="font-mono text-xs mr-2">{asset.sku}</span>
                        {asset.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>วันคืนที่คาด <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Textarea
                placeholder="ระบุหมายเหตุ (ถ้ามี)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowBorrowDialog(false); resetBorrowForm(); }}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleBorrowSubmit}
                disabled={!selectedAssetId || !expectedReturnDate || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                ส่งคำขอยืม
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}