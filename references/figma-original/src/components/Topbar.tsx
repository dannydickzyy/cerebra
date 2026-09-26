import { Search, Plus, Bell, Sun, Moon } from "lucide-react";

export default function Topbar({
  title,
  subtitle,
  onNew,
  darkMode,
  onDarkMode,
}: {
  title: string;
  subtitle: string;
  onNew: () => void;
  darkMode: boolean;
  onDarkMode: (v: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-vanilla/85 px-8 py-5 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-0.5 text-sm text-slate-muted">{subtitle}</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-muted" />
          <input
            placeholder="Search patient ID…"
            className="w-56 rounded-xl border bg-cream py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-slate-muted/70 focus:border-terracotta"
          />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => onDarkMode(!darkMode)}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-cream text-slate-muted transition-colors hover:bg-vanilla-deep hover:text-terracotta"
        >
          {darkMode ? (
            <Sun className="h-[18px] w-[18px]" strokeWidth={2} />
          ) : (
            <Moon className="h-[18px] w-[18px]" strokeWidth={2} />
          )}
        </button>

        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border bg-cream text-slate-muted transition-colors hover:bg-vanilla-deep hover:text-ink">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-terracotta ring-2 ring-cream" />
        </button>
        <button
          onClick={onNew}
          className="flex items-center gap-2 rounded-xl bg-terracotta px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-terracotta-deep active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New screening
        </button>
      </div>
    </header>
  );
}
