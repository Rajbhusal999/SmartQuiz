'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/auth';
import { Users, BookOpen, ShieldCheck, LogOut, ShieldAlert, Settings } from 'lucide-react';

export default function AdminPortalPage() {
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
    setUserEmail(user.email || 'admin@smartquiz.com');
    setRole(user.role || 'admin');
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Route Protection Guard
  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-100">Administrator Access Required</h1>
        <p className="text-slate-400 mt-2 max-w-md">
          You do not have system administrator privileges. Access to the Admin Portal is restricted.
        </p>
        <button
          onClick={() => router.push(role === 'instructor' ? '/instructor' : '/student')}
          className="mt-6 gradient-btn px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Admin Portal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-100 mt-2">System Administration</h1>
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
        {/* User Management */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <div className="p-3 bg-emerald-500/10 rounded-xl w-fit text-emerald-400 mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">User & Role Management</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Manage user accounts, assign roles (Student, Instructor, Admin), and review access permissions.
          </p>
          <button className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 py-2.5 rounded-xl text-emerald-300 text-xs font-semibold">
            Manage Users
          </button>
        </div>

        {/* Curriculum Management */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <div className="p-3 bg-blue-500/10 rounded-xl w-fit text-blue-400 mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Curriculum & Topics</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Configure subjects, topics, difficulty scales, and domain knowledge hierarchies.
          </p>
          <button className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 py-2.5 rounded-xl text-blue-300 text-xs font-semibold">
            Manage Curriculum
          </button>
        </div>

        {/* System Audit Logs */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <div className="p-3 bg-purple-500/10 rounded-xl w-fit text-purple-400 mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Security Audit Logs</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Track key security actions, role changes, question modifications, and exam assemblies.
          </p>
          <button className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 py-2.5 rounded-xl text-purple-300 text-xs font-semibold">
            View Audit Logs
          </button>
        </div>
      </main>
    </div>
  );
}
