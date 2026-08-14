import type { BadgeColor } from "@/components/ui/Badge";
import type { websiteStatusValues } from "./validation";

export const STATUS_OPTIONS = ["new", "contacted", "interested", "quoted", "won", "lost"] as const;

export type LeadStatusValue = (typeof STATUS_OPTIONS)[number];

export const STATUS_LABELS: Record<LeadStatusValue, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

export const STATUS_BADGE_COLOR: Record<LeadStatusValue, BadgeColor> = {
  new: "gray",
  contacted: "blue",
  interested: "purple",
  quoted: "amber",
  won: "green",
  lost: "red",
};

export const STATUS_COLUMN_STYLES: Record<LeadStatusValue, { header: string; dot: string }> = {
  new: { header: "text-slate-600", dot: "bg-slate-400" },
  contacted: { header: "text-blue-600", dot: "bg-blue-500" },
  interested: { header: "text-purple-600", dot: "bg-purple-500" },
  quoted: { header: "text-amber-600", dot: "bg-amber-500" },
  won: { header: "text-emerald-600", dot: "bg-emerald-500" },
  lost: { header: "text-red-600", dot: "bg-red-500" },
};

export type WebsiteStatusValue = (typeof websiteStatusValues)[number];

export const WEBSITE_STATUS_LABEL: Record<string, string> = {
  none: "No website",
  instagram_only: "Instagram only",
  has_website: "Has website",
};

export const WEBSITE_STATUS_BADGE_COLOR: Record<string, BadgeColor> = {
  none: "red",
  instagram_only: "amber",
  has_website: "green",
};
