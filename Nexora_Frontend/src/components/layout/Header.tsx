import * as React from "react"
import { useNavigate } from "react-router-dom"
import { 
  CreditCard, 
  Bell, 
  Settings, 
  Search, 
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { authService, type User } from "@/services/authService"

export function Header() {
  const navigate = useNavigate()
  const [user, setUser] = React.useState<User | null>(authService.getCurrentUserSync())

  React.useEffect(() => {
    return authService.addListener((_auth, user) => {
      setUser(user)
    })
  }, [])

  const handleLogout = async () => {
    await authService.logout()
    navigate("/login")
  }

  return (
    <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CreditCard className="h-4.5 w-4.5 text-neutral-950" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            Nexora
          </span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 tracking-wider">
            Sandbox
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search transactions..." 
              className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-1.5 focus:outline-hidden focus:border-emerald-500/50 text-neutral-300 placeholder:text-neutral-600 transition-colors"
            />
          </div>
          
          <button className="relative p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-neutral-950" />
          </button>

          <button className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer">
            <Settings className="h-4.5 w-4.5" />
          </button>

          <div className="h-8 w-[1px] bg-neutral-900" />

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-semibold text-emerald-400 select-none">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-neutral-400 hover:text-red-400 hover:bg-red-500/10 gap-1.5 cursor-pointer"
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
