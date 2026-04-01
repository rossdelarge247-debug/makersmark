import { completeOnboarding } from "@/lib/supabase/auth-actions";
import { ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-neutral-900 text-center">
          Let&apos;s get you set up
        </h1>
        <p className="mt-3 text-neutral-600 text-center">
          A few quick steps to tailor MakersMark for your team.
        </p>
        <div className="mt-10 p-8 rounded-xl shadow-card border border-neutral-200 bg-white">
          <p className="text-sm text-neutral-500 text-center mb-6">
            Full onboarding flow coming in the next build.
          </p>
          <form action={completeOnboarding}>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              Continue to app
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
