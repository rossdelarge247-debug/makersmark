"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Zap, Grid3X3, FolderOpen } from "lucide-react";
import { createBlueprint, deleteBlueprint } from "@/lib/supabase/blueprint-actions";
import type { Blueprint } from "@/lib/supabase/blueprint-actions";

interface DashboardClientProps {
  blueprints: Blueprint[];
  greeting: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const isDraft = status === "draft";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isDraft
          ? "bg-neutral-100 text-neutral-600"
          : "bg-primary-100 text-primary-700"
      }`}
    >
      {isDraft ? "Draft" : "Published"}
    </span>
  );
}

function ProjectCard({
  blueprint,
  onDelete,
}: {
  blueprint: Blueprint;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startDeleteTransition(async () => {
      await deleteBlueprint(blueprint.id);
      onDelete(blueprint.id);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-card hover:shadow-card-hover transition-shadow duration-200 flex flex-col">
      <div
        className="flex-1 p-5 cursor-pointer"
        onClick={() => router.push(`/app/blueprints/${blueprint.id}`)}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-neutral-900 leading-snug line-clamp-2">
            {blueprint.title}
          </h3>
          <StatusBadge status={blueprint.status} />
        </div>
        {blueprint.description && (
          <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 mb-3">
            {blueprint.description}
          </p>
        )}
        <p className="text-xs text-neutral-400">
          {formatDate(blueprint.created_at)}
        </p>
      </div>

      {/* Two entry buttons */}
      <div className="px-5 py-3 border-t border-neutral-100 flex items-center gap-2">
        <button
          onClick={() => router.push(`/app/blueprints/${blueprint.id}/capture`)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          User Journey
        </button>
        <button
          onClick={() => router.push(`/app/blueprints/${blueprint.id}/overview`)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          Blueprint
        </button>

        {/* Delete */}
        <div className="flex items-center">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "Deleting…" : "Delete?"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 mb-6">
        <FolderOpen className="w-8 h-8 text-primary-400" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
        No projects yet
      </h3>
      <p className="text-sm text-neutral-500 mb-8 max-w-xs leading-relaxed">
        Create your first project to start mapping service experiences.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create your first project
      </button>
    </div>
  );
}

export default function DashboardClient({
  blueprints: initialBlueprints,
  greeting,
}: DashboardClientProps) {
  const router = useRouter();
  const [blueprints, setBlueprints] = useState<Blueprint[]>(initialBlueprints);
  const [isCreating, startCreateTransition] = useTransition();

  function handleCreate() {
    startCreateTransition(async () => {
      const id = await createBlueprint({ title: "Untitled project" });
      router.push(`/app/blueprints/${id}`);
    });
  }

  function handleDelete(id: string) {
    setBlueprints((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{greeting}</h1>
          <p className="mt-1.5 text-neutral-500 text-base">
            {blueprints.length === 0
              ? "Get started by creating your first project."
              : `You have ${blueprints.length} project${blueprints.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {isCreating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              New project
            </>
          )}
        </button>
      </div>

      {/* Project grid or empty state */}
      {blueprints.length === 0 ? (
        <EmptyState onCreate={handleCreate} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blueprints.map((blueprint) => (
            <ProjectCard
              key={blueprint.id}
              blueprint={blueprint}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
