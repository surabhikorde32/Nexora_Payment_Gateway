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

import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route,
  Navigate,
} from "react-router-dom"
import { Signup } from "@/container/auth/Signup"
import { Login } from "@/container/auth/Login"
import { Dashboard } from "@/container/pages/Dashboard"
import { RecoverPassword } from "@/container/auth/RecoverPassword"
import { Layout } from "@/components/layout/Layout"
import { SendPage } from "@/container/pages/Send"

export function Routes() {
  return (
    <BrowserRouter>
      <RouterRoutes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recover" element={<RecoverPassword />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/send" element={<SendPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/signup" replace />} />
      </RouterRoutes>
    </BrowserRouter>
  )
}
