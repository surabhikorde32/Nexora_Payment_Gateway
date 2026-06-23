import * as React from "react"
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Send, Wallet } from "lucide-react"
import { Formik, Form, Field, ErrorMessage } from "formik"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SendSchema, SendPasswordSchema } from "@/validations/validation"
import { authService } from "@/services/authService"

interface SendFormValues {
  toAddress: string
  amount: string
  note: string
}

interface PasswordFormValues {
  password: string
}

type Step = "details" | "confirm"

export function SendPage() {
  const navigate = useNavigate()
  const [step, setStep] = React.useState<Step>("details")
  const [sendDetails, setSendDetails] = React.useState<SendFormValues | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
  })

  const walletAddress = user?.walletAddress ?? ""

  const handleDetailsContinue = (values: SendFormValues) => {
    setSendDetails(values)
    setStep("confirm")
  }

  const handleConfirm = async (_values: PasswordFormValues) => {
    // TODO: decrypt private key with password and send transaction
    console.log("Send tx:", sendDetails)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <button
        onClick={() => step === "confirm" ? setStep("details") : navigate("/dashboard")}
        className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {step === "confirm" ? "Back to Send Details" : "Back to Dashboard"}
      </button>

      <Card className="relative overflow-hidden border-neutral-800/80 bg-neutral-900/60 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-blue-500/50" />

        {/* ── Step indicators ── */}
        <div className="flex items-center justify-center gap-3 px-6 pt-6">
          {(["details", "confirm"] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                step === s
                  ? "border-emerald-500 bg-emerald-500 text-neutral-950"
                  : i < (step === "confirm" ? 1 : 0)
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                    : "border-neutral-700 bg-neutral-800 text-neutral-500"
              }`}>
                {i + 1}
              </div>
              {i === 0 && (
                <div className={`h-px w-10 transition-colors ${step === "confirm" ? "bg-emerald-500/50" : "bg-neutral-800"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <CardHeader className="pb-4">
          <div className="mb-2 flex justify-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border text-emerald-400 ${
              step === "confirm"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-emerald-500/30 bg-emerald-500/10"
            }`}>
              {step === "confirm" ? <Lock className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold text-white">
            {step === "confirm" ? "Confirm Transaction" : "Send Crypto"}
          </CardTitle>
          <CardDescription className="text-center text-neutral-400">
            {step === "confirm"
              ? "Enter your password to authorise this transaction"
              : "Transfer ETH to any wallet address"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* ── Step 1: Send Details ── */}
          {step === "details" && (
            <>
              {walletAddress && (
                <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2.5">
                  <Wallet className="h-4 w-4 shrink-0 text-neutral-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">From</p>
                    <p className="truncate font-mono text-xs text-neutral-300">{walletAddress}</p>
                  </div>
                </div>
              )}

              <Formik<SendFormValues>
                initialValues={sendDetails ?? { toAddress: "", amount: "", note: "" }}
                validationSchema={SendSchema}
                onSubmit={handleDetailsContinue}
              >
                {({ values, handleChange, handleBlur, touched, errors }) => (
                  <Form className="space-y-4">
                    {/* Recipient Address */}
                    <div className="space-y-1.5">
                      <Label className="font-medium text-neutral-300">Recipient Address</Label>
                      <Field
                        name="toAddress"
                        type="text"
                        placeholder="0x..."
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.toAddress}
                        className={`w-full rounded-lg border bg-neutral-950/40 px-3 py-2 font-mono text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500 ${
                          touched.toAddress && errors.toAddress ? "border-destructive" : "border-neutral-800"
                        }`}
                      />
                      <ErrorMessage name="toAddress" component="p" className="text-xs text-destructive" />
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <Label className="font-medium text-neutral-300">Amount (ETH)</Label>
                      <div className="relative">
                        <Field
                          name="amount"
                          type="number"
                          step="any"
                          placeholder="0.00"
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.amount}
                          className={`w-full rounded-lg border bg-neutral-950/40 px-3 py-2 pr-14 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500 ${
                            touched.amount && errors.amount ? "border-destructive" : "border-neutral-800"
                          }`}
                        />
                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-neutral-500">ETH</span>
                      </div>
                      <ErrorMessage name="amount" component="p" className="text-xs text-destructive" />
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-neutral-300">Note</Label>
                        <span className="text-xs text-neutral-500">Optional · {values.note.length}/100</span>
                      </div>
                      <Field
                        as="textarea"
                        name="note"
                        rows={2}
                        placeholder="What's this for?"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.note}
                        className={`w-full resize-none rounded-lg border bg-neutral-950/40 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500 ${
                          touched.note && errors.note ? "border-destructive" : "border-neutral-800"
                        }`}
                      />
                      <ErrorMessage name="note" component="p" className="text-xs text-destructive" />
                    </div>

                    <Button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold text-neutral-950 hover:from-emerald-400 hover:to-teal-400"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Form>
                )}
              </Formik>
            </>
          )}

          {/* ── Step 2: Password Confirm ── */}
          {step === "confirm" && sendDetails && (
            <>
              {/* Transaction summary */}
              <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-neutral-500">To</span>
                  <span className="max-w-[220px] truncate font-mono text-xs text-neutral-200">{sendDetails.toAddress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Amount</span>
                  <span className="font-semibold text-emerald-400">{sendDetails.amount} ETH</span>
                </div>
                {sendDetails.note && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-neutral-500">Note</span>
                    <span className="text-neutral-300">{sendDetails.note}</span>
                  </div>
                )}
              </div>

              <Formik<PasswordFormValues>
                initialValues={{ password: "" }}
                validationSchema={SendPasswordSchema}
                onSubmit={handleConfirm}
              >
                {({ values, handleChange, handleBlur, touched, errors, isSubmitting }) => (
                  <Form className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="font-medium text-neutral-300">Wallet Password</Label>
                      <div className="relative">
                        <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <Field
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.password}
                          className={`w-full rounded-lg border bg-neutral-950/40 px-3 py-2 pl-10 pr-10 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500 ${
                            touched.password && errors.password ? "border-destructive" : "border-neutral-800"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <ErrorMessage name="password" component="p" className="text-xs text-destructive" />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold text-neutral-950 hover:from-emerald-400 hover:to-teal-400"
                    >
                      {isSubmitting ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Confirm & Send
                        </>
                      )}
                    </Button>
                  </Form>
                )}
              </Formik>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
