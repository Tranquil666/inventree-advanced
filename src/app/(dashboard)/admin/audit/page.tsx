'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { toast } from 'sonner'

interface AuditLog {
  id: string
  userId?: string
  userEmail?: string
  action: string
  entity: string
  entityId: string
  entityName?: string
  changes?: string
  createdAt: string
}

interface AuditResponse {
  data: AuditLog[]
  total: number
  page: number
  limit: number
}

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

function ExpandableChanges({ changes }: { changes?: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!changes) return <span className="text-slate-400">—</span>

  let parsed: unknown = null
  try {
    parsed = JSON.parse(changes)
  } catch {
    return <span className="text-slate-500 text-xs font-mono truncate max-w-xs">{changes}</span>
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {expanded ? 'Hide' : 'View changes'}
      </button>
      {expanded && (
        <pre className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 overflow-x-auto max-w-xs">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function AuditLogPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [entity, setEntity] = useState('all')
  const limit = 50

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'admin') {
      toast.error('Admin access required')
      router.push('/')
    }
  }, [session, status, router])

  const { data: auditResponse, isLoading } = useQuery<AuditResponse>({
    queryKey: ['audit', page, entity],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (entity !== 'all') params.set('entity', entity)
      return fetch(`/api/audit?${params}`).then((r) => r.json())
    },
    enabled: session?.user.role === 'admin',
  })

  const logs = auditResponse?.data ?? []
  const total = auditResponse?.total ?? 0

  const handleEntityChange = (value: string | null) => {
    setEntity(value ?? 'all')
    setPage(1)
  }

  if (status === 'loading' || !session) return null

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Log</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{total} events</p>
          </div>
        </div>
        <Select value={entity} onValueChange={handleEntityChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="Part">Part</SelectItem>
            <SelectItem value="Order">Order</SelectItem>
            <SelectItem value="Supplier">Supplier</SelectItem>
            <SelectItem value="Build">Build</SelectItem>
            <SelectItem value="ReturnOrder">Return Order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">When</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Who</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Action</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Entity</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {isLoading
              ? [...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((__, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-5 py-3 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {log.userEmail ?? <span className="text-slate-400">System</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ACTION_STYLES[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{log.entity}</td>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{log.entityName ?? log.entityId.slice(0, 8)}</td>
                    <td className="px-5 py-3">
                      <ExpandableChanges changes={log.changes ?? undefined} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && logs.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No audit events found</p>
          </div>
        )}
        <div className="border-t border-slate-100 dark:border-slate-700">
          <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
