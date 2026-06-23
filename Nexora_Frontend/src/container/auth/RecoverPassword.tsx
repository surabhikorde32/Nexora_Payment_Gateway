import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { CreditCard, ShieldCheck, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useMutation } from "@tanstack/react-query"

export function RecoverPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState("")
  const [mnemonic, setMnemonic] = React.useState("")
  const [success, setSuccess] = React.useState(false)

  const recoverMutation = useMutation({
    mutationFn: () => api.post("users/recover", { email: email.trim().toLowerCase(), mnemonic: mnemonic.trim() }),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => navigate("/dashboard"), 1500)
    },
    onError: () => {},
  })

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-radial from-neutral-900 via-neutral-950 to-black text-neutral-100">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex h-16 w-16 animate-bounce items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/20 text-emerald-400">
            <Check className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-white">Account Recovered!</h3>
          <p className="text-sm text-neutral-400">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-radial from-neutral-900 via-neutral-950 to-black px-4 py-12 text-neutral-100">
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-2 flex items-center gap-2.5 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
              <CreditCard className="h-5 w-5 font-bold text-neutral-950" />
            </div>
            <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Nexora
            </span>
          </div>
        </div>

        <Card className="relative overflow-hidden border-neutral-800/80 bg-neutral-900/60 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-blue-500/50" />

          <CardHeader className="pb-4">
            <div className="mb-2 flex justify-center">
              <ShieldCheck className="h-10 w-10 text-emerald-400" />
            </div>
            <CardTitle className="text-center text-2xl font-bold text-white">Recover Account</CardTitle>
            <CardDescription className="text-center text-neutral-400">
              Enter your email and 12-word recovery phrase to regain access
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="font-medium text-neutral-300">Email Address</Label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={recoverMutation.isPending}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-medium text-neutral-300">Recovery Phrase</Label>
              <textarea
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="word1 word2 word3 ... word12"
                disabled={recoverMutation.isPending}
                rows={3}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 font-mono text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500"
              />
              <p className="text-xs text-neutral-500">Enter all 12 words separated by spaces</p>
            </div>

            <Button
              onClick={() => recoverMutation.mutate()}
              disabled={recoverMutation.isPending || !email || !mnemonic}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold text-neutral-950 hover:from-emerald-400 hover:to-teal-400"
            >
              {recoverMutation.isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
              ) : (
                "Recover Account"
              )}
            </Button>
          </CardContent>

          <CardFooter className="border-t border-neutral-800/40 bg-neutral-950/20 py-4 text-center">
            <p className="w-full text-sm text-neutral-400">
              Remember your password?{" "}
              <Link to="/login" className="font-medium text-emerald-400 hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
