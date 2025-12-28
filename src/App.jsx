import React, { useState, useEffect } from 'react';
import './App.css';
import VerseCard from "./VerseCard.jsx";
import AnalysisPanel from "./AnalysisPanel.jsx";
import { WORD_MAPPING } from "./QuranDictionary.jsx";
import { initializeApp } from 'firebase/app';
import { surahNamesFr } from "./SurahFrench.jsx";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  deleteDoc,
  addDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { 
  BookOpen, 
  Sparkles, 
  Bookmark, 
  Search, 
  History, 
  X, 
  Loader2,
  Settings,
  Menu,
  ChevronLeft,
  Sun,
  Moon
} from 'lucide-react';

// --- Configuration Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyBG82RflivIg1LyCrN6yrPcYd0rQEWkUEc",
  authDomain: "quran-app-aad3c.firebaseapp.com",
  projectId: "quran-app-aad3c",
  storageBucket: "quran-app-aad3c.firebasestorage.app",
  messagingSenderId: "1073143378666",
  appId: "1:1073143378666:web:671be6dc0c02cca99a1d93",
  measurementId: "G-EFL24VTQ2C"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'quran-tadabbur-app';
const normalizeString = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9]/g, "") // Supprime ponctuation et espaces
    .replace(/([a-z])\1+/g, "$1");   // Remplace n'importe quelle lettre doublée (ou plus) par une seule;
};

const normalizeArabic = (str) => {
  if (!str) return "";
  return str
  .replace(/[\u064B-\u065F]/g, "") // Enlève les harakats (voyelles)
  .replace(/[ـ]/g, ""); // Enlève les kashida (tirets d'allongement)
};

const highlightText = (text, query) => {
  if (!query || !text) return text;

  const cleanQuery = query.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const isArabic = /[\u0600-\u06FF]/.test(query);
  const arabicDiacritics = "[\u064B-\u065F\u0670\u06D6-\u06ED]*";
  
  let termsToSearch = [query];

  if (!isArabic && WORD_MAPPING[cleanQuery]) {
    const synonyms = Array.isArray(WORD_MAPPING[cleanQuery]) 
      ? WORD_MAPPING[cleanQuery] 
      : [WORD_MAPPING[cleanQuery]];
    termsToSearch = [...termsToSearch, ...synonyms];
  }

  // On crée le pattern
  const regexSources = termsToSearch.map(term => {
    const isTermArabic = /[\u0600-\u06FF]/.test(term);
    if (isTermArabic) {
      const clean = term.replace(/[\u064B-\u065F]/g, "");
      const pattern = clean.split("").map(char => {
        if (/[أإآا]/.test(char)) return '[أإآا]' + arabicDiacritics;
        return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + arabicDiacritics;
      }).join("");
      // Utilisation de (?:...) pour ne pas créer de groupe de capture supplémentaire
      return `(?:ال)?${pattern}`;
    }
    return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });

  // IMPORTANT : On sépare le regex de split et le regex de test
  const searchRegex = new RegExp(`(${regexSources.join('|')})`, 'iu');
  const parts = text.split(searchRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        // On crée un regex de test local SANS le flag 'g' pour éviter le bug du lastIndex
        const isMatch = new RegExp(`^${regexSources.join('|')}$`, 'iu').test(part) || 
                        searchRegex.test(part);
        
        return isMatch ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-500/40 dark:text-yellow-100 rounded px-0.5">
            {part}
          </span>
        ) : (
          part
        );
      })}
    </>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [surahs, setSurahs] = useState([]);
  const [filteredSurahs, setFilteredSurahs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSurah, setCurrentSurah] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [highlights, setHighlights] = useState({});
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState(null);
  const [mainFontSize, setMainFontSize] = useState(22);
  const [analysisFontSize, setAnalysisFontSize] = useState(18);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [verseResults, setVerseResults] = useState([]);
  const [isSearchingVerses, setIsSearchingVerses] = useState(false);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);

// --- 2. Logique de Filtrage ---
  useEffect(() => {
    const searchClean = normalizeString(searchQuery);
    const searchArabicClean = normalizeArabic(searchQuery);
    const filtered = surahs.filter(s => {
      // Si la recherche est vide, on affiche tout
      if (!searchQuery.trim()) return true;
      // Recherche par numéro
      if (s.number.toString() === searchQuery.trim()) return true;
      // Recherche nom translittéré
      if (normalizeString(s.englishName).includes(searchClean)) return true;      // Recherche nom français
    
      const frenchName = surahNamesFr[s.number] || "";
      if (normalizeString(frenchName).includes(searchClean)) return true;
      
      const arabicNameClean = normalizeArabic(s.name);
      if (normalizeArabic(s.name).includes(searchArabicClean)) return true;
      return false;
    });
    setFilteredSurahs(filtered);
  }, [searchQuery, surahs]);

