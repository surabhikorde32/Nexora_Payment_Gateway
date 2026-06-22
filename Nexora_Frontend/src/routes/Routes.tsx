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

import { Layout } from "@/components/layout/Layout"

export function Routes() {
  return (
    <BrowserRouter>
      <RouterRoutes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/signup" replace />} />
      </RouterRoutes>
    </BrowserRouter>
  )
}

export default Routes
