'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Search, Package, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
}

interface Part {
  id: string
  name: string
  description?: string
  unit: string
  minStock: number
  totalStock: number
  category?: Category
}

function stockStatus(total: number, min: number) {
  if (total === 0) return { label: 'Out of Stock', class: 'bg-red-100 text-red-700' }
  if (total <= min) return { label: 'Low Stock', class: 'bg-amber-100 text-amber-700' }
  return { label: 'In Stock', class: 'bg-green-100 text-green-700' }
}

export default function PartsPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const qc = useQueryClient()

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then((r) => r.json()),
  })

  const { data: parts = [], isLoading } = useQuery<Part[]>({
    queryKey: ['parts', search, categoryId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryId !== 'all') params.set('categoryId', categoryId)
      return fetch(`/api/parts?${params}`).then((r) => r.json())
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/parts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Part deleted')
    },
    onError: () => toast.error('Failed to delete part'),
  })

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parts</h1>
          <p className="text-slate-500 text-sm mt-1">{parts.length} part{parts.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/parts/new">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Add Part
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Part</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Min Stock</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading
              ? [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : parts.map((part) => {
                  const status = stockStatus(part.totalStock, part.minStock)
                  return (
                    <tr key={part.id} className="hover:bg-slate-50 group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div>
                            <Link href={`/parts/${part.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                              {part.name}
                            </Link>
                            {part.description && (
                              <p className="text-xs text-slate-400 truncate max-w-48">{part.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{part.category?.name ?? '—'}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{part.totalStock}</td>
                      <td className="px-5 py-3 text-slate-500">{part.minStock}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{part.unit}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/parts/${part.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(part.id, part.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
        {!isLoading && parts.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No parts found</p>
          </div>
        )}
      </div>
    </div>
  )
}
