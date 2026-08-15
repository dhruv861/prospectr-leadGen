import { prisma } from "./prisma";
import type { ApifyPlaceItem } from "./apify";
import type { Lead, Prisma, WebsiteStatus } from "@prisma/client";
import type { LeadFilters } from "./validation";

export type SerializedLead = Omit<
  Lead,
  | "lastContactedAt"
  | "shortlistedAt"
  | "followUpAt"
  | "pitchIdeasGeneratedAt"
  | "opportunitiesGeneratedAt"
  | "createdAt"
  | "updatedAt"
  | "rawData"
> & {
  lastContactedAt: string | null;
  shortlistedAt: string | null;
  followUpAt: string | null;
  pitchIdeasGeneratedAt: string | null;
  opportunitiesGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeLead(lead: Lead): SerializedLead {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit rawData from the client payload
  const { rawData, ...rest } = lead;
  return {
    ...rest,
    lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.toISOString() : null,
    shortlistedAt: lead.shortlistedAt ? lead.shortlistedAt.toISOString() : null,
    followUpAt: lead.followUpAt ? lead.followUpAt.toISOString() : null,
    pitchIdeasGeneratedAt: lead.pitchIdeasGeneratedAt ? lead.pitchIdeasGeneratedAt.toISOString() : null,
    opportunitiesGeneratedAt: lead.opportunitiesGeneratedAt ? lead.opportunitiesGeneratedAt.toISOString() : null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

const FOLLOW_UP_STALE_DAYS: Record<string, number> = {
  stale7: 7,
  stale14: 14,
  stale30: 30,
};

export function buildLeadWhereClause(filters: LeadFilters): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];

  if (filters.category) and.push({ category: { equals: filters.category, mode: "insensitive" } });
  if (filters.locality) and.push({ locality: { equals: filters.locality, mode: "insensitive" } });
  if (filters.status) and.push({ status: filters.status });

  if (filters.noWebsiteOnly) {
    and.push({ websiteStatus: { in: ["none", "instagram_only"] } });
  } else if (filters.websiteStatus) {
    and.push({ websiteStatus: filters.websiteStatus });
  }

  if (filters.shortlistedOnly) and.push({ shortlistedAt: { not: null } });

  if (filters.search) {
    and.push({
      OR: [
        { businessName: { contains: filters.search, mode: "insensitive" } },
        { address: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  if (filters.minRating != null) and.push({ rating: { gte: filters.minRating } });
  if (filters.minReviews != null) and.push({ reviewCount: { gte: filters.minReviews } });

  if (filters.hasPhone === "true") and.push({ phone: { not: null } });
  if (filters.hasPhone === "false") and.push({ phone: null });

  if (filters.hasNotes === "true") and.push({ notes: { not: null } });
  if (filters.hasNotes === "false") and.push({ notes: null });

  if (filters.followUp === "never") {
    and.push({ lastContactedAt: null });
  } else if (filters.followUp) {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - FOLLOW_UP_STALE_DAYS[filters.followUp]);
    // "Not contacted in N+ days" also covers leads that were never contacted at all.
    and.push({ OR: [{ lastContactedAt: null }, { lastContactedAt: { lte: cutoff } }] });
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildLeadOrderBy(sortBy: LeadFilters["sortBy"]): Prisma.LeadOrderByWithRelationInput {
  switch (sortBy) {
    case "rating_desc":
      return { rating: { sort: "desc", nulls: "last" } };
    case "reviews_desc":
      return { reviewCount: { sort: "desc", nulls: "last" } };
    case "created_desc":
      return { createdAt: "desc" };
    case "name_asc":
      return { businessName: "asc" };
    default:
      return { updatedAt: "desc" };
  }
}

export function detectWebsiteStatus(
  websiteField: string | null | undefined
): { websiteStatus: WebsiteStatus; websiteUrl: string | null } {
  if (!websiteField || websiteField.trim() === "") {
    return { websiteStatus: "none", websiteUrl: null };
  }
  if (websiteField.toLowerCase().includes("instagram.com")) {
    return { websiteStatus: "instagram_only", websiteUrl: websiteField };
  }
  return { websiteStatus: "has_website", websiteUrl: websiteField };
}

export type LeadUpsertData = {
  placeId: string;
  businessName: string;
  category: string | null;
  phone: string | null;
  address: string;
  locality: string;
  websiteStatus: WebsiteStatus;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string;
  rawData: Prisma.InputJsonValue;
};

// Apify sometimes returns an empty string rather than omitting the field
// entirely — treat blank strings the same as missing data for nullable columns.
function nullIfBlank(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;
  return value;
}

export function mapDatasetItemToLead(item: ApifyPlaceItem, locality: string): LeadUpsertData | null {
  if (!item.placeId) {
    return null;
  }
  const { websiteStatus, websiteUrl } = detectWebsiteStatus(item.website);
  return {
    placeId: item.placeId,
    businessName: item.title ?? "(unnamed)",
    category: nullIfBlank(item.categoryName),
    phone: nullIfBlank(item.phoneUnformatted ?? item.phone),
    address: item.address ?? "",
    locality,
    websiteStatus,
    websiteUrl,
    rating: typeof item.totalScore === "number" ? item.totalScore : null,
    reviewCount: typeof item.reviewsCount === "number" ? item.reviewsCount : null,
    mapsUrl: item.url ?? "",
    rawData: item as Prisma.InputJsonValue,
  };
}

export async function upsertLeadsFromDataset(
  items: ApifyPlaceItem[],
  sourceRunId: string,
  locality: string
): Promise<{ created: number; updated: number; errors: number }> {
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const item of items) {
    const mapped = mapDatasetItemToLead(item, locality);
    if (!mapped) {
      errors++;
      continue;
    }
    try {
      const existing = await prisma.lead.findUnique({ where: { placeId: mapped.placeId } });
      await prisma.lead.upsert({
        where: { placeId: mapped.placeId },
        create: {
          ...mapped,
          sourceRunId,
          status: "new",
          notes: null,
          lastContactedAt: null,
          shortlistedAt: null,
          followUpAt: null,
        },
        update: {
          businessName: mapped.businessName,
          category: mapped.category,
          phone: mapped.phone,
          address: mapped.address,
          locality: mapped.locality,
          websiteStatus: mapped.websiteStatus,
          websiteUrl: mapped.websiteUrl,
          rating: mapped.rating,
          reviewCount: mapped.reviewCount,
          mapsUrl: mapped.mapsUrl,
          sourceRunId,
          rawData: mapped.rawData,
          // status, notes, lastContactedAt, shortlistedAt, followUpAt deliberately
          // absent — partner-owned fields must never be overwritten by a re-scrape.
        },
      });
      if (existing) {
        updated++;
      } else {
        created++;
      }
    } catch (err) {
      console.error(`[leads] failed to upsert placeId=${mapped.placeId}`, err);
      errors++;
    }
  }

  return { created, updated, errors };
}
