'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SUPPORTED_LANGUAGES, DICTIONARY, LanguageOption } from './translations';

interface LanguageContextType {
  currentLang: string;
  setLanguage: (lang: string) => void;
  t: (text: string) => string;
  isRtl: boolean;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType>({
  currentLang: 'en',
  setLanguage: () => {},
  t: (text: string) => text,
  isRtl: false,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const useTranslation = () => useContext(LanguageContext);

// WeakMaps to store original English values per node/element
// This prevents memory leaks and ensures we NEVER corrupt multiple text nodes under the same parent element
const origTextMap = new WeakMap<Node, string>();
const origPlaceholderMap = new WeakMap<HTMLInputElement | HTMLTextAreaElement, string>();
const origTitleMap = new WeakMap<HTMLElement, string>();

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [isRtl, setIsRtl] = useState<boolean>(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const isTranslatingRef = useRef<boolean>(false);
  const scheduledRafRef = useRef<number | null>(null);
  const pendingNodesRef = useRef<Set<Node>>(new Set());

  // Initialize language from localStorage or default to 'en'
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('live2030_admin_lang');
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      applyLanguage(saved);
    } else {
      applyLanguage('en');
    }
  }, []);

  const applyLanguage = useCallback((lang: string) => {
    setCurrentLang(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('live2030_admin_lang', lang);
      const opt = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      const rtl = opt?.dir === 'rtl';
      setIsRtl(rtl);
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, []);

  const setLanguage = useCallback((lang: string) => {
    applyLanguage(lang);
  }, [applyLanguage]);

  // Core string translation function with comprehensive token fallback
  const translateString = useCallback((raw: string, lang: string): string => {
    if (!raw || lang === 'en') return raw;
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    // Skip pure numbers, symbols, and dates
    if (/^[\d\s.,:;!?%$\-+*\/=<>()[\]{}#@&|~^]+$/.test(trimmed)) return raw;

    const dict = DICTIONARY[lang];
    if (!dict) return raw;

    // 1. Direct exact dictionary match
    if (dict[trimmed]) {
      return raw.replace(trimmed, dict[trimmed]);
    }

    // 2. Case-insensitive exact match
    const lowerTrimmed = trimmed.toLowerCase();
    for (const [key, value] of Object.entries(dict)) {
      if (key.toLowerCase() === lowerTrimmed) {
        return raw.replace(trimmed, value);
      }
    }

    // 3. Sub-phrase / keyword replacement for dynamic compound strings
    // e.g. "Showing 10 users" -> translates "Showing" and "users"
    // e.g. "VIP 4 Perks" -> translates "VIP" and "Perks"
    let working = raw;
    let modified = false;

    // Sort dictionary keys by length descending to match longer phrases first
    const candidateKeys = Object.keys(dict).filter((k) => k.length > 2 && raw.includes(k));
    candidateKeys.sort((a, b) => b.length - a.length);

    for (const key of candidateKeys) {
      if (working.includes(key)) {
        working = working.split(key).join(dict[key]);
        modified = true;
      }
    }

    if (modified) return working;

    return raw;
  }, []);

  // Programmatic translation function
  const t = useCallback((text: string): string => {
    return translateString(text, currentLang);
  }, [currentLang, translateString]);

  // Translate a single DOM node safely
  const processNode = useCallback((node: Node, lang: string) => {
    if (!node.isConnected) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const val = node.nodeValue;
      if (!val || val.trim().length === 0) return;

      const parent = node.parentElement;
      if (!parent) return;

      // Ignore non-translatable tags
      const tag = parent.tagName?.toUpperCase();
      if (['SCRIPT', 'STYLE', 'CODE', 'PRE', 'SVG', 'PATH', 'IFRAME'].includes(tag)) return;
      if (parent.closest('[data-no-translate]')) return;

      // Save original English text
      if (!origTextMap.has(node)) {
        origTextMap.set(node, val);
      }

      const original = origTextMap.get(node) || val;

      if (lang === 'en') {
        if (node.nodeValue !== original) {
          node.nodeValue = original;
        }
      } else {
        const translated = translateString(original, lang);
        if (translated !== node.nodeValue) {
          node.nodeValue = translated;
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName?.toUpperCase();

      // Skip script/style/svg/etc.
      if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'IFRAME'].includes(tag)) return;
      if (el.hasAttribute('data-no-translate')) return;

      // Translate input/textarea placeholders
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        if (input.placeholder) {
          if (!origPlaceholderMap.has(input)) {
            origPlaceholderMap.set(input, input.placeholder);
          }
          const origPl = origPlaceholderMap.get(input) || input.placeholder;
          if (lang === 'en') {
            if (input.placeholder !== origPl) input.placeholder = origPl;
          } else {
            const transPl = translateString(origPl, lang);
            if (input.placeholder !== transPl) input.placeholder = transPl;
          }
        }
      }

      // Translate title attribute
      if (el.title) {
        if (!origTitleMap.has(el)) {
          origTitleMap.set(el, el.title);
        }
        const origTitle = origTitleMap.get(el) || el.title;
        if (lang === 'en') {
          if (el.title !== origTitle) el.title = origTitle;
        } else {
          const transTitle = translateString(origTitle, lang);
          if (el.title !== transTitle) el.title = transTitle;
        }
      }

      // Process children
      for (let i = 0; i < el.childNodes.length; i++) {
        processNode(el.childNodes[i], lang);
      }
    }
  }, [translateString]);

  // Batch-process nodes with requestAnimationFrame and mutex flag
  const processBatch = useCallback(() => {
    if (isTranslatingRef.current) return;
    isTranslatingRef.current = true;

    try {
      const nodes = Array.from(pendingNodesRef.current);
      pendingNodesRef.current.clear();

      for (const node of nodes) {
        if (node.isConnected) {
          processNode(node, currentLang);
        }
      }
    } finally {
      isTranslatingRef.current = false;
      scheduledRafRef.current = null;
    }
  }, [currentLang, processNode]);

  const scheduleProcessing = useCallback((node: Node) => {
    pendingNodesRef.current.add(node);
    if (!scheduledRafRef.current) {
      scheduledRafRef.current = requestAnimationFrame(processBatch);
    }
  }, [processBatch]);

  // Translate full tree on language change
  useEffect(() => {
    if (typeof window === 'undefined' || !document.body) return;

    isTranslatingRef.current = true;
    try {
      processNode(document.body, currentLang);
    } finally {
      isTranslatingRef.current = false;
    }

    // Set up MutationObserver strictly for newly added nodes (childList only)
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new MutationObserver((mutations) => {
      if (isTranslatingRef.current) return;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const added = mutation.addedNodes[i];
            scheduleProcessing(added);
          }
        }
      }
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      // CRITICAL: characterData is FALSE to completely prevent mutation recursion
      characterData: false,
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (scheduledRafRef.current) {
        cancelAnimationFrame(scheduledRafRef.current);
        scheduledRafRef.current = null;
      }
    };
  }, [currentLang, processNode, scheduleProcessing]);

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        setLanguage,
        t,
        isRtl,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
