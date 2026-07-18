import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      db.writeoffRecord.findMany({
        where,
        include: { asset: { include: { category: true } }, approvedBy: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.writeoffRecord.count({ where }),
    ]);

    return NextResponse.json({ records, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch writeoff records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, reason, description } = body;

    if (!assetId || !reason || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const asset = await db.asset.findFirst({ where: { id: assetId, deletedAt: null } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const record = await db.writeoffRecord.create({
      data: { assetId, reason, description, status: 'PENDING' },
      include: { asset: true },
    });

    await db.notification.create({
      userId: null,
      title: 'คำขอตัดจำหน่ายครุภัณฑ์',
      message: `มีคำขอตัดจำหน่าย ${record.asset.name} (${record.asset.sku})`,
      type: 'WARNING',
      link: 'writeoff',
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create writeoff record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, approvedById } = body;

    const record = await db.writeoffRecord.findUnique({ where: { id }, include: { asset: true } });
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    if (action === 'approve') {
      const updated = await db.writeoffRecord.update({
        where: { id },
        data: { status: 'APPROVED', approvedById },
        include: { asset: true, approvedBy: true },
      });
      await db.asset.update({ where: { id: record.assetId }, data: { status: 'WRITEOFF' } });
      return NextResponse.json(updated);
    }

    if (action === 'reject') {
      const updated = await db.writeoffRecord.update({
        where: { id },
        data: { status: 'REJECTED', approvedById },
        include: { asset: true, approvedBy: true },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update writeoff record' }, { status: 500 });
  }
}