import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const build = await prisma.buildOrder.findUnique({
    where: { id },
    include: {
      part: true,
      allocations: {
        include: { stockItem: true },
      },
    },
  })

  if (!build) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (build.status === 'complete') return NextResponse.json({ error: 'Already completed' }, { status: 400 })

  // Consume allocated stock
  for (const alloc of build.allocations) {
    const si = alloc.stockItem
    if (si.quantity < alloc.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for stock item ${si.id}` },
        { status: 400 }
      )
    }

    await prisma.stockItem.update({
      where: { id: si.id },
      data: { quantity: { decrement: alloc.quantity } },
    })

    await prisma.stockHistory.create({
      data: {
        stockItemId: si.id,
        partId: si.partId,
        type: 'BUILD_USE',
        quantity: alloc.quantity,
        notes: `Used in build order ${build.reference || id}`,
        userId: session.user?.id,
      },
    })
  }

  // Create output stock item for the built part
  const outputStockItem = await prisma.stockItem.create({
    data: {
      partId: build.partId,
      quantity: build.quantity,
      batchCode: `BUILD-${build.reference || id}`,
    },
  })

  await prisma.stockHistory.create({
    data: {
      stockItemId: outputStockItem.id,
      partId: build.partId,
      type: 'ADD',
      quantity: build.quantity,
      notes: `Output from build order ${build.reference || id}`,
      userId: session.user?.id,
    },
  })

  // Mark build as complete
  const updatedBuild = await prisma.buildOrder.update({
    where: { id },
    data: { status: 'complete' },
    include: { part: true },
  })

  return NextResponse.json(updatedBuild)
}
