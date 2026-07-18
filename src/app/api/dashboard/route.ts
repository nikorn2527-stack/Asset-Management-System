import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const totalAssets = await db.asset.count({ where: { deletedAt: null } });
    const availableAssets = await db.asset.count({ where: { status: 'AVAILABLE', deletedAt: null } });
    const borrowedAssets = await db.asset.count({ where: { status: 'BORROWED', deletedAt: null } });
    const maintenanceAssets = await db.asset.count({ where: { status: 'MAINTENANCE', deletedAt: null } });
    const writeoffAssets = await db.asset.count({ where: { status: 'WRITEOFF', deletedAt: null } });
    const totalUsers = await db.user.count();
    const pendingBorrows = await db.borrowRecord.count({ where: { status: 'PENDING' } });
    const overdueBorrows = await db.borrowRecord.count({ where: { status: 'OVERDUE' } });
    const pendingWriteoffs = await db.writeoffRecord.count({ where: { status: 'PENDING' } });

    const valueAgg = await db.asset.aggregate({
      where: { deletedAt: null },
      _sum: { currentValue: true, purchasePrice: true },
    });

    const recentBorrows = await db.borrowRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { asset: { include: { category: true } }, user: true, approvedBy: true },
    });

    const categories = await db.assetCategory.findMany({
      include: { _count: { select: { assets: { where: { deletedAt: null } } } } },
    });

    const statusCounts = await db.asset.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { status: true },
    });

    return NextResponse.json({
      totalAssets,
      availableAssets,
      borrowedAssets,
      maintenanceAssets,
      writeoffAssets,
      totalValue: valueAgg._sum.currentValue || 0,
      totalUsers,
      pendingBorrows,
      overdueBorrows,
      pendingWriteoffs,
      recentBorrows,
      assetsByCategory: categories.map((c) => ({ name: c.name, count: c._count.assets })),
      assetsByStatus: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
      depreciationSummary: {
        totalDepreciation: (valueAgg._sum.purchasePrice || 0) - (valueAgg._sum.currentValue || 0),
        currentValue: valueAgg._sum.currentValue || 0,
        originalValue: valueAgg._sum.purchasePrice || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}