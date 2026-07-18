export type UserRole = 'ADMIN' | 'STAFF' | 'USER';

export type AssetStatus = 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'WRITEOFF';
export type BorrowStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'OVERDUE';
export type MaintenanceStatus = 'IN_PROGRESS' | 'COMPLETED';
export type WriteoffReason = 'DAMAGED' | 'LOST' | 'DEPRECIATED' | 'OTHER';
export type WriteoffStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type NotificationType = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string | null;
  phone: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  category?: AssetCategory;
  status: AssetStatus;
  purchasePrice: number;
  salvageValue: number;
  purchaseDate: string;
  currentValue: number;
  usefulLifeYears: number;
  location: string | null;
  warrantyExpiry: string | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowRecord {
  id: string;
  assetId: string;
  asset?: Asset;
  userId: string;
  user?: User;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  status: BorrowStatus;
  approvedById: string | null;
  approvedBy?: User | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceLog {
  id: string;
  assetId: string;
  asset?: Asset;
  performedBy: string | null;
  description: string;
  cost: number;
  status: MaintenanceStatus;
  date: string;
  completedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WriteoffRecord {
  id: string;
  assetId: string;
  asset?: Asset;
  reason: WriteoffReason;
  description: string;
  approvedById: string | null;
  approvedBy?: User | null;
  status: WriteoffStatus;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditResult = 'FOUND_NORMAL' | 'FOUND_DAMAGED' | 'MISSING';

export interface AuditLog {
  id: string;
  assetId: string;
  asset?: Asset;
  userId: string | null;
  user?: User | null;
  auditResult: AuditResult;
  notes: string | null;
  location: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalAssets: number;
  availableAssets: number;
  borrowedAssets: number;
  maintenanceAssets: number;
  writeoffAssets: number;
  totalValue: number;
  totalUsers: number;
  pendingBorrows: number;
  overdueBorrows: number;
  pendingWriteoffs: number;
  recentBorrows: BorrowRecord[];
  assetsByCategory: { name: string; count: number }[];
  assetsByStatus: { status: string; count: number }[];
  depreciationSummary: { totalDepreciation: number; currentValue: number; originalValue: number };
}

export type PageView = 'dashboard' | 'assets' | 'borrow' | 'maintenance' | 'writeoff' | 'audit' | 'reports' | 'users' | 'settings';