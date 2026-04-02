import {
  Map,
  Layers,
  MessageSquareText,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react";

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-xs font-medium text-primary-700 mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Now with AI interrogation
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-neutral-900 tracking-tight text-balance leading-tight max-w-4xl mx-auto">
          Service blueprints that{" "}
          <span className="text-primary-600">capture the whole picture</span>
        </h1>
        <p className="mt-6 text-xl text-neutral-600 max-w-2xl mx-auto text-balance leading-relaxed">
          MakersMark guides your team through every layer of a service
          experience — from what customers see to the systems that make it
          happen. Design, capture, interrogate, and share in one place.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-card"
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/how-it-works"
            className="px-6 py-3 rounded-xl text-neutral-700 font-medium hover:bg-neutral-100 transition-colors"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* ── Social proof strip ───────────────────────────────────────────── */}
      <section className="border-y border-neutral-100 bg-neutral-50 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm text-neutral-500 mr-4">
            Used by service designers at
          </span>
          {[
            "Meridian Health",
            "Volta Studios",
            "Harbourline Digital",
            "Apex Consulting",
            "Brightfield Co.",
          ].map((name) => (
            <span
              key={name}
              className="text-sm font-medium text-neutral-600 px-3 py-1 rounded-md bg-white border border-neutral-200"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features summary ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Everything your team needs to map a service
          </h2>
          <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
            From first discovery session to polished deliverable — MakersMark
            keeps your whole service team aligned.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Map,
              title: "Guided capture",
              description:
                "Structured prompts walk your team through every service layer — customer actions, frontstage, backstage, and support processes.",
            },
            {
              icon: Layers,
              title: "Blueprint grid",
              description:
                "A professional swimlane layout that maps interactions against phases, automatically organised as you capture.",
            },
            {
              icon: MessageSquareText,
              title: "Notes & tagging",
              description:
                "Attach context, pain points, and opportunities to any cell. Tag items for review and keep insights organised.",
            },
            {
              icon: Sparkles,
              title: "AI interrogation",
              description:
                "Ask questions about your blueprint — identify gaps, surface assumptions, and get sharper thinking from an AI trained on service design.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-6 rounded-xl bg-white border border-neutral-200 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">
                {title}
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works teaser ──────────────────────────────────────────── */}
      <section className="bg-neutral-50 border-y border-neutral-100 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
              From blank page to shared blueprint
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
              Three steps. No training required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Set up your blueprint",
                description:
                  "Name your service, define the customer journey phases, and invite your team. Takes under two minutes.",
              },
              {
                step: "02",
                title: "Capture and expand",
                description:
                  "Work through each layer with guided prompts. Add notes, flag pain points, and tag anything worth revisiting.",
              },
              {
                step: "03",
                title: "Interrogate and share",
                description:
                  "Let AI surface gaps in your thinking, then export or share a polished snapshot link with stakeholders.",
              },
            ].map(({ step, title, description }) => (
              <div key={step} className="flex gap-5">
                <div className="flex-shrink-0">
                  <span className="text-3xl font-bold text-primary-200 leading-none">
                    {step}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href="/how-it-works"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              See the full walkthrough
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Testimonial / proof ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote className="text-2xl font-medium text-neutral-800 text-balance leading-snug">
            &ldquo;We used to spend two days prepping a service blueprint in
            sticky notes and slides. MakersMark halved our prep time and gave
            everyone a shared source of truth.&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-neutral-900">
                Sarah O.
              </p>
              <p className="text-sm text-neutral-500">
                Lead Service Designer, Harbourline Digital
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <section className="bg-primary-600 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight text-balance">
            Ready to map your first blueprint?
          </h2>
          <p className="mt-4 text-lg text-primary-200 max-w-xl mx-auto">
            Free to start, no credit card required. Your team can be blueprinting
            in minutes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary-700 font-medium hover:bg-primary-50 transition-colors shadow-card"
            >
              <CheckCircle2 className="w-4 h-4" />
              Create free account
            </a>
            <a
              href="/features"
              className="px-6 py-3 rounded-xl text-primary-200 font-medium hover:text-white hover:bg-primary-500 transition-colors"
            >
              Explore features
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
