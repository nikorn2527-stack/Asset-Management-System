import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const where: Record<string, unknown> = {};

    if (dateFrom || dateTo) {
      const createdAt: Record<string, unknown> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        createdAt.lte = toDate;
      }
      where.createdAt = createdAt;
    }

    const totalAssets = await db.asset.count();
    const totalScanned = await db.auditLog.count({ where });

    const [foundNormal, foundDamaged, missing] = await Promise.all([
      db.auditLog.count({ where: { ...where, auditResult: 'FOUND_NORMAL' } }),
      db.auditLog.count({ where: { ...where, auditResult: 'FOUND_DAMAGED' } }),
      db.auditLog.count({ where: { ...where, auditResult: 'MISSING' } }),
    ]);

    const scanRate = totalAssets > 0
      ? Math.round((totalScanned / totalAssets) * 1000) / 10
      : 0;

    const logs = await db.auditLog.findMany({
      where,
      include: {
        asset: { include: { category: true } },
        user: { select: { id: true, name: true, role: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      totalScanned,
      foundNormal,
      foundDamaged,
      missing,
      scanRate,
      totalAssets,
      logs,
    });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลสรุปการตรวจสอบได้' }, { status: 500 });
  }
}