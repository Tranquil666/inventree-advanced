import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const suppliers = await prisma.supplier.findMany({
    include: {
      _count: { select: { supplierParts: true, purchaseOrders: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(suppliers)
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
