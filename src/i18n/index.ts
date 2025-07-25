import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import en from './locales/en.json'
import hr from './locales/hr.json'
import de from './locales/de.json'

const resources = {
  en: {
    translation: en
  },
  hr: {
    translation: hr
  },
  de: {
    translation: de
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'hr',
    lng: 'hr', // Set Croatian as the default language
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false // React already escapes values
    },

    detection: {
      order: ['localStorage', 'htmlTag'],
      caches: ['localStorage']
    }
  })

export default i18n