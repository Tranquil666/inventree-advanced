'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface BuildOrder {
  id: string
  reference?: string
  status: string
  quantity: number
  createdAt: string
  part: { name: string; unit: string }
}

interface Part { id: string; name: string; unit: string }

export default function BuildsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ partId: 'none', quantity: '1', reference: '', notes: '' })

  const { data: builds = [], isLoading } = useQuery<BuildOrder[]>({
    queryKey: ['builds'],
    queryFn: () => fetch('/api/builds').then((r) => r.json()),
  })

  const { data: parts = [] } = useQuery<Part[]>({
    queryKey: ['parts'],
    queryFn: () => fetch('/api/parts').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: form.partId,
          quantity: parseFloat(form.quantity),
          reference: form.reference || null,
          notes: form.notes || null,
        }),
      }).then(async (r) => {
        if (!r.ok) throw new Error()
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builds'] })
      setOpen(false)
      toast.success('Build order created')
    },
    onError: () => toast.error('Failed to create build order'),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Build Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{builds.length} builds</p>
        </div>
        <Button onClick={() => { setForm({ partId: 'none', quantity: '1', reference: '', notes: '' }); setOpen(true) }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New Build
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Part</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Target Qty</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((__, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              : builds.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/builds/${b.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                        {b.reference ?? `BUILD-${b.id.slice(0, 8).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{b.part.name}</td>
                    <td className="px-5 py-3 text-slate-600">{b.quantity} {b.part.unit}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {b.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && builds.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No build orders yet</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Build Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Part to Build *</Label>
              <Select value={form.partId} onValueChange={(v) => setForm({ ...form, partId: v ?? 'none' })}>
                <SelectTrigger><SelectValue placeholder="Select part" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select part</SelectItem>
                  {parts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="number" min="1" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="BUILD-2024-001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || form.partId === 'none' || !form.quantity}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Build'}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
