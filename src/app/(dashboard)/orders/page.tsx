'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  placed: 'bg-blue-100 text-blue-700',
  received: 'bg-amber-100 text-amber-700',
  complete: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface Order {
  id: string
  reference?: string
  status: string
  totalValue: number
  createdAt: string
  supplier: { name: string }
  lineItems: { id: string; quantity: number; unitPrice?: number }[]
}

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => fetch('/api/orders').then((r) => r.json()),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{orders.length} orders</p>
        </div>
        <Link href="/orders/new">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> New Order
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Supplier</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Value</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((__, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              : orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/orders/${o.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                        {o.reference ?? `PO-${o.id.slice(0, 8).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{o.supplier.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{o.lineItems.length}</td>
                    <td className="px-5 py-3 font-medium">{o.totalValue > 0 ? `$${o.totalValue.toFixed(2)}` : '—'}</td>
                    <td className="px-5 py-3 text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && orders.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No purchase orders yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
