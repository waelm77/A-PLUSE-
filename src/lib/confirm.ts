import { createContext, useContext } from "react"

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** "destructive" paints the confirm button red; the default is neutral. */
  variant?: "destructive" | "default"
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Drop-in replacement for `window.confirm`, resolved from the in-app dialog:
 *
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: "حذف المادة؟", variant: "destructive" }))) return
 *
 * Dismissing via Escape, the overlay or the X button resolves `false`, exactly like
 * cancelling a native confirm.
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error("useConfirm must be used inside <ConfirmDialogProvider>")
  }
  return confirm
}
