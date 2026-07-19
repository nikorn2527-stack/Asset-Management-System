import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// GET /api/audit - List audit records (with year) or past audit years (without year)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status') || '';
    const sku = searchParams.get('sku') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // ---- /api/audit (no year) → list past audit years with summary ----
    if (!year) {
      const yearGroups = await db.auditRecord.groupBy({
        by: ['auditYear'],
        _count: {
          id: true,
        },
        orderBy: { auditYear: 'desc' },
      });

      const totalAssets = await db.asset.count();

      const years = await Promise.all(
        yearGroups.map(async (group) => {
          const statusCounts = await db.auditRecord.groupBy({
            by: ['status'],
            where: { auditYear: group.auditYear },
            _count: { id: true },
          });

          const counts: Record<string, number> = {
            NOT_CHECKED: 0,
            FOUND_NORMAL: 0,
            FOUND_DAMAGED: 0,
            MISSING: 0,
          };
          statusCounts.forEach((sc) => {
            counts[sc.status] = sc._count.id;
          });

          return {
            year: group.auditYear,
            totalChecked: group._count.id,
            foundNormal: counts.FOUND_NORMAL,
            foundDamaged: counts.FOUND_DAMAGED,
            missing: counts.MISSING,
            notChecked: counts.NOT_CHECKED,
            totalAssets,
            lastUpdated: null as string | null,
          };
        })
      );

      // Get the latest updatedAt for each year
      for (const yearEntry of years) {
        const latest = await db.auditRecord.findFirst({
          where: { auditYear: yearEntry.year },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        });
        yearEntry.lastUpdated = latest?.updatedAt?.toISOString() || null;
      }

      return NextResponse.json({ years, totalAssets });
    }

    // ---- /api/audit?year=2568 → paginated records for a specific year ----
    const auditYear = parseInt(year);
    if (isNaN(auditYear)) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    const where: Prisma.AuditRecordWhereInput = { auditYear };
    if (status) where.status = status;
    if (sku) {
      where.asset = { sku: { contains: sku } };
    }

    // Summary counts for the year
    const [summaryResult, checkedCount] = await Promise.all([
      db.auditRecord.groupBy({
        by: ['status'],
        where: { auditYear },
        _count: { id: true },
      }),
      db.auditRecord.count({
        where: { auditYear, status: { not: 'NOT_CHECKED' } },
      }),
    ]);

    const totalAssets = await db.asset.count();

    const statusMap: Record<string, number> = {
      NOT_CHECKED: 0,
      FOUND_NORMAL: 0,
      FOUND_DAMAGED: 0,
      MISSING: 0,
    };
    summaryResult.forEach((s) => {
      statusMap[s.status] = s._count.id;
    });

    const [records, total] = await Promise.all([
      db.auditRecord.findMany({
        where,
        include: {
          asset: { include: { category: true } },
          auditor: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditRecord.count({ where }),
    ]);

    return NextResponse.json({
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalAssets,
        checked: checkedCount,
        foundNormal: statusMap.FOUND_NORMAL,
        foundDamaged: statusMap.FOUND_DAMAGED,
        missing: statusMap.MISSING,
      },
    });
  } catch (error) {
    console.error('Audit GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit data' }, { status: 500 });
  }
}

// POST /api/audit - Create or update a single audit record (upsert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, auditYear, status, auditorId, notes } = body;

    if (!assetId || !auditYear || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: assetId, auditYear, status' },
        { status: 400 }
      );
    }

    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const validStatuses = ['NOT_CHECKED', 'FOUND_NORMAL', 'FOUND_DAMAGED', 'MISSING'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (auditorId) {
      const auditor = await db.user.findUnique({ where: { id: auditorId } });
      if (!auditor) {
        return NextResponse.json({ error: 'Auditor not found' }, { status: 404 });
      }
    }

    const record = await db.auditRecord.upsert({
      where: {
        auditYear_assetId: { auditYear: parseInt(auditYear), assetId },
      },
      update: {
        status,
        auditorId: auditorId || null,
        notes: notes || null,
      },
      create: {
        auditYear: parseInt(auditYear),
        assetId,
        status,
        auditorId: auditorId || null,
        notes: notes || null,
      },
      include: {
        asset: { include: { category: true } },
        auditor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Audit POST error:', error);
    return NextResponse.json({ error: 'Failed to create or update audit record' }, { status: 500 });
  }
}

// PUT /api/audit - Bulk update multiple audit records
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include a non-empty "records" array' },
        { status: 400 }
      );
    }

    const validStatuses = ['NOT_CHECKED', 'FOUND_NORMAL', 'FOUND_DAMAGED', 'MISSING'];

    // Validate all records before processing
    for (const record of records) {
      if (!record.assetId || !record.auditYear || !record.status) {
        return NextResponse.json(
          { error: 'Each record must have assetId, auditYear, and status' },
          { status: 400 }
        );
      }
      if (!validStatuses.includes(record.status)) {
        return NextResponse.json(
          { error: `Invalid status "${record.status}". Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const results = await Promise.all(
      records.map(
        ({ assetId, auditYear, status, auditorId, notes }) =>
          db.auditRecord.upsert({
            where: {
              auditYear_assetId: { auditYear: parseInt(auditYear), assetId },
            },
            update: {
              status,
              auditorId: auditorId || null,
              notes: notes ?? undefined,
            },
            create: {
              auditYear: parseInt(auditYear),
              assetId,
              status,
              auditorId: auditorId || null,
              notes: notes || null,
            },
            include: {
              asset: { include: { category: true } },
              auditor: { select: { id: true, name: true } },
            },
          })
      )
    );

    return NextResponse.json({
      updated: results.length,
      records: results,
    });
  } catch (error) {
    console.error('Audit PUT error:', error);
    return NextResponse.json({ error: 'Failed to bulk update audit records' }, { status: 500 });
  }
}