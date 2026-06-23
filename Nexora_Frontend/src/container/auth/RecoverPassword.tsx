import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react"
import { Formik, Form, Field, ErrorMessage } from "formik"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authService } from "@/services/authService"
import { RecoverPasswordSchema } from "@/validations/validation"

interface RecoverFormValues {
  email: string
  password: string
  mnemonic: string
}

export function RecoverPassword() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = React.useState(false)

  const recoverMutation = useMutation({
    mutationFn: (values: RecoverFormValues) =>
      authService.recoverWithMnemonic(values),
    onSuccess: () => {
      setTimeout(() => navigate("/login"), 1500)
    },
    onError: () => {},
  })

  const handleSubmit = async (
    values: RecoverFormValues,
    { setFieldError }: { setFieldError: (field: string, message: string) => void }
  ) => {
    try {
      await recoverMutation.mutateAsync(values)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid recovery phrase"
      setFieldError("mnemonic", "Recovery phrase does not match this account")
      if (!message.toLowerCase().includes("recovery") &&
          !message.toLowerCase().includes("phrase") &&
          !message.toLowerCase().includes("invalid")) {
        setFieldError("mnemonic", message)
      }
    }
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
            <CardTitle className="text-center text-2xl font-bold text-white">
              Recover Account
            </CardTitle>
            <CardDescription className="text-center text-neutral-400">
              Restore your wallet locally with your 12-word recovery phrase
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {recoverMutation.isSuccess ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
                <div className="flex h-16 w-16 animate-bounce items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/20 text-emerald-400">
                  <Check className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">
                    Account Recovered Successfully!
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Your wallet was restored. Redirecting to login...
                  </p>
                </div>
              </div>
            ) : (
              <Formik
                initialValues={{ email: "", password: "", mnemonic: "" }}
                validationSchema={RecoverPasswordSchema}
                onSubmit={handleSubmit}
              >
                {({ values, handleChange, handleBlur, touched, errors, isSubmitting }) => (
                  <Form className="space-y-4">
                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label className="font-medium text-neutral-300">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <Field
                          id="email"
                          name="email"
                          type="email"
                          placeholder="name@example.com"
                          disabled={recoverMutation.isPending}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.email}
                          className={`w-full rounded-lg border bg-neutral-950/40 px-3 py-2 pl-10 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500 ${
                            touched.email && errors.email
                              ? "border-destructive"
                              : "border-neutral-800"
                          }`}
                        />
                      </div>
                      <ErrorMessage
                        name="email"
                        component="p"
                        className="text-xs text-destructive"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label className="font-medium text-neutral-300">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <Field
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={recoverMutation.isPending}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.password}
                          className={`w-full rounded-lg border bg-neutral-950/40 px-3 py-2 pr-10 pl-10 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500 ${
                            touched.password && errors.password
                              ? "border-destructive"
                              : "border-neutral-800"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          disabled={recoverMutation.isPending}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300 focus:outline-hidden"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <ErrorMessage
                        name="password"
                        component="p"
                        className="text-xs text-destructive"
                      />
                    </div>

                    {/* Mnemonic */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-neutral-300">Recovery Phrase</Label>
                        <span className="text-xs text-neutral-500">
                          {values.mnemonic.trim().split(/\s+/).filter(Boolean).length}/12 words
                        </span>
                      </div>
                      <Field
                        as="textarea"
                        name="mnemonic"
                        placeholder="word1 word2 word3 ... word12"
                        disabled={recoverMutation.isPending}
                        rows={3}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.mnemonic}
                        className={`w-full resize-none rounded-lg border bg-neutral-950/40 px-3 py-2 font-mono text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500 ${
                          touched.mnemonic && errors.mnemonic
                            ? "border-destructive"
                            : "border-neutral-800"
                        }`}
                      />
                      <ErrorMessage
                        name="mnemonic"
                        component="p"
                        className="text-xs text-destructive"
                      />
                      {!(touched.mnemonic && errors.mnemonic) && (
                        <p className="text-xs text-neutral-500">
                          The phrase is used only in this browser session and is never sent to Nexora.
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={recoverMutation.isPending || isSubmitting}
                      className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold text-neutral-950 hover:from-emerald-400 hover:to-teal-400"
                    >
                      {recoverMutation.isPending || isSubmitting ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
                      ) : (
                        "Recover Account"
                      )}
                    </Button>
                  </Form>
                )}
              </Formik>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-neutral-800/40 bg-neutral-950/20 py-4">
            <Link to="/login" className="text-sm font-medium text-emerald-400 hover:underline">
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
