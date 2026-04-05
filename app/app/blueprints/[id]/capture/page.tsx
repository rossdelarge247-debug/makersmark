import { redirect } from "next/navigation";

/**
 * Legacy capture route — redirects to the project hub.
 * /app/blueprints/[id]/capture → /app/projects/[id]
 */
export default async function LegacyCapturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/app/projects/${id}`);
}
