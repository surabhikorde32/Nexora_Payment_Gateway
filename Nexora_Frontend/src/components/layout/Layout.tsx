// components/layout/Layout.tsx
import { Outlet, Navigate } from "react-router-dom"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { useEffect, useState } from "react"
import { authService } from "@/services/authService"

export function Layout() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated())
  const [isLoading, setIsLoading] = useState(!authService.isSessionChecked())

  useEffect(() => {
    // Listen to auth changes
    const unsubscribe = authService.addListener((auth, user) => {
      setIsAuthenticated(auth)
      setIsLoading(false)
    })

    // Initialize session if needed
    if (!authService.isSessionChecked()) {
      authService.initializeSession().finally(() => {
        setIsLoading(false)
      })
    }

    return unsubscribe
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />
//   }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950">
      {/* Glowing background highlights */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />
      
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 z-10">
        <Outlet /> {/* This renders the nested route components */}
      </main>
      <Footer />
    </div>
  )
}