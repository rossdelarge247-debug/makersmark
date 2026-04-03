"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, Zap, Grid3X3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BlueprintSetupFlowProps {
  blueprintId: string;
}

type StartMode = "journey" | "blueprint";
type QuestionStep = "primary_user" | "user_goal" | "scenario" | "end_condition";

const QUESTIONS: { key: QuestionStep; label: string; placeholder: string; hint: string }[] = [
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
    key: "scenario",
    label: "Describe the scenario",
    placeholder: "e.g. A customer who has just moved house tries to update their address online…",
    hint: "Set the scene — the specific situation or context this journey takes place in.",
  },
  {
    key: "end_condition",
    label: "When does the journey end?",
    placeholder: "e.g. Loan funds transferred, address confirmed in the system…",
    hint: "The moment the service interaction is complete.",
  },
];

export default function BlueprintSetupFlow({ blueprintId }: BlueprintSetupFlowProps) {
  const router = useRouter();
  const [startMode, setStartMode] = useState<StartMode | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [values, setValues] = useState<Record<QuestionStep, string>>({
    primary_user: "",
    user_goal: "",
    scenario: "",
    end_condition: "",
  });
  const [isPending, setIsPending] = useState(false);

  const destinationPath =
    startMode === "blueprint"
      ? `/app/blueprints/${blueprintId}/overview`
      : `/app/blueprints/${blueprintId}/capture`;

  // ---- Step 0: mode picker ----
  if (startMode === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-50/90 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4">
          <div className="bg-white rounded-2xl shadow-modal border border-neutral-200 overflow-hidden">
            <div className="px-10 py-10">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-6">
                New project
              </p>
              <h2 className="text-2xl font-bold text-neutral-900 leading-snug mb-2">
                Where would you like to start?
              </h2>
              <p className="text-sm text-neutral-500 mb-8">
                You can always switch between modes once the project is created.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => { setStartMode("journey"); setQuestionIndex(0); }}
                  className="flex flex-col gap-3 p-5 rounded-xl border-2 border-neutral-200 hover:border-primary-400 hover:bg-primary-50 transition-all duration-150 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                    <Zap className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">User Journey</p>
                    <p className="mt-0.5 text-xs text-neutral-500 leading-snug">
                      Capture steps, actors and moments as they happen
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setStartMode("blueprint"); setQuestionIndex(0); }}
                  className="flex flex-col gap-3 p-5 rounded-xl border-2 border-neutral-200 hover:border-primary-400 hover:bg-primary-50 transition-all duration-150 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                    <Grid3X3 className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">Blueprint</p>
                    <p className="mt-0.5 text-xs text-neutral-500 leading-snug">
                      Jump straight into the swimlane grid
                    </p>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.push(destinationPath)}
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Skip setup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Steps 1–4: context questions ----
  const current = QUESTIONS[questionIndex!];
  const isLast = questionIndex === QUESTIONS.length - 1;
  // +1 because step 0 was mode picker (not counted in QUESTIONS)
  const displayStep = questionIndex! + 1;
  const totalSteps = QUESTIONS.length;

  function handleNext() {
    if (isLast) {
      handleComplete();
    } else {
      setQuestionIndex((i) => i! + 1);
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
          scenario: values.scenario || null,
          end_condition: values.end_condition || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", blueprintId);
    } finally {
      setIsPending(false);
      router.push(destinationPath);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && values[current.key].trim()) {
      handleNext();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-50/90 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4">
        <div className="bg-white rounded-2xl shadow-modal border border-neutral-200 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-neutral-100">
            <div
              className="h-1 bg-primary-500 transition-all duration-500"
              style={{ width: `${((displayStep) / totalSteps) * 100}%` }}
            />
          </div>

          <div className="px-10 py-10">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-8">
              Step {displayStep} of {totalSteps}
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 leading-snug mb-2">
              {current.label}
            </h2>
            <p className="text-sm text-neutral-500 mb-8">{current.hint}</p>

            <input
              key={current.key}
              type="text"
              autoFocus
              value={values[current.key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [current.key]: e.target.value }))
              }
              onKeyDown={handleKeyDown}
              placeholder={current.placeholder}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
            />

            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => router.push(destinationPath)}
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
