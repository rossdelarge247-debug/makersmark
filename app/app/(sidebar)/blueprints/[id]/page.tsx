import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Grid3X3, Users } from "lucide-react";
import { getBlueprintById, getStepsForBlueprint } from "@/lib/supabase/blueprint-actions";
import type { Step } from "@/lib/supabase/blueprint-actions";
import BlueprintSetupFlow from "@/components/blueprints/BlueprintSetupFlow";
import InlineTitle from "@/components/blueprints/InlineTitle";
import type { Blueprint } from "@/lib/types/blueprint";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Derive unique actors from steps + blueprint config
// ---------------------------------------------------------------------------
function derivePersonas(
  blueprint: Blueprint,
  steps: Step[]
): { name: string; role: "customer" | "frontstage" | "backstage" | "unknown"; stepCount: number }[] {
  const primary = blueprint.primary_user?.trim() || "";
  const roles = blueprint.actor_roles ?? {};

  const actorStepCount: Map<string, number> = new Map();

  // Count steps per actor
  for (const step of steps) {
    const actor = step.actor?.trim() || primary || "";
    if (!actor) continue;
    actorStepCount.set(actor, (actorStepCount.get(actor) ?? 0) + 1);
  }

  // Collect all unique actor names (primary user always first)
  const seen = new Set<string>();
  const actors: string[] = [];
  if (primary) { seen.add(primary.toLowerCase()); actors.push(primary); }
  for (const [actor] of Array.from(actorStepCount)) {
    if (!seen.has(actor.toLowerCase())) {
      seen.add(actor.toLowerCase());
      actors.push(actor);
    }
  }

  return actors.map((name) => ({
    name,
    role: roles[name.toLowerCase()] ?? (name.toLowerCase() === primary.toLowerCase() ? "customer" : "unknown"),
    stepCount: actorStepCount.get(name) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Persona card (client-renderable server component — no interactivity needed)
// ---------------------------------------------------------------------------
const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  customer:   { bg: "bg-primary-100",  text: "text-primary-700",  label: "Customer"   },
  frontstage: { bg: "bg-amber-100",    text: "text-amber-700",    label: "Frontstage" },
  backstage:  { bg: "bg-neutral-100",  text: "text-neutral-600",  label: "Backstage"  },
  unknown:    { bg: "bg-neutral-100",  text: "text-neutral-500",  label: "Actor"      },
};

function PersonaCard({ name, role, stepCount }: { name: string; role: string; stepCount: number }) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.unknown;
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-semibold text-neutral-600">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 truncate">{name}</p>
        <p className="text-xs text-neutral-400">
          {stepCount} step{stepCount !== 1 ? "s" : ""}
        </p>
      </div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const [blueprint, steps] = await Promise.all([
    getBlueprintById(id),
    getStepsForBlueprint(id),
  ]);

  if (!blueprint) redirect("/app");

  const isUnconfigured = !blueprint.primary_user;
  const personas = derivePersonas(blueprint, steps);

  const modes = [
    {
      label: "User Journey",
      icon: Zap,
      href: `/app/blueprints/${id}/capture`,
      description: "Capture steps, actors and moments",
      count: steps.length,
      countLabel: "steps",
    },
    {
      label: "Blueprint",
      icon: Grid3X3,
      href: `/app/blueprints/${id}/overview`,
      description: "Swimlane grid view",
      count: null,
      countLabel: null,
    },
  ];

  return (
    <>
      {isUnconfigured && <BlueprintSetupFlow blueprintId={id} />}

      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          All projects
        </Link>

        {/* Project header */}
        <div className="mb-10">
          <InlineTitle blueprintId={id} initialTitle={blueprint.title} />
          {blueprint.scenario && (
            <p className="mt-3 text-sm text-neutral-500 leading-relaxed max-w-2xl">
              {blueprint.scenario}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                blueprint.status === "draft"
                  ? "bg-neutral-100 text-neutral-600"
                  : "bg-primary-100 text-primary-700"
              }`}
            >
              {blueprint.status === "draft" ? "Draft" : "Published"}
            </span>
            {blueprint.primary_user && (
              <span className="text-xs text-neutral-400">
                Primary user: {blueprint.primary_user}
              </span>
            )}
            {blueprint.user_goal && (
              <span className="text-xs text-neutral-400">
                Goal: {blueprint.user_goal}
              </span>
            )}
          </div>
        </div>

        {/* Mode entry cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {modes.map(({ label, icon: Icon, href, description, count, countLabel }) => (
            <Link
              key={label}
              href={href}
              className="flex gap-4 p-5 rounded-xl bg-white border border-neutral-200 shadow-card hover:shadow-card-hover hover:border-primary-200 transition-all duration-200 group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                <Icon className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-800">{label}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
              </div>
              {count !== null && count > 0 && (
                <span className="flex-shrink-0 self-center text-xs text-neutral-400 tabular-nums">
                  {count} {countLabel}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Personas section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-700">Personas</h2>
            {personas.length > 0 && (
              <span className="text-xs text-neutral-400 ml-1">{personas.length} actor{personas.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {personas.length === 0 ? (
            <div className="py-8 px-6 rounded-xl border border-dashed border-neutral-200 text-center">
              <p className="text-sm text-neutral-400">
                Personas will appear here as you add actors in the User Journey or Blueprint.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {personas.map((p) => (
                <PersonaCard key={p.name} name={p.name} role={p.role} stepCount={p.stepCount} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
