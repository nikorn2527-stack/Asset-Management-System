import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, approvedById, actualReturnDate } = body;

    const record = await db.borrowRecord.findUnique({ where: { id }, include: { asset: true, user: true } });
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    if (action === 'approve') {
      const updated = await db.borrowRecord.update({
        where: { id },
        data: { status: 'APPROVED', approvedById },
        include: { asset: true, user: true, approvedBy: true },
      });
      await db.asset.update({ where: { id: record.assetId }, data: { status: 'BORROWED' } });
      await db.notification.create({
        userId: record.userId,
        title: 'คำขอยืมอนุมัติแล้ว',
        message: `คำขอยืม ${record.asset.name} ได้รับการอนุมัติแล้ว`,
        type: 'SUCCESS',
        link: 'borrow',
      });
      return NextResponse.json(updated);
    }

    if (action === 'reject') {
      const updated = await db.borrowRecord.update({
        where: { id },
        data: { status: 'REJECTED', approvedById },
        include: { asset: true, user: true, approvedBy: true },
      });
      await db.notification.create({
        userId: record.userId,
        title: 'คำขอยืมถูกปฏิเสธ',
        message: `คำขอยืม ${record.asset.name} ถูกปฏิเสธ`,
        type: 'ERROR',
        link: 'borrow',
      });
      return NextResponse.json(updated);
    }

    if (action === 'return') {
      const updated = await db.borrowRecord.update({
        where: { id },
        data: {
          status: 'RETURNED',
          actualReturnDate: actualReturnDate ? new Date(actualReturnDate) : new Date(),
        },
        include: { asset: true, user: true, approvedBy: true },
      });
      await db.asset.update({ where: { id: record.assetId }, data: { status: 'AVAILABLE' } });
      return NextResponse.json(updated);
    }

    if (action === 'overdue') {
      const updated = await db.borrowRecord.update({
        where: { id },
        data: { status: 'OVERDUE' },
        include: { asset: true, user: true, approvedBy: true },
      });
      await db.notification.create({
        userId: record.userId,
        title: 'แจ้งเตือนคืนครุภัณฑ์เกินกำหนด',
        message: `กรุณาคืน ${record.asset.name} ที่ยืมไป โดยเร็วที่สุด`,
        type: 'WARNING',
        link: 'borrow',
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Borrow update error:', error);
    return NextResponse.json({ error: 'Failed to update borrow record' }, { status: 500 });
  }
}