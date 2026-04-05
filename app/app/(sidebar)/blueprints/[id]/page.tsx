import { redirect } from "next/navigation";

/**
 * Legacy route — redirects to the new project hub.
 * /app/blueprints/[id] → /app/projects/[id]
 */
export default async function LegacyBlueprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/app/projects/${id}`);
}
