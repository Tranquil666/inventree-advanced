'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { Package, DollarSign, AlertTriangle, ShoppingCart, TrendingUp, PieChartIcon, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'

interface DashboardData {
  kpis: { totalParts: number; totalStockValue: number; lowStockCount: number; pendingOrders: number }
  chartData: { name: string; quantity: number }[]
  categoryBreakdown: { name: string; value: number; color: string }[]
  stockTrend: { date: string; additions: number; removals: number }[]
  recentActivity: { id: string; type: string; partName: string; quantity: number; location?: string; user?: string; createdAt: string }[]
  lowStockAlerts: { id: string; name: string; minStock: number; currentStock: number; unit: string }[]
}

const TYPE_COLORS: Record<string, string> = {
  ADD: 'bg-green-100 text-green-800',
  REMOVE: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
  ADJUST: 'bg-yellow-100 text-yellow-800',
  BUILD_USE: 'bg-purple-100 text-purple-800',
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then((r) => r.json()),
    refetchInterval: 30000,
  })

  const kpis = [
    { label: 'Total Parts', value: data?.kpis.totalParts ?? 0, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    { label: 'Stock Value', value: `$${(data?.kpis.totalStockValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Low Stock Alerts', value: data?.kpis.lowStockCount ?? 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Pending Orders', value: data?.kpis.pendingOrders ?? 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Overview of your inventory system</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="border-0 shadow-sm dark:bg-slate-800">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{kpi.label}</p>
                    {isLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpi.value}</p>
                    )}
                  </div>
                  <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Row 2: Bar Chart + Pie Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Bar Chart - Top Parts */}
        <Card className="xl:col-span-3 border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-slate-100">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Top Parts by Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="quantity" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Category Breakdown */}
        <Card className="xl:col-span-2 border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-slate-100">
              <PieChartIcon className="w-4 h-4 text-purple-600" /> Stock by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data?.categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {data?.categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v} units`, '']} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Stock Trend + Low Stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Line Chart - 7-day trend */}
        <Card className="xl:col-span-2 border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-slate-100">
              <Activity className="w-4 h-4 text-emerald-600" /> 7-Day Stock Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.stockTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="additions" stroke="#10b981" strokeWidth={2} dot={false} name="Added" />
                  <Line type="monotone" dataKey="removals" stroke="#ef4444" strokeWidth={2} dot={false} name="Removed" />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-slate-100">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : data?.lowStockAlerts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">All stock levels healthy ✓</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {data?.lowStockAlerts.slice(0, 8).map((alert) => (
                  <div key={alert.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{alert.name}</p>
                      <p className="text-xs text-slate-400">Min: {alert.minStock} {alert.unit}</p>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ml-2 flex-shrink-0 ${alert.currentStock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {alert.currentStock} {alert.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold dark:text-slate-100">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Part</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {data?.recentActivity.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[a.type] ?? 'bg-gray-100 text-gray-700'}`}>{a.type}</span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{a.partName}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{a.quantity}</td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{a.location ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data?.recentActivity.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No activity yet</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
