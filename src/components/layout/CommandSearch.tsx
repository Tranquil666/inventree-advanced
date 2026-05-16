'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Package, Truck, ShoppingCart, Wrench, Search, Clock } from 'lucide-react'

interface SearchResults {
  parts: { id: string; name: string; category?: { name: string }; totalStock: number }[]
  suppliers: { id: string; name: string; email?: string }[]
  orders: { id: string; reference?: string; status: string; supplier: { name: string } }[]
  builds: { id: string; reference?: string; status: string; part: { name: string } }[]
}

interface RecentItem {
  type: 'part' | 'supplier' | 'order' | 'build'
  id: string
  name: string
  href: string
}

const RECENT_KEY = 'inventree_recent_items'

function getRecent(): RecentItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentItem[]
  } catch {
    return []
  }
}

function addRecent(item: RecentItem) {
  const current = getRecent().filter((r) => r.href !== item.href)
  const updated = [item, ...current].slice(0, 5)
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
}

interface ResultItem {
  type: 'part' | 'supplier' | 'order' | 'build' | 'recent'
  id: string
  name: string
  subtitle?: string
  href: string
  icon: React.ElementType
}

function buildResults(data: SearchResults | undefined): ResultItem[] {
  if (!data) return []
  const items: ResultItem[] = []

  for (const part of data.parts) {
    items.push({
      type: 'part',
      id: part.id,
      name: part.name,
      subtitle: part.category?.name ?? `Stock: ${part.totalStock}`,
      href: `/parts/${part.id}`,
      icon: Package,
    })
  }
  for (const supplier of data.suppliers) {
    items.push({
      type: 'supplier',
      id: supplier.id,
      name: supplier.name,
      subtitle: supplier.email,
      href: `/suppliers/${supplier.id}`,
      icon: Truck,
    })
  }
  for (const order of data.orders) {
    items.push({
      type: 'order',
      id: order.id,
      name: order.reference ?? `PO-${order.id.slice(0, 8).toUpperCase()}`,
      subtitle: `${order.supplier.name} · ${order.status}`,
      href: `/orders/${order.id}`,
      icon: ShoppingCart,
    })
  }
  for (const build of data.builds) {
    items.push({
      type: 'build',
      id: build.id,
      name: build.reference ?? `BO-${build.id.slice(0, 8).toUpperCase()}`,
      subtitle: `${build.part.name} · ${build.status}`,
      href: `/builds/${build.id}`,
      icon: Wrench,
    })
  }

  return items
}

const TYPE_LABELS: Record<string, string> = {
  part: 'Parts',
  supplier: 'Suppliers',
  order: 'Orders',
  build: 'Builds',
  recent: 'Recent',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandSearch({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setDebouncedQuery('')
      setActiveIndex(0)
      setRecent(getRecent())
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data } = useQuery<SearchResults>({
    queryKey: ['search', debouncedQuery],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.json()),
    enabled: debouncedQuery.length >= 1,
  })

  const searchResults = buildResults(data)

  const displayItems: ResultItem[] = debouncedQuery.length >= 1
    ? searchResults
    : recent.map((r) => ({ ...r, type: 'recent' as const, icon: Clock }))

  // Group by type
  const groups: Record<string, ResultItem[]> = {}
  for (const item of displayItems) {
    const group = item.type === 'recent' ? 'recent' : item.type
    if (!groups[group]) groups[group] = []
    groups[group].push(item)
  }

  const flatItems = Object.values(groups).flat()

  const navigate = useCallback((item: ResultItem) => {
    if (item.type !== 'recent') {
      addRecent({
        type: item.type as RecentItem['type'],
        id: item.id,
        name: item.name,
        href: item.href,
      })
    }
    onOpenChange(false)
    router.push(item.href)
  }, [router, onOpenChange])

  useEffect(() => {
    setActiveIndex(0)
  }, [debouncedQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[activeIndex]
      if (item) navigate(item)
    }
  }

  let flatIdx = 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden max-w-lg">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search parts, suppliers, orders, builds..."
            className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {Object.keys(groups).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <Search className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">
                {debouncedQuery.length >= 1 ? 'No results found' : 'Start typing to search'}
              </p>
            </div>
          ) : (
            Object.entries(groups).map(([groupKey, items]) => {
              return (
                <div key={groupKey}>
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50">
                    {TYPE_LABELS[groupKey] ?? groupKey}
                  </div>
                  {items.map((item) => {
                    const idx = flatIdx++
                    const Icon = item.icon
                    const isActive = idx === activeIndex
                    return (
                      <button
                        key={item.href}
                        onClick={() => navigate(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? 'bg-indigo-100 dark:bg-indigo-800'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {item.name}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.subtitle}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">↵</span>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
