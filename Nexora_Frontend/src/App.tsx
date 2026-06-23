import { Toaster } from "sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Routes } from "./routes/Routes";

export function App() {
    const [queryClient] = useState(() => new QueryClient());

  return (
    <>
      <Toaster position="bottom-right" theme="dark" closeButton richColors />
    <QueryClientProvider client={queryClient}>
      <Routes />
      </QueryClientProvider>
    </>
  )
}

export default App
