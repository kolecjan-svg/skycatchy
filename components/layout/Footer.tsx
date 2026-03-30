import { APP_VERSION } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-8 mt-12">
      <div className="container flex items-center justify-between text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} SkyCatchy</span>
        <span>v{APP_VERSION}</span>
        <a
          href="mailto:info@skycatchy.com"
          className="transition-colors hover:text-foreground"
        >
          info@skycatchy.com
        </a>
      </div>
    </footer>
  );
}
