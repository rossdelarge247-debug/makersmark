import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { blueprint, steps, swimlanes } = await req.json();

  const swimlaneList = swimlanes
    .map((s: { name: string }, i: number) => `${i}: ${s.name}`)
    .join("\n");

  const stepList = steps
    .map(
      (s: { title: string; actor?: string | null; location?: string | null; description?: string | null }, i: number) =>
        `Step ${i + 1}: "${s.title}" | Actor: ${s.actor || blueprint.primary_user || "Customer"} | Location: ${s.location || "not specified"} | Description: ${s.description || "not provided"}`
    )
    .join("\n");

  const prompt = `You are a service design expert helping populate a service blueprint grid.

Blueprint context:
- Primary user: ${blueprint.primary_user || "Customer"}
- Goal: ${blueprint.user_goal || "not specified"}
- End condition: ${blueprint.end_condition || "not specified"}

Journey steps (in order):
${stepList}

Swimlane layers (rows in the blueprint grid):
${swimlaneList}

For each step, generate concise cell content (a short phrase or 1–2 sentences) for each swimlane layer where it is meaningfully relevant.

Layer guidance:
- "User actions": What the user/customer actively does at this step
- "Frontstage actions": What staff or systems the user directly sees or interacts with
- "Backstage actions": Behind-the-scenes staff work the user doesn't see
- "Support processes / systems": Technology, tools, databases, or processes enabling this step
- "Physical / digital evidence": Tangible touchpoints — receipts, emails, screens, forms, confirmations
- For custom swimlanes: use the swimlane name as context to infer relevant content

Only include cells with genuinely meaningful content. Skip a cell rather than write something generic.

Return JSON only, no markdown fences:
{
  "cells": [
    { "step_index": 0, "swimlane_index": 0, "content": "..." }
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const json = jsonMatch ? JSON.parse(jsonMatch[0]) : { cells: [] };
    return NextResponse.json(json);
  } catch (err) {
    console.error("seed-cells error:", err);
    return NextResponse.json({ cells: [] });
  }
}
