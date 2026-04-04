import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Users, Zap, Grid3X3,
  FileText, BarChart2, Plus
} from "lucide-react";
import {
  getBlueprintById,
  getStepsForBlueprint,
} from "@/lib/supabase/blueprint-actions";
import type { Blueprint, Step } from "@/lib/types/blueprint";
import InlineTitle from "@/components/blueprints/InlineTitle";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Derive personas from steps + actor_roles
// ---------------------------------------------------------------------------

type PersonaRole = "customer" | "frontstage" | "backstage" | "unknown";

interface Persona {
  name: string;
  role: PersonaRole;
  stepCount: number;
}

function derivePersonas(blueprint: Blueprint, steps: Step[]): Persona[] {
  const primary = blueprint.primary_user?.trim() || "";
  const roles = blueprint.actor_roles ?? {};
  const countMap = new Map<string, number>();

  for (const step of steps) {
    const actor = step.actor?.trim() || primary;
    if (!actor) continue;
    countMap.set(actor, (countMap.get(actor) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const actors: string[] = [];
  if (primary) { seen.add(primary.toLowerCase()); actors.push(primary); }
  for (const [actor] of Array.from(countMap)) {
    if (!seen.has(actor.toLowerCase())) {
      seen.add(actor.toLowerCase());
      actors.push(actor);
    }
  }

  return actors.map((name) => ({
    name,
    role: (roles[name.toLowerCase()] ?? (name.toLowerCase() === primary.toLowerCase() ? "customer" : "unknown")) as PersonaRole,
    stepCount: countMap.get(name) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Role styles
// ---------------------------------------------------------------------------

const ROLE_STYLES: Record<PersonaRole, { bg: string; text: string; label: string }> = {
  customer:   { bg: "bg-primary-100",  text: "text-primary-700",  label: "Customer"   },
  frontstage: { bg: "bg-amber-100",    text: "text-amber-700",    label: "Frontstage" },
  backstage:  { bg: "bg-neutral-100",  text: "text-neutral-600",  label: "Backstage"  },
  unknown:    { bg: "bg-neutral-100",  text: "text-neutral-500",  label: "Actor"      },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionRow({
  icon: Icon,
  label,
  count,
  children,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="py-8 border-b border-neutral-100 last:border-0">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-neutral-400" />
        <h2 className="text-sm font-semibold text-neutral-700">{label}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-neutral-400">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function AddCard({ href, label }: { href?: string; label: string }) {
  const cls = "flex items-center gap-3 w-full px-5 py-4 rounded-xl border-2 border-dashed border-neutral-200 text-neutral-400 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50 transition-all duration-150 text-sm font-medium";
  if (href) {
    return (
      <Link href={href} className={cls}>
        <Plus className="w-4 h-4 flex-shrink-0" />
        {label}
      </Link>
    );
  }
  return (
    <button type="button" className={cls}>
      <Plus className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

function ComingSoonCard({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 w-full px-5 py-4 rounded-xl border border-neutral-100 bg-neutral-50 text-neutral-300 text-sm">
      <Plus className="w-4 h-4 flex-shrink-0" />
      {label}
      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider bg-neutral-200 text-neutral-400 px-2 py-0.5 rounded-full">
        Coming soon
      </span>
    </div>
  );
}

function PersonaCard({ name, role, stepCount }: Persona) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.unknown;
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-semibold text-neutral-600">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 truncate">{name}</p>
        <p className="text-xs text-neutral-400">{stepCount} step{stepCount !== 1 ? "s" : ""}</p>
      </div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    </div>
  );
}

function JourneyCard({ blueprintId, stepCount }: { blueprintId: string; stepCount: number }) {
  return (
    <Link
      href={`/app/blueprints/${blueprintId}/capture`}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-150 group"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
        <Zap className="w-4 h-4 text-primary-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900">User Journey</p>
        <p className="text-xs text-neutral-400">{stepCount} step{stepCount !== 1 ? "s" : ""} captured</p>
      </div>
      <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-primary-400 transition-colors" />
    </Link>
  );
}

function BlueprintCard({ blueprintId }: { blueprintId: string }) {
  return (
    <Link
      href={`/app/blueprints/${blueprintId}/overview`}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-150 group"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
        <Grid3X3 className="w-4 h-4 text-primary-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900">Service Blueprint</p>
        <p className="text-xs text-neutral-400">Swimlane grid</p>
      </div>
      <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-primary-400 transition-colors" />
    </Link>
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

  const personas = derivePersonas(blueprint, steps);
  const hasJourney = steps.length > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        All projects
      </Link>

      {/* Project header */}
      <div className="mb-2">
        <InlineTitle blueprintId={id} initialTitle={blueprint.title} />
      </div>
      {blueprint.description && (
        <p className="text-sm text-neutral-500 leading-relaxed mb-2 max-w-2xl">
          {blueprint.description}
        </p>
      )}
      <div className="mb-8">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${blueprint.status === "draft" ? "bg-neutral-100 text-neutral-600" : "bg-primary-100 text-primary-700"}`}>
          {blueprint.status === "draft" ? "Draft" : "Published"}
        </span>
      </div>

      {/* Rows */}
      <div>

        {/* Personas */}
        <SectionRow icon={Users} label="Personas" count={personas.length > 0 ? personas.length : undefined}>
          {personas.length === 0 ? (
            <p className="text-sm text-neutral-400 py-2">
              Personas are added automatically when you capture actors in a user journey or blueprint.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {personas.map((p) => (
                <PersonaCard key={p.name} {...p} />
              ))}
            </div>
          )}
        </SectionRow>

        {/* User Journeys */}
        <SectionRow icon={Zap} label="User Journeys">
          {hasJourney ? (
            <JourneyCard blueprintId={id} stepCount={steps.length} />
          ) : (
            <AddCard href={`/app/blueprints/${id}/capture`} label="Add a user journey" />
          )}
        </SectionRow>

        {/* Blueprints */}
        <SectionRow icon={Grid3X3} label="Blueprints">
          <BlueprintCard blueprintId={id} />
        </SectionRow>

        {/* Research Docs */}
        <SectionRow icon={FileText} label="Research Docs">
          <ComingSoonCard label="Add a research doc" />
        </SectionRow>

        {/* Planning & Prioritisation */}
        <SectionRow icon={BarChart2} label="Planning & Prioritisation">
          <ComingSoonCard label="Add a plan" />
        </SectionRow>

      </div>
    </div>
  );
}
