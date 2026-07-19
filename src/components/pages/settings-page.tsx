'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Settings,
  Info,
  Plus,
  Trash2,
  Package,
  Lock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CategoryWithCount {
  id: string;
  name: string;
  description: string | null;
  _count: { assets: number };
}

export function SettingsPage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [addCatDialogOpen, setAddCatDialogOpen] = useState(false);
  const [deleteCatDialogOpen, setDeleteCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [deletingCat, setDeletingCat] = useState<CategoryWithCount | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'STAFF');

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดหมวดหมู่ได้', variant: 'destructive' });
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => { fetchCategories(); }, [toast]);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      toast({ title: 'กรุณากรอกชื่อหมวดหมู่', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() || null }),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'เพิ่มหมวดหมู่สำเร็จ' });
      setAddCatDialogOpen(false);
      setNewCatName('');
      setNewCatDesc('');
      fetchCategories();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถเพิ่มหมวดหมู่ได้', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCat) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deletingCat.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: 'เกิดข้อผิดพลาด', description: data.error || 'ไม่สามารถลบหมวดหมู่ได้', variant: 'destructive' });
      } else {
        toast({ title: 'ลบหมวดหมู่สำเร็จ' });
        setDeleteCatDialogOpen(false);
        setDeletingCat(null);
        fetchCategories();
      }
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบหมวดหมู่ได้', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">ข้อมูลระบบ</CardTitle>
              <CardDescription>ระบบบริหารจัดการครุภัณฑ์</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ชื่อระบบ</p>
              <p className="font-medium">ระบบบริหารจัดการครุภัณฑ์</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">เวอร์ชัน</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">POWERED BY</p>
              <p className="font-medium">PNG TEAM</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">เทคโนโลยี</p>
              <p className="font-medium">Next.js, Prisma, SQLite</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Management */}
      {canManage ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50">
                  <Package className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-base">จัดการหมวดหมู่ครุภัณฑ์</CardTitle>
                  <CardDescription>เพิ่ม ลบ หมวดหมู่สำหรับจัดประเภทครุภัณฑ์</CardDescription>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => { setNewCatName(''); setNewCatDesc(''); setAddCatDialogOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                เพิ่มหมวดหมู่
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {loadingCategories ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-60" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))
              ) : categories.length === 0 ? (
                <div className="px-6 py-12 text-center text-muted-foreground">
                  ไม่พบหมวดหมู่
                </div>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{cat.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {cat._count.assets} รายการ
                        </Badge>
                      </div>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground">{cat.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => { setDeletingCat(cat); setDeleteCatDialogOpen(true); }}
                      disabled={cat._count.assets > 0}
                      title={cat._count.assets > 0 ? 'ไม่สามารถลบหมวดหมู่ที่มีครุภัณฑ์อยู่' : 'ลบหมวดหมู่'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">จัดการหมวดหมู่สำหรับผู้ดูแลระบบและเจ้าหน้าที่พัสดุเท่านั้น</p>
          </CardContent>
        </Card>
      )}

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-base">เกี่ยวกับระบบ</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            ระบบบริหารจัดการครุภัณฑ์ จัดทำขึ้นเพื่อช่วยให้การจัดการทรัพย์สินของหน่วยงานเป็นไปอย่างมีประสิทธิภาพ
            ครอบคลุมตั้งแต่การบันทึกข้อมูลครุภัณฑ์ การติดตามสถานะ การยืม-คืน การบำรุงรักษา
            ไปจนถึงการคำนวณค่าเสื่อมราคาและการจัดทำรายงานต่าง ๆ
          </p>
          <p>
            ระบบรองรับการทำงานหลายบทบาท ได้แก่ ผู้ดูแลระบบ เจ้าหน้าที่พัสดุ และพนักงานทั่วไป
            พร้อมระบบแจ้งเตือนแบบเรียลไทม์และการส่งออกรายงานในรูปแบบ Excel และ PDF
          </p>
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={addCatDialogOpen} onOpenChange={setAddCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มหมวดหมู่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">ชื่อหมวดหมู่</Label>
              <Input
                id="cat-name"
                placeholder="เช่น คอมพิวเตอร์และอุปกรณ์"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">คำอธิบาย (ไม่จำเป็น)</Label>
              <Input
                id="cat-desc"
                placeholder="รายละเอียดเพิ่มเติม"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCatDialogOpen(false)}>ยกเลิก</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAddCategory}
              disabled={saving}
            >
              {saving ? 'กำลังบันทึก...' : 'เพิ่ม'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={deleteCatDialogOpen} onOpenChange={setDeleteCatDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบหมวดหมู่</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบหมวดหมู่ <strong>{deletingCat?.name}</strong> หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteCategory}
              disabled={deleting}
            >
              {deleting ? 'กำลังลบ...' : 'ลบ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}