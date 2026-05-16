import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stockItems = await prisma.stockItem.findMany({
    include: {
      part: { include: { category: true } },
      location: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(stockItems)
}
