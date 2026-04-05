import { createClient } from "@/lib/supabase/server";
import { getUserProjects } from "@/lib/supabase/project-actions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(" ")[0]
    : user?.email?.split("@")[0] ?? "there";

  const projects = await getUserProjects();

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  return (
    <DashboardClient
      projects={projects}
      greeting={`Good ${timeOfDay}, ${firstName}`}
    />
  );
}
