import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };
    if (category) where.categoryId = category;
    if (status) where.status = status;

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.asset.count({ where }),
    ]);

    return NextResponse.json({ assets, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, categoryId, purchasePrice, salvageValue, purchaseDate, usefulLifeYears, location, warrantyExpiry, description, status } = body;

    if (!name || !categoryId || !purchasePrice || !purchaseDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const count = await db.asset.count();
    const sku = `AST-${String(count + 1).padStart(5, '0')}`;

    const yearsElapsed = (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const annualDep = (purchasePrice - (salvageValue || 0)) / (usefulLifeYears || 5);
    const currentValue = Math.max(salvageValue || 0, purchasePrice - annualDep * Math.max(0, yearsElapsed));

    const asset = await db.asset.create({
      data: {
        sku,
        name,
        categoryId,
        purchasePrice: parseFloat(purchasePrice),
        salvageValue: parseFloat(salvageValue || 0),
        purchaseDate: new Date(purchaseDate),
        currentValue: Math.round(currentValue * 100) / 100,
        usefulLifeYears: usefulLifeYears || 5,
        location: location || null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        description: description || null,
        status: status || 'AVAILABLE',
      },
      include: { category: true },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}