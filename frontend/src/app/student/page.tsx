'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '@/lib/auth';
import { apiGetStudentDiagnostics, StudentDiagnostics } from '@/lib/api';
import {
  BookOpen,
  Award,
  BarChart3,
  LogOut,
  Play,
  ShieldAlert,
  AlertCircle,
  Lightbulb,
  Target,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('student_demo');
  const [loading, setLoading] = useState(true);

  // Diagnostic Data State
  const [diagnostics, setDiagnostics] = useState<StudentDiagnostics | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('smartquiz_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    setUserEmail(user.email || 'student@smartquiz.com');
    setUserId(user.id || 'student_demo');
    setRole(user.role || 'student');

    // Fetch Diagnostics
    apiGetStudentDiagnostics(user.id || 'student_demo')
      .then((data) => setDiagnostics(data))
      .catch((err) => console.warn('Using default diagnostics fallback:', err))
      .finally(() => setLoading(false));
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10">
      {/* Top Navigation */}
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Student Diagnostic Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-2">Personal Diagnostics</h1>
          <p className="text-xs sm:text-sm text-slate-400">{userEmail}</p>
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

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto mt-8 space-y-8">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Overall Accuracy</span>
            <p className="text-3xl font-black text-emerald-400 mt-1">
              {diagnostics?.overall_accuracy ?? 53.8}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Across all adaptive quizzes</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Current Ability Level</span>
            <p className="text-3xl font-black text-indigo-400 mt-1">
              {(diagnostics?.current_ability ?? 1.0).toFixed(1)} / 5.0
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Dynamic difficulty rating</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Quizzes Completed</span>
            <p className="text-3xl font-black text-purple-400 mt-1">
              {diagnostics?.total_quizzes_taken ?? 1}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total sessions</p>
          </div>
        </div>

        {/* Adaptive Quiz Action Banner */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Take an Adaptive Quiz
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Challenge yourself with dynamic AI difficulty adjustments after every answer.
            </p>
          </div>
          <Link
            href="/student/quiz"
            className="gradient-btn px-6 py-3 rounded-xl text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-500/20 whitespace-nowrap"
          >
            <Play className="w-4 h-4" />
            <span>Start Adaptive Quiz</span>
          </Link>
        </div>

        {/* Topic Accuracy Bar Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Accuracy Per Topic (Diagnostic Bar Chart)
            </h3>
            <p className="text-xs text-slate-400 mb-6">Topic-by-topic skill measurement</p>

            <div className="space-y-5">
              {(
                diagnostics?.topic_accuracies || [
                  { topic_id: 'py_basics', topic_name: 'Basics & Syntax', accuracy: 80.0, total: 5, correct: 4 },
                  { topic_id: 'py_data', topic_name: 'Data Structures', accuracy: 50.0, total: 4, correct: 2 },
                  { topic_id: 'py_advanced', topic_name: 'Advanced Concepts (OOP, GC)', accuracy: 25.0, total: 4, correct: 1 }
                ]
              ).map((topic) => {
                const colorClass =
                  topic.accuracy >= 70
                    ? 'bg-emerald-500'
                    : topic.accuracy >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500';
                
                const textClass =
                  topic.accuracy >= 70
                    ? 'text-emerald-400'
                    : topic.accuracy >= 50
                    ? 'text-amber-400'
                    : 'text-red-400';

                return (
                  <div key={topic.topic_id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-slate-200">{topic.topic_name}</span>
                      <span className={`font-black ${textClass}`}>{topic.accuracy}%</span>
                    </div>

                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={`h-full ${colorClass} transition-all duration-500`}
                        style={{ width: `${topic.accuracy}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 mt-2">
                      <span>{topic.correct} of {topic.total} questions answered correctly</span>
                      <span>{topic.accuracy < 60 ? 'Needs Practice' : 'Mastered'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weak Topics & Study Recommendations Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                Study Recommendations
              </h3>
              <p className="text-xs text-slate-400 mb-4">Targeted practice based on your weak areas</p>

              {/* Weak Topics List */}
              {diagnostics?.weak_topics && diagnostics.weak_topics.length > 0 ? (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                  <span className="font-bold block mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    Weak Topics Identified:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
                    {diagnostics.weak_topics.map((wt, i) => (
                      <li key={i}>{wt}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No weak topics detected. Great performance!</span>
                </div>
              )}

              {/* Actionable Recommendations */}
              <div className="space-y-2.5">
                {(
                  diagnostics?.study_recommendations || [
                    'Focus on Advanced Concepts (OOP, Decorators) where your accuracy is 25.0%. Review key concepts and sample problems.'
                  ]
                ).map((rec, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start space-x-2">
                    <Target className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Practise Weak Topics Only Button */}
            <Link
              href="/student/quiz"
              className="mt-6 w-full gradient-btn py-3 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20"
            >
              <Zap className="w-4 h-4" />
              <span>Practise Weak Topics Only</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
