import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const returnOrder = await prisma.returnOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      lineItems: { include: { part: true } },
    },
  })

  if (!returnOrder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(returnOrder)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, reference, reason, notes } = body

  const oldReturn = await prisma.returnOrder.findUnique({
    where: { id },
    include: { lineItems: { include: { part: true } } },
  })

  const returnOrder = await prisma.returnOrder.update({
    where: { id },
    data: { status, reference, reason, notes },
    include: {
      supplier: true,
      lineItems: { include: { part: true } },
    },
  })

  // When status changes to "received", deduct stock for each line item
  if (status === 'received' && oldReturn?.status !== 'received') {
    for (const lineItem of returnOrder.lineItems) {
      // Find a stock item for this part and deduct
      const stockItem = await prisma.stockItem.findFirst({
        where: { partId: lineItem.partId, quantity: { gte: lineItem.quantity } },
      })
      if (stockItem) {
        await prisma.stockItem.update({
          where: { id: stockItem.id },
          data: { quantity: { decrement: lineItem.quantity } },
        })
        await prisma.stockHistory.create({
          data: {
            stockItemId: stockItem.id,
            partId: lineItem.partId,
            type: 'REMOVE',
            quantity: lineItem.quantity,
            notes: `Return order: ${returnOrder.reference ?? id}`,
            userId: session.user.id,
          },
        })
      }
    }
  }

  await logAudit({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'UPDATE',
    entity: 'ReturnOrder',
    entityId: returnOrder.id,
    entityName: returnOrder.reference ?? `RMA-${returnOrder.id.slice(0, 8).toUpperCase()}`,
    changes: { before: { status: oldReturn?.status }, after: { status } },
  })

  return NextResponse.json(returnOrder)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.returnOrder.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
