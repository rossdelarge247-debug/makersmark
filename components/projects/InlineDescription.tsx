"use client";

import { useState, useRef } from "react";
import { Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface InlineDescriptionProps {
  projectId: string;
  initialDescription: string | null;
}

export default function InlineDescription({ projectId, initialDescription }: InlineDescriptionProps) {
  const [description, setDescription] = useState(initialDescription ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialDescription ?? "");
  const [isPending, setIsPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleEdit() {
    setDraft(description);
    setIsEditing(true);
    setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.select(); }, 0);
  }

  function handleCancel() {
    setIsEditing(false);
    setDraft(description);
  }

  async function handleSave() {
    const trimmed = draft.trim();
    if (trimmed === description.trim()) { setIsEditing(false); return; }
    setIsPending(true);
    const supabase = createClient();
    await supabase
      .from("projects")
      .update({ description: trimmed || null, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    setDescription(trimmed);
    setIsPending(false);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
    else if (e.key === "Escape") handleCancel();
  }

  if (isEditing) {
    return (
      <div>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">Project description</p>
        <textarea
          ref={textareaRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          rows={3}
          placeholder="Add a project summary…"
          className="w-full text-xl font-semibold text-neutral-900 leading-snug bg-white border border-primary-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition resize-none disabled:opacity-60 placeholder:text-neutral-300 placeholder:font-normal"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            Update
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-xs text-neutral-300 ml-1">⌘↵ to save · Esc to cancel</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">Project description</p>
      <div className="group flex items-start gap-2 cursor-pointer" onClick={handleEdit}>
        {description ? (
          <p className="text-xl font-semibold text-neutral-900 leading-snug flex-1">{description}</p>
        ) : (
          <p className="text-xl font-semibold text-neutral-300 leading-snug flex-1 italic">Add project summary here</p>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleEdit(); }}
          title="Edit description"
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
