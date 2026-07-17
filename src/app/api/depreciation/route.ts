import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const assets = await db.asset.findMany({
      where: { status: { not: 'WRITEOFF' } },
    });

    const now = new Date();
    const updates = [];

    for (const asset of assets) {
      const yearsElapsed = (now.getTime() - new Date(asset.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const annualDep = (asset.purchasePrice - asset.salvageValue) / asset.usefulLifeYears;
      const newValue = Math.max(asset.salvageValue, asset.purchasePrice - annualDep * Math.max(0, yearsElapsed));
      const roundedValue = Math.round(newValue * 100) / 100;

      if (roundedValue !== asset.currentValue) {
        updates.push({
          where: { id: asset.id },
          data: { currentValue: roundedValue },
        });
      }
    }

    for (const update of updates) {
      await db.asset.update(update);
    }

    return NextResponse.json({ updated: updates.length, message: `Depreciation updated for ${updates.length} assets` });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate depreciation' }, { status: 500 });
  }
}