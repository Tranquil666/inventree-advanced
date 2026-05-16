import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { locationId, lineItems } = body
  // lineItems: Array<{ lineItemId: string, quantity: number }>

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { lineItems: { include: { part: true } } },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  for (const { lineItemId, quantity } of lineItems) {
    const li = order.lineItems.find((l) => l.id === lineItemId)
    if (!li) continue

    const qty = parseFloat(String(quantity))
    if (qty <= 0) continue

    // Find or create stock item
    let stockItem = await prisma.stockItem.findFirst({
      where: { partId: li.partId, locationId: locationId || null },
    })

    if (stockItem) {
      stockItem = await prisma.stockItem.update({
        where: { id: stockItem.id },
        data: { quantity: { increment: qty } },
      })
    } else {
      stockItem = await prisma.stockItem.create({
        data: { partId: li.partId, locationId: locationId || null, quantity: qty },
      })
    }

    // Update received qty on line item
    await prisma.pOLineItem.update({
      where: { id: lineItemId },
      data: { received: { increment: qty } },
    })

    // Log history
    await prisma.stockHistory.create({
      data: {
        stockItemId: stockItem.id,
        partId: li.partId,
        type: 'ADD',
        quantity: qty,
        notes: `Received from PO ${order.reference || id}`,
        userId: session.user?.id,
      },
    })
  }

  // Update order status to 'received' if all received
  const updatedOrder = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { lineItems: true },
  })

  if (updatedOrder) {
    const allReceived = updatedOrder.lineItems.every((li) => li.received >= li.quantity)
    if (allReceived) {
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'received' },
      })
    }
  }

  return NextResponse.json({ success: true })
}
