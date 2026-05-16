'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag, ChevronRight, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  parent?: { name: string }
  children: Category[]
  _count: { parts: number }
}

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '', parentId: 'none' })

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then((r) => r.json()),
  })

  const roots = categories.filter((c) => !c.parentId)

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', description: '', parentId: 'none' })
    setOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditTarget(c)
    setForm({ name: c.name, description: c.description ?? '', parentId: c.parentId ?? 'none' })
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const body = { ...data, parentId: data.parentId === 'none' ? null : data.parentId }
      if (editTarget) {
        return fetch(`/api/categories/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      return fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setOpen(false)
      toast.success(editTarget ? 'Category updated' : 'Category created')
    },
    onError: () => toast.error('Failed to save category'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted')
    },
    onError: () => toast.error('Cannot delete — category may have parts'),
  })

  const renderCategory = (cat: Category, depth = 0) => (
    <div key={cat.id}>
      <div
        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 group"
        style={{ paddingLeft: `${20 + depth * 24}px` }}
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Tag className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{cat.name}</p>
          {cat.description && <p className="text-xs text-slate-400 truncate">{cat.description}</p>}
        </div>
        <span className="text-xs text-slate-400">{cat._count.parts} part{cat._count.parts !== 1 ? 's' : ''}</span>
        {cat.parent && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            <ChevronRight className="w-3 h-3" /> {cat.parent.name}
          </span>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(cat)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              if (!confirm(`Delete "${cat.name}"?`)) return
              deleteMutation.mutate(cat.id)
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {cat.children.map((child) => renderCategory(child, depth + 1))}
    </div>
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500 text-sm mt-1">{categories.length} categories</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <div className="grid grid-cols-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span className="col-span-2">Name</span>
            <span>Parts</span>
            <span>Parent</span>
          </div>
        </div>
        {isLoading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-3 border-b border-slate-50">
                <Skeleton className="h-5 w-full" />
              </div>
            ))
          : roots.length === 0
          ? (
            <div className="text-center py-16 text-slate-400">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No categories yet</p>
            </div>
          )
          : (
            <div className="divide-y divide-slate-50">
              {roots.map((c) => renderCategory(c))}
            </div>
          )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electronics" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Parent Category</Label>
              <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v ?? "none" })}>
                <SelectTrigger><SelectValue placeholder="No parent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {categories
                    .filter((c) => c.id !== editTarget?.id)
                    .map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
