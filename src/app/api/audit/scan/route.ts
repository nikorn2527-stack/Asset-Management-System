import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku') || '';

    if (!sku) {
      return NextResponse.json({ error: 'กรุณาระบุรหัส SKU' }, { status: 400 });
    }

    const asset = await db.asset.findUnique({
      where: { sku },
      include: {
        category: true,
        maintenanceLogs: { orderBy: { date: 'desc' } },
        borrowRecords: {
          include: { user: { select: { id: true, name: true, department: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'ไม่พบครุภัณฑ์ที่ระบุ' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const latestAuditToday = await db.auditLog.findFirst({
      where: {
        assetId: asset.id,
        createdAt: { gte: today, lt: tomorrow },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true, department: true } },
      },
    });

    return NextResponse.json({
      asset,
      latestAuditToday: latestAuditToday || null,
    });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถค้นหาครุภัณฑ์ได้' }, { status: 500 });
  }
}