import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  if (!q.trim()) {
    return NextResponse.json({ parts: [], suppliers: [], orders: [], builds: [] })
  }

  const [parts, suppliers, orders, builds] = await Promise.all([
    prisma.part.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      include: { category: true, stockItems: true },
      take: 5,
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 3,
      orderBy: { name: 'asc' },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { reference: { contains: q, mode: 'insensitive' } },
          { supplier: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: { supplier: true },
      take: 3,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.buildOrder.findMany({
      where: {
        OR: [
          { reference: { contains: q, mode: 'insensitive' } },
          { part: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: { part: true },
      take: 3,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({
    parts: parts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category ? { name: p.category.name } : undefined,
      totalStock: p.stockItems.reduce((sum, s) => sum + s.quantity, 0),
    })),
    suppliers: suppliers.map((s) => ({ id: s.id, name: s.name, email: s.email ?? undefined })),
    orders: orders.map((o) => ({
      id: o.id,
      reference: o.reference ?? undefined,
      status: o.status,
      supplier: { name: o.supplier.name },
    })),
    builds: builds.map((b) => ({
      id: b.id,
      reference: b.reference ?? undefined,
      status: b.status,
      part: { name: b.part.name },
    })),
  })
}
