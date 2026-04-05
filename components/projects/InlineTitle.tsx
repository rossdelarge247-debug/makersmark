"use client";

import { useState, useRef } from "react";
import { Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface InlineTitleProps {
  projectId: string;
  initialTitle: string;
}

export default function InlineTitle({ projectId, initialTitle }: InlineTitleProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleEdit() {
    setDraft(title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleCancel() {
    setIsEditing(false);
    setDraft(title);
  }

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === title) { setIsEditing(false); return; }
    setIsPending(true);
    const supabase = createClient();
    await supabase
      .from("projects")
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    setTitle(trimmed);
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
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="text-3xl font-bold text-neutral-900 leading-tight bg-white border border-primary-300 rounded-lg px-3 py-1 flex-1 max-w-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition disabled:opacity-60"
        />
        <button
          onClick={handleSave}
          disabled={isPending || !draft.trim()}
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
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-3xl font-bold text-neutral-900 leading-tight">{title}</h1>
      <button
        onClick={handleEdit}
        title="Edit title"
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
}
