import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_GROUPS = ["consideration", "research_question", "assumption", "risk", "opportunity"] as const;

interface ColumnContextItem {
  swimlaneName: string;
  content: string | null;
  isTarget: boolean;
}

export async function POST(req: Request) {
  const {
    targetType,
    targetContent,
    stepTitle,
    swimlaneName,
    blueprintContext,
    nearbyContext,
    columnContext,
  } = await req.json();

  const targetDesc =
    targetType === "cell"
      ? `Cell in "${swimlaneName}" for step "${stepTitle}": "${targetContent || "(empty)"}"`
      : `Journey step "${stepTitle}": "${targetContent || "(no description)"}"`;

  const nearbyStr =
    nearbyContext?.length
      ? `\nNearby steps for context:\n${nearbyContext
          .map((s: { stepTitle: string }) => `- ${s.stepTitle}`)
          .join("\n")}`
      : "";

  // Build column context section for cell interrogations
  const columnCtx = (columnContext as ColumnContextItem[] | undefined) ?? [];
  const filledLanes = columnCtx.filter((c) => !c.isTarget && c.content);
  const emptyLanes = columnCtx.filter((c) => !c.isTarget && !c.content);

  const columnStr =
    columnCtx.length > 0
      ? `\nFull service moment — all swimlanes for this column:\n${columnCtx
          .map(
            (c) =>
              `  ${c.isTarget ? "▶ " : "  "}${c.swimlaneName}: ${
                c.content ? `"${c.content}"` : "(not yet captured)"
              }`
          )
          .join("\n")}`
      : "";

  const gapInstruction =
    emptyLanes.length > 0
      ? `\nNote: ${emptyLanes.map((c) => c.swimlaneName).join(", ")} ${
          emptyLanes.length === 1 ? "is" : "are"
        } not yet captured for this moment. Include questions that help identify what happens in ${
          emptyLanes.length === 1 ? "that layer" : "those layers"
        } — who is responsible, what processes run, what systems are involved, and what the user would experience.`
      : "";

  const connectionInstruction =
    filledLanes.length > 0
      ? `\nAlso consider how the target cell relates to and depends on the other filled swimlanes in this moment.`
      : "";

  const prompt = `You are an expert service designer. Interrogate the following moment in a service blueprint and return structured analysis.

Blueprint: ${blueprintContext?.name || blueprintContext?.title || "A service"}
User goal: ${blueprintContext?.user_goal || "not specified"}
Primary user: ${blueprintContext?.primary_user || "Customer"}
Scenario: ${blueprintContext?.scenario || "not specified"}

Target: ${targetDesc}${columnStr}${nearbyStr}${gapInstruction}${connectionInstruction}

Return a JSON object with exactly these 5 keys. Each key maps to an array of short, specific, actionable strings (aim for 2–5 items each):

{
  "consideration": [...],       // Missing considerations or overlooked aspects of this moment
  "research_question": [...],   // Specific questions that need to be researched or tested — include questions about empty swimlanes if present
  "assumption": [...],          // Assumptions currently being made that should be validated
  "risk": [...],                // Risks, dependencies, or failure modes — including gaps between swimlanes
  "opportunity": [...]          // Opportunities for improvement or innovation at this moment
}

Be concrete and specific. Prioritise questions that surface what is missing or poorly understood in this service moment. Each item should be 1–2 sentences maximum. Return only valid JSON with no markdown fences.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = {};
        }
      }
    }

    const items: { group_type: string; content: string }[] = [];
    for (const group of VALID_GROUPS) {
      const entries = parsed[group];
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (typeof entry === "string" && entry.trim()) {
          items.push({ group_type: group, content: entry.trim() });
        }
      }
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error("interrogate error:", err);
    return NextResponse.json({ items: [] });
  }
}
