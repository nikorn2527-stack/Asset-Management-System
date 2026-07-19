'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { AppLayout } from '@/components/app-layout';
import type { User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, AlertTriangle, RefreshCw } from 'lucide-react';

function LoginScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const setNotifications = useAppStore((s) => s.setNotifications);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoading(false);
          if (err.message?.includes('500')) {
            setError('DATABASE_NOT_CONFIGURED');
          } else {
            setError('NETWORK_ERROR');
          }
        }
      });
    return () => { cancelled = true; };
  }, []);

  const retryFetch = () => {
    setLoading(true);
    setError(null);
    fetch('/api/auth')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (err.message?.includes('500')) {
          setError('DATABASE_NOT_CONFIGURED');
        } else {
          setError('NETWORK_ERROR');
        }
      });
  };

  const handleLogin = async () => {
    const user = users.find((u) => u.email === selectedEmail);
    if (!user) return;

    const fullUser: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      phone: null,
      avatar: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    login(fullUser);

    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      const notifications = await res.json();
      setNotifications(notifications);
    } catch {
      // ignore notification fetch errors
    }
  };

  if (error === 'DATABASE_NOT_CONFIGURED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
        <Card className="w-full max-w-lg shadow-lg border-red-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              ฐานข้อมูลยังไม่ได้ตั้งค่า
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2 text-sm leading-relaxed">
              ระบบนี้รันบน Vercel ซึ่งไม่รองรับ SQLite ไฟล์<br />
              ต้องใช้ <strong>Turso</strong> (SQLite บน Cloud) แทน
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="bg-muted rounded-lg p-3 text-sm space-y-2">
              <p className="font-semibold">📋 ขั้นตอนตั้งค่า:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>สร้าง database ฟรีที่ <a href="https://turso.tech" target="_blank" className="text-blue-600 underline">turso.tech</a></li>
                <li>รัน <code className="bg-background px-1 rounded text-xs">turso db create asset-mgmt</code></li>
                <li>Push schema: <code className="bg-background px-1 rounded text-xs break-all">DATABASE_URL=&quot;libsql://...&quot; DATABASE_AUTH_TOKEN=&quot;...&quot; npx prisma db push</code></li>
                <li>Seed: <code className="bg-background px-1 rounded text-xs">DATABASE_URL=&quot;...&quot; DATABASE_AUTH_TOKEN=&quot;...&quot; npx tsx prisma/seed.ts</code></li>
                <li>ตั้งค่า <strong>DATABASE_URL</strong> และ <strong>DATABASE_AUTH_TOKEN</strong> ใน Vercel Environment Variables</li>
                <li>Redeploy</li>
              </ol>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={retryFetch}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === 'NETWORK_ERROR') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-yellow-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่
            </p>
            <Button variant="outline" className="w-full" onClick={retryFetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-emerald-100">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <Package className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            ระบบบริหารจัดการครุภัณฑ์
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            เข้าสู่ระบบเพื่อดำเนินการ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">เลือกผู้ใช้งาน</Label>
            {loading ? (
              <div className="flex items-center justify-center h-10">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              </div>
            ) : (
              <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="เลือกบัญชีผู้ใช้" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.email}>
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({user.role}) {user.department || ''}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleLogin}
            disabled={!selectedEmail}
          >
            เข้าสู่ระบบ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AppLayout />;
}