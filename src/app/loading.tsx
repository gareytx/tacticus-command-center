export default function Loading() {
  return (
    <div
      className="animate-pulse space-y-6"
      aria-label="Loading command center"
    >
      <div className="h-24 border border-white/10 bg-white/[.03]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 border border-white/10 bg-white/[.03]"
          />
        ))}
      </div>
      <div className="h-80 border border-white/10 bg-white/[.03]" />
    </div>
  );
}
