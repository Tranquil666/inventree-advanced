'use client'

import { Bell, Package } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface LowStockPart {
  id: string
  name: string
  totalStock: number
  minStock: number
  category?: { name: string }
}

interface NotificationsResponse {
  lowStock: LowStockPart[]
  count: number
}

export function NotificationBell() {
  const { data } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const count = data?.count ?? 0
  const items = data?.lowStock ?? []

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none" aria-label="Notifications">
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifications</p>
          {count > 0 && (
            <span className="text-xs text-red-500 font-medium">{count} low stock alert{count !== 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
              <Bell className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">All stock levels are healthy</p>
            </div>
          ) : (
            items.map((part) => (
              <Link
                key={part.id}
                href={`/parts/${part.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{part.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Stock: <span className="font-semibold text-amber-600 dark:text-amber-400">{part.totalStock}</span>
                    {' '}/ Min: {part.minStock}
                    {part.category && <span className="ml-1.5 text-slate-400">· {part.category.name}</span>}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/parts"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            View all parts →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
