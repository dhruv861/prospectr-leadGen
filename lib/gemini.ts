import { GoogleGenAI } from "@google/genai";
import type { SerializedLead } from "./leads";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({});
  return client;
}

export type PitchIdea = {
  title: string;
  pitch: string;
  category: "website" | "web_app" | "ai_workflow" | "other";
};

export type PitchIdeas = { ideas: PitchIdea[] };

export type OpportunitySource = { url: string; title: string };
export type Opportunities = { summary: string; sources: OpportunitySource[] };

const PITCH_SCHEMA = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          pitch: { type: "string" },
          category: { type: "string", enum: ["website", "web_app", "ai_workflow", "other"] },
        },
        required: ["title", "pitch", "category"],
      },
    },
  },
  required: ["ideas"],
};

function describeLead(lead: SerializedLead): string {
  const websiteDescription =
    lead.websiteStatus === "none"
      ? "no website at all"
      : lead.websiteStatus === "instagram_only"
        ? "only an Instagram page, no real website"
        : "has a website";
  return [
    `Business name: ${lead.businessName}`,
    `Category: ${lead.category ?? "unknown"}`,
    `Locality: ${lead.locality}`,
    `Address: ${lead.address}`,
    `Google rating: ${lead.rating != null ? `${lead.rating} (${lead.reviewCount ?? 0} reviews)` : "no rating data"}`,
    `Website status: ${websiteDescription}`,
    `Phone on file: ${lead.phone ? "yes" : "no"}`,
  ].join("\n");
}

export async function generatePitchIdeas(lead: SerializedLead): Promise<PitchIdeas> {
  const prompt = `You are a sales strategist at a small IT agency that builds websites, web apps, and AI-powered workflow automation for local businesses.

Here is what we know about a lead, gathered from Google Maps (no other research has been done yet):
${describeLead(lead)}

Based only on this information, come up with 4 to 6 concrete, specific pitch ideas our sales rep could use when calling this business. Each idea should be grounded in what we actually know (e.g. a business with no website needs a different pitch than one with only Instagram). Avoid generic advice - make it specific to this business's category and situation. Categorize each idea as one of: website, web_app, ai_workflow, other.`;

  const interaction = await getClient().interactions.create({
    model: MODEL,
    input: prompt,
    response_format: { type: "text", mime_type: "application/json", schema: PITCH_SCHEMA },
  });

  if (!interaction.output_text) {
    throw new Error("Gemini returned no output for pitch ideas");
  }
  const parsed = JSON.parse(interaction.output_text) as PitchIdeas;
  if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
    throw new Error("Gemini returned no pitch ideas");
  }
  return parsed;
}

export async function findOpportunities(lead: SerializedLead): Promise<Opportunities> {
  const prompt = `You are a sales researcher at a small IT agency that builds websites, web apps, and AI-powered workflow automation for local businesses.

Research this business using web search:
Business name: ${lead.businessName}
Category: ${lead.category ?? "unknown"}
Locality: ${lead.locality}
Address: ${lead.address}

Find out what you can about their current online presence (or lack of one), reviews, hours, how customers seem to interact with them, and anything else public that's relevant. Then identify 3 to 6 concrete, sellable gaps we could pitch to fix via a website, a web app, or an AI-driven workflow (e.g. missing online booking, no way to browse a menu/catalog online, no way to answer common customer questions automatically, slow response to inquiries, no online ordering).

Format your answer as a plain-text numbered list - no markdown, no asterisks, no bold formatting. Each item should start with a short gap name followed by a colon, then 1-2 sentences explaining the gap and why it's a good fit for us to pitch. Be specific to this business, not generic.`;

  const interaction = await getClient().interactions.create({
    model: MODEL,
    input: prompt,
    tools: [{ type: "google_search" }],
  });

  if (!interaction.output_text) {
    throw new Error("Gemini returned no output for opportunity research");
  }

  const sources = new Map<string, OpportunitySource>();
  for (const step of interaction.steps) {
    if (step.type !== "model_output" || !step.content) continue;
    for (const block of step.content) {
      if (block.type !== "text" || !block.annotations) continue;
      for (const annotation of block.annotations) {
        if (annotation.type === "url_citation" && annotation.url) {
          sources.set(annotation.url, { url: annotation.url, title: annotation.title ?? annotation.url });
        }
      }
    }
  }

  return { summary: interaction.output_text, sources: Array.from(sources.values()) };
}
