import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  Bell,
  CheckCircle,
  CreditCard,
  Info,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { authService, type User } from "@/services/authService"

const notifications = [
  {
    id: 1,
    title: "Wallet backup ready",
    message: "Your recovery phrase backup was generated during signup.",
    time: "2 min ago",
    icon: ShieldCheck,
    color: "text-emerald-400",
  },
  {
    id: 2,
    title: "Sandbox payment received",
    message: "A test payment link recorded a successful transaction.",
    time: "18 min ago",
    icon: CheckCircle,
    color: "text-blue-400",
  },
  {
    id: 3,
    title: "Profile review pending",
    message: "Complete business details to enable production payouts.",
    time: "1 hr ago",
    icon: Info,
    color: "text-amber-400",
  },
]

export function Header() {
  const navigate = useNavigate()
  const [user, setUser] = React.useState<User | null>(authService.getCurrentUserSync())
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const notificationRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    return authService.addListener((_auth, user) => {
      setUser(user)
    })
  }, [])

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  const handleLogout = async () => {
    await authService.logout()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 rounded-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            aria-label="Go to dashboard"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
              <CreditCard className="h-4.5 w-4.5 text-neutral-950" />
            </div>
            <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              Nexora
            </span>
          </button>
          <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 font-mono text-[10px] tracking-wider text-emerald-400 uppercase sm:inline-block">
            Sandbox
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden w-64 md:block">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pr-4 pl-9 text-xs text-neutral-300 transition-colors placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-hidden"
            />
          </div>

          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              className="relative cursor-pointer rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-neutral-200"
              aria-label="Open notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-neutral-950" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between border-b border-neutral-900 px-4 py-3">
                  <h2 className="text-sm font-semibold text-white">Notifications</h2>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    {notifications.length} new
                  </span>
                </div>
                <div className="max-h-96 divide-y divide-neutral-900 overflow-y-auto">
                  {notifications.map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.id} className="flex gap-3 px-4 py-3 transition-colors hover:bg-neutral-900/60">
                        <div className={`mt-0.5 ${item.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-neutral-100">{item.title}</p>
                            <span className="shrink-0 text-[11px] text-neutral-600">{item.time}</span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-neutral-400">{item.message}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <button className="cursor-pointer rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-neutral-200">
            <Settings className="h-4.5 w-4.5" />
          </button>

          <div className="h-8 w-[1px] bg-neutral-900" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-xs font-semibold text-emerald-400 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10"
              aria-label="Open profile"
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserRound className="h-4 w-4" />}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="cursor-pointer gap-1.5 text-neutral-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

