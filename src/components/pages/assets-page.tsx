'use client';

import { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import type { Asset, AssetCategory, AssetStatus, BorrowRecord, MaintenanceLog } from '@/types';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Package,
  Calendar,
  MapPin,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE: 'พร้อมใช้งาน',
  BORROWED: 'ถูกยืม',
  MAINTENANCE: 'ซ่อมบำรุง',
  WRITEOFF: 'ตัดจำหน่าย',
};

const STATUS_BADGE: Record<AssetStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  BORROWED: 'bg-amber-100 text-amber-800 border-amber-200',
  MAINTENANCE: 'bg-orange-100 text-orange-800 border-orange-200',
  WRITEOFF: 'bg-red-100 text-red-800 border-red-200',
};

const BORROW_STATUS_LABELS: Record<string, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
  RETURNED: 'คืนแล้ว',
  OVERDUE: 'เกินกำหนด',
};

function formatCurrency(num: number) {
  return new Intl.NumberFormat('th-TH').format(Math.round(num));
}

interface AssetFormData {
  name: string;
  categoryId: string;
  purchasePrice: string;
  salvageValue: string;
  purchaseDate: string;
  usefulLifeYears: string;
  location: string;
  warrantyExpiry: string;
  description: string;
  status: AssetStatus;
}

const EMPTY_FORM: AssetFormData = {
  name: '',
  categoryId: '',
  purchasePrice: '',
  salvageValue: '',
  purchaseDate: '',
  usefulLifeYears: '5',
  location: '',
  warrantyExpiry: '',
  description: '',
  status: 'AVAILABLE',
};

