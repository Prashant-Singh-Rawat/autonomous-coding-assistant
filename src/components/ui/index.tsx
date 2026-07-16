"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ─── Button Component ──────────────────────────────────────────────────────────
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", leftIcon, rightIcon, loading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={loading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
          {
            "bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:opacity-90 shadow-glow-sm border border-brand-400/20": variant === "default",
            "bg-red-600 text-white hover:bg-red-700 shadow-sm": variant === "destructive",
            "border border-white/10 bg-transparent text-white/80 hover:bg-white/5 hover:text-white": variant === "outline",
            "bg-white/5 text-white/90 hover:bg-white/8 border border-white/6": variant === "secondary",
            "text-white/70 hover:bg-white/5 hover:text-white": variant === "ghost",
            "text-brand-400 underline-offset-4 hover:underline": variant === "link",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-8 px-3 rounded-lg text-[11px]": size === "sm",
            "h-11 px-6 text-sm": size === "lg",
            "h-9 w-9 p-0": size === "icon",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          leftIcon && <span className="mr-1.5 flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && !loading && <span className="ml-1.5 flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";

// ─── Input Component ───────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          ref={ref}
          className={cn(
            "tony-input",
            error && "border-red-500/50 focus:border-red-500/80 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-[10px] text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ─── Card Component ────────────────────────────────────────────────────────────
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-card rounded-2xl", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold leading-none tracking-tight text-white", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

// ─── Badge Component ───────────────────────────────────────────────────────────
export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "destructive" | "success" | "warning" | "blue";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500",
        {
          "border-brand-500/20 bg-brand-500/10 text-brand-400": variant === "default",
          "border-white/10 bg-white/5 text-white/80": variant === "secondary",
          "border-red-500/20 bg-red-500/10 text-red-400": variant === "destructive",
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400": variant === "success",
          "border-amber-500/20 bg-amber-500/10 text-amber-400": variant === "warning",
          "border-blue-500/20 bg-blue-500/10 text-blue-405": variant === "blue",
        },
        className
      )}
      {...props}
    />
  );
}

// ─── Progress Component ────────────────────────────────────────────────────────
export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/5 border border-white/6", className)}>
      <div
        className="h-full w-full flex-1 progress-bar transition-all duration-300 ease-in-out"
        style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))})` }}
      />
    </div>
  );
}

// ─── Skeleton Component ────────────────────────────────────────────────────────
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

// ─── Avatar Component ──────────────────────────────────────────────────────────
export function Avatar({ src, alt, fallback, className }: { src?: string | null; alt?: string; fallback?: string; className?: string }) {
  return (
    <div className={cn("relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5", className)}>
      {src ? (
        <img src={src} alt={alt || "Avatar"} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full text-xs font-semibold text-white/70">
          {fallback || "?"}
        </div>
      )}
    </div>
  );
}

// ─── Separator Component ───────────────────────────────────────────────────────
export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      className={cn(
        "shrink-0 bg-white/8",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  );
}

// ─── Status Dot Component ──────────────────────────────────────────────────────
export function StatusDot({ status }: { status: "success" | "warning" | "error" | "info" | "neutral" }) {
  return (
    <span
      className={cn("status-dot", {
        "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]": status === "success",
        "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]": status === "warning",
        "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]": status === "error",
        "bg-brand-400 shadow-[0_0_8px_rgba(79,107,255,0.4)]": status === "info",
        "bg-neutral-500": status === "neutral",
      })}
    />
  );
}

// ─── Empty State Component ─────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-white/[0.02] border border-white/6 py-12">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed">{description}</p>
      {action && action}
    </div>
  );
}
