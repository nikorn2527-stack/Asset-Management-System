import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Only COMPLETED status is supported' }, { status: 400 });
    }

    const log = await db.maintenanceLog.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!log) {
      return NextResponse.json({ error: 'Maintenance log not found' }, { status: 404 });
    }

    if (log.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Maintenance log is already completed' }, { status: 400 });
    }

    const updatedLog = await db.maintenanceLog.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
      },
      include: { asset: { include: { category: true } } },
    });

    // Check if the asset has any OTHER in-progress maintenance logs
    const inProgressCount = await db.maintenanceLog.count({
      where: {
        assetId: log.assetId,
        status: 'IN_PROGRESS',
      },
    });

    if (inProgressCount === 0) {
      await db.asset.update({
        where: { id: log.assetId },
        data: { status: 'AVAILABLE' },
      });
      updatedLog.asset = { ...updatedLog.asset, status: 'AVAILABLE' };
    }

    return NextResponse.json(updatedLog);
  } catch {
    return NextResponse.json({ error: 'Failed to update maintenance log' }, { status: 500 });
  }
}