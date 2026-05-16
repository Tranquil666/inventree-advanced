import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const builds = await prisma.buildOrder.findMany({
    include: {
      part: true,
      allocations: { include: { stockItem: { include: { location: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(builds)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { partId, quantity, reference, notes } = body

  if (!partId || !quantity) {
    return NextResponse.json({ error: 'partId and quantity required' }, { status: 400 })
  }

  const build = await prisma.buildOrder.create({
    data: {
      partId,
      quantity: parseFloat(String(quantity)),
      reference,
      notes,
    },
    include: { part: true },
  })

  return NextResponse.json(build, { status: 201 })
}
