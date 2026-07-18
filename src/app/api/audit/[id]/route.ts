import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, auditResult, location } = body;

    const existing = await db.auditLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบบันทึกการตรวจสอบ' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (notes !== undefined) updateData.notes = notes || null;
    if (location !== undefined) updateData.location = location || null;
    if (auditResult !== undefined) {
      const validResults = ['FOUND_NORMAL', 'FOUND_DAMAGED', 'MISSING'];
      if (!validResults.includes(auditResult)) {
        return NextResponse.json(
          { error: 'ผลการตรวจสอบไม่ถูกต้อง ต้องเป็น FOUND_NORMAL, FOUND_DAMAGED หรือ MISSING' },
          { status: 400 }
        );
      }
      updateData.auditResult = auditResult;
    }

    const log = await db.auditLog.update({
      where: { id },
      data: updateData,
      include: {
        asset: { include: { category: true } },
        user: { select: { id: true, name: true, role: true, department: true } },
      },
    });

    return NextResponse.json(log);
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถแก้ไขบันทึกการตรวจสอบได้' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.auditLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบบันทึกการตรวจสอบ' }, { status: 404 });
    }

    await db.auditLog.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถลบบันทึกการตรวจสอบได้' }, { status: 500 });
  }
}