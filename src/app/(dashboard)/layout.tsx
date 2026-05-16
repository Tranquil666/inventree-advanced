'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
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
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const navSections = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: BarChart3 }],
  },
  {
    label: 'Inventory',
    items: [
      { href: '/parts', label: 'Parts', icon: Package },
      { href: '/categories', label: 'Categories', icon: Tag },
      { href: '/stock', label: 'Stock', icon: Layers },
      { href: '/stock/locations', label: 'Locations', icon: MapPin },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { href: '/suppliers', label: 'Suppliers', icon: Truck },
      { href: '/orders', label: 'Purchase Orders', icon: ShoppingCart },
    ],
  },
  {
    label: 'Manufacturing',
    items: [{ href: '/builds', label: 'Build Orders', icon: Wrench }],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-slate-900 text-slate-100 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Box className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">InvenTrack</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3">
          {navSections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5',
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-slate-700 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left outline-none">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
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
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
