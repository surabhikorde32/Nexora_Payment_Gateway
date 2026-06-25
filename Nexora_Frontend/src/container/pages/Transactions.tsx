import * as React from "react"
import { CheckCircle, Clock, Search, XCircle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

type TxType = "charge" | "refund" | "payout"
type TxStatus = "Successful" | "Pending" | "Failed"

interface Transaction {
  id: string
  customer: string
  email: string
  amount: string
  status: TxStatus
  date: string
  type: TxType
}

const fetchAllTransactions = async (): Promise<Transaction[]> => [
  { id: "TXN-9021", customer: "Sophia Martinez",  email: "sophia@example.com",   amount: "+$350.00",   status: "Successful", date: "June 22, 2026", type: "charge"  },
  { id: "TXN-9020", customer: "Jackson Reed",     email: "jackson@example.com",   amount: "+$1,200.00", status: "Successful", date: "June 22, 2026", type: "charge"  },
  { id: "TXN-9019", customer: "Olivia Vance",     email: "olivia@example.com",    amount: "-$45.00",    status: "Pending",    date: "June 21, 2026", type: "refund"  },
  { id: "TXN-9018", customer: "Liam Gallagher",   email: "liam@example.com",      amount: "+$89.99",    status: "Successful", date: "June 20, 2026", type: "charge"  },
  { id: "TXN-9017", customer: "Emma Watson",      email: "emma@example.com",      amount: "-$120.00",   status: "Failed",     date: "June 19, 2026", type: "payout"  },
  { id: "TXN-9016", customer: "Noah Kim",         email: "noah@example.com",      amount: "+$675.00",   status: "Successful", date: "June 18, 2026", type: "charge"  },
  { id: "TXN-9015", customer: "Ava Thompson",     email: "ava@example.com",       amount: "-$30.00",    status: "Pending",    date: "June 17, 2026", type: "refund"  },
  { id: "TXN-9014", customer: "Mason Lee",        email: "mason@example.com",     amount: "+$500.00",   status: "Successful", date: "June 16, 2026", type: "charge"  },
  { id: "TXN-9013", customer: "Isabella Clark",   email: "isabella@example.com",  amount: "-$200.00",   status: "Failed",     date: "June 15, 2026", type: "payout"  },
  { id: "TXN-9012", customer: "Ethan Brown",      email: "ethan@example.com",     amount: "+$99.99",    status: "Successful", date: "June 14, 2026", type: "charge"  },
  { id: "TXN-9011", customer: "Mia Davis",        email: "mia@example.com",       amount: "-$60.00",    status: "Pending",    date: "June 13, 2026", type: "refund"  },
  { id: "TXN-9010", customer: "Lucas Wilson",     email: "lucas@example.com",     amount: "+$2,500.00", status: "Successful", date: "June 12, 2026", type: "charge"  },
]

const PAGE_SIZE = 8

const statusStyles: Record<TxStatus, string> = {
  Successful: "border-emerald-500/20 bg-emerald-950/30 text-emerald-400",
  Pending:    "border-amber-500/20  bg-amber-950/30  text-amber-400",
  Failed:     "border-red-500/20    bg-red-950/30    text-red-400",
}

const amountStyles: Record<TxType, string> = {
  charge: "text-emerald-400",
  refund: "text-amber-400",
  payout: "text-neutral-400",
}

const StatusIcon = ({ status }: { status: TxStatus }) => {
  if (status === "Successful") return <CheckCircle className="h-3 w-3" />
  if (status === "Pending")    return <Clock       className="h-3 w-3" />
  return                              <XCircle     className="h-3 w-3" />
}

export function TransactionsPage() {
  const [search, setSearch]       = React.useState("")
  const [statusFilter, setStatus] = React.useState<TxStatus | "All">("All")
  const [typeFilter, setType]     = React.useState<TxType | "All">("All")
  const [page, setPage]           = React.useState(1)

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["allTransactions"],
    queryFn: fetchAllTransactions,
    staleTime: 60 * 1000,
  })

  // Reset to page 1 when filters change
  React.useEffect(() => { setPage(1) }, [search, statusFilter, typeFilter])

  const filtered = transactions.filter((t) => {
    const matchSearch =
      search === "" ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "All" || t.status === statusFilter
    const matchType   = typeFilter   === "All" || t.type   === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Transactions</h1>
        <p className="mt-1 text-sm text-neutral-400">Full history of all your payment activity.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name or email…"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 pl-9 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value as TxStatus | "All")}
          className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-emerald-500"
        >
          <option value="All">All Statuses</option>
          <option value="Successful">Successful</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setType(e.target.value as TxType | "All")}
          className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-emerald-500"
        >
          <option value="All">All Types</option>
          <option value="charge">Charge</option>
          <option value="refund">Refund</option>
          <option value="payout">Payout</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-900 bg-neutral-900/20">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-900 bg-neutral-950/30 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                <th className="px-6 py-3.5">Transaction ID</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/40">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 animate-pulse rounded bg-neutral-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-neutral-500">
                    No transactions match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((txn) => (
                  <tr key={txn.id} className="text-sm transition-colors hover:bg-neutral-900/20">
                    <td className="px-6 py-4 font-mono text-xs text-neutral-400">{txn.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{txn.customer}</div>
                      <div className="text-xs text-neutral-500">{txn.email}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-400">{txn.date}</td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-xs text-neutral-400">{txn.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${amountStyles[txn.type]}`}>{txn.amount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[txn.status]}`}>
                        <StatusIcon status={txn.status} />
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-neutral-900/60 px-6 py-4">
            <p className="text-xs text-neutral-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                    page === i + 1
                      ? "bg-emerald-500 text-neutral-950"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
