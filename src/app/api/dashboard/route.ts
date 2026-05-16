import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [totalParts, stockItems, pendingOrders, recentActivity, allParts] = await Promise.all([
    prisma.part.count(),
    prisma.stockItem.findMany({
      include: {
        part: {
          include: { supplierParts: true },
        },
      },
    }),
    prisma.purchaseOrder.count({ where: { status: { in: ['draft', 'placed'] } } }),
    prisma.stockHistory.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        part: true,
        user: true,
        stockItem: { include: { location: true } },
      },
    }),
    prisma.part.findMany({
      include: {
        stockItems: true,
        supplierParts: true,
      },
    }),
  ])

  // Calculate total stock value
  let totalStockValue = 0
  for (const item of stockItems) {
    const price = item.part.supplierParts[0]?.price ?? 0
    totalStockValue += item.quantity * price
  }

  // Low stock alerts
  const stockByPart: Record<string, number> = {}
  for (const item of stockItems) {
    stockByPart[item.partId] = (stockByPart[item.partId] || 0) + item.quantity
  }

  const lowStockAlerts = allParts
    .filter((p) => {
      const total = stockByPart[p.id] || 0
      return total <= p.minStock
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      minStock: p.minStock,
      currentStock: stockByPart[p.id] || 0,
      unit: p.unit,
    }))

  // Chart data: top 10 parts by stock quantity
  const chartData = allParts
    .map((p) => ({
      name: p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name,
      quantity: stockByPart[p.id] || 0,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  return NextResponse.json({
    kpis: {
      totalParts,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      lowStockCount: lowStockAlerts.length,
      pendingOrders,
    },
    chartData,
    recentActivity: recentActivity.map((h) => ({
      id: h.id,
      type: h.type,
      partName: h.part.name,
      quantity: h.quantity,
      location: h.stockItem?.location?.name,
      user: h.user?.name,
      notes: h.notes,
      createdAt: h.createdAt,
    })),
    lowStockAlerts,
  })
}
