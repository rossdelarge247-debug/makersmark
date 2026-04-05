import ThemeSelector from "./ThemeSelector";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
      <p className="mt-2 text-neutral-500">
        Manage your account preferences and workspace settings.
      </p>

      <div className="mt-10 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-4">
            Appearance
          </h2>
          <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
            <div className="px-6 py-5">
              <p className="text-sm font-semibold text-neutral-900">Theme</p>
              <p className="text-xs text-neutral-500 mt-0.5 mb-5">
                Choose the visual style for your workspace.
              </p>
              <ThemeSelector />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
