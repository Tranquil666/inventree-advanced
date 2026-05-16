import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50')))

  const [total, suppliers] = await Promise.all([
    prisma.supplier.count(),
    prisma.supplier.findMany({
      include: {
        _count: { select: { supplierParts: true, purchaseOrders: true } },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ data: suppliers, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, phone, website, address, notes } = body

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const supplier = await prisma.supplier.create({
    data: { name, email, phone, website, address, notes },
  })

  return NextResponse.json(supplier, { status: 201 })
}
