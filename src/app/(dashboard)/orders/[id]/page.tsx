'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, CheckCircle, Package, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  placed: 'bg-blue-100 text-blue-700',
  received: 'bg-amber-100 text-amber-700',
  complete: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface PurchaseOrder {
  id: string
  reference?: string
  status: string
  notes?: string
  createdAt: string
  supplier: { id: string; name: string }
  lineItems: {
    id: string
    quantity: number
    unitPrice?: number
    received: number
    part: { id: string; name: string; unit: string }
  }[]
}

interface Location { id: string; name: string }

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveLocationId, setReceiveLocationId] = useState('none')
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({})

  const { data: order, isLoading } = useQuery<PurchaseOrder>({
    queryKey: ['order', id],
    queryFn: () => fetch(`/api/orders/${id}`).then((r) => r.json()),
  })

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => fetch('/api/locations').then((r) => r.json()),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order status updated')
    },
  })

  const openReceive = () => {
    if (!order) return
    const qtys: Record<string, string> = {}
    order.lineItems.forEach((li) => {
      qtys[li.id] = String(Math.max(0, li.quantity - li.received))
    })
    setReceiveQtys(qtys)
    setReceiveLocationId('none')
    setReceiveOpen(true)
  }

  const receiveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: receiveLocationId === 'none' ? null : receiveLocationId,
          lineItems: Object.entries(receiveQtys)
            .filter(([, qty]) => parseFloat(qty) > 0)
            .map(([lineItemId, qty]) => ({ lineItemId, quantity: parseFloat(qty) })),
        }),
      }).then(async (r) => {
        if (!r.ok) throw new Error()
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setReceiveOpen(false)
      toast.success('Stock received successfully')
    },
    onError: () => toast.error('Failed to receive stock'),
  })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (!order || 'error' in (order as object)) return (
    <div className="p-6"><p className="text-slate-500">Order not found.</p></div>
  )

  const totalValue = order.lineItems.reduce((s, li) => s + li.quantity * (li.unitPrice ?? 0), 0)
  const canPlace = order.status === 'draft'
  const canReceive = order.status === 'placed' || order.status === 'received'
  const canComplete = order.status === 'received'

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <Link href="/orders">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Purchase Orders
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {order.reference ?? `PO-${order.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <span className="text-sm text-slate-500">
                <Link href={`/suppliers/${order.supplier.id}`} className="hover:text-indigo-600">{order.supplier.name}</Link>
              </span>
              <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canPlace && (
            <Button size="sm" onClick={() => statusMutation.mutate('placed')} disabled={statusMutation.isPending}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <Truck className="w-4 h-4" /> Place Order
            </Button>
          )}
          {canReceive && (
            <Button size="sm" onClick={openReceive} className="gap-1.5 bg-amber-600 hover:bg-amber-700">
              <Package className="w-4 h-4" /> Receive Stock
            </Button>
          )}
          {canComplete && (
            <Button size="sm" onClick={() => statusMutation.mutate('complete')} disabled={statusMutation.isPending}
              className="gap-1.5 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4" /> Mark Complete
            </Button>
          )}
          {order.status !== 'cancelled' && order.status !== 'complete' && (
            <Button size="sm" variant="outline" onClick={() => statusMutation.mutate('cancelled')} disabled={statusMutation.isPending}
              className="text-red-600 hover:bg-red-50">
              Cancel
            </Button>
          )}
        </div>
      </div>

      {order.notes && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-600">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-700 text-sm">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Part</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ordered</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Received</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {order.lineItems.map((li) => (
              <tr key={li.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/parts/${li.part.id}`} className="font-medium text-slate-800 hover:text-indigo-600">{li.part.name}</Link>
                </td>
                <td className="px-5 py-3 text-slate-600">{li.quantity} {li.part.unit}</td>
                <td className="px-5 py-3">
                  <span className={li.received >= li.quantity ? 'text-green-600 font-medium' : li.received > 0 ? 'text-amber-600' : 'text-slate-400'}>
                    {li.received} {li.part.unit}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-500">{li.unitPrice != null ? `$${li.unitPrice.toFixed(2)}` : '—'}</td>
                <td className="px-5 py-3 font-medium">{li.unitPrice != null ? `$${(li.quantity * li.unitPrice).toFixed(2)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalValue > 0 && (
          <>
            <Separator />
            <div className="flex justify-end px-5 py-3">
              <div className="text-sm">
                <span className="text-slate-500">Total: </span>
                <span className="font-bold text-slate-900">${totalValue.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Receive Modal */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Destination Location</Label>
              <Select value={receiveLocationId} onValueChange={(v) => setReceiveLocationId(v ?? 'none')}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantities to Receive</Label>
              {order.lineItems.map((li) => (
                <div key={li.id} className="flex items-center gap-3">
                  <div className="flex-1 text-sm text-slate-700">{li.part.name}</div>
                  <div className="text-xs text-slate-400 w-24 text-right">
                    {li.received}/{li.quantity} {li.part.unit}
                  </div>
                  <Input
                    type="number" min="0" step="0.01"
                    className="w-24"
                    value={receiveQtys[li.id] ?? ''}
                    onChange={(e) => setReceiveQtys({ ...receiveQtys, [li.id]: e.target.value })}
                    max={li.quantity - li.received}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => receiveMutation.mutate()} disabled={receiveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {receiveMutation.isPending ? 'Receiving...' : 'Receive Stock'}
              </Button>
              <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
