import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  CreditCard,
  ArrowRight,
  Check,
} from "lucide-react"
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
import { Formik, Form, Field, ErrorMessage } from "formik"
import { SignupSchema } from "@/validations/validation"
import { useMutation } from "@tanstack/react-query"

interface SignupFormValues {
  full_name: string
  email: string
  password: string
  terms: boolean

}

export function Signup() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = React.useState(false)

  const loginMutation = useMutation({
    mutationFn: (payload: Omit<SignupFormValues, "terms">) =>
      authService.signup(payload),
    onSuccess: () => {
      setTimeout(() => {
        navigate("/dashboard")
      }, 1500)
    },
    onError: () => {},
  })

  const handleSubmit = async (values: SignupFormValues) => {
    // Destructure terms and pass the rest as payload
    const { terms, ...payload } = values
    await loginMutation.mutateAsync(payload)
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-radial from-neutral-900 via-neutral-950 to-black px-4 py-12 text-neutral-100 selection:bg-primary selection:text-primary-foreground">
      {/* Background glowing blobs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="z-10 w-full max-w-md">
        {/* Logo/Brand Header */}
        <div className="animate-fade-in-down mb-8 flex flex-col items-center">
          <div className="mb-2 flex items-center gap-2.5 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
              <CreditCard className="h-5 w-5 font-bold text-neutral-950" />
            </div>
            <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Nexora
            </span>
          </div>
          <p className="text-sm text-neutral-400">
            Empowering modern digital commerce
          </p>
        </div>

        {/* Card Form */}
        <Card className="relative overflow-hidden border-neutral-800/80 bg-neutral-900/60 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-neutral-700/50">
          <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-blue-500/50" />

          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-2xl font-bold text-white">
              Create Account
            </CardTitle>
            <CardDescription className="text-center text-neutral-400">
              Get started with your payment gateway account
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {loginMutation?.isSuccess ? (
              <div className="animate-fade-in flex flex-col items-center justify-center space-y-4 py-8 text-center">
                <div className="flex h-16 w-16 animate-bounce items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/20 text-emerald-400">
                  <Check className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">
                    Registration Successful!
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Welcome aboard. Redirecting to your dashboard...
                  </p>
                </div>
              </div>
            ) : (
              <Formik
                initialValues={{
                  full_name: "",
                  email: "",
                  password: "",
               
                  terms: false,
                }}
                validationSchema={SignupSchema}
                onSubmit={handleSubmit}
              >
                {({ errors, touched, handleChange, handleBlur, values }) => (
                  <Form className="space-y-4">
                    {/* Error display from formik status */}
                    {/* {status && (
                      <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{status}</span>
                      </div>
                    )} */}

                    {/* Name Field */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="name"
                        className="font-medium text-neutral-300"
                      >
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <Field
                          id="name"
                          name="full_name"
                          type="text"
                          placeholder="John Doe"
                          disabled={loginMutation?.isPending}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.full_name}
                          className={`w-full rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 pl-10 text-neutral-100 transition-all duration-200 outline-none placeholder:text-neutral-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50 ${
                            touched.full_name && errors.full_name
                              ? "border-destructive focus-visible:ring-destructive/50"
                              : ""
                          }`}
                        />
                      </div>
                      <ErrorMessage
                        name="full_name"
                        component="p"
                        className="mt-1 text-xs text-destructive"
                      />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="email"
                        className="font-medium text-neutral-300"
                      >
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <Field
                          id="email"
                          name="email"
                          type="email"
                          placeholder="name@example.com"
                          disabled={loginMutation?.isPending}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.email}
                          className={`w-full rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 pl-10 text-neutral-100 transition-all duration-200 outline-none placeholder:text-neutral-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50 ${
                            touched.email && errors.email
                              ? "border-destructive focus-visible:ring-destructive/50"
                              : ""
                          }`}
                        />
                      </div>
                      <ErrorMessage
                        name="email"
                        component="p"
                        className="mt-1 text-xs text-destructive"
                      />
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="password"
                          className="font-medium text-neutral-300"
                        >
                          Password
                        </Label>
                      </div>
                      <div className="relative">
                        <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <Field
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={loginMutation?.isPending}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.password}
                          className={`w-full rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 pr-10 pl-10 text-neutral-100 transition-all duration-200 outline-none placeholder:text-neutral-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50 ${
                            touched.password && errors.password
                              ? "border-destructive focus-visible:ring-destructive/50"
                              : ""
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loginMutation?.isPending}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300 focus:outline-hidden"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <ErrorMessage
                        name="password"
                        component="p"
                        className="mt-1 text-xs text-destructive"
                      />
                    </div>

                    {/* Terms and Conditions */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 pt-1">
                        <Field
                          type="checkbox"
                          id="terms"
                          name="terms"
                          disabled={loginMutation?.isPending}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          checked={values.terms}
                          className={`h-4 w-4 rounded-sm border-neutral-800 bg-neutral-950/40 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-neutral-900 ${
                            touched.terms && errors.terms
                              ? "border-destructive"
                              : ""
                          }`}
                        />
                        <label
                          htmlFor="terms"
                          className="cursor-pointer text-xs text-neutral-400 selection:bg-transparent"
                        >
                          I agree to the{" "}
                          <a
                            href="#"
                            className="text-emerald-400 hover:underline"
                          >
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-emerald-400 hover:underline"
                          >
                            Privacy Policy
                          </a>
                        </label>
                      </div>
                      <ErrorMessage
                        name="terms"
                        component="p"
                        className="text-xs text-destructive"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={loginMutation?.isPending}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 font-semibold text-neutral-950 shadow-lg transition-all duration-300 hover:scale-[1.01] hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/10 active:scale-[0.99]"
                    >
                      {loginMutation?.isPending ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </Form>
                )}
              </Formik>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 border-t border-neutral-800/40 bg-neutral-950/20 py-4 text-center">
            <p className="text-sm text-neutral-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-emerald-400 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

