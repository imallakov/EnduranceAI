import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LanguageCode, Translations } from './types';
import { en } from './locales/en';
import { ru } from './locales/ru';
import { tr } from './locales/tr';

const LOCALES: Record<LanguageCode, Translations> = { en, ru, tr };
const STORAGE_KEY = 'lang';

function detectBrowserLang(): LanguageCode {
  const code = navigator.language.toLowerCase().slice(0, 2);
  if (code === 'ru') return 'ru';
  if (code === 'tr') return 'tr';
  return 'en';
}

function resolveInitialLang(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  if (stored && stored in LOCALES) return stored;
  return detectBrowserLang();
}

interface LangContextValue {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: Translations;
}

const LangContext = createContext<LangContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LanguageCode>(resolveInitialLang);

  const setLang = useCallback((next: LanguageCode) => {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    setLangState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = LOCALES[lang];

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
};

export function useT(): Translations {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useT must be used inside LanguageProvider');
  return ctx.t;
}

export function useLang(): { lang: LanguageCode; setLang: (l: LanguageCode) => void } {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return { lang: ctx.lang, setLang: ctx.setLang };
}
