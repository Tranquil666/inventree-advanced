import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, partId, locationId, quantity, notes, stockItemId } = body

  if (!type || !partId || !quantity) {
    return NextResponse.json({ error: 'type, partId, quantity required' }, { status: 400 })
  }

  const qty = parseFloat(quantity)

  if (type === 'ADD') {
    // Find existing stock item at location or create new one
    let stockItem = stockItemId
      ? await prisma.stockItem.findUnique({ where: { id: stockItemId } })
      : await prisma.stockItem.findFirst({ where: { partId, locationId: locationId || null } })

    if (stockItem) {
      stockItem = await prisma.stockItem.update({
        where: { id: stockItem.id },
        data: { quantity: { increment: qty } },
      })
    } else {
      stockItem = await prisma.stockItem.create({
        data: { partId, locationId: locationId || null, quantity: qty },
      })
    }

    await prisma.stockHistory.create({
      data: {
        stockItemId: stockItem.id,
        partId,
        type: 'ADD',
        quantity: qty,
        notes,
        userId: session.user?.id,
      },
    })

    return NextResponse.json(stockItem)
  }

  if (type === 'REMOVE') {
    const stockItem = stockItemId
      ? await prisma.stockItem.findUnique({ where: { id: stockItemId } })
      : await prisma.stockItem.findFirst({ where: { partId, locationId: locationId || null } })

    if (!stockItem) return NextResponse.json({ error: 'Stock item not found' }, { status: 404 })
    if (stockItem.quantity < qty) return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })

    const updated = await prisma.stockItem.update({
      where: { id: stockItem.id },
      data: { quantity: { decrement: qty } },
    })

    await prisma.stockHistory.create({
      data: {
        stockItemId: stockItem.id,
        partId,
        type: 'REMOVE',
        quantity: qty,
        notes,
        userId: session.user?.id,
      },
    })

    return NextResponse.json(updated)
  }

  if (type === 'ADJUST') {
    const stockItem = stockItemId
      ? await prisma.stockItem.findUnique({ where: { id: stockItemId } })
      : await prisma.stockItem.findFirst({ where: { partId, locationId: locationId || null } })

    if (!stockItem) return NextResponse.json({ error: 'Stock item not found' }, { status: 404 })

    const updated = await prisma.stockItem.update({
      where: { id: stockItem.id },
      data: { quantity: qty },
    })

    await prisma.stockHistory.create({
      data: {
        stockItemId: stockItem.id,
        partId,
        type: 'ADJUST',
        quantity: qty,
        notes,
        userId: session.user?.id,
      },
    })

    return NextResponse.json(updated)
  }

  if (type === 'TRANSFER') {
    const { toLocationId } = body
    const stockItem = await prisma.stockItem.findUnique({ where: { id: stockItemId } })
    if (!stockItem) return NextResponse.json({ error: 'Stock item not found' }, { status: 404 })
    if (stockItem.quantity < qty) return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })

    // Decrement from source
    await prisma.stockItem.update({
      where: { id: stockItem.id },
      data: { quantity: { decrement: qty } },
    })

    // Add to destination
    let destItem = await prisma.stockItem.findFirst({
      where: { partId, locationId: toLocationId || null },
    })

    if (destItem) {
      destItem = await prisma.stockItem.update({
        where: { id: destItem.id },
        data: { quantity: { increment: qty } },
      })
    } else {
      destItem = await prisma.stockItem.create({
        data: { partId, locationId: toLocationId || null, quantity: qty },
      })
    }

    await prisma.stockHistory.create({
      data: {
        stockItemId: stockItem.id,
        partId,
        type: 'TRANSFER',
        quantity: qty,
        notes,
        userId: session.user?.id,
      },
    })

    return NextResponse.json({ from: stockItem, to: destItem })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
