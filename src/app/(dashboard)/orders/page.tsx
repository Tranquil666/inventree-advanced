'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, ShoppingCart, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { toast } from 'sonner'
import { exportToCSV } from '@/lib/csv'

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

interface OrdersResponse {
  data: Order[]
  total: number
  page: number
  limit: number
}

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const limit = 50

  const { data: ordersResponse, isLoading } = useQuery<OrdersResponse>({
    queryKey: ['orders', page],
    queryFn: () => fetch(`/api/orders?page=${page}&limit=${limit}`).then((r) => r.json()),
  })

  const orders = ordersResponse?.data ?? []
  const total = ordersResponse?.total ?? 0

  const handleExport = () => {
    if (orders.length === 0) {
      toast.error('No orders to export')
      return
    }
    const date = new Date().toISOString().slice(0, 10)
    exportToCSV(
      orders.map((o) => ({
        Reference: o.reference ?? `PO-${o.id.slice(0, 8).toUpperCase()}`,
        Supplier: o.supplier.name,
        Status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
        'Items Count': o.lineItems.length,
        'Total Value': o.totalValue > 0 ? o.totalValue.toFixed(2) : '0.00',
        Date: new Date(o.createdAt).toLocaleDateString(),
      })),
      `orders-export-${date}.csv`
    )
    toast.success('Orders exported')
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Purchase Orders</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{total} orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Link href="/orders/new">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> New Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Reference</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Supplier</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Items</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Value</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((__, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              : orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-5 py-3">
                      <Link href={`/orders/${o.id}`} className="font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400">
                        {o.reference ?? `PO-${o.id.slice(0, 8).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{o.supplier.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{o.lineItems.length}</td>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{o.totalValue > 0 ? `$${o.totalValue.toFixed(2)}` : '—'}</td>
                    <td className="px-5 py-3 text-slate-400 dark:text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && orders.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No purchase orders yet</p>
          </div>
        )}
        <div className="border-t border-slate-100 dark:border-slate-700">
          <PaginationControls
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  )
}
