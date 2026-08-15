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

export type Objection = { objection: string; response: string };

export type PitchIdeas = { ideas: PitchIdea[]; objections: Objection[] };

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
    objections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          objection: { type: "string" },
          response: { type: "string" },
        },
        required: ["objection", "response"],
      },
    },
  },
  required: ["ideas", "objections"],
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

Based only on this information, come up with 4 to 6 concrete, specific pitch ideas our sales rep could use when calling this business. Each idea should be grounded in what we actually know (e.g. a business with no website needs a different pitch than one with only Instagram). Avoid generic advice - make it specific to this business's category and situation. Categorize each idea as one of: website, web_app, ai_workflow, other.

Also anticipate 2 to 4 objections our sales rep is likely to hear on this specific call - tailored to this business's size, category, and situation (e.g. "we're too small for that," "can't afford it," "WhatsApp is enough, we don't need a website"). For each, write a brief, confident response she could actually say out loud - not scripted or pushy, just a natural comeback grounded in what we know about this business.`;

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

export type ReviewPainPointSource = { url: string; title: string };

export type ReviewPainPoint = {
  complaint: string;
  evidence: string;
  fix: string;
  category: "website" | "web_app" | "ai_workflow" | "other";
};

export type ReviewPainPoints = { painPoints: ReviewPainPoint[]; sources: ReviewPainPointSource[] };

const REVIEW_PAIN_POINT_SCHEMA = {
  type: "object",
  properties: {
    painPoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          complaint: { type: "string" },
          evidence: { type: "string" },
          fix: { type: "string" },
          category: { type: "string", enum: ["website", "web_app", "ai_workflow", "other"] },
        },
        required: ["complaint", "evidence", "fix", "category"],
      },
    },
  },
  required: ["painPoints"],
};

// Two calls, not one: a search-grounded call can't also force a JSON schema
// (same constraint findOpportunities works around), and testing showed that
// asking the model to write directly in a rigid labeled-field format
// suppresses citation attachment even when it's clearly reading real reviews.
// So step 1 does natural-prose research (reliably cites sources) and step 2
// structures that text into typed pain points with no search tool involved.
export async function mineReviewPainPoints(lead: SerializedLead): Promise<ReviewPainPoints> {
  const researchPrompt = `You are a sales researcher at a small IT agency that builds websites, web apps, and AI-powered workflow automation for local businesses.

Research this business's actual customer reviews using web search:
Business name: ${lead.businessName}
Category: ${lead.category ?? "unknown"}
Locality: ${lead.locality}
Address: ${lead.address}
Google rating: ${lead.rating != null ? `${lead.rating} (${lead.reviewCount ?? 0} reviews)` : "no rating data"}

Search for and read this business's real customer reviews - on Google Maps, and wherever else search turns up (Justdial, Zomato, Swiggy, or other platforms commonly used for local businesses in India). Focus on recurring complaints - the same problem mentioned by multiple reviewers, not a single one-off gripe. Summarize what you find in a few sentences of plain prose, grounded specifically in what reviewers actually wrote (mention roughly how many reviews, which platform, and how recent, where you can tell). If you cannot find genuine customer reviews for this business, say so plainly.`;

  const research = await getClient().interactions.create({
    model: MODEL,
    input: researchPrompt,
    tools: [{ type: "google_search" }],
  });

  if (!research.output_text) {
    throw new Error("Gemini returned no output for review research");
  }

  const sources = new Map<string, ReviewPainPointSource>();
  for (const step of research.steps) {
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

  const structurePrompt = `Here is some research on ${lead.businessName}'s customer reviews:

${research.output_text}

Based only on the above, identify 3 to 6 concrete, recurring pain points - do not invent or generalize beyond what's stated. For each one, propose one specific, sellable fix (a website, web app, or AI-driven workflow) that directly addresses that exact complaint. Avoid generic advice: say something like "3 recent reviews mention slow order times during lunch rush; an ordering/queue-display system would let customers place and track orders without waiting at the counter," not "you should have online ordering." Categorize each fix as one of: website, web_app, ai_workflow, other. If the research above didn't find genuine reviews, return an empty list rather than inventing pain points.`;

  const structured = await getClient().interactions.create({
    model: MODEL,
    input: structurePrompt,
    response_format: { type: "text", mime_type: "application/json", schema: REVIEW_PAIN_POINT_SCHEMA },
  });

  if (!structured.output_text) {
    throw new Error("Gemini returned no output for review pain-point structuring");
  }
  const parsed = JSON.parse(structured.output_text) as { painPoints: ReviewPainPoint[] };
  if (!Array.isArray(parsed.painPoints)) {
    throw new Error("Gemini returned malformed review pain points");
  }

  return { painPoints: parsed.painPoints, sources: Array.from(sources.values()) };
}

export type CompetitorGapSource = { url: string; title: string };

export type CompetitorGap = {
  competitor: string;
  advantage: string;
  pitch: string;
  category: "website" | "web_app" | "ai_workflow" | "other";
};

export type CompetitorGaps = { gaps: CompetitorGap[]; sources: CompetitorGapSource[] };

const COMPETITOR_GAP_SCHEMA = {
  type: "object",
  properties: {
    gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          competitor: { type: "string" },
          advantage: { type: "string" },
          pitch: { type: "string" },
          category: { type: "string", enum: ["website", "web_app", "ai_workflow", "other"] },
        },
        required: ["competitor", "advantage", "pitch", "category"],
      },
    },
  },
  required: ["gaps"],
};

