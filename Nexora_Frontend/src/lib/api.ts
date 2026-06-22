import { showToast } from "./toast"

/**
 * Custom API Error class to handle HTTP response errors consistently
 */
export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}

const BASE_URL = import.meta.env.VITE_API_URL 

/**
 * Common request wrapper to centralize headers, cookies, and error handling
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Ensure cookies (like session cookies) are sent/received
  }

  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `${endpoint}`}`

  try {
    const response = await fetch(url, config)

    // Check if the response is JSON
    const contentType = response.headers.get("content-type")
    const isJson = contentType && contentType.includes("application/json")
    const data = isJson ? await response.json() : null

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`

      // Auto-trigger error toast
      showToast(errorMessage, "error")

      throw new ApiError(errorMessage, response.status, data?.errors)
    }

    // Auto-trigger success toast for POST requests
    if (options.method === "POST") {
      const successMessage = data?.message || "Operation successful"
      showToast(successMessage, "success")
    }

    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    const networkErrorMessage = "Unable to connect to the server. Please check your network connection."
    showToast(networkErrorMessage, "error")
    throw new ApiError(networkErrorMessage, 503)
  }
}



// Common easy-to-use API object wrapper
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
}
