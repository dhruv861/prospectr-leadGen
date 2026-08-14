import { prisma } from "@/lib/prisma";
import { leadFiltersSchema } from "@/lib/validation";
import { buildLeadWhereClause, buildLeadOrderBy, serializeLead } from "@/lib/leads";
import FilterBar from "./FilterBar";
import LeadsTable from "./LeadsTable";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawParams = await searchParams;
  const singleValued = Object.fromEntries(
    Object.entries(rawParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  );
  const parsed = leadFiltersSchema.safeParse(singleValued);
  const filters = parsed.success ? parsed.data : { noWebsiteOnly: false, shortlistedOnly: false };

  const leads = await prisma.lead.findMany({
    where: buildLeadWhereClause(filters),
    orderBy: buildLeadOrderBy(filters.sortBy),
    take: filters.limit ?? 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leads</h1>
        <p className="mt-1 text-sm text-slate-500">
          {leads.length} lead{leads.length === 1 ? "" : "s"}
        </p>
      </div>
      <FilterBar
        initial={{
          category: filters.category ?? "",
          locality: filters.locality ?? "",
          search: filters.search ?? "",
          status: filters.status ?? "",
          websiteStatus: filters.websiteStatus ?? "",
          noWebsiteOnly: filters.noWebsiteOnly ?? false,
          shortlistedOnly: filters.shortlistedOnly ?? false,
          minRating: filters.minRating != null ? String(filters.minRating) : "",
          minReviews: filters.minReviews != null ? String(filters.minReviews) : "",
          hasPhone: filters.hasPhone ?? "",
          hasNotes: filters.hasNotes ?? "",
          followUp: filters.followUp ?? "",
          sortBy: filters.sortBy ?? "updated_desc",
        }}
      />
      <LeadsTable leads={leads.map(serializeLead)} />
    </div>
  );
}
