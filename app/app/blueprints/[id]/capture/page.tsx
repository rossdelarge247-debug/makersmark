interface CapturePageProps {
  params: { id: string };
}

export default function CapturePage({ params }: CapturePageProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Capture mode</h1>
      <p className="mt-2 text-sm text-neutral-500 font-mono">{params.id}</p>
    </div>
  );
}
