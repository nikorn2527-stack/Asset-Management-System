import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (assetId) where.assetId = assetId;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      db.maintenanceLog.findMany({
        where,
        include: { asset: { include: { category: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.maintenanceLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch maintenance logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, description, cost, performedBy } = body;

    if (!assetId || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const asset = await db.asset.findFirst({ where: { id: assetId, deletedAt: null } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const log = await db.maintenanceLog.create({
      data: {
        assetId,
        description,
        cost: parseFloat(cost || 0),
        performedBy: performedBy || null,
        status: 'IN_PROGRESS',
      },
      include: { asset: true },
    });

    await db.asset.update({ where: { id: assetId }, data: { status: 'MAINTENANCE' } });

    await db.notification.create({
      userId: null,
      title: 'แจ้งเตือนบำรุงครุภัณฑ์',
      message: `${log.asset.name} เข้าสู่สถานะซ่อมบำรุง`,
      type: 'WARNING',
      link: 'maintenance',
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create maintenance log' }, { status: 500 });
  }
}