// Authentification
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Chargement de la liste initiale des sourates
  useEffect(() => {
    fetch('https://api.alquran.cloud/v1/surah')
      .then(res => res.json())
      .then(data => {
        setSurahs(data.data);
        setFilteredSurahs(data.data);
        setLoadingList(false);
      })
      .catch(err => {
        setError("Impossible de charger la liste des sourates.");
        setLoadingList(false);
      });
  }, []);

  // Synchronisation des favoris
  useEffect(() => {
    if (!user) return;
    const highlightsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'highlights');
    const unsubscribe = onSnapshot(highlightsRef, (snapshot) => {
      const hMap = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        hMap[data.verseKey] = { id: doc.id, ...data };
      });
      setHighlights(hMap);
    }, (err) => console.error("Firestore error:", err));
    return () => unsubscribe();
  }, [user]);

  // Variables CSS polices
  useEffect(() => {
    document.documentElement.style.setProperty('--main-font-size', `${mainFontSize}px`);
    document.documentElement.style.setProperty('--analysis-font-size', `${analysisFontSize}px`);
  }, [mainFontSize, analysisFontSize]);

  // Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Trouver des versets
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearchingVerses(true);
        setIsGlobalSearch(true);
        try {
          // Recherche par mot-clé dans la traduction française
          const response = await fetch(`https://api.alquran.cloud/v1/search/${searchQuery}/all/fr.hamidullah`);
          const data = await response.json();
          
          if (data.data && data.data.matches) {
            // on va chercher le texte arabe en parallèle, limiter aux 20er resultats
            const topMatches = data.data.matches.slice(0, 20);
            const resultsWithArabic = await Promise.all(
              topMatches.map(async (m) => {
                try {
                  const resAr = await fetch(`https://api.alquran.cloud/v1/ayah/${m.number}/ar.uthmani`);
                const dataAr = await resAr.json();
                return {
                  ...m,
              textFr: m.text, // Le texte trouvé est la traduction
              text: dataAr.data.text, // Le vrai texte arabe récupéré
              key: `${m.surah.number}:${m.numberInSurah}`
            };
            } catch (e) {
              return { ...m, textFr: m.text, text: "Erreur chargement arabe", key: `${m.surah.number}:${m.numberInSurah}` };
            }
          })
        );
        setVerseResults(resultsWithArabic);
      }
    } catch (err) {
          console.error("Erreur recherche:", err);
        } finally {
          setIsSearchingVerses(false);
        }
      } else {
        setVerseResults([]);
        setIsGlobalSearch(false);
      }
    }, 600); // Délai de 500ms pour ne pas surcharger l'API

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Chargement sourate
  const loadSurahContent = async (surah) => {
    setLoadingContent(true);
    setError(null);
    setSelectedVerse(null);
    setSearchQuery(""); 
    setIsGlobalSearch(false);
    setVerseResults([]);
    try {
      const [arRes, frRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/ar.uthmani`),
        fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/fr.hamidullah`)
      ]);
      const arData = await arRes.json();
      const frData = await frRes.json();
      if (arData.code === 200 && frData.code === 200) {
        const combinedVerses = arData.data.ayahs.map((v, i) => ({
          ...v,
          textFr: frData.data.ayahs[i].text,
          key: `${surah.number}:${v.numberInSurah}`
        }));
        setVerses(combinedVerses);
        setCurrentSurah(arData.data);
        if (window.innerWidth < 1024) setSidebarOpen(false);
      } else {
        throw new Error("Erreur de réponse API");
      }
    } catch (err) {
      console.error("Détail erreur:", err);
      setError("Impossible de charger les versets.");
    } finally {
      setLoadingContent(false);
    }
  };

  const toggleHighlight = async (verse) => {
    if (!user) return;
    const key = verse.key;
    const highlightsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'highlights');
    if (highlights[key]) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'highlights', highlights[key].id));
    } else {
      await addDoc(highlightsRef, {
        verseKey: key,
        surahName: currentSurah.englishName,
        surahNumber: currentSurah.number,
        verseNumber: verse.numberInSurah,
        timestamp: Date.now()
      });
    }
  };

  const runTadabbur = async (verse) => {
    setAnalyzing(true);
    setSelectedVerse(verse);
    setAnalysis("");
    setIsFromCache(false);
    const analysisId = `analysis_s${currentSurah.number}_v${verse.numberInSurah}`;
    const analysisRef = doc(db, 'cached_analyses', analysisId);
    const apiKey = "AIzaSyDBY8d8uPfcHDLDEHL-cfPBstqOEdg28Vk";
    try {
      const cachedDoc = await getDoc(analysisRef);
      if (cachedDoc.exists()) {
        setAnalysis(cachedDoc.data().text);
        setIsFromCache(true);
        setAnalyzing(false);
        return; 
      }
      const systemPrompt = `Tu es "Tadabbur Profond", un expert en Qur’ān-thérapie et en linguistique arabe. Ton but est de décortiquer le Coran en profondeur, en suivant rigoureusement ce protocole pour chaque demande :

1. Contexte de la Sourate : Présente la sourate (Mecquoise ou Médinoise), ses thèmes principaux et la période de sa révélation.

2. Méditation sur le Nom : Pourquoi la sourate porte-t-elle ce nom ? Quel est le lien symbolique entre ce titre et le message divin ?

3. Contexte du Verset (Asbāb al-Nuzūl) : Explique les circonstances précises de la révélation de ce verset. Si la sourate a été révélée en plusieurs fois, précise le moment spécifique de ce verset dans l'histoire du Prophète (saws).

4. Analyse Linguistique & Profondeur :
- Traduction préalable : Fournis systématiquement le verset en français (traduction du sens) pour poser le cadre.
- Étymologie : Remonte aux racines arabes (Trilitères) pour expliquer le sens originel.
- Grammaire & Éloquence (Balāgha) : Analyse les choix de mots, les pronoms et les nuances (ex: Yā abati).
- Nuances Techniques : Détaille l'impact des particules (Inna, Qad) et l'ordre des mots (Taqdīm/Ta’khīr) sur le sens spirituel.
- Trésors cachés : Explique ce que l'arabe exprime et que le français ne restitue pas.

5. Psychologie & Baume Spirituel : Comment ce verset résonne avec les émotions (tristesse, espoir, peur) ? Réconfort pour le Prophète (saws) et pour nous.

6. Morale de Qur’ān-thérapie : Termine par une leçon de vie concrète, empathique et applicable immédiatement.

Directives de Style :
- Ton : Chaleureux, perspicace, spirituel.
- Format Arabe : Mot en translittération suivi du mot en arabe voyellé entre parenthèses. Exemple : yā abati (يَا أَبَتِ).
- Accessibilité : Une conversation vivante entre Allāh et Sa création.

Directive de Formatage :
- Titres de Section : Utilisez exactement le format "N. Nom de la section" (ex: 1. Contexte de la Sourate).
- Sous-listes : Utilisez "a)", "b)", "c)" ou des puces "*" pour les sous-points afin de ne pas confondre avec les sections.
- Thèmes : Utilisez des chiffres romains gras (**I.**, **II.**).
- Gras : Utilisez les doubles étoiles **uniquement** pour les mots très importants.
- Séparateurs : Utilisez "---" entre les grandes sections.`;
      const userQuery = `Analyse : Sourate ${currentSurah.number}, Verset ${verse.numberInSurah}. Arabe: ${verse.text}. Trad: ${verse.textFr}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userQuery }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Erreur de génération.";
      if (generatedText !== "Erreur de génération.") {
        await setDoc(analysisRef, { text: generatedText, timestamp: Date.now() });
      }
      setAnalysis(generatedText);
    } catch (err) {
      console.error("Erreur:", err);
      setAnalysis("L'IA est momentanément indisponible.");
    } finally {
      setAnalyzing(false);
    }
  };

  const FontSizeSelector = ({ value, onChange, isDark = false }) => (
    <div className={`flex items-center gap-1 p-1 rounded-xl border shadow-sm ${isDark ? 'bg-white/10 border-white/20' : 'bg-slate-100/80 border-slate-200'}`}>
      {[
        { val: 16, label: 'Aa', class: 'text-[10px]' },
        { val: 22, label: 'Aa', class: 'text-sm' },
        { val: 30, label: 'Aa', class: 'text-lg' }
      ].map((opt) => (
        <button
          key={opt.val}
          onClick={() => onChange(opt.val)}
          className={`px-3 py-1 rounded-lg transition-all font-bold ${
            value === opt.val
            ? 'bg-white text-emerald-900 shadow-sm'
            : isDark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
          }`}
        >
          <span className={opt.class}>{opt.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen font-sans flex overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Sidebar */}
      <aside className={`w-96 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0'}`}>
        <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2">
            <BookOpen size={20} /> An-Nūr
          </h2>
          <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-emerald-700 rounded lg:hidden">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..." 
              className="w-full pl-10 pr-4 py-2 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 search-bar-input"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setIsGlobalSearch(false);
                  setVerseResults([]);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-emerald-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin">
  {filteredSurahs.map(s => (
    <button
      key={s.number}
      onClick={() => loadSurahContent(s)}
      className={`w-full text-left p-4 rounded-2xl mb-2 transition-all flex items-center justify-between group surah-hover-effect ${
        currentSurah?.number === s.number 
        ? 'bg-emerald-600 text-white' 
        : '' 
      }`}
    >
      <div className="flex items-center gap-4">
        <span className={`text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full ${
          currentSurah?.number === s.number 
          ? 'bg-white/20 text-white' 
          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}>
          {s.number}
        </span>
        <div>
          <div className={`font-bold text-sm mb-1 ${
            currentSurah?.number === s.number 
            ? 'text-white' 
            : 'text-emerald-700 dark:text-emerald-400'
          }`}>
            {s.englishName}
          </div>
          <div className={`font-bold text-sm mb-1 ${
            currentSurah?.number === s.number
            ? 'text-white'
            : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              <span>{surahNamesFr[s.number]}</span>
          </div>
          <div className={`text-[10px] ${
            currentSurah?.number === s.number 
            ? 'text-white/70' 
            : 'text-slate-500'
          }`}>
            {s.revelationType} • {s.numberOfAyahs}
          </div>
        </div>
      </div>
      <div className={`font-arabic text-xl ${
        currentSurah?.number === s.number 
        ? 'text-white' 
        : 'text-emerald-800 dark:text-emerald-400'
      }`}>
        {s.name}
      </div>
    </button>
  ))}
</div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              <Menu size={20} />
            </button>
            {currentSurah && <h1 className="font-bold text-lg text-emerald-900 dark:text-emerald-400">{currentSurah.englishName}</h1>}
          </div>
          <FontSizeSelector value={mainFontSize} onChange={setMainFontSize} />
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
            {isDarkMode ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-slate-600" />}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10 scrollbar-thin bg-dots">
          {loadingContent || isSearchingVerses ? (
            <div className="h-full flex flex-col items-center justify-center text-emerald-600 gap-4">
              <Loader2 className="animate-spin" size={48} />
              <p className="font-medium animate-pulse">Recherche en cours...</p>
            </div>
          ) : isGlobalSearch && verseResults.length > 0 ? (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
          <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-400 mb-8">
            {verseResults.length} versets trouvés pour "{searchQuery}"
          </h2>
          {verseResults.map(v => (
            <div key={v.key} className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="text-xs font-bold text-emerald-600 mb-2">
                SOURATE {v.surah.number} • {v.surah.englishName}
              </div>
              <VerseCard 
                v={{
                  ...v,
                  text: highlightText(v.text, searchQuery),  // Applique la surbrillance Arabe
                  textFr: highlightText(v.textFr, searchQuery) // Applique la surbrillance Français
                }}
                highlights={highlights} 
                toggleHighlight={toggleHighlight} 
                runTadabbur={() => {
                  // On définit la sourate courante avant d'analyser si on vient d'une recherche
                  setCurrentSurah(v.surah);
                  runTadabbur(v);// On passe l'objet original (sans balises span) à l'IA
                }} 
              />
            </div>
          ))}
        </div>
          ) : currentSurah ? (
            <div className="reading-area max-w-4xl mx-auto space-y-10 pb-20">
              {currentSurah.number !== 1 && currentSurah.number !== 9 && (
                <div className="text-center py-10">
                  <div className="font-arabic text-5xl opacity-90">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
                </div>
              )}
              {verses.map(v => (
                <VerseCard
                key={v.key}
                v={{
                  ...v,
                  text: highlightText(v.text, searchQuery),   // Surligne l'arabe (via dictionnaire ou recherche directe)
                  textFr: highlightText(v.textFr, searchQuery) // Surligne le français
                }}
                highlights={highlights} 
                toggleHighlight={toggleHighlight} 
                runTadabbur={() => runTadabbur(v)} // On passe l'objet original 'v' pour que l'IA reçoive du texte pur
              />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-8 text-center">
              <BookOpen size={120} strokeWidth={1} />
              <h3 className="text-2xl font-bold">
                <span className="text-slate-900 dark:text-slate-700">Bienvenue sur </span>
                <span className="text-emerald-700 dark:text-emerald-400">An-Nūr</span>
                </h3>
            </div>
          )}
        </div>

        {selectedVerse && (
          <AnalysisPanel 
            selectedVerse={selectedVerse}
            currentSurah={currentSurah}
            analysis={analysis}
            analyzing={analyzing}
            setSelectedVerse={setSelectedVerse}
            FontSizeSelector={FontSizeSelector}
            analysisFontSize={analysisFontSize}
            setAnalysisFontSize={setAnalysisFontSize}
          />
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@300;400;500;600;700&display=swap');
        .reading-area .font-arabic { font-size: calc(var(--main-font-size) * 1.8) !important; line-height: 2.5 !important; }
        .reading-area .text-slate-700, .reading-area .text-slate-600 { font-size: var(--main-font-size) !important; }
        .prose p, .prose li { font-size: var(--analysis-font-size) !important; line-height: 1.6 !important; }
        .dir-rtl { direction: rtl; }
        .scrollbar-thin::-webkit-scrollbar { width: 5px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }
      `}} />
    </div>
  );
}