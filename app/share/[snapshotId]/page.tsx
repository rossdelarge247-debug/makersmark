interface SharedSnapshotPageProps {
  params: { snapshotId: string };
}

export default function SharedSnapshotPage({ params }: SharedSnapshotPageProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 h-14 flex items-center px-6">
        <span className="text-sm font-medium text-neutral-700">{"SD>Kit"}</span>
        <span className="mx-3 text-neutral-300">/</span>
        <span className="text-sm text-neutral-500">Shared blueprint</span>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-neutral-900">
          Shared snapshot
        </h1>
        <p className="mt-2 text-sm text-neutral-500 font-mono">
          {params.snapshotId}
        </p>
        <p className="mt-4 text-neutral-600">
          This is a read-only view of a shared service blueprint snapshot.
        </p>
      </main>
    </div>
  );
}
