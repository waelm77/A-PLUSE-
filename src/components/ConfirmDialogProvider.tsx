import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ConfirmContext, type ConfirmOptions } from "@/lib/confirm"

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    // A second request while one is open would orphan the first promise forever.
    resolverRef.current?.(false)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setPending(options)
    })
  }, [])

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setPending(null)
  }, [])

  const value = useMemo(() => confirm, [confirm])

  const {
    title,
    description,
    confirmLabel = "تأكيد",
    cancelLabel = "إلغاء",
    variant = "default",
  } = pending ?? {}

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) settle(false)
        }}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription className="whitespace-pre-line">{description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => settle(false)}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
