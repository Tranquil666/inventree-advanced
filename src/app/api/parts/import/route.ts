import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

interface ImportRow {
  name: string
  description?: string
  categoryName?: string
  unit?: string
  minStock?: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as { rows: ImportRow[] }
  const { rows } = body

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  let created = 0
  const errors: string[] = []

  // Cache category lookups to avoid redundant queries
  const categoryCache = new Map<string, string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowLabel = `Row ${i + 2}` // +2 because row 1 = header

    try {
      if (!row.name?.trim()) {
        errors.push(`${rowLabel}: Name is required`)
        continue
      }

      let categoryId: string | null = null

      if (row.categoryName?.trim()) {
        const catName = row.categoryName.trim()
        if (categoryCache.has(catName)) {
          categoryId = categoryCache.get(catName)!
        } else {
          let category = await prisma.category.findFirst({ where: { name: catName } })
          if (!category) {
            category = await prisma.category.create({ data: { name: catName } })
          }
          categoryId = category.id
          categoryCache.set(catName, category.id)
        }
      }

      const minStock = row.minStock ? parseFloat(row.minStock) : 0

      await prisma.part.create({
        data: {
          name: row.name.trim(),
          description: row.description?.trim() || null,
          categoryId,
          unit: row.unit?.trim() || 'pcs',
          minStock: isNaN(minStock) ? 0 : minStock,
        },
      })

      created++
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`${rowLabel} ("${row.name}"): ${message}`)
    }
  }

  return NextResponse.json({ created, errors })
}
