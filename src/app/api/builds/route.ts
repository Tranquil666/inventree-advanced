import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50')))

  const [total, builds] = await Promise.all([
    prisma.buildOrder.count(),
    prisma.buildOrder.findMany({
      include: {
        part: true,
        allocations: { include: { stockItem: { include: { location: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ data: builds, total, page, limit })
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
