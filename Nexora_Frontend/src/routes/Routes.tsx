// import {
//   BrowserRouter,
//   Routes as RouterRoutes,
//   Route,
//   Navigate,
// } from "react-router-dom"
// import { Signup } from "@/container/auth/Signup"
// import { Login } from "@/container/auth/Login"
// import { Dashboard } from "@/container/pages/Dashboard"

// export function Routes() {
//   return (
//     <BrowserRouter>
//       <RouterRoutes>
//         <Route path="/signup" element={<Signup />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/dashboard" element={<Dashboard />} />
//         <Route path="*" element={<Navigate to="/signup" replace />} />
//       </RouterRoutes>
//     </BrowserRouter>
//   )
// }

// export default Routes


// src/Routes.tsx
import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route,
  Navigate,
} from "react-router-dom"
import { Signup } from "@/container/auth/Signup"
import { Login } from "@/container/auth/Login"
import { Dashboard } from "@/container/pages/Dashboard"
import { useEffect, useState } from "react"
import { authService } from "@/services/authService"

// Auth Guard Component (inline in Routes file)
function AuthGuard({ children, requireAuth = true }: { children: React.ReactNode, requireAuth?: boolean }) {
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export function Routes() {
  return (
    <BrowserRouter>
      <RouterRoutes>
        <Route 
          path="/signup" 
          element={
            <AuthGuard requireAuth={false}>
              <Signup />
            </AuthGuard>
          } 
        />
        <Route 
          path="/login" 
          element={
            <AuthGuard requireAuth={false}>
              <Login />
            </AuthGuard>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <AuthGuard requireAuth={true}>
              <Dashboard />
            </AuthGuard>
          } 
        />
        <Route path="*" element={<Navigate to="/signup" replace />} />
      </RouterRoutes>
    </BrowserRouter>
  )
}

export default Routes