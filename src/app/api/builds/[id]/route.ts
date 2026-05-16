import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const build = await prisma.buildOrder.findUnique({
    where: { id },
    include: {
      part: {
        include: {
          bomItems: {
            include: {
              component: {
                include: { stockItems: { include: { location: true } } },
              },
            },
          },
        },
      },
      allocations: {
        include: {
          stockItem: { include: { part: true, location: true } },
        },
      },
    },
  })

  if (!build) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(build)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, reference, notes } = body

  const build = await prisma.buildOrder.update({
    where: { id },
    data: { status, reference, notes },
    include: { part: true },
  })

  return NextResponse.json(build)
}
