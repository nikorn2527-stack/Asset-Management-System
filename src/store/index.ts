import { create } from 'zustand';
import type { User, PageView, Notification } from '@/types';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

interface AppState {
  currentPage: PageView;
  selectedAssetId: string | null;
  sidebarOpen: boolean;
  notifications: Notification[];
  unreadCount: number;
  setCurrentPage: (page: PageView) => void;
  setSelectedAssetId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  login: (user) => set({ currentUser: user, isAuthenticated: true }),
  logout: () => set({ currentUser: null, isAuthenticated: false }),
}));

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  selectedAssetId: null,
  sidebarOpen: false,
  notifications: [],
  unreadCount: 0,
  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));