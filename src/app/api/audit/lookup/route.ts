import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/audit/lookup?sku=AST-00001&year=2568
// Look up a single asset by SKU for QR scan - returns asset info + audit status for that year
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const year = searchParams.get('year');

    if (!sku || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: sku and year' },
        { status: 400 }
      );
    }

    const auditYear = parseInt(year);
    if (isNaN(auditYear)) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    const asset = await db.asset.findUnique({
      where: { sku },
      include: {
        category: true,
        auditRecords: {
          where: { auditYear },
          include: { auditor: { select: { id: true, name: true } } },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const auditRecord = asset.auditRecords[0] || null;

    return NextResponse.json({
      asset: {
        id: asset.id,
        sku: asset.sku,
        name: asset.name,
        location: asset.location,
        status: asset.status,
        currentValue: asset.currentValue,
        purchaseDate: asset.purchaseDate,
        imageUrl: asset.imageUrl,
        description: asset.description,
        category: {
          id: asset.category.id,
          name: asset.category.name,
        },
      },
      audit: auditRecord
        ? {
            id: auditRecord.id,
            auditYear: auditRecord.auditYear,
            status: auditRecord.status,
            notes: auditRecord.notes,
            auditor: auditRecord.auditor || null,
            updatedAt: auditRecord.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Audit lookup error:', error);
    return NextResponse.json({ error: 'Failed to look up asset' }, { status: 500 });
  }
}