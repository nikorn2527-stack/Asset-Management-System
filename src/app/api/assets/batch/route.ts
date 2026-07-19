import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface BatchAssetInput {
  name?: unknown;
  categoryName?: unknown;
  purchasePrice?: unknown;
  purchaseDate?: unknown;
  salvageValue?: unknown;
  usefulLifeYears?: unknown;
  location?: unknown;
  warrantyExpiry?: unknown;
  description?: unknown;
  sku?: unknown;
}

interface ValidatedRow {
  index: number;
  name: string;
  categoryName: string;
  purchasePrice: number;
  purchaseDate: Date;
  salvageValue: number;
  usefulLifeYears: number;
  location: string | null;
  warrantyExpiry: Date | null;
  description: string | null;
  explicitSku: string | null;
}

interface AssetCreateData {
  sku: string;
  name: string;
  categoryId: string;
  purchasePrice: number;
  salvageValue: number;
  purchaseDate: Date;
  currentValue: number;
  usefulLifeYears: number;
  location: string | null;
  warrantyExpiry: Date | null;
  description: string | null;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assets } = body as { assets: BatchAssetInput[] };

    if (!Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { created: 0, skipped: 0, errors: ['ไม่พบข้อมูลในไฟล์'] },
        { status: 400 }
      );
    }

    const errors: string[] = [];

    // ── Step 1: Validate all rows and collect valid data ──────────────────
    const validatedRows: ValidatedRow[] = [];

    for (let i = 0; i < assets.length; i++) {
      const item = assets[i];

      if (!item.name || !item.purchasePrice || !item.purchaseDate) {
        errors.push(
          `แถวที่ ${i + 2}: ข้อมูลไม่ครบ (ต้องมี ชื่อ, ราคาซื้อ, วันที่ซื้อ)`
        );
        continue;
      }

      if (!item.categoryName) {
        errors.push(`แถวที่ ${i + 2}: ต้องระบุหมวดหมู่`);
        continue;
      }

      const purchasePrice = parseFloat(String(item.purchasePrice));
      if (isNaN(purchasePrice) || purchasePrice <= 0) {
        errors.push(`แถวที่ ${i + 2}: ราคาซื้อไม่ถูกต้อง`);
        continue;
      }

      const purchaseDate = new Date(String(item.purchaseDate));
      if (isNaN(purchaseDate.getTime())) {
        errors.push(
          `แถวที่ ${i + 2}: วันที่ซื้อไม่ถูกต้อง (ใช้รูปแบบ YYYY-MM-DD)`
        );
        continue;
      }

      let warrantyExpiry: Date | null = null;
      if (item.warrantyExpiry) {
        const wd = new Date(String(item.warrantyExpiry));
        warrantyExpiry = isNaN(wd.getTime()) ? null : wd;
      }

      validatedRows.push({
        index: i,
        name: String(item.name).trim(),
        categoryName: String(item.categoryName).trim(),
        purchasePrice,
        purchaseDate,
        salvageValue: parseFloat(String(item.salvageValue)) || 0,
        usefulLifeYears: parseInt(String(item.usefulLifeYears)) || 5,
        location: item.location ? String(item.location).trim() : null,
        warrantyExpiry,
        description: item.description ? String(item.description).trim() : null,
        explicitSku: item.sku ? String(item.sku).trim() : null,
      });
    }

    if (validatedRows.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, errors });
    }

    // ── Step 2: Resolve categories in bulk ───────────────────────────────
    const existingCategories = await db.assetCategory.findMany();
    const categoryMap = new Map<string, string>(); // lowercase name → id
    for (const cat of existingCategories) {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    }

    // Identify new category names not yet in the map
    const newCategoryNames = new Set<string>();
    for (const row of validatedRows) {
      const key = row.categoryName.toLowerCase();
      if (!categoryMap.has(key)) {
        newCategoryNames.add(row.categoryName);
      }
    }

    // Batch create new categories
    if (newCategoryNames.size > 0) {
      try {
        await db.assetCategory.createMany({
          data: Array.from(newCategoryNames).map((name) => ({ name })),
          skipDuplicates: true,
        });
      } catch {
        // If batch create fails, fall back to creating them individually
        for (const name of newCategoryNames) {
          if (!categoryMap.has(name.toLowerCase())) {
            try {
              const cat = await db.assetCategory.create({ data: { name } });
              categoryMap.set(cat.name.toLowerCase(), cat.id);
            } catch {
              // Silently skip — will be caught below when resolving rows
            }
          }
        }
      }

      // Fetch newly created categories to get their IDs
      const createdCats = await db.assetCategory.findMany({
        where: { name: { in: Array.from(newCategoryNames) } },
      });
      for (const cat of createdCats) {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
      }
    }

    // Build rows with resolved category IDs
    interface ResolvedRow extends ValidatedRow {
      categoryId: string;
    }
    const rowsWithCategory: ResolvedRow[] = [];

    for (const row of validatedRows) {
      const catId = categoryMap.get(row.categoryName.toLowerCase());
      if (!catId) {
        errors.push(
          `แถวที่ ${row.index + 2}: ไม่สามารถสร้างหมวดหมู่ "${row.categoryName}" ได้`
        );
        continue;
      }
      rowsWithCategory.push({ ...row, categoryId: catId });
    }

    if (rowsWithCategory.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, errors });
    }

    // ── Step 3: Pre-compute SKUs ─────────────────────────────────────────
    // Get the current max numeric SKU from existing assets
    const maxSkuResult = await db.$queryRaw<
      Array<{ maxNum: number | null }>
    >`SELECT MAX(CAST(SUBSTR(sku, 5) AS INTEGER)) as maxNum FROM Asset WHERE sku LIKE 'AST-%'`;
    const maxSkuNum = maxSkuResult[0]?.maxNum ?? 0;
    let autoSkuCounter = maxSkuNum + 1;

    // Collect explicit SKUs and check for duplicates in the DB (single query)
    const explicitSkus = rowsWithCategory
      .filter((r) => r.explicitSku)
      .map((r) => r.explicitSku!);

    const existingSkuSet = new Set<string>();
    if (explicitSkus.length > 0) {
      const existingSkuAssets = await db.asset.findMany({
        where: { sku: { in: explicitSkus } },
        select: { sku: true },
      });
      for (const a of existingSkuAssets) {
        existingSkuSet.add(a.sku);
      }
    }

    // Track SKUs within the batch to detect intra-batch duplicates
    const batchSkuSet = new Set<string>();

    // ── Step 4: Bulk duplicate detection (name + categoryId + purchaseDate) ──
    const duplicateKeySet = new Set<string>();

    // Build unique lookup tuples
    const uniqueTuples = new Map<
      string,
      { name: string; categoryId: string; purchaseDate: string }
    >();
    for (const row of rowsWithCategory) {
      const key = buildDuplicateKey(row.name, row.categoryId, row.purchaseDate);
      if (!uniqueTuples.has(key)) {
        uniqueTuples.set(key, {
          name: row.name,
          categoryId: row.categoryId,
          purchaseDate: row.purchaseDate.toISOString(),
        });
      }
    }

    // Query existing duplicates in batches
    if (uniqueTuples.size > 0) {
      const tuples = Array.from(uniqueTuples.values());
      const OR_BATCH_SIZE = 50;

      for (let b = 0; b < tuples.length; b += OR_BATCH_SIZE) {
        const batch = tuples.slice(b, b + OR_BATCH_SIZE);
        const orConditions = batch.map((t) => ({
          AND: [
            { name: t.name },
            { categoryId: t.categoryId },
            { purchaseDate: new Date(t.purchaseDate) },
          ],
        }));

        const duplicates = await db.asset.findMany({
          where: { OR: orConditions },
          select: { name: true, categoryId: true, purchaseDate: true },
        });
        for (const d of duplicates) {
          duplicateKeySet.add(
            buildDuplicateKey(d.name, d.categoryId, d.purchaseDate)
          );
        }
      }
    }

    // Also detect intra-batch duplicates
    const seenBatchKeys = new Set<string>();
    for (const row of rowsWithCategory) {
      const key = buildDuplicateKey(row.name, row.categoryId, row.purchaseDate);
      if (seenBatchKeys.has(key)) {
        duplicateKeySet.add(key);
      }
      seenBatchKeys.add(key);
    }

    // ── Step 5: Build final data array for createMany ────────────────────
    const finalAssets: AssetCreateData[] = [];
    let skipped = 0;

    for (const row of rowsWithCategory) {
      // Check duplicate by name + category + purchaseDate
      const dupKey = buildDuplicateKey(
        row.name,
        row.categoryId,
        row.purchaseDate
      );
      if (duplicateKeySet.has(dupKey)) {
        skipped++;
        errors.push(
          `แถวที่ ${row.index + 2}: "${row.name}" ในหมวด "${row.categoryName}" วันที่ซื้อเดียวกัน มีอยู่แล้ว`
        );
        continue;
      }

      // Resolve SKU
      let sku: string;
      if (row.explicitSku) {
        if (existingSkuSet.has(row.explicitSku)) {
          errors.push(
            `แถวที่ ${row.index + 2}: SKU ${row.explicitSku} มีอยู่แล้ว`
          );
          continue;
        }
        if (batchSkuSet.has(row.explicitSku)) {
          errors.push(
            `แถวที่ ${row.index + 2}: SKU ${row.explicitSku} ซ้ำในไฟล์อัปโหลด`
          );
          continue;
        }
        sku = row.explicitSku;
        batchSkuSet.add(sku);
      } else {
        sku = `AST-${String(autoSkuCounter++).padStart(5, '0')}`;
      }

      // Calculate depreciation (pure math, no DB calls)
      const annualDep =
        (row.purchasePrice - row.salvageValue) / row.usefulLifeYears;
      const yearsElapsed = Math.max(
        0,
        (Date.now() - row.purchaseDate.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      );
      const currentValue = Math.max(
        row.salvageValue,
        row.purchasePrice - annualDep * yearsElapsed
      );

      finalAssets.push({
        sku,
        name: row.name,
        categoryId: row.categoryId,
        purchasePrice: row.purchasePrice,
        salvageValue: row.salvageValue,
        purchaseDate: row.purchaseDate,
        currentValue: Math.round(currentValue * 100) / 100,
        usefulLifeYears: row.usefulLifeYears,
        location: row.location,
        warrantyExpiry: row.warrantyExpiry,
        description: row.description,
        status: 'AVAILABLE',
      });
    }

    if (finalAssets.length === 0) {
      return NextResponse.json({ created: 0, skipped, errors });
    }

    // ── Step 6: Batch insert with createMany ─────────────────────────────
    let created = 0;
    try {
      const result = await db.asset.createMany({
        data: finalAssets,
        skipDuplicates: true,
      });
      created = result.count;
    } catch {
      // Graceful fallback: if createMany fails (e.g. edge-case constraint violation),
      // insert one-by-one so valid rows still get saved
      for (const asset of finalAssets) {
        try {
          await db.asset.create({ data: asset });
          created++;
        } catch {
          const originalRow = rowsWithCategory.find(
            (r) => r.categoryId === asset.categoryId && r.name === asset.name
          );
          const rowNum = originalRow ? originalRow.index + 2 : '?';
          errors.push(
            `แถวที่ ${rowNum}: ${asset.name} - ไม่สามารถบันทึกได้`
          );
        }
      }
    }

    return NextResponse.json({ created, skipped, errors });
  } catch {
    return NextResponse.json(
      { created: 0, skipped: 0, errors: ['เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'] },
      { status: 500 }
    );
  }
}

/** Build a deterministic key for duplicate detection: name|categoryId|date */
function buildDuplicateKey(
  name: string,
  categoryId: string,
  date: Date
): string {
  return `${name}|${categoryId}|${date.toISOString()}`;
}