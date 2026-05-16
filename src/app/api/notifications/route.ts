import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parts = await prisma.part.findMany({
    include: {
      stockItems: true,
      category: true,
    },
  })

  const lowStock = parts
    .map((p) => ({
      id: p.id,
      name: p.name,
      totalStock: p.stockItems.reduce((sum, s) => sum + s.quantity, 0),
      minStock: p.minStock,
      category: p.category ? { name: p.category.name } : undefined,
    }))
    .filter((p) => p.totalStock <= p.minStock)
    .sort((a, b) => a.totalStock - b.totalStock)

  return NextResponse.json({ lowStock, count: lowStock.length })
}
