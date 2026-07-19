'use client';

import { useEffect, useState, useCallback } from 'react';
import type { WriteoffRecord, WriteoffStatus, WriteoffReason, Asset } from '@/types';
import { useAuthStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  FileX,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateWriteoffFormHtml } from '@/lib/pdf-templates';
import { generatePdfFromHtml } from '@/lib/pdf-client';

const STATUS_BADGE: Record<WriteoffStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-red-100 text-red-800 border-red-300',
  REJECTED: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_LABELS: Record<WriteoffStatus, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติ',
  REJECTED: 'ปฏิเสธ',
};

const REASON_LABELS: Record<WriteoffReason, string> = {
  DAMAGED: 'ชำรุด',
  LOST: 'สูญหาย',
  DEPRECIATED: 'เสื่อมสภาพ',
  OTHER: 'อื่นๆ',
};

const ITEMS_PER_PAGE = 10;

export function WriteoffPage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const isStaffOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF';

  // Data
  const [records, setRecords] = useState<WriteoffRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [reason, setReason] = useState<WriteoffReason | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(ITEMS_PER_PAGE) });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/writeoff?${params}`);
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
  }, [page, statusFilter, toast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value);
    setPage(1);
  };

  // Fetch non-writeoff assets for dialog
  const openAddDialog = async () => {
    setShowAddDialog(true);
    try {
      const res = await fetch('/api/assets?limit=100');
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Filter out already WRITEOFF assets
      setAllAssets((data.assets || []).filter((a: Asset) => a.status !== 'WRITEOFF'));
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดรายการครุภัณฑ์ได้', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedAssetId('');
    setReason('');
    setDescription('');
  };

  const handleAddSubmit = async () => {
    if (!selectedAssetId || !reason || !description) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/writeoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetId,
          reason,
          description,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast({ title: 'ส่งคำขอสำเร็จ', description: 'คำขอตัดจำหน่ายถูกส่งแล้ว' });
      setShowAddDialog(false);
      resetForm();
      fetchRecords();
    } catch (err) {
      toast({ title: 'เกิดข้อผิดพลาด', description: err instanceof Error ? err.message : 'ไม่สามารถส่งคำขอได้', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!currentUser) return;
    setActionLoading(id);
    try {
      const res = await fetch('/api/writeoff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action,
          approvedById: currentUser.id,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const label = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
      toast({ title: `${label}สำเร็จ` });
      fetchRecords();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถดำเนินการได้', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintWriteoff = async (record: WriteoffRecord) => {
    setPdfLoading(record.id);
    try {
      const reasonLabels: Record<string, string> = {
        DAMAGED: 'ชำรุด',
        LOST: 'สูญหาย',
        DEPRECIATED: 'เสื่อมสภาพ',
        OTHER: 'อื่นๆ',
      };
      const html = generateWriteoffFormHtml({
        assetSku: record.asset?.sku || '-',
        assetName: record.asset?.name || '-',
        categoryName: record.asset?.category?.name || '-',
        purchasePrice: record.asset?.purchasePrice ?? 0,
        currentValue: record.asset?.currentValue ?? 0,
        purchaseDate: record.asset?.purchaseDate || '-',
        reason: record.reason,
        reasonLabel: reasonLabels[record.reason] || record.reason,
        description: record.description,
        date: record.date,
        approvedByName: record.approvedBy?.name || undefined,
      });
      const filename = `รายงานตัดจำหน่าย_${record.asset?.sku || record.id}_${format(new Date(record.date), 'yyyy-MM-dd')}`;
      await generatePdfFromHtml(html, filename);
      toast({ title: 'สำเร็จ', description: 'ดาวน์โหลดรายงานตัดจำหน่ายเรียบร้อย' });
    } catch (err) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err instanceof Error ? err.message : 'ไม่สามารถสร้าง PDF ได้',
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileX className="h-6 w-6 text-emerald-600" />
            ระบบตัดจำหน่ายครุภัณฑ์
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            จัดการการตัดจำหน่ายครุภัณฑ์ ({total} รายการ)
          </p>
        </div>
        {isStaffOrAdmin && (
          <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            ขอตัดจำหน่าย
          </Button>
        )}
      </div>

      {/* Filters & Table */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex justify-end mb-4">
            <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="PENDING">รออนุมัติ</SelectItem>
                <SelectItem value="APPROVED">อนุมัติ</SelectItem>
                <SelectItem value="REJECTED">ปฏิเสธ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium text-muted-foreground">รหัสครุภัณฑ์</TableHead>
                  <TableHead className="font-medium text-muted-foreground">ชื่อครุภัณฑ์</TableHead>
                  <TableHead className="font-medium text-muted-foreground">สาเหตุ</TableHead>
                  <TableHead className="font-medium text-muted-foreground">รายละเอียด</TableHead>
                  <TableHead className="font-medium text-muted-foreground text-right">มูลค่าคงเหลือ</TableHead>
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
                      {Array.from({ length: isStaffOrAdmin ? 8 : 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isStaffOrAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
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
                      <TableCell>
                        <Badge variant="secondary">
                          {REASON_LABELS[record.reason]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {record.description}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {record.asset?.currentValue != null
                          ? `${new Intl.NumberFormat('th-TH').format(Math.round(record.asset.currentValue))} บาท`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE[record.status]}>
                          {STATUS_LABELS[record.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.date ? format(new Date(record.date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      {isStaffOrAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {record.status === 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-gray-600 hover:text-gray-900"
                                onClick={() => handlePrintWriteoff(record)}
                                disabled={pdfLoading === record.id}
                                title="พิมพ์รายงาน"
                              >
                                {pdfLoading === record.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <FileText className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            {record.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-700 border-red-300 hover:bg-red-50 h-8 px-2"
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
                                  className="text-gray-700 border-gray-300 hover:bg-gray-50 h-8 px-2"
                                  onClick={() => handleAction(record.id, 'reject')}
                                  disabled={actionLoading === record.id}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  ปฏิเสธ
                                </Button>
                              </>
                            )}
                          </div>
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

      {/* Write-off Request Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ขอตัดจำหน่ายครุภัณฑ์</DialogTitle>
            <DialogDescription>กรอกข้อมูลเพื่อขอตัดจำหน่ายครุภัณฑ์</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>ครุภัณฑ์ <span className="text-red-500">*</span></Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกครุภัณฑ์" />
                </SelectTrigger>
                <SelectContent className="max-h-60 custom-scrollbar">
                  {allAssets.length === 0 ? (
                    <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                      ไม่มีครุภัณฑ์ที่สามารถตัดจำหน่ายได้
                    </div>
                  ) : (
                    allAssets.map((asset) => (
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
              <Label>สาเหตุ <span className="text-red-500">*</span></Label>
              <Select
                value={reason}
                onValueChange={(v) => setReason(v as WriteoffReason)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสาเหตุ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAMAGED">ชำรุด</SelectItem>
                  <SelectItem value="LOST">สูญหาย</SelectItem>
                  <SelectItem value="DEPRECIATED">เสื่อมสภาพ</SelectItem>
                  <SelectItem value="OTHER">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="ระบุรายละเอียด"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleAddSubmit}
                disabled={!selectedAssetId || !reason || !description || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                ส่งคำขอ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}