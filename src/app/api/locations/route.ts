import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locations = await prisma.location.findMany({
    include: {
      parent: true,
      children: true,
      _count: { select: { stockItems: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(locations)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, parentId } = body

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const location = await prisma.location.create({
    data: { name, description, parentId: parentId || null },
    include: { parent: true },
  })

  return NextResponse.json(location, { status: 201 })
}
