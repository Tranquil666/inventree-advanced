'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Search, ArrowUpDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { toast } from 'sonner'
import { exportToCSV } from '@/lib/csv'

interface StockItem {
  id: string
  quantity: number
  serialNumber?: string
  batchCode?: string
  updatedAt: string
  part: { id: string; name: string; unit: string; minStock: number; category?: { name: string } }
  location?: { id: string; name: string }
}

interface StockResponse {
  data: StockItem[]
  total: number
  page: number
  limit: number
}

interface Location {
  id: string
  name: string
}

export default function StockPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [page, setPage] = useState(1)
  const limit = 50
  const [adjustForm, setAdjustForm] = useState({
    type: 'ADD',
    quantity: '',
    notes: '',
    locationId: 'none',
    toLocationId: 'none',
  })

  const { data: stockResponse, isLoading } = useQuery<StockResponse>({
    queryKey: ['stock', page],
    queryFn: () => fetch(`/api/stock?page=${page}&limit=${limit}`).then((r) => r.json()),
  })

  const stockItems = stockResponse?.data ?? []
  const total = stockResponse?.total ?? 0

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => fetch('/api/locations').then((r) => r.json()),
  })

  const filtered = stockItems.filter(
    (s) =>
      s.part.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.batchCode?.toLowerCase().includes(search.toLowerCase())
  )

  const openAdjust = (item: StockItem) => {
    setSelectedItem(item)
    setAdjustForm({
      type: 'ADD',
      quantity: '',
      notes: '',
      locationId: item.location?.id ?? 'none',
      toLocationId: 'none',
    })
    setAdjustOpen(true)
  }

  const adjustMutation = useMutation({
    mutationFn: (data: typeof adjustForm) =>
      fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          partId: selectedItem!.part.id,
          stockItemId: selectedItem!.id,
          quantity: parseFloat(data.quantity),
          notes: data.notes || null,
          locationId: data.locationId === 'none' ? null : data.locationId,
          toLocationId: data.toLocationId === 'none' ? null : data.toLocationId,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || 'Failed')
        }
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setAdjustOpen(false)
      toast.success('Stock adjusted successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleExport = () => {
    if (stockItems.length === 0) {
      toast.error('No stock entries to export')
      return
    }
    const date = new Date().toISOString().slice(0, 10)
    exportToCSV(
      stockItems.map((s) => ({
        'Part Name': s.part.name,
        Category: s.part.category?.name ?? '',
        Location: s.location?.name ?? 'Unassigned',
        Quantity: s.quantity,
        'Batch Code': s.batchCode ?? '',
        'Serial Number': s.serialNumber ?? '',
      })),
      `stock-export-${date}.csv`
    )
    toast.success('Stock exported')
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stock</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{total} stock entries</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search by part, location, batch..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Part</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Category</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Location</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Quantity</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Batch</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {isLoading
              ? [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((__, j) => (
                      <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              : filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{item.part.name}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{item.part.category?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{item.location?.name ?? 'Unassigned'}</td>
                    <td className="px-5 py-3">
                      <span className={`font-medium ${item.quantity <= item.part.minStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {item.quantity} {item.part.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 dark:text-slate-500">{item.batchCode ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm" variant="ghost"
                        className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                        onClick={() => openAdjust(item)}
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" /> Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No stock entries found</p>
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

      {/* Adjust Modal */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock — {selectedItem?.part.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Current stock: </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedItem?.quantity} {selectedItem?.part.unit}</span>
              <span className="text-slate-400 dark:text-slate-500 ml-2">@ {selectedItem?.location?.name ?? 'Unassigned'}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Adjustment Type</Label>
              <Select value={adjustForm.type} onValueChange={(v) => setAdjustForm({ ...adjustForm, type: v ?? 'ADD' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">Add Stock</SelectItem>
                  <SelectItem value="REMOVE">Remove Stock</SelectItem>
                  <SelectItem value="ADJUST">Set Absolute Quantity</SelectItem>
                  <SelectItem value="TRANSFER">Transfer to Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{adjustForm.type === 'ADJUST' ? 'New Quantity' : 'Quantity'}</Label>
              <Input
                type="number" min="0" step="0.01"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                placeholder="0"
              />
            </div>

            {adjustForm.type === 'TRANSFER' && (
              <div className="space-y-1.5">
                <Label>Transfer To</Label>
                <Select value={adjustForm.toLocationId} onValueChange={(v) => setAdjustForm({ ...adjustForm, toLocationId: v ?? 'none' })}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {locations.filter((l) => l.id !== selectedItem?.location?.id).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => adjustMutation.mutate(adjustForm)}
                disabled={adjustMutation.isPending || !adjustForm.quantity}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {adjustMutation.isPending ? 'Saving...' : 'Apply'}
              </Button>
              <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
