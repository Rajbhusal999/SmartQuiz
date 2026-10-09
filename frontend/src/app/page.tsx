'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, BrainCircuit, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <BrainCircuit className="w-7 h-7" />
          </div>
          <span className="text-xl font-extrabold tracking-tight gradient-text">SmartQuiz AI</span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="gradient-btn text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto text-center my-auto py-16 z-10">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Adaptive Testing Platform</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-slate-100 leading-tight tracking-tight">
          Next-Generation <span className="gradient-text">Adaptive Quizzes</span> & Exam Intelligence
        </h1>

        <p className="text-slate-400 text-base md:text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
          Dynamic difficulty adjustment, automated NLP question generation, diagnostic skill mapping, and optimal exam assembly.
        </p>

        {/* Quick Portal Selection */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Link
            href="/student"
            className="glass-card hover:border-indigo-500/50 p-5 rounded-2xl text-center transition group"
          >
            <UserCheck className="w-6 h-6 text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="block font-bold text-sm text-slate-200">Student Portal</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Adaptive Quizzes & Diagnostics</span>
          </Link>

          <Link
            href="/instructor"
            className="glass-card hover:border-purple-500/50 p-5 rounded-2xl text-center transition group"
          >
            <BrainCircuit className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="block font-bold text-sm text-slate-200">Instructor Portal</span>
            <span className="text-[11px] text-slate-400 mt-1 block">NLP Generation & Assembly</span>
          </Link>

          <Link
            href="/admin"
            className="glass-card hover:border-emerald-500/50 p-5 rounded-2xl text-center transition group"
          >
            <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="block font-bold text-sm text-slate-200">Admin Portal</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Roles, Curriculum & Audits</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto border-t border-slate-900 pt-6 text-center text-xs text-slate-500">
        Smart Quiz System • Final-Year BCA Project • Powered by Next.js & Supabase
      </footer>
    </div>
  );
}
