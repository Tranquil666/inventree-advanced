import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const part = await prisma.part.findUnique({
    where: { id },
    include: {
      category: true,
      attributes: true,
      stockItems: {
        include: { location: true },
      },
      supplierParts: {
        include: { supplier: true },
      },
      bomItems: {
        include: { component: { include: { category: true } } },
      },
      bomComponents: {
        include: { part: true },
      },
    },
  })

  if (!part) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...part,
    totalStock: part.stockItems.reduce((sum, s) => sum + s.quantity, 0),
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, description, categoryId, unit, minStock } = body

  const oldPart = await prisma.part.findUnique({ where: { id } })

  const part = await prisma.part.update({
    where: { id },
    data: {
      name,
      description,
      categoryId: categoryId || null,
      unit,
      minStock: parseFloat(minStock) || 0,
    },
    include: { category: true },
  })

  await logAudit({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'UPDATE',
    entity: 'Part',
    entityId: part.id,
    entityName: part.name,
    changes: {
      before: { name: oldPart?.name, description: oldPart?.description, unit: oldPart?.unit, minStock: oldPart?.minStock },
      after: { name, description, unit, minStock },
    },
  })

  return NextResponse.json(part)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const part = await prisma.part.findUnique({ where: { id } })
  await prisma.part.delete({ where: { id } })

  await logAudit({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'DELETE',
    entity: 'Part',
    entityId: id,
    entityName: part?.name,
  })

  return NextResponse.json({ success: true })
}
