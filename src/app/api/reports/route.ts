import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'assets') {
      const assets = await db.asset.findMany({
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(assets);
    }

    if (type === 'depreciation') {
      const assets = await db.asset.findMany({
        where: { status: { not: 'WRITEOFF' } },
        include: { category: true },
        orderBy: { purchaseDate: 'asc' },
      });

      const now = new Date();
      const report = assets.map((a) => {
        const yearsElapsed = (now.getTime() - new Date(a.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        const annualDep = (a.purchasePrice - a.salvageValue) / a.usefulLifeYears;
        const totalDep = annualDep * Math.max(0, yearsElapsed);
        const remainingLife = Math.max(0, a.usefulLifeYears - yearsElapsed);
        const bookValue = Math.max(a.salvageValue, a.purchasePrice - totalDep);

        return {
          sku: a.sku,
          name: a.name,
          category: a.category?.name || '-',
          purchaseDate: a.purchaseDate,
          purchasePrice: a.purchasePrice,
          salvageValue: a.salvageValue,
          usefulLifeYears: a.usefulLifeYears,
          annualDepreciation: Math.round(annualDep * 100) / 100,
          totalDepreciation: Math.round(Math.min(totalDep, a.purchasePrice - a.salvageValue) * 100) / 100,
          currentValue: Math.round(bookValue * 100) / 100,
          yearsElapsed: Math.round(yearsElapsed * 10) / 10,
          remainingLife: Math.round(remainingLife * 10) / 10,
          depreciationPercent: Math.round((Math.min(totalDep, a.purchasePrice - a.salvageValue) / (a.purchasePrice - a.salvageValue)) * 100),
        };
      });

      return NextResponse.json(report);
    }

    if (type === 'borrow') {
      const records = await db.borrowRecord.findMany({
        include: { asset: { include: { category: true } }, user: true, approvedBy: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(records);
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}