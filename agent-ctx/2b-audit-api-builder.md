# Task 2b - Audit API Builder

## Files Created
1. `/src/app/api/audit/route.ts` - GET (list with pagination/filters) + POST (create with validation)
2. `/src/app/api/audit/[id]/route.ts` - PUT (update notes/result/location) + DELETE
3. `/src/app/api/audit/summary/route.ts` - GET (audit summary with counts + scan rate)
4. `/src/app/api/audit/scan/route.ts` - GET (lookup by SKU for QR scan)

## Notes
- All error messages in Thai
- Uses `Record<string, unknown>` for dynamic where clauses (matching project pattern)
- Scan endpoint returns asset with category, maintenance logs, borrow records, and today's latest audit
- Summary calculates scan rate as percentage of total assets
- ESLint passes cleanly