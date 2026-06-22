import * as React from "react"
import { useNavigate } from "react-router-dom"
import { 
  CreditCard, 
  TrendingUp, 
  Users, 
  Activity, 
  DollarSign, 
  LogOut, 
  Plus, 
  Settings, 
  Bell, 
  Search, 
  ArrowRight,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { authService, type User } from "@/services/authService"

export function Dashboard() {
  const navigate = useNavigate()
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)



  const handleLogout = async () => {
    await authService.logout()
    navigate("/login")
  }

  const transactions = [
    { id: "TXN-9021", customer: "Sophia Martinez", email: "sophia@example.com", amount: "+$350.00", status: "Successful", date: "June 22, 2026", type: "charge" },
    { id: "TXN-9020", customer: "Jackson Reed", email: "jackson@example.com", amount: "+$1,200.00", status: "Successful", date: "June 22, 2026", type: "charge" },
    { id: "TXN-9019", customer: "Olivia Vance", email: "olivia@example.com", amount: "-$45.00", status: "Pending", date: "June 21, 2026", type: "refund" },
    { id: "TXN-9018", customer: "Liam Gallagher", email: "liam@example.com", amount: "+$89.99", status: "Successful", date: "June 20, 2026", type: "charge" },
    { id: "TXN-9017", customer: "Emma Watson", email: "emma@example.com", amount: "-$120.00", status: "Failed", date: "June 19, 2026", type: "payout" },
  ]

  const stats = [
    { title: "Total Volume", value: "$45,231.89", change: "+12.5%", label: "vs last month", icon: DollarSign, color: "text-emerald-400" },
    { title: "Active Links", value: "14 Live", change: "+4.2%", label: "3 drafted", icon: Activity, color: "text-blue-400" },
    { title: "Customers", value: "1,249", change: "+18.3%", label: "21 today", icon: Users, color: "text-purple-400" },
    { title: "Success Rate", value: "99.4%", change: "+0.2%", label: "Industry: 97.2%", icon: TrendingUp, color: "text-teal-400" },
  ]

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950">
      {/* Glowing background highlights */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CreditCard className="h-4.5 w-4.5 text-neutral-950 font-bold" />
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
                {/* {user?.name ? user.name.charAt(0).toUpperCase() : "U"} */}
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

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 z-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Merchant Dashboard</h1>
            <p className="text-neutral-400 text-sm mt-1">Here is what's happening with your store today.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 text-xs font-medium text-neutral-300 flex items-center gap-2 cursor-pointer transition-colors active:scale-[0.98]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Sync Data
            </button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 font-semibold text-xs py-1.5 px-4.5 rounded-lg shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer gap-1.5">
              <Plus className="h-3.5 w-3.5 stroke-[3px]" />
              New Payment Link
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div 
                key={i} 
                className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-5 hover:border-neutral-800/80 transition-all duration-300 group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">{stat.title}</span>
                  <div className={`p-2 rounded-lg bg-neutral-950/60 border border-neutral-900 group-hover:border-neutral-800 transition-all ${stat.color}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white">{stat.value}</span>
                  <span className="text-emerald-400 text-xs font-semibold">{stat.change}</span>
                </div>
                <p className="text-[11px] text-neutral-600 mt-1">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Info Banner */}
        <div className="relative bg-gradient-to-r from-emerald-950/30 to-neutral-900 border border-emerald-900/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Verify your business profile
            </h2>
            <p className="text-neutral-400 text-sm max-w-2xl">
              You are currently in developer testing mode. Complete your business KYC onboarding to enable production payouts and accept real credit card and bank payments globally.
            </p>
          </div>
          <Button variant="outline" className="border-emerald-500/30 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 font-semibold gap-1.5 cursor-pointer self-start md:self-auto">
            Complete Profile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Transactions & Activity Table */}
        <div className="bg-neutral-900/20 border border-neutral-900 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-900/60 flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Recent Transactions</h3>
            <a href="#" className="text-emerald-400 hover:underline text-xs font-semibold">View all transactions</a>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900 bg-neutral-950/30 text-neutral-500 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="px-6 py-3.5">Transaction ID</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/40">
                {transactions.map((txn, index) => {
                  return (
                    <tr key={index} className="hover:bg-neutral-900/20 transition-colors text-sm">
                      <td className="px-6 py-4 font-mono text-xs text-neutral-400">{txn.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{txn.customer}</div>
                        <div className="text-neutral-500 text-xs">{txn.email}</div>
                      </td>
                      <td className="px-6 py-4 text-neutral-400 text-xs">{txn.date}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${
                          txn.type === 'charge' ? 'text-emerald-400' : 
                          txn.type === 'refund' ? 'text-amber-400' : 'text-neutral-400'
                        }`}>
                          {txn.amount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                          txn.status === 'Successful' ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' :
                          txn.status === 'Pending' ? 'bg-amber-950/30 border-amber-500/20 text-amber-400' :
                          'bg-red-950/30 border-red-500/20 text-red-400'
                        }`}>
                          {txn.status === 'Successful' && <CheckCircle className="h-3 w-3" />}
                          {txn.status === 'Pending' && <Clock className="h-3 w-3" />}
                          {txn.status === 'Failed' && <XCircle className="h-3 w-3" />}
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950/20 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-600">
          <p>© 2026 Nexora Technologies Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-neutral-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-neutral-400 transition-colors">API Reference</a>
            <a href="#" className="hover:text-neutral-400 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
