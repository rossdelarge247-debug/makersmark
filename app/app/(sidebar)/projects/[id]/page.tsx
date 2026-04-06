import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Users, Zap, Grid3X3,
  FileText, BarChart2, Plus, Calendar, Clock,
} from "lucide-react";
import { getProjectById } from "@/lib/supabase/project-actions";
import { getBlueprintsForProject } from "@/lib/supabase/project-actions";
import { getJourneysForProject } from "@/lib/supabase/journey-actions";
import type { Blueprint, UserJourney } from "@/lib/types/blueprint";
import InlineTitle from "@/components/projects/InlineTitle";
import InlineDescription from "@/components/projects/InlineDescription";
import InlineOrganisation from "@/components/projects/InlineOrganisation";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Persona helpers (derived from blueprint actor_roles)
// ---------------------------------------------------------------------------

type PersonaRole = "customer" | "frontstage" | "backstage" | "unknown";

interface Persona {
  name: string;
  role: PersonaRole;
}

function derivePersonas(blueprints: Blueprint[]): Persona[] {
  const seen = new Map<string, PersonaRole>();

  for (const bp of blueprints) {
    if (!bp.primary_user?.trim()) continue;
    const primary = bp.primary_user.trim();
    if (!seen.has(primary.toLowerCase())) {
      seen.set(primary.toLowerCase(), "customer");
    }

    if (bp.actor_roles) {
      for (const [name, role] of Object.entries(bp.actor_roles)) {
        if (!seen.has(name.toLowerCase())) {
          seen.set(name.toLowerCase(), role as PersonaRole);
        }
      }
    }
  }

  return Array.from(seen.entries()).map(([key, role]) => ({
    name: key,
    role,
  }));
}

const ROLE_STYLES: Record<PersonaRole, { bg: string; text: string; label: string }> = {
  customer:   { bg: "bg-primary-100",  text: "text-primary-700",  label: "Customer"   },
  frontstage: { bg: "bg-amber-100",    text: "text-amber-700",    label: "Frontstage" },
  backstage:  { bg: "bg-neutral-100",  text: "text-neutral-600",  label: "Backstage"  },
  unknown:    { bg: "bg-neutral-100",  text: "text-neutral-500",  label: "Actor"      },
};

// ---------------------------------------------------------------------------
// Blueprint type label
// ---------------------------------------------------------------------------

