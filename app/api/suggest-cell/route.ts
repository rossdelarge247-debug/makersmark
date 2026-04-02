import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { step, swimlaneName, blueprintContext } = await req.json();

  const isEvidence = swimlaneName === "Physical / digital evidence";

  const prompt = `You are a service design expert. Suggest content for a single cell in a service blueprint.

Blueprint context: ${blueprintContext || "A service journey"}
Step: "${step.title}" | Actor: ${step.actor || "Customer"} | Location: ${step.location || "not specified"} | Description: ${step.description || "not provided"}
Swimlane: "${swimlaneName}"
${isEvidence ? `\nThis is the Physical / Digital Evidence row. Describe the specific tangible touchpoints the customer sees or receives at this step — screen confirmations, paper forms, receipts, emails, SMS, signage. Base this on the step location (e.g. "online" → confirmation screen; "phone" → hold music, verbal confirmation; "branch" → paper form, receipt). Be concrete and channel-specific.` : ""}

Write concise content (a short phrase or 1–2 sentences) for what belongs in this cell. Use service design language. Be specific to this step, actor, and context. Do not explain your answer — return only the cell content text.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const content =
      message.content[0].type === "text"
        ? message.content[0].text.trim()
        : "";

    return NextResponse.json({ content });
  } catch (err) {
    console.error("suggest-cell error:", err);
    return NextResponse.json({ content: "" });
  }
}
