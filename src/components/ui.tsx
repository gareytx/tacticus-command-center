import clsx from "clsx";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { label } from "@/lib/constants";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 font-mono text-[11px] tracking-[.22em] text-amber-300">
          {eyebrow.toUpperCase()}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
export function Panel({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.ComponentPropsWithoutRef<"section">) {
  return (
    <section
      {...props}
      className={clsx(
        "border border-white/10 bg-[#101618] p-5 shadow-[0_20px_80px_rgba(0,0,0,.25)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
export function Badge({ value }: { value: string | null | undefined }) {
  const tone =
    value === "CRITICAL" || value === "IMPERIAL"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : value === "HIGH" || value === "CHAOS"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
        : value === "XENOS"
          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
          : "border-white/10 bg-white/5 text-zinc-300";
  return (
    <span
      className={clsx(
        "inline-flex border px-2 py-1 font-mono text-[10px] tracking-wide",
        tone,
      )}
    >
      {label(value)}
    </span>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex min-h-10 items-center justify-center gap-2 border px-4 py-2 text-sm font-medium transition",
        secondary
          ? "border-white/15 bg-white/5 hover:bg-white/10"
          : "border-amber-300 bg-amber-300 text-black hover:bg-amber-200",
      )}
    >
      {children}
    </Link>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel className="grid min-h-56 place-items-center text-center">
      <div>
        <AlertTriangle className="mx-auto mb-3 text-zinc-600" />
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-2 mb-5 text-sm text-zinc-500">{description}</p>
        {action}
      </div>
    </Panel>
  );
}
export const fieldClass =
  "mt-1 w-full border border-white/15 bg-[#090d0f] px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-300";
export function Stat({
  label: name,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[.14em] text-zinc-500">
        {name.toUpperCase()}
      </p>
      <p
        className={clsx(
          "mt-1 text-2xl font-semibold",
          accent && "text-amber-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}
