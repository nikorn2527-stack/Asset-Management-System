import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Dual-mode database client:
 * - file:...   → local SQLite (development)
 * - libsql:... → Turso cloud (Vercel production)
 */
async function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

  if (dbUrl.startsWith('libsql:')) {
    // Turso / libsql cloud mode
    const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
    const { createClient } = await import('@libsql/client')

    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })

    return new PrismaClient({
      adapter: new PrismaLibSQL(libsql),
    })
  }

  // Local SQLite mode
  return new PrismaClient()
}

let _db: PrismaClient | undefined

export const db =
  globalForPrisma.prisma ??
  (_db = await createPrismaClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db