import * as React from "react"
import { Copy, Mail, ShieldCheck, UserRound, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authService, type User } from "@/services/authService"

const displayValue = (value?: string | null) => value || "Not available"

const shortenValue = (value?: string | null) => {
  if (!value) return "Not available"
  if (value.length <= 18) return value

  return `${value.slice(0, 10)}...${value.slice(-8)}`
}

export function Profile() {
  const [user, setUser] = React.useState<User | null>(authService.getCurrentUserSync())
  const [copiedWallet, setCopiedWallet] = React.useState(false)
  const [copiedPublicKey, setCopiedPublicKey] = React.useState(false)

  React.useEffect(() => {
    return authService.addListener((_auth, nextUser) => {
      setUser(nextUser)
    })
  }, [])

  const handleCopyWallet = async () => {
    if (!user?.walletAddress) return

    await navigator.clipboard.writeText(user.walletAddress)
    setCopiedWallet(true)
    setTimeout(() => setCopiedWallet(false), 1800)
  }

  const handleCopyPublicKey = async () => {
    if (!user?.publicKey) return

    await navigator.clipboard.writeText(user.publicKey)
    setCopiedPublicKey(true)
    setTimeout(() => setCopiedPublicKey(false), 1800)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-neutral-400">View your Nexora account and wallet details.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-5">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-2xl font-bold text-emerald-400">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserRound className="h-8 w-8" />}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">{displayValue(user?.full_name)}</h2>
            <p className="mt-1 text-sm text-neutral-400">{displayValue(user?.email)}</p>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-5">
          <div className="mb-5 flex items-center justify-between border-b border-neutral-900 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Account Details</h2>
              <p className="text-sm text-neutral-500">Data loaded from your active session.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                <UserRound className="h-4 w-4" />
                Full Name
              </div>
              <p className="text-sm text-neutral-100">{displayValue(user?.full_name)}</p>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                <Mail className="h-4 w-4" />
                Email Address
              </div>
              <p className="text-sm text-neutral-100">{displayValue(user?.email)}</p>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                <Wallet className="h-4 w-4" />
                Wallet Address
              </div>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-mono text-sm text-neutral-100">
                  {shortenValue(user?.walletAddress)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWallet}
                  disabled={!user?.walletAddress}
                  className="gap-2 border-neutral-800 text-neutral-200 hover:bg-neutral-900 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copiedWallet ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                <ShieldCheck className="h-4 w-4" />
                Public Key
              </div>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-mono text-sm text-neutral-100">
                  {shortenValue(user?.publicKey)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPublicKey}
                  disabled={!user?.publicKey}
                  className="gap-2 border-neutral-800 text-neutral-200 hover:bg-neutral-900 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copiedPublicKey ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}




