'use client';

import { useEffect } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import type { PageView, Notification } from '@/types';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Wrench,
  FileX,
  ClipboardCheck,
  BarChart3,
  Users,
  Bell,
  LogOut,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { DashboardPage } from '@/components/pages/dashboard-page';
import { AssetsPage } from '@/components/pages/assets-page';
import { BorrowPage } from '@/components/pages/borrow-page';
import { MaintenancePage } from '@/components/pages/maintenance-page';
import { WriteoffPage } from '@/components/pages/writeoff-page';
import { AuditPage } from '@/components/pages/audit-page';
import { ReportsPage } from '@/components/pages/reports-page';
import { UsersPage } from '@/components/pages/users-page';
import { SettingsPage } from '@/components/pages/settings-page';

const PAGE_CONFIG: { view: PageView; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
  { view: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { view: 'assets', label: 'ครุภัณฑ์', icon: Package },
  { view: 'borrow', label: 'ยืม-คืน', icon: ArrowLeftRight },
  { view: 'maintenance', label: 'ซ่อมบำรุง', icon: Wrench },
  { view: 'writeoff', label: 'ตัดจำหน่าย', icon: FileX },
  { view: 'audit', label: 'ตรวจนับประจำปี', icon: ClipboardCheck },
  { view: 'reports', label: 'รายงาน', icon: BarChart3 },
  { view: 'users', label: 'จัดการผู้ใช้', icon: Users, adminOnly: true },
  { view: 'settings', label: 'ตั้งค่า', icon: Settings },
];

const PAGE_TITLES: Record<PageView, string> = {
  dashboard: 'แดชบอร์ด',
  assets: 'ครุภัณฑ์',
  borrow: 'ยืม-คืนครุภัณฑ์',
  maintenance: 'ซ่อมบำรุง',
  writeoff: 'ตัดจำหน่าย',
  audit: 'ตรวจนับประจำปี',
  reports: 'รายงาน',
  users: 'จัดการผู้ใช้',
  settings: 'ตั้งค่า',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  STAFF: 'เจ้าหน้าที่',
  USER: 'ผู้ใช้งาน',
};

function NotificationItem({ notification, onClick }: { notification: Notification; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 flex gap-3 items-start hover:bg-accent transition-colors rounded-md ${
        !notification.read ? 'bg-emerald-50/50' : ''
      }`}
    >
      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notification.read ? 'bg-emerald-500' : 'bg-transparent'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(notification.createdAt), 'd MMM yyyy HH:mm', { locale: th })}
        </p>
      </div>
    </button>
  );
}

function PageRouter({ page }: { page: PageView }) {
  switch (page) {
    case 'dashboard':
      return <DashboardPage />;
    case 'assets':
      return <AssetsPage />;
    case 'borrow':
      return <BorrowPage />;
    case 'maintenance':
      return <MaintenancePage />;
    case 'writeoff':
      return <WriteoffPage />;
    case 'audit':
      return <AuditPage />;
    case 'reports':
      return <ReportsPage />;
    case 'users':
      return <UsersPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

export function AppLayout() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = useAppStore((s) => s.unreadCount);
  const markAsRead = useAppStore((s) => s.markAsRead);
  const markAllAsRead = useAppStore((s) => s.markAllAsRead);
  const setNotifications = useAppStore((s) => s.setNotifications);

  const isAdmin = currentUser?.role === 'ADMIN';
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
    : '??';

  useEffect(() => {
    if (currentUser) {
      const interval = setInterval(() => {
        fetch(`/api/notifications?userId=${currentUser.id}`)
          .then((r) => r.json())
          .then((data: Notification[]) => setNotifications(data))
          .catch(() => {});
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, setNotifications]);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllRead = async () => {
    markAllAsRead();
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch {
      // ignore
    }
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="px-4 py-3">
          <div className="flex items-center gap-3 data-[state=collapsed]:justify-center data-[state=collapsed]:gap-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Package className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0 data-[state=collapsed]:hidden">
              <h2 className="text-sm font-bold leading-tight truncate">
                ระบบบริหารจัดการ
              </h2>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">
                ครุภัณฑ์
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {PAGE_CONFIG.map((item) => {
                  if (item.adminOnly && !isAdmin) return null;
                  return (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        isActive={currentPage === item.view}
                        onClick={() => setCurrentPage(item.view)}
                        tooltip={item.label}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="px-3 py-2">
          {currentUser && (
            <div className="flex items-center gap-3 data-[state=collapsed]:justify-center data-[state=collapsed]:gap-0">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 data-[state=collapsed]:hidden">
                <p className="text-sm font-medium truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ROLE_LABELS[currentUser.role] || currentUser.role}
                  {currentUser.department ? ` · ${currentUser.department}` : ''}
                </p>
              </div>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
          <SidebarTrigger className="-ml-1" />

          <div className="flex-1">
            <h1 className="text-lg font-semibold">{PAGE_TITLES[currentPage]}</h1>
          </div>

          {/* Notification Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-emerald-600 text-white border-0">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <h3 className="text-sm font-semibold">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-600 hover:text-emerald-700" onClick={handleMarkAllRead}>
                    อ่านทั้งหมด
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-80 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    ไม่มีการแจ้งเตือน
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <NotificationItem key={n.id} notification={n} onClick={() => handleNotificationClick(n.id)} />
                  ))
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {currentUser && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[currentUser.role]} {currentUser.department ? `· ${currentUser.department}` : ''}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCurrentPage('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    ตั้งค่า
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    ออกจากระบบ
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          <PageRouter page={currentPage} />
        </main>
      </div>
    </SidebarProvider>
  );
}