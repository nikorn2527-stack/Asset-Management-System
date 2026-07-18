import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assetCount = await db.asset.count({ where: { categoryId: id, deletedAt: null } });
    if (assetCount > 0) {
      return NextResponse.json({ error: 'Cannot delete category with existing assets' }, { status: 400 });
    }
    await db.assetCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}