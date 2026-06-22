import * as React from "react"
import {
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  Plus,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export function Dashboard() {
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const transactions = [
    {
      id: "TXN-9021",
      customer: "Sophia Martinez",
      email: "sophia@example.com",
      amount: "+$350.00",
      status: "Successful",
      date: "June 22, 2026",
      type: "charge",
    },
    {
      id: "TXN-9020",
      customer: "Jackson Reed",
      email: "jackson@example.com",
      amount: "+$1,200.00",
      status: "Successful",
      date: "June 22, 2026",
      type: "charge",
    },
    {
      id: "TXN-9019",
      customer: "Olivia Vance",
      email: "olivia@example.com",
      amount: "-$45.00",
      status: "Pending",
      date: "June 21, 2026",
      type: "refund",
    },
    {
      id: "TXN-9018",
      customer: "Liam Gallagher",
      email: "liam@example.com",
      amount: "+$89.99",
      status: "Successful",
      date: "June 20, 2026",
      type: "charge",
    },
    {
      id: "TXN-9017",
      customer: "Emma Watson",
      email: "emma@example.com",
      amount: "-$120.00",
      status: "Failed",
      date: "June 19, 2026",
      type: "payout",
    },
  ]

  const stats = [
    {
      title: "Total Volume",
      value: "$45,231.89",
      change: "+12.5%",
      label: "vs last month",
      icon: DollarSign,
      color: "text-emerald-400",
    },
    {
      title: "Active Links",
      value: "14 Live",
      change: "+4.2%",
      label: "3 drafted",
      icon: Activity,
      color: "text-blue-400",
    },
    {
      title: "Customers",
      value: "1,249",
      change: "+18.3%",
      label: "21 today",
      icon: Users,
      color: "text-purple-400",
    },
    {
      title: "Success Rate",
      value: "99.4%",
      change: "+0.2%",
      label: "Industry: 97.2%",
      icon: TrendingUp,
      color: "text-teal-400",
    },
  ]

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  return (
    <div>
      {/* Main Dashboard Workspace */}
      <main className="z-10 mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Merchant Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Here is what's happening with your store today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 px-3.5 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-900 active:scale-[0.98]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`}
              />
              Sync Data
            </button>
            <Button className="cursor-pointer gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4.5 py-1.5 text-xs font-semibold text-neutral-950 shadow-lg transition-all hover:from-emerald-400 hover:to-teal-400">
              <Plus className="h-3.5 w-3.5 stroke-[3px]" />
              New Payment Link
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div
                key={i}
                className="group rounded-xl border border-neutral-900 bg-neutral-900/40 p-5 transition-all duration-300 hover:border-neutral-800/80"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                    {stat.title}
                  </span>
                  <div
                    className={`rounded-lg border border-neutral-900 bg-neutral-950/60 p-2 transition-all group-hover:border-neutral-800 ${stat.color}`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white">
                    {stat.value}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {stat.change}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-neutral-600">
                  {stat.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* Info Banner */}
        <div className="relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-emerald-900/20 bg-gradient-to-r from-emerald-950/30 to-neutral-900 p-6 md:flex-row md:items-center md:justify-between">
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Verify your business profile
            </h2>
            <p className="max-w-2xl text-sm text-neutral-400">
              You are currently in developer testing mode. Complete your
              business KYC onboarding to enable production payouts and accept
              real credit card and bank payments globally.
            </p>
          </div>
          <Button
            variant="outline"
            className="cursor-pointer gap-1.5 self-start border-emerald-500/30 font-semibold text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 md:self-auto"
          >
            Complete Profile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Transactions & Activity Table */}
        <div className="overflow-hidden rounded-xl border border-neutral-900 bg-neutral-900/20">
          <div className="flex items-center justify-between border-b border-neutral-900/60 px-6 py-5">
            <h3 className="text-lg font-bold text-white">
              Recent Transactions
            </h3>
            <a
              href="#"
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              View all transactions
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-900 bg-neutral-950/30 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
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
                    <tr
                      key={index}
                      className="text-sm transition-colors hover:bg-neutral-900/20"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                        {txn.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {txn.customer}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {txn.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-400">
                        {txn.date}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-semibold ${
                            txn.type === "charge"
                              ? "text-emerald-400"
                              : txn.type === "refund"
                                ? "text-amber-400"
                                : "text-neutral-400"
                          }`}
                        >
                          {txn.amount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            txn.status === "Successful"
                              ? "border-emerald-500/20 bg-emerald-950/30 text-emerald-400"
                              : txn.status === "Pending"
                                ? "border-amber-500/20 bg-amber-950/30 text-amber-400"
                                : "border-red-500/20 bg-red-950/30 text-red-400"
                          }`}
                        >
                          {txn.status === "Successful" && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {txn.status === "Pending" && (
                            <Clock className="h-3 w-3" />
                          )}
                          {txn.status === "Failed" && (
                            <XCircle className="h-3 w-3" />
                          )}
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
    </div>
  )
}
