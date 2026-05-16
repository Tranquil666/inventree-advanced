'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
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
  status: string
  reason?: string
  createdAt: string
  supplier: { name: string }
  lineItems: { id: string }[]
}

interface ReturnsResponse {
  data: ReturnOrder[]
  total: number
  page: number
  limit: number
}

interface Supplier { id: string; name: string }
interface Part { id: string; name: string; unit: string }

interface SuppliersResponse { data: Supplier[]; total: number; page: number; limit: number }
interface PartsResponse { data: Part[]; total: number; page: number; limit: number }

const emptyLineItem = { partId: 'none', quantity: '1', unitPrice: '', reason: '' }

export default function ReturnsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 50
  const [form, setForm] = useState({
    supplierId: 'none',
    reference: '',
    reason: '',
    notes: '',
    lineItems: [{ ...emptyLineItem }],
  })

  const { data: returnsResponse, isLoading } = useQuery<ReturnsResponse>({
    queryKey: ['returns', page],
    queryFn: () => fetch(`/api/returns?page=${page}&limit=${limit}`).then((r) => r.json()),
  })

  const { data: suppliersResponse } = useQuery<SuppliersResponse>({
    queryKey: ['suppliers'],
    queryFn: () => fetch('/api/suppliers?limit=200').then((r) => r.json()),
  })

  const { data: partsResponse } = useQuery<PartsResponse>({
    queryKey: ['parts'],
    queryFn: () => fetch('/api/parts?limit=200').then((r) => r.json()),
  })

  const returns = returnsResponse?.data ?? []
  const total = returnsResponse?.total ?? 0
  const suppliers = suppliersResponse?.data ?? []
  const parts = partsResponse?.data ?? []

  const createMutation = useMutation({
    mutationFn: () =>
      fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: form.supplierId,
          reference: form.reference || null,
          reason: form.reason || null,
          notes: form.notes || null,
          lineItems: form.lineItems
            .filter((li) => li.partId !== 'none' && li.quantity)
            .map((li) => ({
              partId: li.partId,
              quantity: parseFloat(li.quantity),
              unitPrice: li.unitPrice ? parseFloat(li.unitPrice) : null,
              reason: li.reason || null,
            })),
        }),
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed') }
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns'] })
      setOpen(false)
      toast.success('Return order created')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const addLineItem = () => setForm({ ...form, lineItems: [...form.lineItems, { ...emptyLineItem }] })
  const removeLineItem = (i: number) => setForm({ ...form, lineItems: form.lineItems.filter((_, idx) => idx !== i) })
  const updateLineItem = (i: number, field: string, value: string) => {
    const updated = form.lineItems.map((li, idx) => idx === i ? { ...li, [field]: value } : li)
    setForm({ ...form, lineItems: updated })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Return Orders (RMA)</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{total} return orders</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New Return
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Reference</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Supplier</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Items</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((__, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              : returns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-5 py-3">
                      <Link href={`/returns/${r.id}`} className="font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400">
                        {r.reference ?? `RMA-${r.id.slice(0, 8).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{r.supplier.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{r.lineItems.length}</td>
                    <td className="px-5 py-3 text-slate-400 dark:text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && returns.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No return orders yet</p>
          </div>
        )}
        <div className="border-t border-slate-100 dark:border-slate-700">
          <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Return Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Supplier *</Label>
                <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v ?? 'none' })}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Select supplier</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="RMA-2024-001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Defective parts, wrong items, etc." />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLineItem}>+ Add Item</Button>
              </div>
              {form.lineItems.map((li, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 p-3 border border-slate-200 rounded-lg">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Part</Label>
                    <Select value={li.partId} onValueChange={(v) => updateLineItem(i, 'partId', v ?? 'none')}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select part" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>Select part</SelectItem>
                        {parts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input className="h-8 text-xs" type="number" min="0.01" step="0.01" value={li.quantity} onChange={(e) => updateLineItem(i, 'quantity', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input className="h-8 text-xs" type="number" min="0" step="0.01" value={li.unitPrice} onChange={(e) => updateLineItem(i, 'unitPrice', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Item Reason</Label>
                    <Input className="h-8 text-xs" value={li.reason} onChange={(e) => updateLineItem(i, 'reason', e.target.value)} placeholder="e.g. Damaged on arrival" />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => removeLineItem(i)}>×</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || form.supplierId === 'none'}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Return'}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
