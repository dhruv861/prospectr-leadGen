const APIFY_API_BASE = "https://api.apify.com/v2";
const COST_PER_PLACE_USD = 0.004;

export type ApifyActorInput = {
  searchStringsArray: string[];
  locationQuery: string;
  maxCrawledPlacesPerSearch: number;
  website: "withoutWebsite";
  skipClosedPlaces: true;
};

export type ApifyRunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMING-OUT"
  | "TIMED-OUT"
  | "ABORTING"
  | "ABORTED";

export type ApifyRunInfo = {
  id: string;
  status: ApifyRunStatus;
  defaultDatasetId: string;
  usageTotalUsd: number | null;
};

export type ApifyPlaceItem = {
  placeId?: string;
  title?: string;
  categoryName?: string;
  address?: string;
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  totalScore?: number;
  reviewsCount?: number;
  url?: string;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  [key: string]: unknown;
};

const TERMINAL_STATUSES: ApifyRunStatus[] = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"];

export function isTerminalStatus(status: ApifyRunStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export class ApifyInsufficientCreditsError extends Error {
  constructor(message = "Apify account has insufficient credits") {
    super(message);
    this.name = "ApifyInsufficientCreditsError";
  }
}

export function buildActorInput(searchTerm: string, locality: string): ApifyActorInput {
  const maxPlaces = Number(process.env.APIFY_MAX_PLACES_PER_SEARCH ?? "50");
  return {
    searchStringsArray: [searchTerm],
    locationQuery: locality,
    maxCrawledPlacesPerSearch: maxPlaces,
    website: "withoutWebsite",
    skipClosedPlaces: true,
  };
}

async function apifyFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (res.status === 402) {
    throw new ApifyInsufficientCreditsError();
  }
  return res;
}

export async function startActorRun(
  actorId: string,
  input: ApifyActorInput,
  token: string
): Promise<{ apifyRunId: string; defaultDatasetId: string }> {
  const encodedActorId = actorId.replace("/", "~");
  const res = await apifyFetch(`${APIFY_API_BASE}/actors/${encodedActorId}/runs?waitForFinish=0`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify startActorRun failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as { data: ApifyRunInfo };
  return { apifyRunId: json.data.id, defaultDatasetId: json.data.defaultDatasetId };
}

export async function getRunStatus(apifyRunId: string, token: string): Promise<ApifyRunInfo> {
  const res = await apifyFetch(`${APIFY_API_BASE}/actor-runs/${apifyRunId}`, token);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify getRunStatus failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as { data: ApifyRunInfo };
  return json.data;
}

export async function getDatasetItems(datasetId: string, token: string): Promise<ApifyPlaceItem[]> {
  const res = await apifyFetch(`${APIFY_API_BASE}/datasets/${datasetId}/items?clean=true`, token);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify getDatasetItems failed (${res.status}): ${body}`);
  }
  return (await res.json()) as ApifyPlaceItem[];
}

export function extractCostFromRun(run: ApifyRunInfo, placesReturned: number): number {
  if (typeof run.usageTotalUsd === "number") {
    return run.usageTotalUsd;
  }
  console.warn(
    `[apify] usageTotalUsd missing on run ${run.id}; falling back to estimate (${placesReturned} places * $${COST_PER_PLACE_USD})`
  );
  return placesReturned * COST_PER_PLACE_USD;
}

export function isInsufficientCreditsError(err: unknown): boolean {
  return err instanceof ApifyInsufficientCreditsError;
}
