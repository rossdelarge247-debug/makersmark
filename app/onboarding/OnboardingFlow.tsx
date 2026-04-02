"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Zap, Grid3X3, StickyNote, Sparkles, Map } from "lucide-react";
import { completeOnboarding, markOnboardingComplete } from "@/lib/supabase/auth-actions";
import { createBlueprint } from "@/lib/supabase/blueprint-actions";
import { useRouter } from "next/navigation";

const TOTAL_STEPS = 4;

export default function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [blueprintTitle, setBlueprintTitle] = useState("");
  const [blueprintDescription, setBlueprintDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleSkip() {
    startTransition(async () => {
      await completeOnboarding();
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const id = await createBlueprint({
        title: blueprintTitle || "My first blueprint",
        description: blueprintDescription,
      });
      await markOnboardingComplete();
      router.push(`/app/blueprints/${id}`);
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6 py-12">
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-12">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i + 1 === step
                ? "w-6 h-2 bg-primary-600"
                : i + 1 < step
                ? "w-2 h-2 bg-primary-300"
                : "w-2 h-2 bg-neutral-300"
            }`}
          />
        ))}
      </div>

      {/* Step panels */}
      <div className="w-full max-w-lg">
        {step === 1 && (
          <StepPanel key="step-1">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-8 mx-auto">
              <Map className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-4xl font-bold text-neutral-900 text-center leading-tight">
              Welcome to MakersMark
            </h1>
            <p className="mt-5 text-lg text-neutral-600 text-center leading-relaxed">
              MakersMark helps you design, capture, and share professional
              service blueprints — so your whole team understands exactly how
              your service works.
            </p>
            <p className="mt-4 text-base text-neutral-500 text-center">
              Map every touchpoint, handoff, and backstage process in one
              structured place. No more scattered docs or fuzzy shared
              understanding.
            </p>
            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={next}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                Get started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleSkip}
                disabled={isPending}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Skip setup
              </button>
            </div>
          </StepPanel>
        )}

        {step === 2 && (
          <StepPanel key="step-2">
            <p className="text-sm font-medium text-primary-600 text-center mb-6 uppercase tracking-widest">
              How it works
            </p>
            <h2 className="text-3xl font-bold text-neutral-900 text-center leading-tight">
              Four tools, one clear picture
            </h2>
            <p className="mt-4 text-base text-neutral-500 text-center mb-10">
              Every blueprint gives you a structured workflow from raw
              observation to polished documentation.
            </p>

            <div className="space-y-4">
              <FeatureRow
                icon={<Zap className="w-5 h-5 text-primary-600" />}
                title="Capture mode"
                description="Quickly log observations, steps, and touchpoints as they happen — no formatting required."
              />
              <FeatureRow
                icon={<Grid3X3 className="w-5 h-5 text-primary-600" />}
                title="Blueprint grid"
                description="Organise captured items into a structured swimlane grid across actors, actions, and layers."
              />
              <FeatureRow
                icon={<StickyNote className="w-5 h-5 text-primary-600" />}
                title="Notes"
                description="Add context, assumptions, and open questions directly alongside each part of your blueprint."
              />
              <FeatureRow
                icon={<Sparkles className="w-5 h-5 text-primary-600" />}
                title="AI interrogation"
                description="Ask the AI to identify gaps, suggest improvements, or explain your blueprint to stakeholders."
              />
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={next}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleSkip}
                disabled={isPending}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Skip setup
              </button>
            </div>
          </StepPanel>
        )}

        {step === 3 && (
          <StepPanel key="step-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-8 mx-auto">
              <Map className="w-7 h-7 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 text-center leading-tight">
              Name your first blueprint
            </h2>
            <p className="mt-4 text-base text-neutral-500 text-center mb-10">
              Give it a name and optional description. You can always change
              these later.
            </p>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="bp-title"
                  className="block text-sm font-medium text-neutral-700 mb-1.5"
                >
                  Blueprint name
                </label>
                <input
                  id="bp-title"
                  type="text"
                  value={blueprintTitle}
                  onChange={(e) => setBlueprintTitle(e.target.value)}
                  placeholder="My first blueprint"
                  maxLength={120}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="bp-desc"
                  className="block text-sm font-medium text-neutral-700 mb-1.5"
                >
                  Short description{" "}
                  <span className="text-neutral-400 font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="bp-desc"
                  value={blueprintDescription}
                  onChange={(e) => setBlueprintDescription(e.target.value)}
                  placeholder="What service or experience does this blueprint map?"
                  maxLength={300}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow text-sm resize-none"
                />
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={next}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleSkip}
                disabled={isPending}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Skip setup
              </button>
            </div>
          </StepPanel>
        )}

        {step === 4 && (
          <StepPanel key="step-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-8 mx-auto">
              <Sparkles className="w-7 h-7 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 text-center leading-tight">
              You&apos;re ready to go
            </h2>
            <p className="mt-4 text-base text-neutral-500 text-center mb-2">
              Your blueprint will be created and ready for you to start
              capturing.
            </p>

            {/* Summary card */}
            <div className="mt-8 p-5 rounded-xl bg-white border border-neutral-200 shadow-card">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
                Blueprint
              </p>
              <p className="text-base font-semibold text-neutral-900">
                {blueprintTitle.trim() || "My first blueprint"}
              </p>
              {blueprintDescription.trim() && (
                <p className="mt-1.5 text-sm text-neutral-500">
                  {blueprintDescription.trim()}
                </p>
              )}
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    Create my first blueprint
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={handleSkip}
                disabled={isPending}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Skip and go to dashboard
              </button>
            </div>
          </StepPanel>
        )}
      </div>

      {/* Step count */}
      <p className="mt-10 text-xs text-neutral-400">
        Step {step} of {TOTAL_STEPS}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {children}
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-white border border-neutral-200 shadow-card">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-800">{title}</p>
        <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
      </div>
    </div>
  );
}
