import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { blueprint, steps, swimlanes } = await req.json();

  // Build actor role context string
  const actorRoles: Record<string, string> = blueprint.actor_roles ?? {};
  const primaryUser: string = blueprint.primary_user || "Customer";
  actorRoles[primaryUser.toLowerCase()] = "customer";

  const actorRoleLines = Object.entries(actorRoles)
    .map(([name, role]) => {
      const label =
        role === "customer"
          ? "external customer/user — actions go in User actions row"
          : role === "frontstage"
          ? "frontstage staff — customer-facing, actions go in Frontstage actions row"
          : "backstage staff — not visible to customer, actions go in Backstage actions row";
      return `- "${name}": ${label}`;
    })
    .join("\n");

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
- Scenario: ${blueprint.scenario || "not specified"}
- End condition: ${blueprint.end_condition || "not specified"}

Actor roles (IMPORTANT — use these to determine which swimlane row each actor's actions belong in):
${actorRoleLines || "- All non-primary actors: use context to infer frontstage or backstage"}

Journey steps (in order):
${stepList}

Swimlane layers (rows in the blueprint grid):
${swimlaneList}

For each step, generate concise cell content (a short phrase or 1–2 sentences) for each swimlane layer where it is meaningfully relevant.

Layer guidance:
- "Physical / digital evidence": Tangible touchpoints the customer sees/receives — screen confirmations, paper forms, receipts, emails, SMS, signage. Infer from step location (e.g. "online portal" → confirmation screen; "phone call" → hold music, verbal confirmation; "branch" → paper form, receipt).
- "User actions": What the PRIMARY USER / CUSTOMER does at this step. Only use actors whose role is "customer".
- "Frontstage actions": What FRONTSTAGE staff or systems do — things the customer directly sees or interacts with. Only use actors whose role is "frontstage". If no frontstage actor is present at this step, describe the customer-facing system/interface instead.
- "Backstage actions": What BACKSTAGE staff do — invisible to the customer. Only use actors whose role is "backstage". If no backstage actor is present at this step, leave this cell empty rather than guess.
- "Support processes / systems": Technology, tools, databases, or processes enabling this step — regardless of actor.
- For custom swimlanes: use the swimlane name as context to infer relevant content.

CRITICAL: Do not place a backstage actor's actions in the User actions or Frontstage rows, and vice versa. Use the actor roles above to assign content to the correct row.

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
