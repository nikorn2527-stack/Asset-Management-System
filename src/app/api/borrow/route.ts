import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const userId = searchParams.get('userId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [records, total] = await Promise.all([
      db.borrowRecord.findMany({
        where,
        include: { asset: { include: { category: true } }, user: true, approvedBy: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.borrowRecord.count({ where }),
    ]);

    return NextResponse.json({ records, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch borrow records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, userId, expectedReturnDate, notes } = body;

    if (!assetId || !userId || !expectedReturnDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const asset = await db.asset.findFirst({ where: { id: assetId, deletedAt: null } });
    if (!asset || asset.status !== 'AVAILABLE') {
      return NextResponse.json({ error: 'Asset not available' }, { status: 400 });
    }

    const record = await db.borrowRecord.create({
      data: {
        assetId,
        userId,
        expectedReturnDate: new Date(expectedReturnDate),
        notes: notes || null,
        status: 'PENDING',
      },
      include: { asset: true, user: true },
    });

    // Create notification for staff
    await db.notification.create({
      userId: null,
      title: 'คำขอยืมครุภัณฑ์ใหม่',
      message: `มีคำขอยืม ${asset.name} (${asset.sku})`,
      type: 'INFO',
      link: 'borrow',
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create borrow request' }, { status: 500 });
  }
}