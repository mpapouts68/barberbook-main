import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { el, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";

export type Language = "el" | "en";

interface LanguageContextValue {
  language: Language;
  isEnglish: boolean;
  localeCode: string;
  dateLocale: Locale;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LANGUAGE_STORAGE_KEY = "barberbook-language";

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return "el";
    }

    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage === "en" ? "en" : "el";
  });

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isEnglish: language === "en",
      localeCode: language === "en" ? "en-US" : "el-GR",
      dateLocale: language === "en" ? enUS : el,
      setLanguage: setLanguageState,
      toggleLanguage: () => setLanguageState((current) => (current === "el" ? "en" : "el")),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}
