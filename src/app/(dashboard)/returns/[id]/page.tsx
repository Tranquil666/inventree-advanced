'use client'

import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, Send, PackageCheck, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  shipped: 'bg-blue-100 text-blue-700',
  received: 'bg-amber-100 text-amber-700',
  refunded: 'bg-green-100 text-green-700',
}

interface ReturnOrder {
  id: string
  reference?: string
  reason?: string
  status: string
  notes?: string
  createdAt: string
  supplier: { id: string; name: string }
  lineItems: {
    id: string
    quantity: number
    unitPrice?: number
    reason?: string
    part: { id: string; name: string; unit: string }
  }[]
}

export default function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery<ReturnOrder>({
    queryKey: ['return', id],
    queryFn: () => fetch(`/api/returns/${id}`).then((r) => r.json()),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      fetch(`/api/returns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed') }
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['return', id] })
      qc.invalidateQueries({ queryKey: ['returns'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      toast.success('Return order updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (!order || 'error' in (order as object)) return (
    <div className="p-6"><p className="text-slate-500">Return order not found.</p></div>
  )

  const totalValue = order.lineItems.reduce((s, li) => s + li.quantity * (li.unitPrice ?? 0), 0)

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <Link href="/returns">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Return Orders
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
            <RotateCcw className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {order.reference ?? `RMA-${order.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <Link href={`/suppliers/${order.supplier.id}`} className="text-sm text-slate-500 hover:text-indigo-600">
                {order.supplier.name}
              </Link>
              <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {order.status === 'pending' && (
            <Button size="sm" onClick={() => statusMutation.mutate('shipped')} disabled={statusMutation.isPending}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" /> Mark Shipped
            </Button>
          )}
          {order.status === 'shipped' && (
            <Button size="sm" onClick={() => {
              if (!confirm('Mark as received? This will deduct stock for the returned items.')) return
              statusMutation.mutate('received')
            }} disabled={statusMutation.isPending}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700">
              <PackageCheck className="w-4 h-4" /> Mark Received
            </Button>
          )}
          {order.status === 'received' && (
            <Button size="sm" onClick={() => statusMutation.mutate('refunded')} disabled={statusMutation.isPending}
              className="gap-1.5 bg-green-600 hover:bg-green-700">
              <DollarSign className="w-4 h-4" /> Mark Refunded
            </Button>
          )}
        </div>
      </div>

      {(order.reason || order.notes) && (
        <div className="grid grid-cols-2 gap-4">
          {order.reason && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Reason</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{order.reason}</p>
              </CardContent>
            </Card>
          )}
          {order.notes && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Line Items */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Return Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Part</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Line Total</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {order.lineItems.map((li) => (
              <tr key={li.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-5 py-3">
                  <Link href={`/parts/${li.part.id}`} className="font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600">
                    {li.part.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{li.quantity} {li.part.unit}</td>
                <td className="px-5 py-3 text-slate-500">{li.unitPrice != null ? `$${li.unitPrice.toFixed(2)}` : '—'}</td>
                <td className="px-5 py-3 font-medium">{li.unitPrice != null ? `$${(li.quantity * li.unitPrice).toFixed(2)}` : '—'}</td>
                <td className="px-5 py-3 text-slate-400 text-xs">{li.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalValue > 0 && (
          <>
            <Separator />
            <div className="flex justify-end px-5 py-3">
              <div className="text-sm">
                <span className="text-slate-500">Total Refund Value: </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">${totalValue.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
