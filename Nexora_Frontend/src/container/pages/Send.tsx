import * as React from "react"
import { ArrowLeft, Send, Wallet } from "lucide-react"
import { Formik, Form, Field, ErrorMessage } from "formik"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { SendSchema } from "@/validations/validation"
import { authService } from "@/services/authService"

interface SendFormValues {
  toAddress: string
  amount: string
  note: string
}

export function SendPage() {
  const navigate = useNavigate()

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
  })

  const walletAddress = user?.walletAddress ?? ""

  const handleSubmit = async (values: SendFormValues) => {
    // TODO: integrate send transaction API / contract call
    console.log("Send payload:", values)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      <Card className="relative overflow-hidden border-neutral-800/80 bg-neutral-900/60 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-blue-500/50" />

        <CardHeader className="pb-4">
          <div className="mb-2 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Send className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold text-white">
            Send Crypto
          </CardTitle>
          <CardDescription className="text-center text-neutral-400">
            Transfer ETH to any wallet address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Sender wallet info */}
          {walletAddress && (
            <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2.5">
              <Wallet className="h-4 w-4 shrink-0 text-neutral-500" />
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">From</p>
                <p className="truncate font-mono text-xs text-neutral-300">
                  {walletAddress}
                </p>
              </div>
            </div>
          )}

          <Formik<SendFormValues>
            initialValues={{ toAddress: "", amount: "", note: "" }}
            validationSchema={SendSchema}
            onSubmit={handleSubmit}
          >
            {({
              values,
              handleChange,
              handleBlur,
              touched,
              errors,
              isSubmitting,
            }) => (
              <Form className="space-y-4">
                {/* Recipient Address */}
                <div className="space-y-1.5">
                  <Label className="font-medium text-neutral-300">
                    Recipient Address
                  </Label>
                  <Field
                    id="toAddress"
                    name="toAddress"
                    type="text"
                    placeholder="0x..."
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.toAddress}
                    className={`w-full rounded-lg border bg-neutral-950/40 px-3 py-2 font-mono text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500 ${
                      touched.toAddress && errors.toAddress
                        ? "border-destructive"
                        : "border-neutral-800"
                    }`}
                  />
                  <ErrorMessage
                    name="toAddress"
                    component="p"
                    className="text-xs text-destructive"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label className="font-medium text-neutral-300">
                    Amount (ETH)
                  </Label>
                  <div className="relative">
                    <Field
                      id="amount"
                      name="amount"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.amount}
                      className={`w-full rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 pr-14 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500`}
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-neutral-500">
                      ETH
                    </span>
                  </div>
                  <ErrorMessage
                    name="amount"
                    component="p"
                    className="text-xs text-destructive"
                  />
                </div>

                {/* Note (optional) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium text-neutral-300">Note</Label>
                    <span className="text-xs text-neutral-500">
                      Optional · {values.note.length}/100
                    </span>
                  </div>
                  <Field
                    as="textarea"
                    id="note"
                    name="note"
                    rows={2}
                    placeholder="What's this for?"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.note}
                    className={`w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500`}
                  />
                  <ErrorMessage
                    name="note"
                    component="p"
                    className="text-xs text-destructive"
                  />
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
                      Send Transaction
                    </>
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  )
}
