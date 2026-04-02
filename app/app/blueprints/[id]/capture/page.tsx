import { redirect } from "next/navigation";
import { getBlueprintById, getStepsForBlueprint } from "@/lib/supabase/blueprint-actions";
import CaptureMode from "./CaptureMode";

interface CapturePageProps {
  params: Promise<{ id: string }>;
}

export default async function CapturePage({ params }: CapturePageProps) {
  const { id } = await params;

  const [blueprint, steps] = await Promise.all([
    getBlueprintById(id),
    getStepsForBlueprint(id),
  ]);

  if (!blueprint) {
    redirect("/app");
  }

  return <CaptureMode blueprint={blueprint} initialSteps={steps} />;
}
