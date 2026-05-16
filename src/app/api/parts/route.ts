import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || undefined

  const parts = await prisma.part.findMany({
    where: {
      AND: [
        search ? { name: { contains: search } } : {},
        categoryId ? { categoryId } : {},
      ],
    },
    include: {
      category: true,
      stockItems: true,
      supplierParts: true,
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(
    parts.map((p) => ({
      ...p,
      totalStock: p.stockItems.reduce((sum, s) => sum + s.quantity, 0),
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, categoryId, unit, minStock } = body

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const part = await prisma.part.create({
    data: {
      name,
      description,
      categoryId: categoryId || null,
      unit: unit || 'pcs',
      minStock: parseFloat(minStock) || 0,
    },
    include: { category: true },
  })

  return NextResponse.json(part, { status: 201 })
}
