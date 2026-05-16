import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50')))

  const where = {
    AND: [
      search ? { name: { contains: search, mode: 'insensitive' as const } } : {},
      categoryId ? { categoryId } : {},
    ],
  }

  const [total, parts] = await Promise.all([
    prisma.part.count({ where }),
    prisma.part.findMany({
      where,
      include: {
        category: true,
        stockItems: true,
        supplierParts: true,
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({
    data: parts.map((p) => ({
      ...p,
      totalStock: p.stockItems.reduce((sum, s) => sum + s.quantity, 0),
    })),
    total,
    page,
    limit,
  })
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

  await logAudit({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'CREATE',
    entity: 'Part',
    entityId: part.id,
    entityName: part.name,
  })

  return NextResponse.json(part, { status: 201 })
}
