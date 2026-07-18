import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await db.asset.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        borrowRecords: {
          include: { user: true, approvedBy: true },
          orderBy: { createdAt: 'desc' },
        },
        maintenanceLogs: { orderBy: { date: 'desc' } },
        writeoffRecords: { include: { approvedBy: true }, orderBy: { date: 'desc' } },
      },
    });
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const asset = await db.asset.update({
      where: { id },
      data: body,
      include: { category: true },
    });
    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await db.asset.findFirst({ where: { id, deletedAt: null } });
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    await db.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true, softDeleted: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}