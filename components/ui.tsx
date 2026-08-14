import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary:
      "bg-guinda text-white shadow-[0_8px_20px_-8px_rgba(122,18,51,0.55)] hover:bg-magenta hover:shadow-[0_10px_24px_-8px_rgba(200,33,95,0.55)] disabled:opacity-50 disabled:shadow-none",
    secondary:
      "border border-zinc-200 bg-white text-zinc-800 shadow-[0_2px_8px_-4px_rgba(28,10,18,0.12)] hover:bg-zinc-50",
    ghost: "text-zinc-600 hover:bg-zinc-100",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${styles} ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-magenta/30 transition-shadow focus:ring-2 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-magenta/30 transition-shadow focus:ring-2 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-magenta/30 transition-shadow focus:ring-2 ${className}`}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
      {children}
    </label>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[1.75rem] border border-zinc-200/70 bg-white shadow-[0_1px_2px_rgba(28,10,18,0.04),0_16px_32px_-24px_rgba(28,10,18,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}
