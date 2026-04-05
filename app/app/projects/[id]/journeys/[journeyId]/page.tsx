import { redirect } from "next/navigation";
import {
  getJourneyById,
  getStepsForJourney,
  getVisualsForJourney,
} from "@/lib/supabase/journey-actions";
import CaptureMode from "@/app/app/blueprints/[id]/capture/CaptureMode";

interface JourneyPageProps {
  params: Promise<{ id: string; journeyId: string }>;
}

export default async function JourneyPage({ params }: JourneyPageProps) {
  const { id: projectId, journeyId } = await params;

  const [journey, steps, visuals] = await Promise.all([
    getJourneyById(journeyId),
    getStepsForJourney(journeyId),
    getVisualsForJourney(journeyId),
  ]);

  if (!journey) redirect(`/app/projects/${projectId}`);

  return (
    <CaptureMode
      journey={journey}
      initialSteps={steps}
      initialVisuals={visuals}
    />
  );
}
