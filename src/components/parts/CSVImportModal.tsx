'use client'

import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, Download, CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type PartField = 'name' | 'description' | 'categoryName' | 'unit' | 'minStock' | '__skip__'

const PART_FIELDS: { value: PartField; label: string }[] = [
  { value: 'name', label: 'Name *' },
  { value: 'description', label: 'Description' },
  { value: 'categoryName', label: 'Category' },
  { value: 'unit', label: 'Unit' },
  { value: 'minStock', label: 'Min Stock' },
  { value: '__skip__', label: '— Skip —' },
]

interface ImportResult {
  created: number
  errors: string[]
}

export function CSVImportModal({ open, onOpenChange, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, PartField>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const reset = useCallback(() => {
    setHeaders([])
    setRows([])
    setMapping({})
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const handleClose = (val: boolean) => {
    if (!val) reset()
    onOpenChange(val)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<string[]>(file, {
      complete: (res) => {
        const data = res.data as string[][]
        if (data.length < 2) {
          toast.error('CSV must have a header row and at least one data row')
          return
        }
        const hdrs = data[0].map((h) => h.trim())
        const dataRows = data.slice(1).filter((r) => r.some((c) => c.trim()))
        setHeaders(hdrs)
        setRows(dataRows)
        setResult(null)

        // Auto-map by column name
        const autoMap: Record<string, PartField> = {}
        for (const h of hdrs) {
          const lower = h.toLowerCase().replace(/[\s_-]/g, '')
          if (lower === 'name' || lower === 'partname') autoMap[h] = 'name'
          else if (lower === 'description' || lower === 'desc') autoMap[h] = 'description'
          else if (lower === 'category' || lower === 'categoryname') autoMap[h] = 'categoryName'
          else if (lower === 'unit') autoMap[h] = 'unit'
          else if (lower === 'minstock' || lower === 'minimumstock' || lower === 'min') autoMap[h] = 'minStock'
          else autoMap[h] = '__skip__'
        }
        setMapping(autoMap)
      },
      skipEmptyLines: true,
    })
  }

  const handleImport = async () => {
    // Validate name mapping
    const hasName = Object.values(mapping).includes('name')
    if (!hasName) {
      toast.error('You must map a column to "Name"')
      return
    }

    setImporting(true)
    try {
      const nameCol = headers.find((h) => mapping[h] === 'name')!
      const descCol = headers.find((h) => mapping[h] === 'description')
      const catCol = headers.find((h) => mapping[h] === 'categoryName')
      const unitCol = headers.find((h) => mapping[h] === 'unit')
      const minStockCol = headers.find((h) => mapping[h] === 'minStock')

      const parsedRows = rows.map((row) => {
        const get = (col: string | undefined) =>
          col !== undefined ? row[headers.indexOf(col)]?.trim() || undefined : undefined

        return {
          name: get(nameCol) ?? '',
          description: get(descCol),
          categoryName: get(catCol),
          unit: get(unitCol),
          minStock: get(minStockCol),
        }
      }).filter((r) => r.name)

      const res = await fetch('/api/parts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows }),
      })
      const data = (await res.json()) as ImportResult
      setResult(data)
      if (data.created > 0) {
        onSuccess()
        toast.success(`Imported ${data.created} part${data.created !== 1 ? 's' : ''}`)
      }
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csv = 'name,description,category,unit,minStock\nResistor 10k,10kΩ resistor,Electronics,pcs,100\nCapacitor 100uF,100µF capacitor,Electronics,pcs,50'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'parts-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const preview = rows.slice(0, 5)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Parts from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Upload area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>CSV File</Label>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                <Download className="w-3.5 h-3.5" /> Download template
              </button>
            </div>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {headers.length > 0
                  ? `${rows.length} row${rows.length !== 1 ? 's' : ''} loaded (${headers.length} columns)`
                  : 'Click to upload or drag & drop a .csv file'}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={handleFile}
              />
            </label>
          </div>

          {/* Column mapping */}
          {headers.length > 0 && !result && (
            <>
              <div>
                <Label className="mb-2 block">Column Mapping</Label>
                <div className="space-y-2">
                  {headers.map((h) => (
                    <div key={h} className="flex items-center gap-3">
                      <span className="w-40 text-sm text-slate-700 dark:text-slate-300 truncate font-mono bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
                        {h}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-xs">→</span>
                      <Select
                        value={mapping[h] ?? '__skip__'}
                        onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v as PartField }))}
                      >
                        <SelectTrigger className="flex-1 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PART_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              {preview.length > 0 && (
                <div>
                  <Label className="mb-2 block">Preview (first {preview.length} rows)</Label>
                  <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                          {headers.map((h) => (
                            <th key={h} className="text-left px-3 py-2 text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                              {h}
                              {mapping[h] && mapping[h] !== '__skip__' && (
                                <span className="ml-1 text-indigo-500 dark:text-indigo-400">
                                  ({PART_FIELDS.find((f) => f.value === mapping[h])?.label.replace(' *', '')})
                                </span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {preview.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-32 truncate">
                                {cell || <span className="text-slate-300 dark:text-slate-600">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 5 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      +{rows.length - 5} more rows not shown
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : `Import ${rows.length} row${rows.length !== 1 ? 's' : ''}`}
                </Button>
                <Button variant="outline" onClick={reset}>Reset</Button>
              </div>
            </>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Successfully created {result.created} part{result.created !== 1 ? 's' : ''}
                </p>
              </div>

              {result.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ul className="text-xs text-red-700 dark:text-red-400 space-y-0.5 list-disc list-inside">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>+{result.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Import more</Button>
                <Button variant="outline" onClick={() => handleClose(false)}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
