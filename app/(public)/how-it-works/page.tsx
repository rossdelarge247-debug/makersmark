import { ArrowRight, CheckCircle2 } from "lucide-react";

const steps = [
  {
    number: "01",
    phase: "Setup",
    title: "Define your service",
    description:
      "Start by naming your blueprint and describing the service experience you're mapping. Set the customer journey phases — the columns of your blueprint. These might be Awareness, Enquiry, Onboarding, Delivery, and Follow-up, or something entirely specific to your service. You define the structure.",
    details: [
      "Name the blueprint and describe the service context",
      "Define journey phases (columns)",
      "Set the service layers you'll map (rows)",
      "Invite team members if working collaboratively",
    ],
  },
  {
    number: "02",
    phase: "Capture",
    title: "Work through each layer",
    description:
      "SD>Kit guides you through each swimlane in turn. Start with customer actions — what does the customer do in each phase? Then move to touchpoints, frontstage interactions, backstage processes, and support systems. Guided prompts stop the session going blank.",
    details: [
      "Customer actions: what is the customer doing?",
      "Touchpoints: where do they interact with the service?",
      "Frontstage: what do staff or systems do that the customer sees?",
      "Backstage: what happens behind the scenes?",
      "Support processes: what systems or teams enable delivery?",
    ],
  },
  {
    number: "03",
    phase: "Expand",
    title: "Add depth with notes and tags",
    description:
      "Raw captures are just the start. Go back through your blueprint cells and add context — note pain points, moments of delight, assumptions, open questions, or dependencies. Tag items for review, action, or follow-up so nothing gets lost after the session.",
    details: [
      "Attach notes to any cell in the grid",
      "Tag items: Pain point, Opportunity, Assumption, Open question",
      "Flag cells for review or follow-up",
      "Add links to supporting evidence or research",
    ],
  },
  {
    number: "04",
    phase: "Refine",
    title: "Review and tighten",
    description:
      "Step back and read the blueprint as a whole. Filter by tag to see all pain points across the journey. Identify where swim lanes don't line up — where a customer action has no visible touchpoint, or where a frontstage interaction has no backstage support. Fill the gaps.",
    details: [
      "Filter view by tag type for a focused review",
      "Identify misalignments between layers",
      "Fill gaps before moving to interrogation",
      "Mark cells as reviewed or approved",
    ],
  },
  {
    number: "05",
    phase: "AI interrogate",
    title: "Let the AI challenge your thinking",
    description:
      "The AI interrogation panel reads your entire blueprint and acts as a sharp thinking partner. It asks the questions experienced service designers ask in a review — surfacing gaps, logical inconsistencies, missing dependencies, and unstated assumptions. You can also ask it anything about the service.",
    details: [
      "Ask: 'What gaps do you see in the backstage processes?'",
      "Ask: 'Explain this service to someone who has never heard of it'",
      "Ask: 'What assumptions are we making that we haven't validated?'",
      "Iterate on your blueprint based on AI responses",
    ],
  },
  {
    number: "06",
    phase: "Share",
    title: "Get it in front of stakeholders",
    description:
      "When you're ready, generate a shareable snapshot link. Stakeholders get a clean, read-only view of the blueprint without needing a SD>Kit account. Export to PDF or PNG for slide decks and documentation. Snapshots are version-stamped so you always know what was shared.",
    details: [
      "Generate a snapshot link with one click",
      "Shareable without requiring a login",
      "Export to PDF for documentation",
      "Snapshot includes a timestamp and version reference",
    ],
  },
] as const;

export default function HowItWorksPage() {
  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="text-5xl font-bold text-neutral-900 tracking-tight text-balance">
          From blank canvas to{" "}
          <span className="text-primary-600">shared blueprint</span>
        </h1>
        <p className="mt-6 text-xl text-neutral-600 max-w-2xl mx-auto text-balance">
          A step-by-step walkthrough of the {"SD>Kit"} workflow — from setting
          up your first blueprint to sharing it with stakeholders.
        </p>
      </section>

      {/* ── Step timeline ────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="relative">
          {/* Vertical rule */}
          <div
            className="absolute left-[2.25rem] top-0 bottom-0 w-px bg-neutral-200"
            aria-hidden="true"
          />

          <ol className="space-y-0">
            {steps.map((step, index) => (
              <li key={step.number} className="relative flex gap-8">
                {/* Step number bubble */}
                <div className="relative z-10 flex-shrink-0 mt-8">
                  <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-white border-2 border-neutral-200 flex items-center justify-center shadow-card">
                    <span className="text-lg font-bold text-primary-600">
                      {step.number}
                    </span>
                  </div>
                </div>

                {/* Step content */}
                <div
                  className={`flex-1 pt-8 ${index < steps.length - 1 ? "pb-12" : "pb-0"}`}
                >
                  <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary-500 mb-2">
                    {step.phase}
                  </span>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-3 tracking-tight">
                    {step.title}
                  </h2>
                  <p className="text-neutral-600 leading-relaxed mb-5">
                    {step.description}
                  </p>
                  <ul className="space-y-2">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-neutral-600">
                          {detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-neutral-50 border-t border-neutral-100 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Ready to map your first blueprint?
          </h2>
          <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
            Free to start. No credit card. Your team can be blueprinting in
            minutes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-card"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/features"
              className="px-6 py-3 rounded-xl text-neutral-700 font-medium hover:bg-neutral-100 transition-colors"
            >
              Explore all features
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
