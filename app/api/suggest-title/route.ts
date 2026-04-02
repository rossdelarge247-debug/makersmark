import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { description } = await req.json();

  if (!description || typeof description !== "string") {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Fallback: derive title from first few words of description
  if (!apiKey) {
    const words = description.trim().split(/\s+/).slice(0, 6).join(" ");
    const fallback = words.length > 0 ? words : "Step in the journey";
    return NextResponse.json({ title: fallback });
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      system:
        "You are a service design assistant. Generate a short step title (4-8 words) in verb-first syntax that captures what happens at this service moment. Examples: 'User submits application form', 'System validates eligibility criteria', 'Agent calls applicant to confirm'. Return ONLY the title, no quotes, no explanation.",
      messages: [
        {
          role: "user",
          content: description,
        },
      ],
    });

    const block = message.content[0];
    const title = block.type === "text" ? block.text.trim() : "Step in the journey";
    return NextResponse.json({ title });
  } catch {
    // Fallback on any error
    const words = description.trim().split(/\s+/).slice(0, 6).join(" ");
    const fallback = words.length > 0 ? words : "Step in the journey";
    return NextResponse.json({ title: fallback });
  }
}
