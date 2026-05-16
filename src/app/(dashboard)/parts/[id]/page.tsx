'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Part {
  id: string
  name: string
  description?: string
  unit: string
  minStock: number
  totalStock: number
  category?: { id: string; name: string }
  attributes: { id: string; key: string; value: string }[]
  stockItems: { id: string; quantity: number; serialNumber?: string; batchCode?: string; location?: { name: string } }[]
  supplierParts: { id: string; sku?: string; price?: number; leadDays?: number; supplier: { name: string } }[]
  bomItems: { id: string; quantity: number; component: { id: string; name: string; unit: string; category?: { name: string } } }[]
}

interface Category {
  id: string
  name: string
}

export default function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', categoryId: 'none', unit: 'pcs', minStock: '0' })

  const { data: part, isLoading } = useQuery<Part>({
    queryKey: ['part', id],
    queryFn: () => fetch(`/api/parts/${id}`).then((r) => r.json()),
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then((r) => r.json()),
  })

  const startEdit = () => {
    if (!part) return
    setForm({
      name: part.name,
      description: part.description ?? '',
      categoryId: part.category?.id ?? 'none',
      unit: part.unit,
      minStock: String(part.minStock),
    })
    setEditing(true)
  }

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetch(`/api/parts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, categoryId: data.categoryId === 'none' ? null : data.categoryId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['part', id] })
      qc.invalidateQueries({ queryKey: ['parts'] })
      setEditing(false)
      toast.success('Part updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const totalStock = part?.stockItems.reduce((s, i) => s + i.quantity, 0) ?? 0

  const statusBadge = () => {
    if (!part) return null
    if (totalStock === 0) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Out of Stock</Badge>
    if (totalStock <= part.minStock) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Low Stock</Badge>
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">In Stock</Badge>
  }

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!part) return (
    <div className="p-6">
      <p className="text-slate-500">Part not found.</p>
      <Link href="/parts"><Button className="mt-4" variant="outline">Back to Parts</Button></Link>
    </div>
  )

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/parts">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
            <ArrowLeft className="w-4 h-4" /> Parts
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Package className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{part.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {part.category && <Badge variant="outline" className="text-xs">{part.category.name}</Badge>}
              {statusBadge()}
            </div>
          </div>
        </div>
        <Button onClick={startEdit} variant="outline" size="sm" className="gap-2">
          <Pencil className="w-4 h-4" /> Edit
        </Button>
      </div>

      {/* Edit form */}
      {editing && (
        <Card className="border-indigo-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Edit Part</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v ?? "none" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v ?? "pcs" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['pcs', 'kg', 'g', 'm', 'cm', 'mm', 'L', 'mL', 'box', 'roll', 'set'].map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Min Stock</Label>
                  <Input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Save className="w-4 h-4" /> Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="gap-2">
                  <X className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock">Stock ({part.stockItems.length})</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers ({part.supplierParts.length})</TabsTrigger>
          <TabsTrigger value="bom">BOM ({part.bomItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm">Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Unit</span><span className="font-medium">{part.unit}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Min Stock</span><span className="font-medium">{part.minStock} {part.unit}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Total Stock</span><span className="font-medium">{totalStock} {part.unit}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-medium">{part.category?.name ?? '—'}</span></div>
                </div>
                {part.description && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Description</p>
                    <p className="text-sm text-slate-600">{part.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm">Attributes</h3>
                {part.attributes.length === 0 ? (
                  <p className="text-slate-400 text-sm">No attributes defined</p>
                ) : (
                  <div className="space-y-2">
                    {part.attributes.map((a) => (
                      <div key={a.id} className="flex justify-between text-sm">
                        <span className="text-slate-500">{a.key}</span>
                        <span className="font-medium">{a.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Batch</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Serial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {part.stockItems.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600">{s.location?.name ?? 'Unassigned'}</td>
                    <td className="px-5 py-3 font-medium">{s.quantity} {part.unit}</td>
                    <td className="px-5 py-3 text-slate-400">{s.batchCode ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-400">{s.serialNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {part.stockItems.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">No stock entries</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Supplier</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {part.supplierParts.map((sp) => (
                  <tr key={sp.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{sp.supplier.name}</td>
                    <td className="px-5 py-3 text-slate-500">{sp.sku ?? '—'}</td>
                    <td className="px-5 py-3">{sp.price != null ? `$${sp.price.toFixed(2)}` : '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{sp.leadDays != null ? `${sp.leadDays} days` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {part.supplierParts.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">No supplier links</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bom" className="mt-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Component</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {part.bomItems.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/parts/${b.component.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                        {b.component.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{b.component.category?.name ?? '—'}</td>
                    <td className="px-5 py-3">{b.quantity} {b.component.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {part.bomItems.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">No BOM items defined</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