export function AssetsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { toast } = useToast();
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF';

  // List state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialogs
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetFormData>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [detailData, setDetailData] = useState<Asset & { borrowRecords?: BorrowRecord[]; maintenanceLogs?: MaintenanceLog[] } | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCategory) params.set('category', filterCategory);
      if (filterStatus) params.set('status', filterStatus);
      params.set('page', String(page));
      params.set('limit', '10');

      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();
      setAssets(data.assets || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterStatus, page, toast]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterStatus]);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setSelectedAsset(null);
    setShowForm(true);
  };

  const openEditForm = (asset: Asset) => {
    setSelectedAsset(asset);
    setForm({
      name: asset.name,
      categoryId: asset.categoryId,
      purchasePrice: String(asset.purchasePrice),
      salvageValue: String(asset.salvageValue),
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      usefulLifeYears: String(asset.usefulLifeYears),
      location: asset.location || '',
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
      description: asset.description || '',
      status: asset.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.categoryId || !form.purchasePrice || !form.purchaseDate) {
      toast({ title: 'กรุณากรอกข้อมูลที่จำเป็น', variant: 'destructive' });
      return;
    }
    setFormLoading(true);
    try {
      const url = selectedAsset ? `/api/assets/${selectedAsset.id}` : '/api/assets';
      const method = selectedAsset ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        name: form.name,
        categoryId: form.categoryId,
        purchasePrice: parseFloat(form.purchasePrice),
        salvageValue: parseFloat(form.salvageValue) || 0,
        purchaseDate: form.purchaseDate,
        usefulLifeYears: parseInt(form.usefulLifeYears) || 5,
        location: form.location || null,
        warrantyExpiry: form.warrantyExpiry || null,
        description: form.description || null,
        status: form.status,
      };

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast({ title: selectedAsset ? 'แก้ไขครุภัณฑ์สำเร็จ' : 'เพิ่มครุภัณฑ์สำเร็จ' });
      setShowForm(false);
      fetchAssets();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกข้อมูลได้', variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  };

  const openDetail = async (asset: Asset) => {
    setSelectedAsset(asset);
    setShowDetail(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`);
      const data = await res.json();
      setDetailData(data);
      const url = await QRCode.toDataURL(asset.sku, { width: 200, margin: 2, color: { dark: '#0f766e' } });
      setQrUrl(url);
    } catch {
      setDetailData(asset);
    }
  };

  const openDelete = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/assets/${selectedAsset.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast({ title: 'ลบครุภัณฑ์สำเร็จ' });
      setShowDelete(false);
      fetchAssets();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบข้อมูลได้', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">ครุภัณฑ์ทั้งหมด</h2>
          <p className="text-sm text-muted-foreground">ทั้งหมด {total} รายการ</p>
        </div>
        {canManage && (
          <Button onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มครุภัณฑ์
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาครุภัณฑ์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="หมวดหมู่ทั้งหมด" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="สถานะทั้งหมด" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">สถานะทั้งหมด</SelectItem>
            <SelectItem value="AVAILABLE">พร้อมใช้งาน</SelectItem>
            <SelectItem value="BORROWED">ถูกยืม</SelectItem>
            <SelectItem value="MAINTENANCE">ซ่อมบำรุง</SelectItem>
            <SelectItem value="WRITEOFF">ตัดจำหน่าย</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium text-muted-foreground">SKU</TableHead>
                  <TableHead className="font-medium text-muted-foreground">ชื่อครุภัณฑ์</TableHead>
                  <TableHead className="font-medium text-muted-foreground hidden md:table-cell">หมวดหมู่</TableHead>
                  <TableHead className="font-medium text-muted-foreground">สถานะ</TableHead>
                  <TableHead className="font-medium text-muted-foreground text-right hidden sm:table-cell">ราคาซื้อ</TableHead>
                  <TableHead className="font-medium text-muted-foreground text-right hidden lg:table-cell">มูลค่าปัจจุบัน</TableHead>
                  <TableHead className="font-medium text-muted-foreground hidden lg:table-cell">สถานที่</TableHead>
                  <TableHead className="font-medium text-muted-foreground text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      ไม่พบครุภัณฑ์
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((asset) => (
                    <TableRow key={asset.id} className="group">
                      <TableCell className="font-mono text-xs text-muted-foreground">{asset.sku}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{asset.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{asset.category?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${STATUS_BADGE[asset.status]}`}>
                          {STATUS_LABELS[asset.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-right hidden sm:table-cell">{formatCurrency(asset.purchasePrice)}</TableCell>
                      <TableCell className="text-sm text-right hidden lg:table-cell">{formatCurrency(asset.currentValue)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell max-w-[120px] truncate">{asset.location || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(asset)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(asset)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => openDelete(asset)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
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
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                หน้า {page} จาก {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>{selectedAsset ? 'แก้ไขครุภัณฑ์' : 'เพิ่มครุภัณฑ์ใหม่'}</DialogTitle>
            <DialogDescription>
              {selectedAsset ? 'แก้ไขข้อมูลครุภัณฑ์' : 'กรอกข้อมูลครุภัณฑ์ที่ต้องการเพิ่ม'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="form-name">ชื่อครุภัณฑ์ *</Label>
              <Input id="form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น คอมพิวเตอร์โน๊ตบุ๊ค" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-category">หมวดหมู่ *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger id="form-category">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="form-price">ราคาซื้อ (บาท) *</Label>
                <Input id="form-price" type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} placeholder="0.00" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-salvage">มูลค่าซาก (บาท)</Label>
                <Input id="form-salvage" type="number" value={form.salvageValue} onChange={(e) => setForm({ ...form, salvageValue: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="form-date">วันที่ซื้อ *</Label>
                <Input id="form-date" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-life">อายุการใช้งาน (ปี)</Label>
                <Input id="form-life" type="number" value={form.usefulLifeYears} onChange={(e) => setForm({ ...form, usefulLifeYears: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="form-location">สถานที่ตั้ง</Label>
                <Input id="form-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="เช่น อาคาร A ชั้น 2" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-warranty">วันหมดประกัน</Label>
                <Input id="form-warranty" type="date" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-status">สถานะ</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AssetStatus })}>
                <SelectTrigger id="form-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">พร้อมใช้งาน</SelectItem>
                  <SelectItem value="BORROWED">ถูกยืม</SelectItem>
                  <SelectItem value="MAINTENANCE">ซ่อมบำรุง</SelectItem>
                  <SelectItem value="WRITEOFF">ตัดจำหน่าย</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-desc">รายละเอียด</Label>
              <Textarea id="form-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="รายละเอียดเพิ่มเติม" rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
            <Button onClick={handleSubmit} disabled={formLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {formLoading ? 'กำลังบันทึก...' : selectedAsset ? 'บันทึกการแก้ไข' : 'เพิ่มครุภัณฑ์'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>รายละเอียดครุภัณฑ์</DialogTitle>
          </DialogHeader>
          {detailData && (
            <ScrollArea className="max-h-[70vh] pr-4 custom-scrollbar">
              <div className="space-y-6">
                {/* Header with QR */}
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`font-mono text-xs ${STATUS_BADGE[detailData.status]}`}>
                        {detailData.sku}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${STATUS_BADGE[detailData.status]}`}>
                        {STATUS_LABELS[detailData.status]}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold">{detailData.name}</h3>
                    <p className="text-sm text-muted-foreground">{detailData.category?.name || '-'}</p>
                  </div>
                  {qrUrl && (
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <img src={qrUrl} alt="QR Code" className="h-32 w-32 rounded-lg border p-1" />
                      <p className="text-[10px] text-muted-foreground font-mono">{detailData.sku}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">ราคาซื้อ</p>
                      <p className="text-sm font-medium">{formatCurrency(detailData.purchasePrice)} บาท</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <QrCode className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">มูลค่าปัจจุบัน</p>
                      <p className="text-sm font-medium text-emerald-600">{formatCurrency(detailData.currentValue)} บาท</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">วันที่ซื้อ</p>
                      <p className="text-sm font-medium">{detailData.purchaseDate ? format(new Date(detailData.purchaseDate), 'd MMMM yyyy', { locale: th }) : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">วันหมดประกัน</p>
                      <p className="text-sm font-medium">{detailData.warrantyExpiry ? format(new Date(detailData.warrantyExpiry), 'd MMMM yyyy', { locale: th }) : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">สถานที่ตั้ง</p>
                      <p className="text-sm font-medium">{detailData.location || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">อายุการใช้งาน</p>
                      <p className="text-sm font-medium">{detailData.usefulLifeYears} ปี</p>
                    </div>
                  </div>
                </div>

                {detailData.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">รายละเอียด</p>
                      <p className="text-sm whitespace-pre-wrap">{detailData.description}</p>
                    </div>
                  </>
                )}

                {/* Depreciation info */}
                <Separator />
                <div>
                  <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-sm font-medium">ตารางค่าเสื่อมราคา</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-medium text-muted-foreground text-xs">ปีที่</TableHead>
                          <TableHead className="font-medium text-muted-foreground text-xs text-right">มูลค่าเริ่มต้น</TableHead>
                          <TableHead className="font-medium text-muted-foreground text-xs text-right">ค่าเสื่อม</TableHead>
                          <TableHead className="font-medium text-muted-foreground text-xs text-right">มูลค่าสิ้นปี</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: detailData.usefulLifeYears }, (_, i) => {
                          const annualDep = (detailData.purchasePrice - detailData.salvageValue) / detailData.usefulLifeYears;
                          const beginVal = Math.max(detailData.salvageValue, detailData.purchasePrice - annualDep * i);
                          const endVal = Math.max(detailData.salvageValue, detailData.purchasePrice - annualDep * (i + 1));
                          return (
                            <TableRow key={i}>
                              <TableCell className="text-xs">{i + 1}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(beginVal)}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(annualDep)}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(endVal)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Borrow History */}
                {detailData.borrowRecords && detailData.borrowRecords.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-sm font-medium">ประวัติการยืม-คืน</CardTitle>
                      </CardHeader>
                      <ScrollArea className="max-h-48 custom-scrollbar">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-medium text-muted-foreground text-xs">ผู้ยืม</TableHead>
                              <TableHead className="font-medium text-muted-foreground text-xs">วันยืม</TableHead>
                              <TableHead className="font-medium text-muted-foreground text-xs">กำหนดคืน</TableHead>
                              <TableHead className="font-medium text-muted-foreground text-xs">สถานะ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailData.borrowRecords.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="text-xs">{record.user?.name || '-'}</TableCell>
                                <TableCell className="text-xs">{format(new Date(record.borrowDate), 'd MMM yy', { locale: th })}</TableCell>
                                <TableCell className="text-xs">{format(new Date(record.expectedReturnDate), 'd MMM yy', { locale: th })}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">
                                    {BORROW_STATUS_LABELS[record.status] || record.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </>
                )}

                {/* Maintenance History */}
                {detailData.maintenanceLogs && detailData.maintenanceLogs.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-sm font-medium">ประวัติการซ่อมบำรุง</CardTitle>
                      </CardHeader>
                      <ScrollArea className="max-h-48 custom-scrollbar">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-medium text-muted-foreground text-xs">วันที่</TableHead>
                              <TableHead className="font-medium text-muted-foreground text-xs">รายละเอียด</TableHead>
                              <TableHead className="font-medium text-muted-foreground text-xs text-right">ค่าใช้จ่าย</TableHead>
                              <TableHead className="font-medium text-muted-foreground text-xs">สถานะ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailData.maintenanceLogs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="text-xs">{format(new Date(log.date), 'd MMM yy', { locale: th })}</TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate">{log.description}</TableCell>
                                <TableCell className="text-xs text-right">{formatCurrency(log.cost)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">
                                    {log.status === 'IN_PROGRESS' ? 'ดำเนินการ' : 'เสร็จสิ้น'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบครุภัณฑ์</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ &ldquo;{selectedAsset?.name}&rdquo; ({selectedAsset?.sku}) หรือไม่?
              การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบออก
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? 'กำลังลบ...' : 'ลบ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}