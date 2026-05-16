'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Truck, Mail, Phone, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  placed: 'bg-blue-100 text-blue-700',
  received: 'bg-amber-100 text-amber-700',
  complete: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
  address?: string
  notes?: string
  supplierParts: {
    id: string
    sku?: string
    price?: number
    leadDays?: number
    part: { id: string; name: string; unit: string; category?: { name: string } }
  }[]
  purchaseOrders: {
    id: string
    reference?: string
    status: string
    createdAt: string
  }[]
}

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: supplier, isLoading } = useQuery<Supplier>({
    queryKey: ['supplier', id],
    queryFn: () => fetch(`/api/suppliers/${id}`).then((r) => r.json()),
  })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
    </div>
  )

  if (!supplier || 'error' in (supplier as object)) return (
    <div className="p-6"><p className="text-slate-500">Supplier not found.</p></div>
  )

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <Link href="/suppliers">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Suppliers
        </Button>
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
          <Truck className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{supplier.name}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            {supplier.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{supplier.email}</span>}
            {supplier.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{supplier.phone}</span>}
            {supplier.website && (
              <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-indigo-600">
                <Globe className="w-3.5 h-3.5" />{supplier.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      </div>

      {(supplier.address || supplier.notes) && (
        <div className="grid grid-cols-2 gap-4">
          {supplier.address && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Address</p>
                <p className="text-sm text-slate-600 whitespace-pre-line">{supplier.address}</p>
              </CardContent>
            </Card>
          )}
          {supplier.notes && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-slate-600">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="parts">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="parts">Parts ({supplier.supplierParts.length})</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders ({supplier.purchaseOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="parts" className="mt-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Part</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {supplier.supplierParts.map((sp) => (
                  <tr key={sp.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/parts/${sp.part.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                        {sp.part.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{sp.part.category?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{sp.sku ?? '—'}</td>
                    <td className="px-5 py-3">{sp.price != null ? `$${sp.price.toFixed(2)}` : '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{sp.leadDays != null ? `${sp.leadDays} days` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {supplier.supplierParts.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">No parts linked to this supplier</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {supplier.purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/orders/${po.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                        {po.reference ?? `PO-${po.id.slice(0, 8).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[po.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{new Date(po.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {supplier.purchaseOrders.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">No purchase orders</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
