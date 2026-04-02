"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BlueprintSetupFlowProps {
  blueprintId: string;
}

type Step = "primary_user" | "user_goal" | "end_condition";

const STEPS: { key: Step; label: string; placeholder: string; hint: string }[] =
  [
    {
      key: "primary_user",
      label: "Who is the primary user of this service?",
      placeholder: "e.g. First-time home buyer, small business owner…",
      hint: "Think about the person whose journey you are mapping.",
    },
    {
      key: "user_goal",
      label: "What are they trying to achieve?",
      placeholder: "e.g. Get a mortgage approved, hire their first employee…",
      hint: "The outcome this person wants from the service.",
    },
    {
      key: "end_condition",
      label: "When does the journey end?",
      placeholder: "e.g. Loan funds transferred, contract signed…",
      hint: "The moment the service interaction is complete.",
    },
  ];

export default function BlueprintSetupFlow({
  blueprintId,
}: BlueprintSetupFlowProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<Record<Step, string>>({
    primary_user: "",
    user_goal: "",
    end_condition: "",
  });
  const [isPending, setIsPending] = useState(false);

  const current = STEPS[currentIndex];
  const isLast = currentIndex === STEPS.length - 1;

  function handleNext() {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  async function handleComplete() {
    setIsPending(true);
    try {
      const supabase = createClient();
      await supabase
        .from("blueprints")
        .update({
          primary_user: values.primary_user || null,
          user_goal: values.user_goal || null,
          end_condition: values.end_condition || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", blueprintId);
    } finally {
      setIsPending(false);
      router.push(`/app/blueprints/${blueprintId}/capture`);
    }
  }

  function handleSkip() {
    router.push(`/app/blueprints/${blueprintId}/capture`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && values[current.key].trim()) {
      handleNext();
    }
  }

  return (
    // Full-page overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-50/90 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-modal border border-neutral-200 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-neutral-100">
            <div
              className="h-1 bg-primary-500 transition-all duration-500"
              style={{
                width: `${((currentIndex + 1) / STEPS.length) * 100}%`,
              }}
            />
          </div>

          <div className="px-10 py-10">
            {/* Step counter */}
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-8">
              Step {currentIndex + 1} of {STEPS.length}
            </p>

            {/* Question */}
            <h2 className="text-2xl font-bold text-neutral-900 leading-snug mb-2">
              {current.label}
            </h2>
            <p className="text-sm text-neutral-500 mb-8">{current.hint}</p>

            {/* Input */}
            <input
              key={current.key}
              type="text"
              autoFocus
              value={values[current.key]}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [current.key]: e.target.value,
                }))
              }
              onKeyDown={handleKeyDown}
              placeholder={current.placeholder}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
            />

            {/* Actions */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Skip setup
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!values[current.key].trim() || isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : isLast ? (
                  <>
                    Get started
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
