'use client';

import { useSettingsStore } from './use-settings-store';
import { translations, TranslationKey } from '@/locales';

export function useTranslation() {
  const { settings } = useSettingsStore();
  const lang = settings.language || 'en';

  const t = (key: TranslationKey | string, params?: { [key: string]: string | number }): string => {
    const keys = key.split('.');
    let
 
result: any = translations[lang as keyof typeof translations];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if translation is missing
        let fallbackResult: any = translations['en'];
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
        }
        result = fallbackResult || key;
        break;
      }
    }

    if (typeof result === 'string' && params) {
        Object.keys(params).forEach(paramKey => {
            result = result.replace(`{${paramKey}}`, String(params[paramKey]));
        });
    }

    return result || key;
  };

  return { t, settings };
}
