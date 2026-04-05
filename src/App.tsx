/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Brain, 
  BookOpen, 
  Globe, 
  BarChart3, 
  PenTool, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  LayoutDashboard, 
  FileText, 
  Zap, 
  Moon, 
  Sun,
  Scale,
  ExternalLink,
  Download,
  Search,
  Loader2
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";

// ─── Constants ───────────────────────────────────────────────────────────────
const START_DATE = new Date("2026-03-28");
START_DATE.setHours(0, 0, 0, 0);
const EXAM_DATE = new Date("2026-04-18");
EXAM_DATE.setHours(0, 0, 0, 0);

const TOPICS = [
  { id: "aptitude", label: "Aptitude & Logic", iconId: "vfeenjov", icon: Brain, color: "blue" },
  { id: "reading", label: "Reading Comprehension", iconId: "wxnxerhs", icon: BookOpen, color: "purple" },
  { id: "gk", label: "General Knowledge", iconId: "fiyxzirk", icon: Globe, color: "emerald" },
  { id: "numerical", label: "Numerical Skills", iconId: "msetzzcu", icon: BarChart3, color: "amber" },
  { id: "writing", label: "Analytical Writing", iconId: "wloionto", icon: PenTool, color: "rose" },
];

const PHASE1_ROTA = [
  "aptitude", "reading", "gk", "numerical", "writing",
  "aptitude", "reading", "gk", "numerical", "writing",
  "aptitude", "reading", "gk", "numerical"
];

const PAST_PAPERS = [
  {
    year: "2024/2025",
    date: "Saturday, 12th April 2025",
    url: "https://law.mak.ac.ug/pre-entry-examinations-for-admission-to-bachelor-of-laws-2025-26/",
    sections: ["Aptitude", "Reading & Comprehension", "Numerical Skills", "General Knowledge", "Analytical Writing"],
    sampleQs: []
  },
  {
    year: "2023/2024",
    date: "Tuesday, 2nd April 2024",
    url: "https://www.scribd.com/document/822820737/Past-papers-of-pre-entry-law",
    sections: ["Aptitude & Logical Reasoning", "Reading Comprehension & Language Skills", "Numerical Skills", "General Knowledge", "Analytical Writing"],
    sampleQs: [
      { q: "The examination is structured in two main parts: Aptitude and Comprehension & Language Skills, assessing analytical ability for law studies.", ans: "See full paper on Scribd", section: "Structure" },
    ]
  },
  {
    year: "2021/2022",
    date: "September/October 2021",
    url: "https://news.mak.ac.ug/wp-content/uploads/2021/09/LAW-Pre-Entry-Examinations-Call-for-Applications-2021-2022.pdf",
    sections: ["Aptitude (25 min)", "Reading & Comprehension (60 min)", "Numerical Skills (35 min)", "General Knowledge (40 min)", "Analytical Writing (20 min)"],
    sampleQs: []
  },
  {
    year: "2020/2021",
    date: "Saturday, 3rd October 2020",
    url: "https://www.studocu.com/row/document/makerere-university/constitutional-law/bachelor-of-laws-pre-entry-examination/68469248",
    sections: ["Aptitude (25 min)", "Reading & Comprehension (60 min)", "Numerical Skills (35 min)", "General Knowledge (40 min)", "Analytical Writing (20 min)"],
    sampleQs: [
      { q: "Sidney is older than Odongo. Odongo and Atim are both older than Akot. Ekeya is not the youngest. Who is the youngest of the five?", ans: "D. Cannot say", section: "Aptitude" },
      { q: "Why are 2020 cents worth more than 1986 cents?", ans: "B. Because there are 34 more of them", section: "Aptitude" },
      { q: "Which word, if pronounced right is wrong, but if pronounced wrong is right?", ans: "C. Wrong", section: "Aptitude" },
      { q: "All candidates to be admitted to Law School must pass this entry examination. Whoever does not pass it must have cheated at their UACE examinations. The second sentence is the cause of the first?", ans: "A. False", section: "Aptitude" },
    ]
  },
];

