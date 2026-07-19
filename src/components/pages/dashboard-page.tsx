'use client';

import { useEffect, useState } from 'react';
import type { DashboardStats, BorrowRecord, BorrowStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Package, CheckCircle, ArrowLeftRight, Wrench, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#10b981',
  BORROWED: '#f59e0b',
  MAINTENANCE: '#f97316',
  WRITEOFF: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'พร้อมใช้งาน',
  BORROWED: 'ถูกยืม',
  MAINTENANCE: 'ซ่อมบำรุง',
  WRITEOFF: 'ตัดจำหน่าย',
};

const BORROW_STATUS_LABELS: Record<BorrowStatus, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
  RETURNED: 'คืนแล้ว',
  OVERDUE: 'เกินกำหนด',
};

const BORROW_STATUS_VARIANT: Record<BorrowStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  RETURNED: 'bg-slate-100 text-slate-700 border-slate-200',
  OVERDUE: 'bg-red-100 text-red-800 border-red-200',
};

const pieConfig = {
  available: { label: 'พร้อมใช้งาน', color: '#10b981' },
  borrowed: { label: 'ถูกยืม', color: '#f59e0b' },
  maintenance: { label: 'ซ่อมบำรุง', color: '#f97316' },
  writeoff: { label: 'ตัดจำหน่าย', color: '#ef4444' },
} satisfies ChartConfig;

const barConfig = {
  count: { label: 'จำนวน', color: '#10b981' },
} satisfies ChartConfig;

function formatCurrency(num: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(num);
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold">{value?.toLocaleString() ?? '0'}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const pieData = stats?.assetsByStatus?.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    fill: STATUS_COLORS[s.status] || '#999',
    key: s.status.toLowerCase(),
  })) ?? [];

  const barData = stats?.assetsByCategory?.map((c) => ({
    name: c.name,
    count: c.count,
  })) ?? [];

  const depPercent = stats
    ? stats.depreciationSummary.originalValue > 0
      ? (stats.depreciationSummary.totalDepreciation / stats.depreciationSummary.originalValue) * 100
      : 0
    : 0;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="ครุภัณฑ์ทั้งหมด" value={stats?.totalAssets} icon={Package} color="bg-emerald-600" loading={loading} />
        <StatCard title="พร้อมใช้งาน" value={stats?.availableAssets} icon={CheckCircle} color="bg-teal-600" loading={loading} />
        <StatCard title="ถูกยืม" value={stats?.borrowedAssets} icon={ArrowLeftRight} color="bg-amber-500" loading={loading} />
        <StatCard title="ซ่อมบำรุง" value={stats?.maintenanceAssets} icon={Wrench} color="bg-orange-500" loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="p-4">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">ครุภัณฑ์ตามสถานะ</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : pieData.length > 0 ? (
              <ChartContainer config={pieConfig} className="h-[250px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="p-4">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">ครุภัณฑ์ตามหมวดหมู่</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : barData.length > 0 ? (
              <ChartContainer config={barConfig} className="h-[250px] w-full">
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Borrow Requests */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">คำขอยืมล่าสุด</CardTitle>
            <CardDescription>รายการยืม-คืน 5 รายการล่าสุด</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats?.recentBorrows && stats.recentBorrows.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-medium text-muted-foreground">ครุภัณฑ์</TableHead>
                      <TableHead className="font-medium text-muted-foreground">ผู้ยืม</TableHead>
                      <TableHead className="font-medium text-muted-foreground">วันที่ยืม</TableHead>
                      <TableHead className="font-medium text-muted-foreground">สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentBorrows.map((record: BorrowRecord) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium text-sm">
                          {record.asset?.name || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.user?.name || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(record.borrowDate), 'd MMM yy', { locale: th })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${BORROW_STATUS_VARIANT[record.status]}`}>
                            {BORROW_STATUS_LABELS[record.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">ไม่มีรายการยืม</div>
            )}
          </CardContent>
        </Card>

        {/* Depreciation Summary */}
        <Card className="p-4">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">สรุปค่าเสื่อมราคา</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : stats ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5" />
                      มูลค่ารวมเดิม
                    </span>
                    <span className="font-semibold">{formatCurrency(stats.depreciationSummary.originalValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5" />
                      มูลค่าปัจจุบัน
                    </span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(stats.depreciationSummary.currentValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <TrendingDown className="h-3.5 w-3.5" />
                      ค่าเสื่อมราคารวม
                    </span>
                    <span className="font-semibold text-red-500">{formatCurrency(stats.depreciationSummary.totalDepreciation)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>สัดส่วนค่าเสื่อม</span>
                    <span>{depPercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={depPercent} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg bg-amber-50 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.pendingBorrows}</p>
                    <p className="text-xs text-muted-foreground mt-1">รออนุมัติยืม</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.overdueBorrows}</p>
                    <p className="text-xs text-muted-foreground mt-1">เกินกำหนดคืน</p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}