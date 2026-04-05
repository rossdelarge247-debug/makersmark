import { redirect } from "next/navigation";
import {
  getBlueprintById,
  getStepsForBlueprint,
  getSwimlanesForBlueprint,
  getCellsForBlueprint,
  getNotesForBlueprint,
  getVisualsForBlueprint,
} from "@/lib/supabase/blueprint-actions";
import OverviewMode from "@/app/app/blueprints/[id]/overview/OverviewMode";

interface BlueprintPageProps {
  params: Promise<{ id: string; blueprintId: string }>;
}

export default async function BlueprintPage({ params }: BlueprintPageProps) {
  const { id: projectId, blueprintId } = await params;

  const [blueprint, steps, swimlanes, cells, notes, visuals] = await Promise.all([
    getBlueprintById(blueprintId),
    getStepsForBlueprint(blueprintId),
    getSwimlanesForBlueprint(blueprintId),
    getCellsForBlueprint(blueprintId),
    getNotesForBlueprint(blueprintId),
    getVisualsForBlueprint(blueprintId),
  ]);

  if (!blueprint) redirect(`/app/projects/${projectId}`);

  return (
    <OverviewMode
      blueprint={blueprint}
      initialSteps={steps}
      initialSwimlanes={swimlanes}
      initialCells={cells}
      initialNotes={notes}
      initialVisuals={visuals}
    />
  );
}