// ─── AI Prompts ──────────────────────────────────────────────────────────────
const PROMPTS = {
  aptitude: {
    sys: "You are a law school aptitude examiner for Makerere University. Return ONLY valid JSON.",
    usr: "Generate 6 MCQ aptitude/logical reasoning questions. Style: family puzzles, riddles, deductions, syllogisms. Format: {\"questions\":[{\"q\":\"...\",\"opts\":[\"A. ...\",\"B. ...\",\"C. ...\",\"D. ...\"],\"ans\":\"A\",\"exp\":\"...\"}]}"
  },
  reading: {
    sys: "You are a reading comprehension examiner for Makerere University Law. Return ONLY valid JSON.",
    usr: "A 200-word passage on law/governance/East Africa + 5 MCQ questions. Format: {\"passage\":\"...\",\"questions\":[{\"q\":\"...\",\"opts\":[\"A. ...\",\"B. ...\",\"C. ...\",\"D. ...\"],\"ans\":\"A\",\"exp\":\"...\"}]}"
  },
  gk: {
    sys: "You are a general knowledge examiner for Uganda Law School. Return ONLY valid JSON.",
    usr: "8 MCQ GK questions: Uganda history, Constitution, EAC current affairs (2024-2026), international law. Format: {\"questions\":[{\"q\":\"...\",\"opts\":[\"A. ...\",\"B. ...\",\"C. ...\",\"D. ...\"],\"ans\":\"A\",\"exp\":\"...\"}]}"
  },
  numerical: {
    sys: "You are a numerical reasoning examiner for Law School. Return ONLY valid JSON.",
    usr: "6 MCQ numerical questions: percentages, ratios, data tables, budgets. Format: {\"questions\":[{\"q\":\"...\",\"opts\":[\"A. ...\",\"B. ...\",\"C. ...\",\"D. ...\"],\"ans\":\"A\",\"exp\":\"...\"}]}"
  },
  writing: {
    sys: "You are a law school essay examiner. Return ONLY valid JSON.",
    usr: "2 analytical essay prompts on law/justice/governance in East Africa. Format: {\"prompts\":[{\"title\":\"...\",\"question\":\"...\",\"hints\":[\"...\",\"...\",\"...\"]}]}"
  },
  mock: {
    sys: "You are a law school examiner. Return ONLY valid JSON.",
    usr: "Create a mini mock paper: 4 aptitude, 3 GK, 3 numerical, 3 reading MCQs based on a 100-word passage. Format: {\"passage\":\"...\",\"questions\":[{\"q\":\"...\",\"opts\":[\"A. ...\",\"B. ...\",\"C. ...\",\"D. ...\"],\"ans\":\"A\",\"exp\":\"...\",\"type\":\"aptitude|gk|numerical|reading\"}]}"
  },
  extra: {
    sys: "You are a law school examiner. Return ONLY valid JSON.",
    usr: "8 extra practice MCQ questions mixing aptitude, numerical, and GK at a harder difficulty. Format: {\"questions\":[{\"q\":\"...\",\"opts\":[\"A. ...\",\"B. ...\",\"C. ...\",\"D. ...\"],\"ans\":\"A\",\"exp\":\"...\",\"type\":\"aptitude|numerical|gk\"}]}"
  }
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Topic = typeof TOPICS[0];
type View = "dashboard" | "practice" | "writing" | "papers" | "extra";
type HistoryItem = {
  id: string;
  topic: string;
  score: number;
  total: number;
  date: number;
  isTimed: boolean;
};

// ─── Components ──────────────────────────────────────────────────────────────

const Logo = ({ size = 48 }: { size?: number }) => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="relative flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
      {/* Crane Crest */}
      <path d="M50 5 L55 15 L45 15 Z" fill="#c5a059" />
      <path d="M50 15 Q60 15 60 25 Q60 35 50 35 Q40 35 40 25 Q40 15 50 15" fill="#0a1d37" />
      <path d="M50 20 Q55 20 55 25 Q55 30 50 30 Q45 30 45 25 Q45 20 50 20" fill="#fdfcf0" />
      <path d="M55 22 L65 22 L65 28 L55 28" fill="#c5a059" />
      
      {/* Shield */}
      <path d="M20 40 Q20 100 50 115 Q80 100 80 40 Z" fill="#0a1d37" stroke="#c5a059" strokeWidth="2" />
      
      {/* Book */}
      <path d="M35 65 Q42 60 50 65 Q58 60 65 65 L65 85 Q58 80 50 85 Q42 80 35 85 Z" fill="#fdfcf0" />
      <path d="M50 65 L50 85" stroke="#0a1d37" strokeWidth="0.5" />
      
      {/* Gavel */}
      <path d="M45 70 L55 78" stroke="#c5a059" strokeWidth="1.5" />
      <path d="M42 72 L48 68 L52 72 L46 76 Z" fill="#c5a059" />
      
      {/* Scales */}
      <path d="M40 50 L60 50" stroke="#c5a059" strokeWidth="1" />
      <circle cx="40" cy="55" r="2" fill="#c5a059" />
      <circle cx="60" cy="55" r="2" fill="#c5a059" />
      <path d="M50 45 L50 55" stroke="#c5a059" strokeWidth="1" />
      
      {/* Text Placeholder */}
      <text x="50" y="105" textAnchor="middle" fontSize="6" fill="#fdfcf0" fontWeight="bold" fontFamily="serif">LEX PREP</text>
    </svg>
  </motion.div>
);

