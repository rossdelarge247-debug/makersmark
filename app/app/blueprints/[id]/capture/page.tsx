import { redirect } from "next/navigation";
import {
  getBlueprintById,
  getStepsForBlueprint,
  getVisualsForBlueprint,
} from "@/lib/supabase/blueprint-actions";
import CaptureMode from "./CaptureMode";

interface CapturePageProps {
  params: Promise<{ id: string }>;
}

export default async function CapturePage({ params }: CapturePageProps) {
  const { id } = await params;

  const [blueprint, steps, visuals] = await Promise.all([
    getBlueprintById(id),
    getStepsForBlueprint(id),
    getVisualsForBlueprint(id),
  ]);

  if (!blueprint) {
    redirect("/app");
  }

  return <CaptureMode blueprint={blueprint} initialSteps={steps} initialVisuals={visuals} />;
}
