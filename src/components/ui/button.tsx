"use client";

import { LoaderCircle } from "lucide-react";
import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "@/lib/format";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-class";

type Props = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
};

/** While `loading`, the button is disabled and shows a spinner. */
export function Button({ variant, size, block, loading, icon, children, className, disabled, type, ...props }: Props) {
  return (
    <motion.button
      type={type ?? "button"}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      disabled={disabled || loading}
      className={cx(buttonClass(variant, size, block), className)}
      {...props}
    >
      {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : icon}
      {children}
    </motion.button>
  );
}
