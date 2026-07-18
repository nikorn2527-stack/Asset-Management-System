import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const result = searchParams.get('result') || '';
    const assetId = searchParams.get('assetId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const where: Record<string, unknown> = {};

    if (result) where.auditResult = result;
    if (assetId) where.assetId = assetId;
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

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          asset: { include: { category: true } },
          user: { select: { id: true, name: true, role: true, department: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลบันทึกการตรวจสอบได้' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, auditResult, notes, location, userId } = body;

    if (!assetId || !auditResult) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสครุภัณฑ์และผลการตรวจสอบ' },
        { status: 400 }
      );
    }

    const validResults = ['FOUND_NORMAL', 'FOUND_DAMAGED', 'MISSING'];
    if (!validResults.includes(auditResult)) {
      return NextResponse.json(
        { error: 'ผลการตรวจสอบไม่ถูกต้อง ต้องเป็น FOUND_NORMAL, FOUND_DAMAGED หรือ MISSING' },
        { status: 400 }
      );
    }

    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: 'ไม่พบครุภัณฑ์ที่ระบุ' }, { status: 404 });
    }

    const log = await db.auditLog.create({
      data: {
        assetId,
        auditResult,
        notes: notes || null,
        location: location || null,
        userId: userId || null,
      },
      include: {
        asset: { include: { category: true } },
        user: { select: { id: true, name: true, role: true, department: true } },
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถบันทึกการตรวจสอบได้' }, { status: 500 });
  }
}