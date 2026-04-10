import { en } from './en';
import { es } from './es';

export const translations = {
  en,
  es,
};

type DeepKeys<T> = T extends object ? {
  [K in keyof T]-?: `${K & string}` | `${K & string}.${DeepKeys<T[K]>}`
}[keyof T] : "";


export type TranslationKey = DeepKeys<typeof en>;
