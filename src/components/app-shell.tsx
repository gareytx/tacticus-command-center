import Link from "next/link";
import {
  BarChart3,
  Database,
  ListFilter,
  Shield,
  Target,
  Users,
  Gauge,
  Map,
  CalendarClock,
  ClipboardList,
  Sparkles,
} from "lucide-react";

const links = [
  ["/", "Dashboard", BarChart3],
  ["/roster", "Roster", Shield],
  ["/readiness", "Readiness", Gauge],
  ["/campaigns", "Campaigns", Map],
  ["/events", "Events", CalendarClock],
  ["/brief", "Brief", ClipboardList],
  ["/recommendations", "Recommendations", Sparkles],
  ["/priorities", "Priorities", Target],
  ["/teams", "Teams", Users],
  ["/settings", "Data", Database],
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080c0d] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1012]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center border border-amber-400/50 bg-amber-400/10 text-amber-300">
              <ListFilter size={20} />
            </span>
            <span>
              <b className="block text-sm tracking-[.18em]">TACTICUS</b>
              <span className="text-xs text-zinc-500">COMMAND CENTER</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map(([href, name, Icon]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <Icon size={16} />
                {name}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-140px)] max-w-[1500px] px-4 py-6 lg:px-8 lg:py-9">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-white/10 bg-[#0b1012] p-2 md:hidden">
        {links.map(([href, name, Icon]) => (
          <Link
            key={href}
            href={href}
            aria-label={name}
            className="flex flex-col items-center gap-1 px-2 py-1 text-[10px] text-zinc-400"
          >
            <Icon size={18} />
            {name}
          </Link>
        ))}
      </nav>
      <footer className="border-t border-white/10 px-4 py-8 pb-20 text-center text-xs text-zinc-600 md:pb-8">
        Unofficial fan-made roster tool. Not affiliated with or endorsed by
        Games Workshop or Snowprint Studios.
      </footer>
    </div>
  );
}
