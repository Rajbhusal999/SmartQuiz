'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '@/lib/auth';
import { BookOpen, Award, BarChart3, LogOut, Play, ShieldAlert } from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('smartquiz_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    setUserEmail(user.email || 'student@smartquiz.com');
    setRole(user.role || 'student');
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  // Route Protection Guard
  if (role && role !== 'student') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-100">Role Mis-match Guard</h1>
        <p className="text-slate-400 mt-2 max-w-md">
          You are signed in as an <span className="font-semibold text-indigo-400 capitalize">{role}</span>. You cannot open the Student Portal directly.
        </p>
        <button
          onClick={() => router.push(`/${role}`)}
          className="mt-6 gradient-btn px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
        >
          Go to {role.toUpperCase()} Portal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Student Portal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-100 mt-2">Welcome Back!</h1>
          <p className="text-sm text-slate-400">{userEmail}</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('smartquiz_user');
            router.push('/login');
          }}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-card rounded-2xl p-6 border border-slate-800">
          <h2 className="text-xl font-bold text-slate-100 mb-2 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Adaptive Testing Engine
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Take personalized quizzes that dynamically adjust to your skill level after every answer.
          </p>

          <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-200">Python Programming</h3>
              <p className="text-xs text-slate-400 mt-1">5 Adaptive Questions • Real-time Difficulty</p>
            </div>
            <Link
              href="/student/quiz"
              className="gradient-btn px-5 py-2.5 rounded-xl text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-500/20"
            >
              <Play className="w-4 h-4" />
              <span>Start Quiz</span>
            </Link>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Diagnostic Stats
            </h2>
            <div className="mt-4 space-y-3">
              <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Estimated Ability</p>
                <p className="text-2xl font-bold text-indigo-400 mt-0.5">1.0 / 5.0</p>
              </div>
              <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Quizzes Completed</p>
                <p className="text-2xl font-bold text-purple-400 mt-0.5">0</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
