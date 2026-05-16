import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50')))

  const [total, returns] = await Promise.all([
    prisma.returnOrder.count(),
    prisma.returnOrder.findMany({
      include: {
        supplier: true,
        lineItems: { include: { part: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ data: returns, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { supplierId, reference, reason, notes, lineItems } = body

  if (!supplierId) return NextResponse.json({ error: 'Supplier required' }, { status: 400 })

  const returnOrder = await prisma.returnOrder.create({
    data: {
      supplierId,
      reference,
      reason,
      notes,
      lineItems: {
        create: (lineItems ?? []).map((li: { partId: string; quantity: number; unitPrice?: number; reason?: string }) => ({
          partId: li.partId,
          quantity: parseFloat(String(li.quantity)),
          unitPrice: li.unitPrice ? parseFloat(String(li.unitPrice)) : null,
          reason: li.reason,
        })),
      },
    },
    include: {
      supplier: true,
      lineItems: { include: { part: true } },
    },
  })

  await logAudit({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'CREATE',
    entity: 'ReturnOrder',
    entityId: returnOrder.id,
    entityName: returnOrder.reference ?? `RMA-${returnOrder.id.slice(0, 8).toUpperCase()}`,
  })

  return NextResponse.json(returnOrder, { status: 201 })
}
