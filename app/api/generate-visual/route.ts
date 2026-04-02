import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Fixed Beano/Viz comic style — locked for MVP, expandable in later releases
const COMIC_STYLE =
  "Single comic strip panel in the style of classic British comics like The Beano and Dandy. " +
  "Bold black ink outlines, flat bright primary colours, expressive cartoonish characters, " +
  "simple clean panel composition, light or white background, no text, no speech bubbles, " +
  "no captions. Humorous light-hearted storytelling illustration style.";

function buildPrompt(stepTitle: string, stepDescription: string | null, modification: string | null): string {
  const scene = stepDescription?.trim()
    ? `${stepTitle}: ${stepDescription}`
    : stepTitle;
  const base = `${COMIC_STYLE} Scene: ${scene}.`;
  return modification?.trim() ? `${base} Additional instruction: ${modification.trim()}.` : base;
}

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { stepId, stepTitle, stepDescription, blueprintId, modification } = await req.json();

    if (!stepId || !stepTitle || !blueprintId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = buildPrompt(stepTitle, stepDescription, modification);

    // Generate image via DALL-E 3 — request base64 so we own the bytes
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "No image returned from generation API" }, { status: 500 });
    }

    // Upload to Supabase Storage
    const admin = createAdminClient();
    const imageBuffer = Buffer.from(b64, "base64");
    const storagePath = `${blueprintId}/${stepId}.png`;

    const { error: uploadError } = await admin.storage
      .from("visuals")
      .upload(storagePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("visuals").getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Upsert into visuals table (one visual per step)
    const { data: visual, error: dbError } = await admin
      .from("visuals")
      .upsert(
        { blueprint_id: blueprintId, step_id: stepId, url: publicUrl, prompt },
        { onConflict: "step_id" }
      )
      .select("*")
      .single();

    if (dbError || !visual) {
      console.error("DB upsert error:", dbError);
      return NextResponse.json({ error: `Database error: ${dbError?.message ?? "no data returned"}` }, { status: 500 });
    }

    // Update step.visual_id
    await admin.from("steps").update({ visual_id: visual.id }).eq("id", stepId);

    return NextResponse.json({ visual });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-visual error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
