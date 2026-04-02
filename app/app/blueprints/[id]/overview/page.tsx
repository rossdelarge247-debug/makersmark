import { redirect } from "next/navigation";
import {
  getBlueprintById,
  getStepsForBlueprint,
  getSwimlanesForBlueprint,
  getCellsForBlueprint,
} from "@/lib/supabase/blueprint-actions";
import OverviewMode from "./OverviewMode";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function OverviewPage({ params }: OverviewPageProps) {
  const { id } = await params;

  const [blueprint, steps, swimlanes, cells] = await Promise.all([
    getBlueprintById(id),
    getStepsForBlueprint(id),
    getSwimlanesForBlueprint(id),
    getCellsForBlueprint(id),
  ]);

  if (!blueprint) {
    redirect("/app");
  }

  return (
    <OverviewMode
      blueprint={blueprint}
      initialSteps={steps}
      initialSwimlanes={swimlanes}
      initialCells={cells}
    />
  );
}
