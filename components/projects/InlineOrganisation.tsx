"use client";

import { useState, useRef } from "react";
import { Building2, Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface InlineOrganisationProps {
  projectId: string;
  initialOrganisation: string | null;
}

export default function InlineOrganisation({ projectId, initialOrganisation }: InlineOrganisationProps) {
  const [organisation, setOrganisation] = useState(initialOrganisation ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialOrganisation ?? "");
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleEdit() {
    setDraft(organisation);
    setIsEditing(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  }

  function handleCancel() {
    setIsEditing(false);
    setDraft(organisation);
  }

  async function handleSave() {
    const trimmed = draft.trim();
    if (trimmed === organisation.trim()) { setIsEditing(false); return; }
    setIsPending(true);
    const supabase = createClient();
    await supabase
      .from("projects")
      .update({ organisation: trimmed || null, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    setOrganisation(trimmed);
    setIsPending(false);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") handleCancel();
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder="e.g. NHS Digital, Cabinet Office…"
          className="text-sm text-neutral-900 bg-white border border-primary-300 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 transition disabled:opacity-60 placeholder:text-neutral-300"
        />
        <button
          onClick={handleSave}
          disabled={isPending || !draft.trim()}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 cursor-pointer" onClick={handleEdit}>
      <Building2 className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
      {organisation ? (
        <span className="text-sm font-medium text-neutral-700">{organisation}</span>
      ) : (
        <span className="text-sm text-neutral-300 italic">Add organisation</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); handleEdit(); }}
        title="Edit organisation"
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}
