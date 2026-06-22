// components/layout/Layout.tsx
import { Outlet, Navigate } from "react-router-dom"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { useEffect, useState } from "react"
import { authService } from "@/services/authService"

export function Layout() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    authService.isAuthenticated()
  )
  const [isLoading, setIsLoading] = useState(!authService.isSessionChecked())

  useEffect(() => {
    let isMounted = true

    const unsubscribe = authService.addListener((auth) => {
      if (!isMounted) return
      setIsAuthenticated(auth)
      setIsLoading(!authService.isSessionChecked())
    })

    authService.initializeSession().then((auth) => {
      if (!isMounted) return
      setIsAuthenticated(auth)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 font-sans text-neutral-100 selection:bg-emerald-500 selection:text-neutral-950">
      {/* Glowing background highlights */}
      <div className="pointer-events-none absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[150px]" />

      <Header />
      <main className="z-10 mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet /> {/* This renders the nested route components */}
      </main>
      <Footer />
    </div>
  )
}
