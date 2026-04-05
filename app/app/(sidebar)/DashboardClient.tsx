"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FolderOpen, ArrowRight, X } from "lucide-react";
import { createProject, deleteProject } from "@/lib/supabase/project-actions";
import type { Project } from "@/lib/types/blueprint";

interface DashboardClientProps {
  projects: Project[];
  greeting: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// New project modal
// ---------------------------------------------------------------------------

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (id: string) => void;
}

function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setIsCreating(true);
    const id = await createProject(name.trim(), description.trim());
    onCreated(id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm" onKeyDown={handleKeyDown}>
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-modal border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-8 pt-8 pb-0">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">New project</p>
          <button onClick={onClose} className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isCreating ? (
          <div className="px-8 py-12 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-neutral-600">Setting up your new project…</p>
          </div>
        ) : (
          <div className="px-8 pt-6 pb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-6">What are we working on?</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Project name</label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. GP appointment booking, Home insurance claim…"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Describe this project
                  <span className="ml-1.5 text-xs font-normal text-neutral-400">optional</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What service or experience is this project about?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition resize-none"
                />
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between gap-4">
              <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Create project
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project card
// ---------------------------------------------------------------------------

function ProjectCard({ project, index, onDelete }: { project: Project; index: number; onDelete: (id: string) => void }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    startDeleteTransition(async () => {
      await deleteProject(project.id);
      onDelete(project.id);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-card hover:shadow-card-hover transition-shadow duration-200 flex flex-col">
      <div className="flex-1 p-5 cursor-pointer" onClick={() => router.push(`/app/projects/${project.id}`)}>
        <span className="display-num block mb-2">{String(index + 1).padStart(2, "0")}</span>
        <div className="flex items-start mb-3">
          <h3 className="section-label text-base text-neutral-900 leading-snug line-clamp-2">{project.title}</h3>
        </div>
        {project.description && (
          <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 mb-3">{project.description}</p>
        )}
        <p className="text-xs text-neutral-400">{formatDate(project.created_at)}</p>
      </div>

      <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between gap-3">
        <button
          onClick={() => router.push(`/app/projects/${project.id}`)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors"
        >
          View project
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} disabled={isDeleting} className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors">
              {isDeleting ? "Deleting…" : "Delete?"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">No</button>
          </div>
        ) : (
          <button onClick={handleDelete} className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Delete project">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 mb-6">
        <FolderOpen className="w-8 h-8 text-primary-400" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">No projects yet</h3>
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function DashboardClient({ projects: initialProjects, greeting }: DashboardClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showModal, setShowModal] = useState(false);

  function handleCreated(id: string) {
    router.push(`/app/projects/${id}`);
  }

  function handleDelete(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="max-w-5xl mx-auto">
      {showModal && (
        <NewProjectModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}

      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{greeting}</h1>
          <p className="mt-1.5 text-neutral-500 text-base">
            {projects.length === 0
              ? "Get started by creating your first project."
              : `You have ${projects.length} project${projects.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New project
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState onCreate={() => setShowModal(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
