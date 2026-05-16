'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface Location {
  id: string
  name: string
  description?: string
  parentId?: string
  parent?: { name: string }
  children: Location[]
  _count?: { stockItems: number }
}

export default function LocationsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Location | null>(null)
  const [form, setForm] = useState({ name: '', description: '', parentId: 'none' })

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => fetch('/api/locations').then((r) => r.json()),
  })

  const roots = locations.filter((l) => !l.parentId)

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', description: '', parentId: 'none' })
    setOpen(true)
  }

  const openEdit = (loc: Location) => {
    setEditTarget(loc)
    setForm({ name: loc.name, description: loc.description ?? '', parentId: loc.parentId ?? 'none' })
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const body = { ...data, parentId: data.parentId === 'none' ? null : data.parentId }
      if (editTarget) {
        return fetch(`/api/locations/${editTarget.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      }
      return fetch('/api/locations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      setOpen(false)
      toast.success(editTarget ? 'Location updated' : 'Location created')
    },
    onError: () => toast.error('Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/locations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location deleted')
    },
    onError: () => toast.error('Cannot delete — location may have stock'),
  })

  const renderLocation = (loc: Location, depth = 0) => (
    <div key={loc.id}>
      <div
        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 group border-b border-slate-50 last:border-0"
        style={{ paddingLeft: `${20 + depth * 24}px` }}
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">{loc.name}</p>
          {loc.description && <p className="text-xs text-slate-400">{loc.description}</p>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(loc)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => { if (!confirm(`Delete "${loc.name}"?`)) return; deleteMutation.mutate(loc.id) }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {loc.children?.map((child) => renderLocation(child, depth + 1))}
    </div>
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Locations</h1>
          <p className="text-slate-500 text-sm mt-1">{locations.length} locations</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add Location
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : roots.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No locations yet</p>
          </div>
        ) : (
          <div>{roots.map((l) => renderLocation(l))}</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Location' : 'New Location'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shelf A-1" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Parent Location</Label>
              <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v ?? "none" })}>
                <SelectTrigger><SelectValue placeholder="No parent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {locations.filter((l) => l.id !== editTarget?.id).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.name.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
