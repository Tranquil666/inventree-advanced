import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      lineItems: { include: { part: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, reference, notes } = body

  const oldOrder = await prisma.purchaseOrder.findUnique({ where: { id } })

  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: { status, reference, notes },
    include: { supplier: true, lineItems: { include: { part: true } } },
  })

  await logAudit({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'UPDATE',
    entity: 'Order',
    entityId: order.id,
    entityName: order.reference ?? `PO-${order.id.slice(0, 8).toUpperCase()}`,
    changes: {
      before: { status: oldOrder?.status, reference: oldOrder?.reference },
      after: { status, reference },
    },
  })

  return NextResponse.json(order)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.purchaseOrder.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
