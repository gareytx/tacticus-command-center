"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[55vh] place-items-center text-center">
      <div>
        <AlertTriangle className="mx-auto mb-4 text-amber-300" size={32} />
        <h1 className="text-2xl font-semibold">Command data unavailable</h1>
        <p className="mt-2 text-sm text-zinc-500">
          The local operation could not be completed. Your data has not been
          discarded.
        </p>
        <button
          className="mt-5 border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-black"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
