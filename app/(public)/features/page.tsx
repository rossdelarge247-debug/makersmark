import {
  Map,
  Layers,
  MessageSquareText,
  Sparkles,
  Share2,
  Tag,
  StickyNote,
  Search,
  Download,
  Link2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

function VisualPlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 flex items-center justify-center">
      <span className="text-sm font-medium text-primary-400">{label}</span>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl font-bold text-neutral-900 tracking-tight text-balance">
          Built for how service designers{" "}
          <span className="text-primary-600">actually work</span>
        </h1>
        <p className="mt-6 text-xl text-neutral-600 max-w-2xl mx-auto text-balance">
          Every feature in MakersMark exists to reduce friction between your
          team&rsquo;s thinking and a finished, shareable blueprint.
        </p>
      </section>

      {/* ── Feature 1: Guided capture ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-5">
              <Map className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-4">
              Guided capture
            </h2>
            <p className="text-lg text-neutral-600 leading-relaxed mb-6">
              Most blueprinting sessions stall because teams don&rsquo;t know
              where to start. MakersMark walks you through every layer
              systematically — customer actions, touchpoints, frontstage
              interactions, backstage processes, and support systems.
            </p>
            <ul className="space-y-3">
              {[
                "Structured prompts per swim lane",
                "Journey phase columns keep work organised",
                "Add items without losing your flow",
                "Works solo or collaboratively",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-neutral-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <VisualPlaceholder label="Guided capture interface" />
        </div>
      </section>

      <div className="border-t border-neutral-100" />

      {/* ── Feature 2: Blueprint grid ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <VisualPlaceholder label="Blueprint grid view" />
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-5">
              <Layers className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-4">
              Blueprint grid
            </h2>
            <p className="text-lg text-neutral-600 leading-relaxed mb-6">
              Your capture sessions automatically populate a professional
              swimlane grid — the standard format stakeholders recognise and
              expect. No manual layout work. The grid builds itself as your
              team adds content.
            </p>
            <ul className="space-y-3">
              {[
                "Classic swimlane layout: customer, frontstage, backstage, support",
                "Phase columns match your journey definition",
                "Zoom in on any cell for detail",
                "Always print-ready and presentation-ready",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-neutral-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="border-t border-neutral-100" />

      {/* ── Feature 3: Notes & tagging ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-5">
              <StickyNote className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-4">
              Notes &amp; tagging
            </h2>
            <p className="text-lg text-neutral-600 leading-relaxed mb-6">
              A blueprint without context is just a grid. MakersMark lets you
              attach rich notes to any cell — capturing the conversation behind
              the decision, not just the decision itself.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {[
                { icon: StickyNote, label: "Rich cell notes" },
                { icon: Tag, label: "Custom tags" },
                { icon: Search, label: "Filter & search" },
                { icon: MessageSquareText, label: "Team comments" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200"
                >
                  <Icon className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-neutral-700">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <VisualPlaceholder label="Notes and tagging panel" />
        </div>
      </section>

      <div className="border-t border-neutral-100" />

      {/* ── Feature 4: AI interrogation ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <VisualPlaceholder label="AI interrogation chat" />
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-5">
              <Sparkles className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-4">
              AI interrogation
            </h2>
            <p className="text-lg text-neutral-600 leading-relaxed mb-6">
              A sharp thinking partner that has read your entire blueprint.
              Ask it to find gaps, stress-test assumptions, suggest improvements,
              or explain any part of the service to a stakeholder unfamiliar with
              the domain.
            </p>
            <ul className="space-y-3">
              {[
                "Asks the probing questions your team might miss",
                "Surfaces logical gaps between swim lanes",
                "Explains service concepts in plain language",
                "Trained on service design best practice",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-neutral-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="border-t border-neutral-100" />

      {/* ── Feature 5: Share & export ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-5">
              <Share2 className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-4">
              Share &amp; export
            </h2>
            <p className="text-lg text-neutral-600 leading-relaxed mb-6">
              Get your blueprint in front of stakeholders without making them
              log in. Snapshot links capture the blueprint at a point in time.
              Export for slide decks, print, or archiving.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {[
                { icon: Link2, label: "Shareable snapshot links" },
                { icon: Download, label: "Export to PDF / PNG" },
                { icon: Layers, label: "Version history" },
                { icon: CheckCircle2, label: "Stakeholder-ready view" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200"
                >
                  <Icon className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-neutral-700">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <VisualPlaceholder label="Share & export options" />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-neutral-50 border-t border-neutral-100 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
            See every feature in action
          </h2>
          <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
            Create a free account and take MakersMark through a real blueprint.
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
              href="/how-it-works"
              className="px-6 py-3 rounded-xl text-neutral-700 font-medium hover:bg-neutral-100 transition-colors"
            >
              How it works
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
