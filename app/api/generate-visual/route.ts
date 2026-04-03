import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Fixed Beano/Viz comic style — locked for MVP, expandable in later releases
const COMIC_STYLE =
  "Single panel in a comic strip storyboard, drawn in the style of classic British comics " +
  "like The Beano and The Dandy. Bold black ink outlines, flat bright primary colours, " +
  "expressive cartoonish characters with exaggerated reactions, simple clean panel composition, " +
  "light or white background. No text, no speech bubbles, no captions, no panel borders. " +
  "Humorous light-hearted storytelling style.";

interface SceneContext {
  stepTitle: string;
  stepDescription: string | null;
  scenario: string | null;
  actorName: string | null;
  userAction: string | null;
  frontstageAction: string | null;
  modification: string | null;
}

function buildPrompt(ctx: SceneContext): string {
  const lines: string[] = [COMIC_STYLE, ""];

  lines.push("SCENE BRIEF FOR THIS STORYBOARD PANEL:");

  if (ctx.scenario) {
    lines.push(`Service scenario: ${ctx.scenario}.`);
  }

  lines.push(`Journey step: "${ctx.stepTitle}".`);

  if (ctx.stepDescription) {
    lines.push(`Step description: ${ctx.stepDescription}.`);
  }

  if (ctx.actorName) {
    lines.push(`Actor(s) in this scene: ${ctx.actorName}.`);
  }

  if (ctx.userAction) {
    lines.push(`What the user is doing: ${ctx.userAction}.`);
  }

  if (ctx.frontstageAction) {
    lines.push(`Visible service interaction: ${ctx.frontstageAction}.`);
  }

  lines.push("");
  lines.push(
    "Depict this exact moment as a single expressive comic panel. " +
    "Focus on the human action and emotion of the scene. " +
    "Show the people involved and what is physically happening."
  );

  if (ctx.modification?.trim()) {
    lines.push(`Additional direction: ${ctx.modification.trim()}.`);
  }

  return lines.join(" ");
}

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const {
      stepId, stepTitle, stepDescription, blueprintId, modification,
      scenario, actorName, userAction, frontstageAction,
    } = await req.json();

    if (!stepId || !stepTitle || !blueprintId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = buildPrompt({
      stepTitle, stepDescription, scenario, actorName,
      userAction, frontstageAction, modification,
    });

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
