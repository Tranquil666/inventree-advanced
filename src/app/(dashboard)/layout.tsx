'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import {
  BarChart3,
  Package,
  Tag,
  Layers,
  MapPin,
  Truck,
  ShoppingCart,
  Wrench,
  LogOut,
  User,
  ChevronDown,
  Box,
  Sun,
  Moon,
  RotateCcw,
  Shield,
  ClipboardList,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { CommandSearch } from '@/components/layout/CommandSearch'

const navSections = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: BarChart3 }],
    adminOnly: false,
  },
  {
    label: 'Inventory',
    items: [
      { href: '/parts', label: 'Parts', icon: Package },
      { href: '/categories', label: 'Categories', icon: Tag },
      { href: '/stock', label: 'Stock', icon: Layers },
      { href: '/stock/locations', label: 'Locations', icon: MapPin },
    ],
    adminOnly: false,
  },
  {
    label: 'Procurement',
    items: [
      { href: '/suppliers', label: 'Suppliers', icon: Truck },
      { href: '/orders', label: 'Purchase Orders', icon: ShoppingCart },
      { href: '/returns', label: 'Return Orders', icon: RotateCcw },
    ],
    adminOnly: false,
  },
  {
    label: 'Manufacturing',
    items: [{ href: '/builds', label: 'Build Orders', icon: Wrench }],
    adminOnly: false,
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin/users', label: 'Users', icon: Shield },
      { href: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
    ],
    adminOnly: true,
  },
]

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const isDark = theme === 'dark'
  return (
    <Button
      size="sm"
      variant="ghost"
      className="w-8 h-8 p-0 text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex-shrink-0"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [cmdSearchOpen, setCmdSearchOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Persist collapsed state across page loads
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdSearchOpen(true)
      }
      // Ctrl+B to toggle sidebar (like VS Code)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex-shrink-0 flex flex-col bg-slate-900 dark:bg-slate-950 text-slate-100 overflow-y-auto transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn(
          'flex items-center border-b border-slate-700 flex-shrink-0',
          collapsed ? 'justify-center px-0 py-5' : 'gap-2 px-4 py-5'
        )}>
          {!collapsed && (
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <Box className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight flex-1 truncate">InvenTrack</span>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors flex-shrink-0',
              collapsed && 'mx-auto'
            )}
          >
            {collapsed
              ? <ChevronsRight className="w-4 h-4" />
              : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          {navSections
            .filter(s => !s.adminOnly || session?.user?.role === 'admin')
            .map((section) => (
              <div key={section.label} className={cn('mb-4', collapsed ? 'px-2' : 'px-3')}>
                {/* Section label — hidden when collapsed */}
                {!collapsed && (
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1.5">
                    {section.label}
                  </p>
                )}
                {/* Divider when collapsed */}
                {collapsed && (
                  <div className="h-px bg-slate-700 mb-2 mx-1" />
                )}
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center rounded-lg text-sm font-medium transition-colors mb-0.5',
                        collapsed
                          ? 'justify-center w-10 h-10 mx-auto'
                          : 'gap-3 px-3 py-2',
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && item.label}
                    </Link>
                  )
                })}
              </div>
            ))}
        </nav>

        {/* User + Theme */}
        <div className="border-t border-slate-700 p-2 flex-shrink-0">
          {collapsed ? (
            /* Collapsed: stack icon buttons vertically */
            <div className="flex flex-col items-center gap-1">
              <ThemeToggle collapsed={collapsed} />
              <DropdownMenu>
                <DropdownMenuTrigger
                  title={session?.user?.name ?? 'Account'}
                  className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center hover:ring-2 hover:ring-indigo-400 transition-all outline-none"
                >
                  <User className="w-4 h-4 text-white" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-48">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800 truncate">{session?.user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-red-600 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            /* Expanded: full user row */
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex-1 flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left outline-none min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{session?.user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-red-600 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle collapsed={collapsed} />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCmdSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xs"
            >
              <span>Search...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <CommandSearch open={cmdSearchOpen} onOpenChange={setCmdSearchOpen} />
    </div>
  )
}
