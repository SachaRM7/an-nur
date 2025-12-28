import React from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';

export default function AnalysisPanel({ 
  selectedVerse, 
  currentSurah, 
  analysis, 
  analyzing, 
  setSelectedVerse, 
  FontSizeSelector, 
  analysisFontSize, 
  setAnalysisFontSize 
}) {
  return (
    <div className="absolute top-0 right-0 w-full lg:w-[550px] h-full shadow-2xl z-40 flex flex-col analysis-panel animate-in slide-in-from-right duration-500 panel-container">
      
      {/* Header du panel utilisant la variable de couleur dynamique */}
      <div className="p-6 flex items-center justify-between text-white panel-header">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white/10 rounded-xl">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="font-bold">Analyse Tadabbur</h3>
            <p className="text-xs text-white/60">Verset {selectedVerse.numberInSurah} • {currentSurah.englishName}</p>
          </div>
        </div>
        <FontSizeSelector value={analysisFontSize} onChange={setAnalysisFontSize} isDark={true} />
        <button onClick={() => setSelectedVerse(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Zone de contenu utilisant les variables de fond et de texte */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin panel-content">
        {analyzing ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-2/3"></div>
            <div className="h-40 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl flex items-center justify-center">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          </div>
        ) : (
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed text-sm panel-body-text">
              {analysis && typeof analysis === 'string' ? analysis.split('\n').map((line, i) => {
                // Gestion des titres de section (ex: 1. Contexte...)
                if (line.match(/^\d\./) || line.startsWith('#')) {
                  const cleanTitle = line.replace(/^#+\s*/, '').trim();
                  return <h4 key={i} className="font-extrabold text-lg mt-8 mb-4 pb-2 panel-title-text">{cleanTitle}</h4>;
                }
                if (!line.trim()) return <div key={i} className="h-2"></div>;
                
                // Gestion du texte en gras (**mot**)
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={i} className="mb-4 text-[15px]">
                    {parts.map((part, index) => {
                      if (part?.startsWith('**') && part?.endsWith('**')) {
                        return <strong key={index} className="font-bold panel-bold-text">{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </p>
                );
              }) : <p className="italic opacity-50">Prêt pour l'analyse.</p>}
            </div>
          </div>
        )}
      </div>

      {/* Footer synchronisé */}
      <div className="p-4 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold panel-footer">
        <span>Propulsé par Tadabbur-IA</span>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          Connecté
        </div>
      </div>
    </div>
  );
}