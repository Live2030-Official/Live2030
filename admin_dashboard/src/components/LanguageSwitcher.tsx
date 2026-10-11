'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { currentLang, setLanguage, supportedLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = supportedLanguages.find((l) => l.code === currentLang) || supportedLanguages[0];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} data-no-translate="true">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition shadow-sm group"
        title="Select Dashboard Language"
      >
        <span className="text-sm leading-none">{activeOption.flag}</span>
        <Globe className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform duration-300" />
        {!compact && (
          <span className="font-semibold text-slate-200 hidden md:inline">
            {activeOption.nativeName}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0F1420] border border-slate-800 shadow-2xl py-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-800/80 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-indigo-400" />
              Language / Idioma
            </span>
            <span className="text-[10px] text-slate-500 font-mono">12 langs</span>
          </div>

          <div className="max-h-72 overflow-y-auto px-1 space-y-0.5 custom-scrollbar">
            {supportedLanguages.map((lang) => {
              const isSelected = lang.code === currentLang;

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition text-left ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-semibold">{lang.nativeName}</span>
                      <span className="text-[10px] text-slate-400 truncate">{lang.name}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
