"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Language = "cs" | "en" | "de" | "org";

const STORAGE_KEY = "skycatchy-language";
const DEFAULT_LANG: Language = "cs";

interface LanguageCtx {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageCtx>({
  language: DEFAULT_LANG,
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start with default to avoid hydration mismatch, then read localStorage
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANG);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored) setLanguageState(stored);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