function blueprintTypeLabel(type: Blueprint["type"]) {
  return type === "as_is" ? "As-is" : "To-be";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const [project, blueprints, journeys] = await Promise.all([
    getProjectById(id),
    getBlueprintsForProject(id),
    getJourneysForProject(id),
  ]);

  if (!project) redirect("/app");

  const personas = derivePersonas(blueprints);
  const asIsBlueprints = blueprints.filter((b) => b.type === "as_is");
  const toBeBlueprints = blueprints.filter((b) => b.type === "to_be");

  return (
    <div className="max-w-3xl mx-auto">

      {/* Back */}
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Workspace
      </Link>

      {/* ------------------------------------------------------------------ */}
      {/* Project header                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-10">
        <InlineTitle projectId={id} initialTitle={project.title} />

        <div className="mt-3">
          <InlineOrganisation projectId={id} initialOrganisation={project.organisation} />
        </div>

        <div className="mt-6">
          <InlineDescription projectId={id} initialDescription={project.description} />
        </div>

        {/* Metadata row */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
            <Calendar className="w-3.5 h-3.5" />
            Created {formatDate(project.created_at)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
            <Clock className="w-3.5 h-3.5" />
            Last updated {formatDate(project.updated_at)}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PRIMARY — Blueprints                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="w-5 h-5 text-primary-500" />
          <h2 className="section-label text-base text-neutral-900">Blueprints</h2>
        </div>

        {/* As-is */}
        <p className="label-caps text-neutral-400 mb-2">As-is</p>
        {asIsBlueprints.length > 0 ? (
          <div className="flex flex-col gap-2">
            {asIsBlueprints.map((bp) => (
              <Link
                key={bp.id}
                href={`/app/projects/${id}/blueprints/${bp.id}`}
                className="ruled-item flex items-center justify-between p-5 bg-white rounded-xl border-2 border-primary-100 shadow-sm hover:border-primary-300 hover:shadow-md transition-all duration-150 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors flex-shrink-0">
                    <Grid3X3 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{bp.name || "As-is blueprint"}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {bp.scenario ?? `Created ${formatDate(bp.created_at)}`}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 text-white text-xs font-semibold group-hover:bg-primary-700 transition-colors flex-shrink-0">
                  Open
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Link
            href={`/app/projects/${id}/blueprints/new`}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-dashed border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-all duration-150 text-sm"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            Create as-is blueprint
          </Link>
        )}

        {/* To-be */}
        <p className="label-caps text-neutral-400 mt-5 mb-2">To-be</p>
        {toBeBlueprints.length > 0 ? (
          <div className="flex flex-col gap-2">
            {toBeBlueprints.map((bp) => (
              <Link
                key={bp.id}
                href={`/app/projects/${id}/blueprints/${bp.id}`}
                className="ruled-item flex items-center justify-between p-5 bg-white rounded-xl border-2 border-amber-100 shadow-sm hover:border-amber-300 hover:shadow-md transition-all duration-150 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors flex-shrink-0">
                    <Grid3X3 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{bp.name || "To-be blueprint"} <span className="text-xs text-neutral-400 ml-1">{blueprintTypeLabel(bp.type)}</span></p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {bp.scenario ?? `Created ${formatDate(bp.created_at)}`}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold group-hover:bg-amber-700 transition-colors flex-shrink-0">
                  Open
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-4 p-5 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60">
            <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Grid3X3 className="w-5 h-5 text-neutral-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-400">To-be blueprint</p>
              <p className="text-xs text-neutral-400 mt-0.5">Future state service design — AI generated from your as-is blueprint</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-200 text-neutral-400 px-2 py-0.5 rounded-full flex-shrink-0">
              Coming soon
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECONDARY — User Journeys                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="py-6 border-t border-neutral-100">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-neutral-400" />
          <h2 className="section-label text-sm text-neutral-700">User Journeys</h2>
          {journeys.length > 0 && (
            <span className="text-xs text-neutral-400">{journeys.length}</span>
          )}
        </div>

        {journeys.length > 0 ? (
          <div className="flex flex-col gap-2">
            {journeys.map((journey: UserJourney) => (
              <Link
                key={journey.id}
                href={`/app/projects/${id}/journeys/${journey.id}`}
                className="ruled-item flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-150 group"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-neutral-50 flex items-center justify-center group-hover:bg-neutral-100 transition-colors">
                  <Zap className="w-4 h-4 text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800">{journey.name}</p>
                  {journey.description && (
                    <p className="text-xs text-neutral-400 truncate">{journey.description}</p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
              </Link>
            ))}
          </div>
        ) : null}

        <Link
          href={`/app/projects/${id}/journeys/new`}
          className="flex items-center gap-3 w-full px-4 py-3.5 mt-2 rounded-xl border border-dashed border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-all duration-150 text-sm"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          Add a user journey
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TERTIARY — Personas                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="py-6 border-t border-neutral-100">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-3.5 h-3.5 text-neutral-400" />
          <h2 className="label-caps text-neutral-500">Personas</h2>
          {personas.length > 0 && (
            <span className="text-xs text-neutral-400">{personas.length}</span>
          )}
        </div>

        {personas.length === 0 ? (
          <p className="text-xs text-neutral-400 py-1">
            Added automatically when you define actors in a blueprint.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {personas.map((p) => {
              const style = ROLE_STYLES[p.role] ?? ROLE_STYLES.unknown;
              const initials = p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={p.name} className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 bg-white rounded-full border border-neutral-200 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-600 flex-shrink-0">
                    {initials}
                  </div>
                  <span className="text-xs font-medium text-neutral-700">{p.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Future capabilities                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6 pt-6 border-t-2 border-neutral-100">
        <p className="label-caps text-neutral-300 mb-4">Coming soon</p>
        <div className="bg-neutral-50 rounded-xl border border-neutral-100 divide-y divide-neutral-100 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 text-neutral-400">
            <FileText className="w-4 h-4 flex-shrink-0 text-neutral-300" />
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-500">Research Docs</p>
              <p className="text-[11px] text-neutral-400">Attach research and insight documents</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5 text-neutral-400">
            <BarChart2 className="w-4 h-4 flex-shrink-0 text-neutral-300" />
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-500">Planning & Prioritisation</p>
              <p className="text-[11px] text-neutral-400">Prioritise findings and plan next steps</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
