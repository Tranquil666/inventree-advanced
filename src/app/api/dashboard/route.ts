import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const PIE_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#84cc16','#f97316','#14b8a6']

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [totalParts, stockItems, pendingOrders, recentActivity, allParts, stockTrendRaw, categories] = await Promise.all([
    prisma.part.count(),
    prisma.stockItem.findMany({
      include: { part: { include: { supplierParts: true } } },
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
      include: { stockItems: true, supplierParts: true, category: true },
    }),
    prisma.stockHistory.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.category.findMany({ include: { parts: true } }),
  ])

  // Total stock value
  let totalStockValue = 0
  const stockByPart: Record<string, number> = {}
  for (const item of stockItems) {
    stockByPart[item.partId] = (stockByPart[item.partId] || 0) + item.quantity
    const price = item.part.supplierParts[0]?.price ?? 0
    totalStockValue += item.quantity * price
  }

  // Low stock alerts
  const lowStockAlerts = allParts
    .filter((p) => (stockByPart[p.id] || 0) <= p.minStock)
    .map((p) => ({
      id: p.id,
      name: p.name,
      minStock: p.minStock,
      currentStock: stockByPart[p.id] || 0,
      unit: p.unit,
    }))

  // Bar chart: top 10 parts by stock
  const chartData = allParts
    .map((p) => ({
      name: p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name,
      quantity: stockByPart[p.id] || 0,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  // Pie chart: stock count by category
  const categoryBreakdown = categories
    .map((cat, i) => {
      const total = cat.parts.reduce((sum, p) => sum + (stockByPart[p.id] || 0), 0)
      return { name: cat.name, value: total, color: PIE_COLORS[i % PIE_COLORS.length] }
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Stock trend: last 7 days additions vs removals
  const trendMap: Record<string, { additions: number; removals: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    trendMap[key] = { additions: 0, removals: 0 }
  }
  for (const h of stockTrendRaw) {
    const key = h.createdAt.toISOString().slice(0, 10)
    if (!trendMap[key]) continue
    if (h.type === 'ADD') trendMap[key].additions += h.quantity
    if (h.type === 'REMOVE' || h.type === 'BUILD_USE') trendMap[key].removals += h.quantity
  }
  const stockTrend = Object.entries(trendMap).map(([date, v]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    additions: Math.round(v.additions),
    removals: Math.round(v.removals),
  }))

  return NextResponse.json({
    kpis: {
      totalParts,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      lowStockCount: lowStockAlerts.length,
      pendingOrders,
    },
    chartData,
    categoryBreakdown,
    stockTrend,
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
