"use client";

import { useState, useRef, useTransition } from "react";
import { updateBlueprintMeta } from "@/lib/supabase/blueprint-actions";

interface InlineTitleProps {
  blueprintId: string;
  initialTitle: string;
}

export default function InlineTitle({
  blueprintId,
  initialTitle,
}: InlineTitleProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    setDraft(title);
    setIsEditing(true);
    // Focus handled by autoFocus on the input
  }

  function commitSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === title) {
      setIsEditing(false);
      return;
    }
    startTransition(async () => {
      await updateBlueprintMeta(blueprintId, { title: trimmed });
      setTitle(trimmed);
      setIsEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      commitSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitSave}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        className="text-3xl font-bold text-neutral-900 leading-tight bg-primary-50 border border-primary-300 rounded-lg px-2 py-0.5 w-full max-w-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition disabled:opacity-60"
      />
    );
  }

  return (
    <h1
      onClick={handleClick}
      title="Click to edit title"
      className="text-3xl font-bold text-neutral-900 leading-tight cursor-text hover:bg-neutral-100 rounded-lg px-2 py-0.5 -mx-2 transition-colors select-none"
    >
      {title}
    </h1>
  );
}
