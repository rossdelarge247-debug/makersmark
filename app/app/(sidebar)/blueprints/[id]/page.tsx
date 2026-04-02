import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Grid3X3 } from "lucide-react";
import { getBlueprintById } from "@/lib/supabase/blueprint-actions";
import BlueprintSetupFlow from "@/components/blueprints/BlueprintSetupFlow";
import InlineTitle from "@/components/blueprints/InlineTitle";

interface BlueprintPageProps {
  params: Promise<{ id: string }>;
}

export default async function BlueprintPage({ params }: BlueprintPageProps) {
  const { id } = await params;
  const blueprint = await getBlueprintById(id);

  if (!blueprint) {
    redirect("/app");
  }

  const isUnconfigured = !blueprint.primary_user;

  const tabs = [
    {
      label: "Capture",
      icon: Zap,
      href: `/app/blueprints/${id}/capture`,
      description: "Log observations and steps as they happen",
    },
    {
      label: "Overview",
      icon: Grid3X3,
      href: `/app/blueprints/${id}/overview`,
      description: "Structured swimlane grid view",
    },
  ];

  return (
    <>
      {/* Setup flow overlay — shown for new/unconfigured blueprints */}
      {isUnconfigured && <BlueprintSetupFlow blueprintId={id} />}

      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        {/* Blueprint header */}
        <div className="mb-10">
          <InlineTitle blueprintId={id} initialTitle={blueprint.title} />
          {blueprint.description && (
            <p className="mt-3 text-base text-neutral-500 leading-relaxed max-w-2xl">
              {blueprint.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
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
                User: {blueprint.primary_user}
              </span>
            )}
          </div>
        </div>

        {/* Mode tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tabs.map(({ label, icon: Icon, href, description }) => (
            <Link
              key={label}
              href={href}
              className="flex gap-4 p-5 rounded-xl bg-white border border-neutral-200 shadow-card hover:shadow-card-hover hover:border-primary-200 transition-all duration-200 group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                <Icon className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800">{label}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
