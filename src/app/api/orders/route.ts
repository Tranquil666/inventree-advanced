import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orders = await prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      lineItems: {
        include: { part: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    orders.map((o) => ({
      ...o,
      totalValue: o.lineItems.reduce((sum, li) => sum + li.quantity * (li.unitPrice || 0), 0),
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { supplierId, reference, notes, lineItems } = body

  if (!supplierId) return NextResponse.json({ error: 'Supplier required' }, { status: 400 })

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      reference,
      notes,
      lineItems: {
        create: lineItems?.map((li: { partId: string; quantity: number; unitPrice?: number }) => ({
          partId: li.partId,
          quantity: parseFloat(String(li.quantity)),
          unitPrice: li.unitPrice ? parseFloat(String(li.unitPrice)) : null,
        })) || [],
      },
    },
    include: {
      supplier: true,
      lineItems: { include: { part: true } },
    },
  })

  return NextResponse.json(order, { status: 201 })
}
