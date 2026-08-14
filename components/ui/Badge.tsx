import type { ReactNode } from "react";

export type BadgeColor = "gray" | "blue" | "purple" | "amber" | "green" | "red" | "indigo";

const COLOR_CLASSES: Record<BadgeColor, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-600/10",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/10",
  purple: "bg-purple-50 text-purple-700 ring-purple-600/10",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/10",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  red: "bg-red-50 text-red-700 ring-red-600/10",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
};

export default function Badge({
  color = "gray",
  children,
  className = "",
}: {
  color?: BadgeColor;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${COLOR_CLASSES[color]} ${className}`}
    >
      {children}
    </span>
  );
}
