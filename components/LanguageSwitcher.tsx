"use client";

import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type Language } from "@/hooks/useLanguage";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "org", label: "Original", flag: "🌍" },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const activeLang = LANGUAGES.find((l) => l.code === language)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>{activeLang.flag}</span>
          <span className="hidden sm:inline">{activeLang.code.toUpperCase()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer gap-2 ${
              lang.code === language ? "bg-secondary font-medium" : ""
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {lang.code.toUpperCase()}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
