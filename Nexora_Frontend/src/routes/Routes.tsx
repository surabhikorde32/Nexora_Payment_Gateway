import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route,
  Navigate,
} from "react-router-dom"
import { Signup } from "@/container/auth/Signup"
import { Login } from "@/container/auth/Login"
import { RecoverPassword } from "@/container/auth/RecoverPassword"
import { Dashboard } from "@/container/pages/Dashboard"
import { Profile } from "@/container/pages/Profile"
import { Layout } from "@/components/layout/Layout"

export function Routes() {
  return (
    <BrowserRouter>
      <RouterRoutes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recover" element={<RecoverPassword />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/signup" replace />} />
      </RouterRoutes>
    </BrowserRouter>
  )
}
