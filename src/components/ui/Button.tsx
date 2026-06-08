"use client";

import React from "react";

type Variant = "primary" | "accent" | "success" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  accent:  "btn-accent",
  success: "btn-success",
  danger:  "btn-danger",
  ghost:   "btn-ghost",
};

const sizeClass: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "btn",
        variantClass[variant],
        sizeClass[size],
        fullWidth ? "btn-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}
