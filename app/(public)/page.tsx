export default function LandingPage() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 text-center">
      <h1 className="text-5xl font-bold text-neutral-900 tracking-tight text-balance">
        Service blueprints,{" "}
        <span className="text-primary-600">built for teams</span>
      </h1>
      <p className="mt-6 text-xl text-neutral-600 max-w-2xl mx-auto text-balance">
        Design, capture, and share professional service blueprints with your
        team. Align on the full picture — from frontstage interactions to
        backstage processes.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <a
          href="/signup"
          className="px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-card"
        >
          Get started free
        </a>
        <a
          href="/how-it-works"
          className="px-6 py-3 rounded-xl text-neutral-700 font-medium hover:bg-neutral-100 transition-colors"
        >
          See how it works
        </a>
      </div>
    </section>
  );
}
