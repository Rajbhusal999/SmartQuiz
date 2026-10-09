'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/auth';
import { FileText, Database, Layers, BarChart3, LogOut, ShieldAlert, Plus, Upload } from 'lucide-react';

export default function InstructorDashboardPage() {
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
    setUserEmail(user.email || 'instructor@smartquiz.com');
    setRole(user.role || 'instructor');
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  // Route Protection Guard
  if (role === 'student') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-100">Access Restricted</h1>
        <p className="text-slate-400 mt-2 max-w-md">
          Instructor permissions required. Students cannot access the Instructor Management Portal.
        </p>
        <button
          onClick={() => router.push('/student')}
          className="mt-6 gradient-btn px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
        >
          Return to Student Portal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Instructor Portal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-100 mt-2">Instructor Dashboard</h1>
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

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Question Bank Management */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-indigo-500/10 rounded-xl w-fit text-indigo-400 mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Question Bank</h2>
            <p className="text-xs text-slate-400 mt-1">
              Create, edit, delete, and search questions by topic, difficulty, or keyword.
            </p>
          </div>
          <button className="mt-6 w-full gradient-btn py-2.5 rounded-xl text-white font-semibold text-xs flex items-center justify-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Manage Questions</span>
          </button>
        </div>

        {/* NLP Question Generation */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-purple-500/10 rounded-xl w-fit text-purple-400 mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">AI Question Generator</h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload PDF/DOCX or text notes to generate fill-in-the-blank questions automatically.
            </p>
          </div>
          <button className="mt-6 w-full bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-purple-300 font-semibold text-xs border border-purple-500/20 flex items-center justify-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Upload Notes</span>
          </button>
        </div>

        {/* Exam Assembler */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-pink-500/10 rounded-xl w-fit text-pink-400 mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Exam Assembler</h2>
            <p className="text-xs text-slate-400 mt-1">
              Assemble optimal exams matching difficulty targets and topic constraints.
            </p>
          </div>
          <button className="mt-6 w-full bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-pink-300 font-semibold text-xs border border-pink-500/20 flex items-center justify-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Assemble Exam</span>
          </button>
        </div>
      </main>
    </div>
  );
}
