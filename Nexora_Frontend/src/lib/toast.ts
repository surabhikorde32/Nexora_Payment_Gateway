import { toast } from "sonner"

/**
 * Thin wrapper over 'sonner' toast notification library.
 * Adapts key signatures to work across the codebase.
 */
export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  if (type === "success") {
    toast.success(message)
  } else if (type === "error") {
    toast.error(message)
  } else {
    toast(message)
  }
}
