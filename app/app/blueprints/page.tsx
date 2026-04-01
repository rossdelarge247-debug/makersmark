export default function BlueprintsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Blueprints</h1>
        <button className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
          New blueprint
        </button>
      </div>
      <p className="mt-2 text-neutral-600">
        Your service blueprints will appear here.
      </p>
    </div>
  );
}