// Same two-call shape as mineReviewPainPoints, for the same reason: a
// search-grounded call reliably attaches citations only when free to answer
// in natural prose, not when forced into a rigid schema.
export async function mineCompetitorGaps(lead: SerializedLead): Promise<CompetitorGaps> {
  const researchPrompt = `You are a sales researcher at a small IT agency that builds websites, web apps, and AI-powered workflow automation for local businesses.

Research this business's local competitors using web search:
Business name: ${lead.businessName}
Category: ${lead.category ?? "unknown"}
Locality: ${lead.locality}
Address: ${lead.address}

Find 2 to 3 other businesses in the same category, near the same locality, that plausibly compete with this one for customers (search Google Maps, Justdial, Zomato/Swiggy, Instagram, or their own websites - whatever search turns up). For each competitor, describe what you can find about their online presence: do they have a website, an Instagram page, online ordering/booking, a visible menu or catalog, customer reviews, and so on. Then note specifically what each one offers online that ${lead.businessName} does not appear to have. Write this up in plain prose - name each competitor, what you found about their online presence, and what gap that reveals for this lead. If you can't find at least 2 genuine nearby competitors, say so plainly rather than inventing them.`;

  const research = await getClient().interactions.create({
    model: MODEL,
    input: researchPrompt,
    tools: [{ type: "google_search" }],
  });

  if (!research.output_text) {
    throw new Error("Gemini returned no output for competitor research");
  }

  const sources = new Map<string, CompetitorGapSource>();
  for (const step of research.steps) {
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

  const structurePrompt = `Here is some research comparing ${lead.businessName} to its nearby competitors:

${research.output_text}

Based only on the above, identify 2 to 3 concrete competitor gaps - do not invent or generalize beyond what's stated. Each gap should name the specific competitor, state the one thing they offer online that ${lead.businessName} doesn't, and propose how to use that as a pitch angle (e.g. "Competitor X has an online ordering menu, you don't - reach the same lunch-rush customers without losing them to a listed competitor"). Categorize each pitch as one of: website, web_app, ai_workflow, other. If the research above didn't find genuine nearby competitors, return an empty list rather than inventing any.`;

  const structured = await getClient().interactions.create({
    model: MODEL,
    input: structurePrompt,
    response_format: { type: "text", mime_type: "application/json", schema: COMPETITOR_GAP_SCHEMA },
  });

  if (!structured.output_text) {
    throw new Error("Gemini returned no output for competitor gap structuring");
  }
  const parsed = JSON.parse(structured.output_text) as { gaps: CompetitorGap[] };
  if (!Array.isArray(parsed.gaps)) {
    throw new Error("Gemini returned malformed competitor gaps");
  }

  return { gaps: parsed.gaps, sources: Array.from(sources.values()) };
}

export async function generateWhatsAppOpener(lead: SerializedLead): Promise<string> {
  const prompt = `You are a sales rep at a small IT agency that builds websites, web apps, and AI-powered workflow automation for local businesses. You're about to send a first WhatsApp message to a lead you have not spoken to before.

Here is what we know about this lead, gathered from Google Maps:
${describeLead(lead)}

Write a short WhatsApp opening message - 2 to 3 sentences, ready to send as-is. It should sound like a real person texting, not a template: warm, specific to this business, and low-pressure - the goal is to start a conversation, not close a sale in one message. Reference something concrete about the business (its category, locality, or website situation) so it doesn't read as mass-blasted. Do not use placeholders like [Name] - write it as a finished message. No markdown, no emojis, no greeting like "Dear" - just plain conversational text a sales rep would actually type into WhatsApp.`;

  const interaction = await getClient().interactions.create({
    model: MODEL,
    input: prompt,
  });

  if (!interaction.output_text) {
    throw new Error("Gemini returned no output for WhatsApp opener");
  }
  return interaction.output_text.trim();
}
