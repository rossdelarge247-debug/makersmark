import { Suspense } from "react";
import AuthCodeHandler from "../callback/AuthCallbackClient";

export default function AuthProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-500">Signing you in…</p>
          </div>
        </div>
      }
    >
      <AuthCodeHandler />
    </Suspense>
  );
}
