import React from 'react';
import { Bookmark, Sparkles } from 'lucide-react';

export default function VerseCard({ v, highlights, toggleHighlight, runTadabbur }) {
  const isHighlighted = highlights[v.key];
  
  return (
    <div className="relative p-8 mb-6 transition-all group">
      {/* Badge Verset - Positionné à droite comme sur l'image */}
      <div className="flex justify-end mb-4">
        <div className="flex justify-end mb-4">
            <span className="badge-verset text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-md">
                Verset {v.numberInSurah}
            </span>
        </div>
       </div>
      
      {/* Actions au survol */}
      <div className="absolute left-0 top-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => toggleHighlight(v)} className="p-2 text-slate-300 hover:text-emerald-600">
          <Bookmark size={18} fill={isHighlighted ? "currentColor" : "none"} />
        </button>
        <button onClick={() => runTadabbur(v)} className="p-2 text-slate-300 hover:text-emerald-600">
          <Sparkles size={18} />
        </button>
      </div>

      {/* Texte Arabe */}
      <div className="text-right mb-8 font-arabic text-4xl text-slate-800 dir-rtl">
        {v.text}
      </div>
      
      {/* Traduction avec la barre fine à gauche */}
      <div className="text-left text-slate-500 italic text-lg border-l-2 border-emerald-500/30 pl-6 leading-relaxed">
        {v.textFr}
      </div>
    </div>
  );
}