const LoadingSplash = ({ label }: { label?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream dark:bg-slate-950"
  >
    <Logo size={80} />
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-6 text-center"
    >
      <h1 className="font-serif text-3xl font-bold text-slate-900 dark:text-white">LexPrep</h1>
      <p className="mt-2 text-sm tracking-widest uppercase text-slate-500 dark:text-slate-400">MUK Law Pre-Entry</p>
    </motion.div>
    {label && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-8 text-sm text-navy dark:text-gold flex items-center gap-2"
      >
        <Loader2 className="animate-spin" size={16} />
        {label}
      </motion.p>
    )}
  </motion.div>
);

const CalendarModal = ({ isOpen, onClose, sched }: { isOpen: boolean; onClose: () => void; sched: any }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-cream dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-navy dark:text-gold">Study Calendar</h2>
                <p className="text-xs text-slate-500">21-Day Countdown to MUK Law Pre-Entry</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ChevronLeft className="rotate-90" size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-7 gap-2 mb-6">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                ))}
                {Array.from({ length: 21 }).map((_, i) => {
                  const d = i + 1;
                  const date = new Date(START_DATE);
                  date.setDate(date.getDate() + i);
                  const isPast = d < sched.day;
                  const isToday = d === sched.day;
                  const isMock = d > 14;
                  const topicId = isMock ? "mock" : PHASE1_ROTA[d - 1];
                  const topic = TOPICS.find(t => t.id === topicId);
                  
                  return (
                    <div
                      key={d}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all relative ${
                        isToday 
                        ? "bg-navy dark:bg-gold border-navy dark:border-gold text-white dark:text-navy shadow-lg z-10" 
                        : isPast 
                        ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400" 
                        : isMock
                        ? "bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-navy dark:text-gold"
                      }`}
                    >
                      <span className="text-[10px] font-bold">{d}</span>
                      <span className="text-[8px] opacity-60 uppercase">{topicId.substring(0, 2)}</span>
                      {isPast && <CheckCircle2 size={8} className="absolute top-1 right-1 text-emerald-500" />}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Schedule Details</h3>
                <div className="space-y-2">
                  {Array.from({ length: 21 }).map((_, i) => {
                    const d = i + 1;
                    const date = new Date(START_DATE);
                    date.setDate(date.getDate() + i);
                    const isToday = d === sched.day;
                    const isMock = d > 14;
                    const topicId = isMock ? "mock" : PHASE1_ROTA[d - 1];
                    const topic = TOPICS.find(t => t.id === topicId);

                    return (
                      <div key={d} className={`flex items-center gap-3 p-3 rounded-xl border ${isToday ? 'border-gold bg-gold/5' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="w-10 text-center">
                          <p className="text-[10px] font-bold text-slate-400">Day</p>
                          <p className="text-sm font-serif font-bold">{d}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-500">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}</p>
                          <p className="text-xs font-bold">{isMock ? "Full Mock Exam Simulation" : topic?.label}</p>
                        </div>
                        {isMock && <Scale size={14} className="text-rose-500" />}
                        {!isMock && topic && React.createElement(topic.icon, { size: 14, className: `text-${topic.color}-500` })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
              <button 
                onClick={onClose}
                className="w-full bg-navy dark:bg-gold text-white dark:text-navy py-3 rounded-xl font-bold text-sm"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [dark, setDark] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [tab, setTab] = useState<"home" | "practice" | "papers" | "extra" | "stats">("home");
  const [loading, setLoading] = useState(false);
  const [loadLabel, setLoadLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [topic, setTopic] = useState<Topic | null>(null);
  const [mcqData, setMcqData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  
  const [writingData, setWritingData] = useState<any>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [essay, setEssay] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  const [doneCount, setDoneCount] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedPaper, setExpandedPaper] = useState<number | null>(null);
  
  const [isTimed, setIsTimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [showCalendar, setShowCalendar] = useState(false);

  // ─── Sched Info ────────────────────────────────────────────────────────────
  const sched = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const day = Math.max(1, Math.floor((now.getTime() - START_DATE.getTime()) / 86400000) + 1);
    const left = Math.max(0, Math.floor((EXAM_DATE.getTime() - now.getTime()) / 86400000));
    const isPhase2 = day > 14;
    const todayId = isPhase2 ? "mock" : PHASE1_ROTA[Math.min(day - 1, 13)];
    return { day, left, isPhase2, todayId };
  }, []);

  useEffect(() => {
    const savedDone = localStorage.getItem("lexprep_done");
    if (savedDone) setDoneCount(JSON.parse(savedDone));
    
    const savedHistory = localStorage.getItem("lexprep_history");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedTheme = localStorage.getItem("lexprep_theme");
    if (savedTheme) setDark(savedTheme === "dark");

    setTimeout(() => setIsReady(true), 2000);
  }, []);

  useEffect(() => {
    localStorage.setItem("lexprep_theme", dark ? "dark" : "light");
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  const saveProgress = (id: string, score?: number, total?: number) => {
    const newCount = { ...doneCount, [id]: (doneCount[id] || 0) + 1 };
    setDoneCount(newCount);
    localStorage.setItem("lexprep_done", JSON.stringify(newCount));

    if (score !== undefined && total !== undefined) {
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        topic: id,
        score,
        total,
        date: Date.now(),
        isTimed
      };
      const newHistory = [newItem, ...history];
      setHistory(newHistory);
      localStorage.setItem("lexprep_history", JSON.stringify(newHistory));
    }
  };

  const callAI = async (system: string, user: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: user,
      config: { systemInstruction: system }
    });
    return response.text || "";
  };

  const startPractice = async (t: Topic | { id: string; label: string; iconId: string }, isExtra = false, timed = false) => {
    setTopic(t as Topic);
    setLoading(true);
    setLoadLabel(`Preparing ${t.label}...`);
    setError(null);
    setAnswers({});
    setSubmitted(false);
    setMcqData(null);
    setWritingData(null);
    setSelectedPrompt(null);
    setEssay("");
    setFeedback(null);
    setIsTimed(timed);
    if (timed) setTimeLeft(600); // 10 minutes for timed session

    try {
      if (t.id === "writing") {
        setView("writing");
        const res = await callAI(PROMPTS.writing.sys, PROMPTS.writing.usr);
        const data = JSON.parse(res.replace(/```json|```/g, "").trim());
        setWritingData(data);
      } else {
        setView("practice");
        const key = isExtra ? "extra" : (PROMPTS[t.id as keyof typeof PROMPTS] ? t.id : "mock");
        const prompt = PROMPTS[key as keyof typeof PROMPTS];
        const res = await callAI(prompt.sys, prompt.usr);
        const data = JSON.parse(res.replace(/```json|```/g, "").trim());
        setMcqData(data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load content. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isTimed && timeLeft > 0 && !submitted && view === "practice") {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isTimed && !submitted && view === "practice") {
      setSubmitted(true);
      const { score, total } = getScore();
      saveProgress(topic?.id || "mock", score, total);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimed, timeLeft, submitted, view]);

  const evaluateEssay = async () => {
    if (!selectedPrompt || essay.trim().split(/\s+/).length < 30) return;
    setIsEvaluating(true);
    try {
      const res = await callAI(
        "You are a law school essay evaluator. Be constructive, specific, and encouraging.",
        `Prompt: "${selectedPrompt.question}"\n\nEssay:\n${essay}\n\nEvaluate on: (1) Argument clarity & structure, (2) Use of evidence, (3) Analytical depth, (4) Language & expression. Give a score /20 with targeted tips for improvement.`
      );
      setFeedback(res);
      saveProgress("writing");
    } catch (err) {
      setFeedback("Could not get feedback. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScore = () => {
    if (!mcqData?.questions) return { score: 0, total: 0 };
    let correct = 0;
    mcqData.questions.forEach((q: any, i: number) => {
      if (answers[i] && answers[i].startsWith(q.ans)) correct++;
    });
    return { score: correct, total: mcqData.questions.length };
  };

  const totalSessions = Object.values(doneCount).reduce((a: number, b: number) => a + b, 0);

  if (!isReady) return <LoadingSplash />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <AnimatePresence>
        {loading && <LoadingSplash label={loadLabel} />}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* Header */}
        <header className="flex items-center justify-between py-6 border-b border-slate-200 dark:border-slate-800 mb-8">
          <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} sched={sched} />
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => { setView("dashboard"); setTab("home"); }}
          >
            <Logo size={40} />
            <div>
              <h1 className="font-serif text-2xl font-bold leading-none group-hover:text-gold dark:group-hover:text-gold transition-colors">LexPrep</h1>
              <p className="text-[10px] tracking-widest uppercase text-slate-500 dark:text-slate-400 mt-1">MUK Law Pre-Entry</p>
            </div>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        {view === "dashboard" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Tabs */}
            <nav className="flex p-1 bg-slate-200 dark:bg-slate-900 rounded-xl mb-8">
              {(["home", "practice", "papers", "extra", "stats"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    tab === t 
                    ? "bg-white dark:bg-slate-800 text-gold shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>

            {tab === "home" && (
              <div className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
    { label: "Days Left", val: sched.left, icon: Calendar, onClick: () => setShowCalendar(true) },
    { label: "Study Day", val: sched.day, icon: Trophy },
    { label: "Done", val: totalSessions, icon: CheckCircle2 }
  ].map((s) => (
    <div 
      key={s.label} 
      onClick={s.onClick}
      className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm ${s.onClick ? 'cursor-pointer hover:border-gold transition-all group' : ''}`}
    >
                      <div className="font-serif text-3xl font-bold text-navy dark:text-gold">{s.val}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">{s.label}</div>
                      {s.onClick && (
                        <div className="text-[8px] text-gold font-bold uppercase mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View Calendar</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Phase Badge */}
                <div className="flex justify-center">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    sched.isPhase2 
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                    : "bg-gold/10 text-navy dark:bg-gold/20 dark:text-gold border border-gold/20 dark:border-gold/30"
                  }`}>
                    {sched.isPhase2 ? "Phase 2: Intensive Mocks" : "Phase 1: Foundation"}
                  </span>
                </div>

                {/* Today's Task */}
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    Today's Session <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </h2>
                  <button
                    onClick={() => startPractice(
                      sched.isPhase2 
                      ? { id: "mock", label: "Full Mock Exam", iconId: "vufjamqa" } 
                      : TOPICS.find(t => t.id === sched.todayId) || TOPICS[0]
                    )}
                    className="w-full group bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:border-amber-400 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600">
                        {sched.isPhase2 ? <Scale size={40} /> : React.createElement(TOPICS.find(t => t.id === sched.todayId)?.icon || Brain, { size: 40 })}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Day {sched.day} Focus</p>
                        <h3 className="font-serif text-xl font-bold group-hover:text-amber-600 transition-colors">
                          {sched.isPhase2 ? "Full Mock Exam" : (TOPICS.find(t => t.id === sched.todayId)?.label || "Aptitude")}
                        </h3>
                        {doneCount[sched.todayId] > 0 && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                            <CheckCircle2 size={12} /> {doneCount[sched.todayId]} session(s) completed
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="bg-navy dark:bg-gold text-white dark:text-navy p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <ChevronLeft className="rotate-180" size={20} />
                    </div>
                  </button>
                </section>

                {/* Calendar */}
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    21-Day Schedule <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </h2>
                  <div 
                    onClick={() => setShowCalendar(true)}
                    className="grid grid-cols-7 gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    {Array.from({ length: 21 }).map((_, i) => {
                      const d = i + 1;
                      const id = d > 14 ? "mock" : PHASE1_ROTA[d - 1];
                      const isPast = d < sched.day;
                      const isToday = d === sched.day;
                      const isMock = d > 14;
                      
                      return (
                        <div
                          key={d}
                          title={`Day ${d}: ${id}`}
                          className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                            isToday 
                            ? "bg-navy dark:bg-gold border-navy dark:border-gold text-white dark:text-navy scale-110 shadow-lg z-10" 
                            : isPast 
                            ? "bg-gold/5 dark:bg-gold/10 border-gold/20 dark:border-gold/30 text-navy dark:text-gold" 
                            : isMock
                            ? "bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30 text-rose-400"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                          }`}
                        >
                          {isMock ? "M" : id.substring(0, 2).toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Info Card */}
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  <p className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-500 mb-2">
                    <AlertCircle size={16} /> Important Exam Info
                  </p>
                  <ul className="space-y-2">
                    <li>• <span className="font-bold">Date:</span> Saturday 18 April 2026 (9 AM - 12 PM)</li>
                    <li>• <span className="font-bold">Pass Mark:</span> 50% minimum required</li>
                    <li>• <span className="font-bold">Prohibited:</span> Phones, smart watches, calculators</li>
                    <li>• <span className="font-bold">Required:</span> Coloured invitation printout with photo</li>
                  </ul>
                </div>
              </div>
            )}

            {tab === "practice" && (
              <div className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  Choose Focus Area <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {TOPICS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => startPractice(t)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-left hover:border-gold transition-all shadow-sm group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-${t.color}-50 dark:bg-${t.color}-900/20 text-${t.color}-600`}>
                        <t.icon size={24} />
                      </div>
                      <h3 className="font-serif font-bold text-lg leading-tight group-hover:text-gold transition-colors">{t.label}</h3>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
                        {doneCount[t.id] || 0} sessions done
                      </p>
                    </button>
                  ))}
                  <button
                    onClick={() => startPractice({ id: "mock", label: "Full Mock Exam", iconId: "vufjamqa" })}
                    className="col-span-2 bg-slate-900 dark:bg-gold/10 border border-slate-800 dark:border-gold/20 rounded-2xl p-6 text-left hover:bg-slate-800 transition-all shadow-lg group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif font-bold text-xl text-white">Full Mock Exam</h3>
                        <p className="text-xs text-slate-400 mt-1">All sections combined · Timed simulation</p>
                      </div>
                      <div className="w-12 h-12 bg-navy dark:bg-gold rounded-xl flex items-center justify-center text-white dark:text-navy">
                        <Scale size={24} />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {tab === "papers" && (
              <div className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  Official Past Papers <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </h2>
                <div className="space-y-4">
                  {PAST_PAPERS.map((p, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-serif text-xl font-bold text-navy dark:text-gold">{p.year} Paper</h3>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Calendar size={12} /> {p.date}
                          </p>
                        </div>
                        <a 
                          href={p.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-gold/10 dark:bg-gold/20 text-navy dark:text-gold rounded-lg hover:bg-gold/20 transition-colors"
                        >
                          <ExternalLink size={18} />
                        </a>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {p.sections.map((s, j) => (
                          <span key={j} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-600 dark:text-slate-400">
                            {s}
                          </span>
                        ))}
                      </div>
                      {p.sampleQs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button 
                            onClick={() => setExpandedPaper(expandedPaper === i ? null : i)}
                            className="text-xs font-bold text-slate-500 hover:text-gold flex items-center gap-1"
                          >
                            {expandedPaper === i ? "Hide" : "Show"} Sample Questions ({p.sampleQs.length})
                          </button>
                          {expandedPaper === i && (
                            <div className="mt-4 space-y-3">
                              {p.sampleQs.map((q, k) => (
                                <div key={k} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                    <span className="text-navy dark:text-gold font-bold mr-1">[{q.section}]</span> {q.q}
                                  </p>
                                  <p className="text-[10px] text-emerald-600 font-bold mt-2 uppercase tracking-wider">Answer: {q.ans}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "extra" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-navy to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="font-serif text-3xl font-bold mb-2">Challenge Mode</h2>
                    <p className="text-gold/80 text-sm mb-6 max-w-xs">Push your limits with advanced questions designed to test deep analytical skills.</p>
                    <button 
                      onClick={() => startPractice({ id: "extra", label: "Extra Challenge", iconId: "jvucoldz" }, true)}
                      className="bg-gold text-navy px-6 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                    >
                      Start Challenge →
                    </button>
                  </div>
                  <Scale className="absolute -right-8 -bottom-8 text-white/10" size={200} />
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gold/20 dark:border-gold/30 rounded-3xl p-8 mt-6 shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-gold/5 dark:bg-gold/10 rounded-xl text-gold">
                      <Clock size={40} />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold">Timed Training</h3>
                      <p className="text-xs text-slate-500">10-minute high-pressure session</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {TOPICS.map(t => (
                      <button
                        key={t.id}
                        onClick={() => startPractice(t, false, true)}
                        className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold hover:border-gold transition-all text-center"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-8 mb-4 flex items-center gap-2">
                  Topic Mastery <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </h2>
                <div className="space-y-3">
                  {TOPICS.map((t) => (
                    <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${t.color}-50 dark:bg-${t.color}-900/20 text-${t.color}-600`}>
                          <t.icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{t.label}</h3>
                          <p className="text-[10px] text-slate-500">{doneCount[t.id] || 0} sessions</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => startPractice(t)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Practice
                        </button>
                        <button 
                          onClick={() => startPractice(t, true)}
                          className="px-3 py-1.5 bg-navy text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          Challenge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "stats" && (
              <div className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  Performance Analytics <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Average Score</p>
                    <div className="text-3xl font-serif font-bold text-navy dark:text-gold">
                      {history.length > 0 
                        ? Math.round((history.reduce((acc, curr) => acc + (curr.score / curr.total), 0) / history.length) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Questions</p>
                    <div className="text-3xl font-serif font-bold text-navy dark:text-gold">
                      {history.reduce((acc, curr) => acc + curr.total, 0)}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Recent Sessions</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                    {history.length > 0 ? history.map((item) => (
                      <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div>
                          <p className="text-sm font-bold capitalize">{item.topic}</p>
                          <p className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString()} · {item.isTimed ? 'Timed' : 'Casual'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${item.score / item.total >= 0.5 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {item.score}/{item.total}
                          </p>
                          <p className="text-[10px] text-slate-400">{Math.round((item.score / item.total) * 100)}%</p>
                        </div>
                      </div>
                    )) : (
                      <div className="p-12 text-center text-slate-400">
                        <Brain size={48} className="mx-auto text-slate-300" />
                        <p className="mt-4 text-sm">No sessions recorded yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {view === "practice" && mcqData && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <button onClick={() => setView("dashboard")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-gold transition-colors mb-4">
              <ChevronLeft size={16} /> Back to Dashboard
            </button>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-gold">
                  {React.createElement(topic?.icon || Scale, { size: 48 })}
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold">{topic?.label}</h2>
                  <p className="text-xs text-slate-500">AI-Generated Practice Session</p>
                </div>
              </div>
              {isTimed && !submitted && (
                <div className={`px-4 py-2 rounded-2xl font-mono font-bold text-xl ${timeLeft < 60 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-gold/10 text-navy dark:text-gold'}`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
              )}
            </div>

            {submitted && (
              <div className="bg-white dark:bg-slate-900 border border-gold/20 dark:border-gold/30 rounded-3xl p-8 text-center shadow-xl">
                <div className="font-serif text-6xl font-bold text-navy dark:text-gold">
                  {getScore().score}/{getScore().total}
                </div>
                <div className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-500">
                  {Math.round((getScore().score / getScore().total) * 100)}% Score
                </div>
                <div className="mt-6 w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(getScore().score / getScore().total) * 100}%` }}
                    className={`h-full rounded-full ${getScore().score / getScore().total >= 0.5 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
                </div>
                <p className="mt-4 text-xs text-slate-500 italic">
                  {getScore().score / getScore().total >= 0.5 
                    ? "✓ You are above the 50% pass mark. Great job!" 
                    : "Keep practicing! Aim for at least 50% to pass the pre-entry."}
                </p>
              </div>
            )}

            {mcqData.passage && (
              <div className="bg-white dark:bg-slate-900 border-l-4 border-navy dark:border-gold rounded-r-2xl p-6 shadow-sm italic text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                {mcqData.passage}
              </div>
            )}

            <div className="space-y-6">
              {mcqData.questions.map((q: any, i: number) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  {q.type && submitted && (
                    <span className="inline-block px-2 py-0.5 bg-gold/10 dark:bg-gold/20 text-navy dark:text-gold text-[10px] font-bold rounded mb-3 uppercase tracking-wider">
                      {q.type}
                    </span>
                  )}
                  <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-6">
                    <span className="text-navy dark:text-gold font-bold mr-2">Q{i + 1}.</span> {q.q}
                  </p>
                  <div className="space-y-3">
                    {q.opts.map((opt: string, oi: number) => {
                      const isSelected = answers[i] === opt;
                      const isCorrect = opt.startsWith(q.ans);
                      let btnClass = "w-full text-left p-4 rounded-xl border text-sm transition-all ";
                      
                      if (submitted) {
                        if (isCorrect) btnClass += "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold";
                        else if (isSelected) btnClass += "bg-rose-50 dark:bg-rose-900/20 border-rose-500 text-rose-700 dark:text-rose-400";
                        else btnClass += "border-slate-100 dark:border-slate-800 opacity-50";
                      } else {
                        btnClass += isSelected 
                          ? "bg-gold/10 dark:bg-gold/20 border-navy dark:border-gold text-navy dark:text-gold shadow-inner" 
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-gold/50";
                      }

                      return (
                        <button
                          key={oi}
                          disabled={submitted}
                          onClick={() => setAnswers({ ...answers, [i]: opt })}
                          className={btnClass}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {submitted && q.exp && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border-l-2 border-amber-400 text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
                    >
                      <span className="font-bold text-amber-700 dark:text-amber-500 mr-1">Explanation:</span> {q.exp}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-8">
              {!submitted ? (
                <button
                  disabled={Object.keys(answers).length < mcqData.questions.length}
                  onClick={() => { 
                    setSubmitted(true); 
                    const { score, total } = getScore();
                    saveProgress(topic?.id || "mock", score, total); 
                  }}
                  className="flex-1 bg-navy dark:bg-gold text-white dark:text-navy py-4 rounded-2xl font-bold shadow-lg shadow-navy/30 dark:shadow-gold/30 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  Submit Answers
                </button>
              ) : (
                <>
                  <button onClick={() => startPractice(topic!)} className="flex-1 bg-slate-200 dark:bg-slate-800 py-4 rounded-2xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">
                    Try Again
                  </button>
                  <button onClick={() => startPractice(topic!, true)} className="flex-1 bg-navy dark:bg-gold text-white dark:text-navy py-4 rounded-2xl font-bold shadow-lg shadow-navy/30 dark:shadow-gold/30 hover:opacity-90 transition-all">
                    Extra Challenge →
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {view === "writing" && writingData && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <button onClick={() => setView("dashboard")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-gold transition-colors mb-4">
              <ChevronLeft size={16} /> Back to Dashboard
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-gold">
                <PenTool size={48} />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold">Analytical Writing</h2>
                <p className="text-xs text-slate-500">Practice your essay skills with AI feedback</p>
              </div>
            </div>

            {!selectedPrompt ? (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Select a Prompt</h3>
                {writingData.prompts.map((p: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPrompt(p)}
                    className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-gold transition-all shadow-sm group"
                  >
                    <h4 className="font-serif text-lg font-bold text-navy dark:text-gold mb-2 group-hover:scale-[1.01] transition-transform">{p.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{p.question}</p>
                    <div className="flex flex-wrap gap-2">
                      {p.hints.map((h: string, j: number) => (
                        <span key={j} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 italic">
                          • {h}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-gold/20 dark:border-gold/30 rounded-2xl p-6 shadow-sm">
                  <h4 className="font-serif text-lg font-bold text-navy dark:text-gold mb-2">{selectedPrompt.title}</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedPrompt.question}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Essay</label>
                    <span className={`text-[10px] font-bold ${essay.trim().split(/\s+/).length < 200 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {essay.trim().split(/\s+/).filter(Boolean).length} words (Aim for 200-300)
                    </span>
                  </div>
                  <textarea
                    value={essay}
                    onChange={(e) => setEssay(e.target.value)}
                    disabled={!!feedback || isEvaluating}
                    className="w-full h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-sm leading-relaxed focus:ring-2 focus:ring-gold outline-none transition-all disabled:opacity-60"
                    placeholder="Start writing your essay here..."
                  />
                </div>

                {!feedback ? (
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setSelectedPrompt(null)} 
                      className="flex-1 bg-slate-200 dark:bg-slate-800 py-4 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                    >
                      Change Prompt
                    </button>
                    <button 
                      disabled={essay.trim().split(/\s+/).length < 30 || isEvaluating}
                      onClick={evaluateEssay}
                      className="flex-1 bg-navy dark:bg-gold text-white dark:text-navy py-4 rounded-2xl font-bold shadow-lg shadow-navy/30 dark:shadow-gold/30 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isEvaluating ? <Loader2 className="animate-spin" size={20} /> : "Get AI Feedback →"}
                    </button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      AI Evaluation <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </h3>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {feedback}
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => { setFeedback(null); setEssay(""); setSelectedPrompt(null); }}
                        className="flex-1 bg-slate-200 dark:bg-slate-800 py-4 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                      >
                        New Prompt
                      </button>
                      <button 
                        onClick={() => { setFeedback(null); setEssay(""); }}
                        className="flex-1 bg-navy dark:bg-gold text-white dark:text-navy py-4 rounded-2xl font-bold shadow-lg shadow-navy/30 dark:shadow-gold/30 hover:opacity-90 transition-all"
                      >
                        Write Again
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
