"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { cx } from "@/lib/format";

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-brand-950/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cx(
              "relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-white shadow-2xl sm:max-w-md sm:rounded-[28px]",
              className,
            )}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" />
            {(title || description) && (
              <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-1 pt-4">
                <div>
                  {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1 grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
