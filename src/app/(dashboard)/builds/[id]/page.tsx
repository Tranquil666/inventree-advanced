'use client'

import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Wrench, Play, CheckCircle, AlertTriangle, Package, TrendingDown, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface BomComponent {
  id: string
  name: string
  unit: string
  stockItems: { quantity: number; location?: { name: string } }[]
  supplierParts: { price?: number; supplier: { name: string } }[]
}

interface BuildOrder {
  id: string
  reference?: string
  status: string
  quantity: number
  notes?: string
  createdAt: string
  part: {
    id: string
    name: string
    unit: string
    bomItems: {
      id: string
      quantity: number
      component: BomComponent
    }[]
  }
  allocations: {
    id: string
    quantity: number
    stockItem: {
      id: string
      quantity: number
      part: { name: string; unit: string }
      location?: { name: string }
    }
  }[]
}

export default function BuildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()

  const { data: build, isLoading } = useQuery<BuildOrder>({
    queryKey: ['build', id],
    queryFn: () => fetch(`/api/builds/${id}`).then((r) => r.json()),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      fetch(`/api/builds/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['build', id] })
      qc.invalidateQueries({ queryKey: ['builds'] })
      toast.success('Build status updated')
    },
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/builds/${id}/complete`, { method: 'POST' }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || 'Failed')
        }
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['build', id] })
      qc.invalidateQueries({ queryKey: ['builds'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Build completed! Output stock created.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (!build || 'error' in (build as object)) return (
    <div className="p-6"><p className="text-slate-500">Build not found.</p></div>
  )

  const bomItems = build.part.bomItems ?? []
  const canStart = build.status === 'pending'
  const canComplete = build.status === 'in_progress'

  // Forecast calculations
  const forecastItems = bomItems.map((bom) => {
    const required = bom.quantity * build.quantity
    const available = bom.component.stockItems.reduce((s, si) => s + si.quantity, 0)
    const shortfall = Math.max(0, required - available)
    const firstPrice = bom.component.supplierParts?.[0]?.price ?? null
    const estimatedCost = shortfall > 0 && firstPrice != null ? shortfall * firstPrice : null
    const hasSupplier = (bom.component.supplierParts?.length ?? 0) > 0
    return { bom, required, available, shortfall, estimatedCost, hasSupplier }
  })

  const totalComponents = forecastItems.length
  const fullyStocked = forecastItems.filter((f) => f.shortfall === 0).length
  const withShortfall = forecastItems.filter((f) => f.shortfall > 0).length
  const totalProcurementCost = forecastItems.reduce((sum, f) => sum + (f.estimatedCost ?? 0), 0)

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <Link href="/builds">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Build Orders
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {build.reference ?? `BUILD-${build.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[build.status]}`}>
                {build.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <Link href={`/parts/${build.part.id}`} className="text-sm text-slate-500 hover:text-indigo-600">
                {build.part.name}
              </Link>
              <span className="text-xs text-slate-400">
                Target: {build.quantity} {build.part.unit}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canStart && (
            <Button size="sm" onClick={() => statusMutation.mutate('in_progress')} disabled={statusMutation.isPending}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <Play className="w-4 h-4" /> Start Build
            </Button>
          )}
          {canComplete && (
            <Button size="sm" onClick={() => {
              if (!confirm('Complete this build? This will consume allocated stock and create output stock.')) return
              completeMutation.mutate()
            }} disabled={completeMutation.isPending}
              className="gap-1.5 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4" />
              {completeMutation.isPending ? 'Completing...' : 'Complete Build'}
            </Button>
          )}
          {build.status !== 'cancelled' && build.status !== 'complete' && (
            <Button size="sm" variant="outline" onClick={() => statusMutation.mutate('cancelled')}
              className="text-red-600 hover:bg-red-50">
              Cancel
            </Button>
          )}
        </div>
      </div>

      {build.notes && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-600">{build.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Forecast Summary */}
      {bomItems.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-500 font-medium">Total Components</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalComponents}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-xs text-green-700 font-medium">Fully Stocked</p>
              </div>
              <p className="text-2xl font-bold text-green-800">{fullyStocked}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <p className="text-xs text-red-700 font-medium">With Shortfall</p>
              </div>
              <p className="text-2xl font-bold text-red-800">{withShortfall}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-amber-700 font-medium">Est. Procurement</p>
              </div>
              <p className="text-xl font-bold text-amber-800">
                {totalProcurementCost > 0 ? `$${totalProcurementCost.toFixed(2)}` : '—'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BOM Requirements */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-700 text-sm">Bill of Materials Requirements</h2>
          <p className="text-xs text-slate-400 mt-0.5">Required components for {build.quantity} {build.part.unit} of {build.part.name}</p>
        </div>
        {bomItems.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No BOM defined for this part</p>
            <p className="text-xs mt-1">Add components in the part&apos;s BOM tab</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Component</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Required</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Available</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Shortfall</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Cost</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Stock Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {forecastItems.map(({ bom, required, available, shortfall, estimatedCost, hasSupplier }) => {
                const pct = Math.min(100, required > 0 ? (available / required) * 100 : 100)
                const hasEnough = available >= required
                return (
                  <tr key={bom.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/parts/${bom.component.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                          {bom.component.name}
                        </Link>
                        {hasSupplier && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Source</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{required} {bom.component.unit}</td>
                    <td className="px-5 py-3">
                      <span className={hasEnough ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {available} {bom.component.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {shortfall > 0 ? (
                        <span className="text-red-600 font-semibold">−{shortfall} {bom.component.unit}</span>
                      ) : (
                        <span className="text-green-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {estimatedCost != null ? (
                        <span className="text-amber-700 font-medium">${estimatedCost.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className={`h-1.5 flex-1 ${!hasEnough ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`} />
                        <span className="text-xs text-slate-400 w-8">{Math.round(pct)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Allocations */}
      {build.allocations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-700 text-sm">Stock Allocations</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Part</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Allocated</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {build.allocations.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{a.stockItem.part.name}</td>
                  <td className="px-5 py-3 text-slate-500">{a.stockItem.location?.name ?? 'Unassigned'}</td>
                  <td className="px-5 py-3 text-slate-600">{a.quantity} {a.stockItem.part.unit}</td>
                  <td className="px-5 py-3">
                    <span className={a.stockItem.quantity >= a.quantity ? 'text-green-600' : 'text-red-600'}>
                      {a.stockItem.quantity} {a.stockItem.part.unit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
