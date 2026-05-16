'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Supplier { id: string; name: string }
interface Part { id: string; name: string; unit: string }

interface LineItem {
  partId: string
  quantity: string
  unitPrice: string
}

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [supplierId, setSupplierId] = useState('none')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ partId: 'none', quantity: '1', unitPrice: '' }])

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => fetch('/api/suppliers').then((r) => r.json()),
  })

  const { data: parts = [] } = useQuery<Part[]>({
    queryKey: ['parts'],
    queryFn: () => fetch('/api/parts').then((r) => r.json()),
  })

  const addLine = () => setLineItems([...lineItems, { partId: 'none', quantity: '1', unitPrice: '' }])
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineItem, value: string) =>
    setLineItems(lineItems.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))

  const totalValue = lineItems.reduce((sum, li) => {
    return sum + (parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0)
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (supplierId === 'none') { toast.error('Select a supplier'); return }
    const validLines = lineItems.filter((l) => l.partId !== 'none' && parseFloat(l.quantity) > 0)
    if (validLines.length === 0) { toast.error('Add at least one line item'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          reference: reference || null,
          notes: notes || null,
          lineItems: validLines.map((l) => ({
            partId: l.partId,
            quantity: parseFloat(l.quantity),
            unitPrice: l.unitPrice ? parseFloat(l.unitPrice) : null,
          })),
        }),
      })
      if (!res.ok) throw new Error()
      const order = await res.json()
      toast.success('Purchase order created')
      router.push(`/orders/${order.id}`)
    } catch {
      toast.error('Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/orders">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
            <ArrowLeft className="w-4 h-4" /> Orders
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Purchase Order</h1>
        <p className="text-slate-500 text-sm mt-1">Create a purchase order to track incoming stock</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Supplier *</Label>
                <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? 'none')}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Select supplier</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PO-2024-001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addLine} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lineItems.map((li, i) => (
              <div key={i} className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Part</Label>
                  <Select value={li.partId} onValueChange={(v) => updateLine(i, 'partId', v ?? 'none')}>
                    <SelectTrigger><SelectValue placeholder="Select part" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Select part</SelectItem>
                      {parts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min="0.01" step="0.01" value={li.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
                </div>
                <div className="w-28 space-y-1.5">
                  <Label className="text-xs">Unit Price ($)</Label>
                  <Input type="number" min="0" step="0.01" value={li.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} placeholder="0.00" />
                </div>
                <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5" onClick={() => removeLine(i)} disabled={lineItems.length === 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Separator />
            <div className="flex justify-end">
              <div className="text-sm">
                <span className="text-slate-500">Total: </span>
                <span className="font-semibold text-slate-900">${totalValue.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? 'Creating...' : 'Create Order'}
          </Button>
          <Link href="/orders">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
