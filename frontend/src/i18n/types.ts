export type LanguageCode = 'en' | 'ru' | 'tr';
export type { Translations } from './locales/en';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'ru', label: 'Русский', flag: 'RU' },
  { code: 'tr', label: 'Türkçe',  flag: 'TR' },
];
