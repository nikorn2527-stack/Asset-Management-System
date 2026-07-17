'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { AppLayout } from '@/components/app-layout';
import type { User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package } from 'lucide-react';

function LoginScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const login = useAuthStore((s) => s.login);
  const setNotifications = useAppStore((s) => s.setNotifications);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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