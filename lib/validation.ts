import { z } from "zod";

export const leadStatusValues = ["new", "contacted", "interested", "quoted", "won", "lost"] as const;
export const websiteStatusValues = ["none", "instagram_only", "has_website"] as const;
export const apifyAccountStatusValues = ["active", "exhausted"] as const;
export const followUpValues = ["never", "stale7", "stale14", "stale30"] as const;
export const leadSortValues = ["updated_desc", "rating_desc", "reviews_desc", "created_desc", "name_asc"] as const;

export const leadFiltersSchema = z.object({
  category: z.string().trim().min(1).optional(),
  locality: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  status: z.enum(leadStatusValues).optional(),
  websiteStatus: z.enum(websiteStatusValues).optional(),
  noWebsiteOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  shortlistedOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minReviews: z.coerce.number().int().min(0).optional(),
  hasPhone: z.enum(["true", "false"]).optional(),
  hasNotes: z.enum(["true", "false"]).optional(),
  followUp: z.enum(followUpValues).optional(),
  sortBy: z.enum(leadSortValues).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

export const leadPatchSchema = z.object({
  status: z.enum(leadStatusValues).optional(),
  notes: z.string().max(5000).nullable().optional(),
  lastContactedAt: z.coerce.date().nullable().optional(),
  shortlistedAt: z.coerce.date().nullable().optional(),
  followUpAt: z.coerce.date().nullable().optional(),
});

export const scrapeRunPostSchema = z.object({
  searchTerm: z.string().trim().min(1).max(200),
  locality: z.string().trim().min(1).max(200),
  bypassCooldown: z.boolean().optional(),
});

export const apifyAccountPatchSchema = z.object({
  status: z.enum(apifyAccountStatusValues),
});

export type LeadFilters = z.infer<typeof leadFiltersSchema>;
