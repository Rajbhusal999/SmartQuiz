'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/auth';
import {
  Database, LogOut, ShieldAlert, Plus, Search, Filter,
  CheckCircle, AlertCircle, Trash2, Edit3, X, HelpCircle,
  FileText, ArrowLeft, RefreshCw, Check
} from 'lucide-react';

interface Question {
  id: string;
  subject_id: string;
  topic_id?: string;
  question_text: string;
  options: Record<string, string>;
  correct_option: string;
  difficulty: number;
  explanation?: string;
  source: string;
  reviewed: boolean;
}

export default function InstructorDashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Question Bank State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'needs_review'>('all');
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDiff, setSelectedDiff] = useState('all');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formSubject, setFormSubject] = useState('python');
  const [formTopic, setFormTopic] = useState('py_basics');
  const [formText, setFormText] = useState('');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formOptD, setFormOptD] = useState('');
  const [formCorrect, setFormCorrect] = useState('A');
  const [formDiff, setFormDiff] = useState(2.0);
  const [formExplanation, setFormExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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

    if (user.role === 'instructor' || user.role === 'admin') {
      fetchQuestions();
    }
  }, [router]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchQuestions = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/api/instructor/questions`, {
        headers: { Authorization: 'Bearer mock_instructor_token' }
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      } else {
        showToast('Failed to load question bank', 'error');
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      // Fallback mock data if API unavailable
      setQuestions([
        {
          id: 'py_1',
          subject_id: 'python',
          topic_id: 'py_basics',
          question_text: 'What keyword is used to define a function in Python?',
          options: { A: 'func', B: 'def', C: 'function', D: 'lambda' },
          correct_option: 'B',
          difficulty: 1.0,
          explanation: "'def' defines functions in Python.",
          source: 'manual',
          reviewed: true
        },
        {
          id: 'py_2',
          subject_id: 'python',
          topic_id: 'py_data',
          question_text: 'Which data structure is immutable in Python?',
          options: { A: 'List', B: 'Dictionary', C: 'Tuple', D: 'Set' },
          correct_option: 'C',
          difficulty: 2.0,
          explanation: 'Tuples cannot be modified after creation.',
          source: 'manual',
          reviewed: true
        },
        {
          id: 'gen_101',
          subject_id: 'python',
          topic_id: 'py_advanced',
          question_text: 'What is the default recursion depth limit in CPython standard library?',
          options: { A: '100', B: '500', C: '1000', D: '10000' },
          correct_option: 'C',
          difficulty: 4.0,
          explanation: 'sys.getrecursionlimit() defaults to 1000 in CPython.',
          source: 'generated',
          reviewed: false
        }
      ]);
    } finally {
      setFetching(false);
    }
  };

  const openAddModal = () => {
    setEditingQuestion(null);
    setFormSubject('python');
    setFormTopic('py_basics');
    setFormText('');
    setFormOptA('');
    setFormOptB('');
    setFormOptC('');
    setFormOptD('');
    setFormCorrect('A');
    setFormDiff(2.0);
    setFormExplanation('');
    setIsModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormSubject(q.subject_id || 'python');
    setFormTopic(q.topic_id || 'py_basics');
    setFormText(q.question_text);
    setFormOptA(q.options?.A || '');
    setFormOptB(q.options?.B || '');
    setFormOptC(q.options?.C || '');
    setFormOptD(q.options?.D || '');
    setFormCorrect(q.correct_option || 'A');
    setFormDiff(q.difficulty || 2.0);
    setFormExplanation(q.explanation || '');
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim() || !formOptA.trim() || !formOptB.trim()) {
      showToast('Please fill out the question text and options A & B', 'error');
      return;
    }

    setSubmitting(true);
    const payload = {
      subject_id: formSubject,
      topic_id: formTopic,
      question_text: formText,
      options: { A: formOptA, B: formOptB, C: formOptC, D: formOptD },
      correct_option: formCorrect,
      difficulty: formDiff,
      explanation: formExplanation,
      source: editingQuestion ? editingQuestion.source : 'manual',
      reviewed: editingQuestion ? editingQuestion.reviewed : true
    };

    try {
      if (editingQuestion) {
        // Update existing
        const res = await fetch(`${API_URL}/api/instructor/questions/${editingQuestion.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock_instructor_token'
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const updated = await res.json();
          setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
          showToast('Question updated successfully!');
        } else {
          // Local fallback
          setQuestions((prev) =>
            prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...payload } : q))
          );
          showToast('Question updated locally');
        }
      } else {
        // Create new
        const res = await fetch(`${API_URL}/api/instructor/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock_instructor_token'
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const created = await res.json();
          setQuestions((prev) => [created, ...prev]);
          showToast('Question created successfully!');
        } else {
          const mockNew: Question = {
            id: `q_${Date.now()}`,
            ...payload
          };
          setQuestions((prev) => [mockNew, ...prev]);
          showToast('Question created locally');
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save question', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/instructor/questions/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: 'Bearer mock_instructor_token' }
      });
      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, reviewed: true } : q))
        );
        showToast('Question approved & published!');
      } else {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, reviewed: true } : q))
        );
        showToast('Question approved locally');
      }
    } catch (err) {
      console.error(err);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, reviewed: true } : q))
      );
      showToast('Question approved locally');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/instructor/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mock_instructor_token' }
      });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        showToast('Question deleted');
      } else {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        showToast('Question deleted locally');
      }
    } catch (err) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      showToast('Question deleted locally');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter Computation
  const needsReviewCount = questions.filter((q) => !q.reviewed).length;
  const publishedCount = questions.filter((q) => q.reviewed).length;

  const filteredQuestions = questions.filter((q) => {
    if (activeTab === 'needs_review' && q.reviewed) return false;
    if (selectedTopic !== 'all' && q.topic_id !== selectedTopic) return false;
    if (selectedDiff !== 'all') {
      if (selectedDiff === 'easy' && (q.difficulty < 1.0 || q.difficulty > 2.0)) return false;
      if (selectedDiff === 'medium' && (q.difficulty < 2.1 || q.difficulty > 3.5)) return false;
      if (selectedDiff === 'hard' && q.difficulty < 3.6) return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchText = q.question_text.toLowerCase().includes(query);
      const matchId = q.id.toLowerCase().includes(query);
      if (!matchText && !matchId) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (role === 'student') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-100">Access Restricted</h1>
        <p className="text-slate-400 mt-2 max-w-md">
          Instructor permissions required. Students cannot access the Question Bank portal.
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Toast Banner */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-medium border ${
          toastMsg.type === 'error'
            ? 'bg-red-950/90 text-red-200 border-red-500/40'
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
        }`}>
          {toastMsg.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-0.5 rounded-full border border-indigo-500/20">
                Instructor Portal
              </span>
              <span className="text-xs text-slate-400">Phase 5</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-1">Question Bank Engine</h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchQuestions}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition flex items-center space-x-2 text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={openAddModal}
            className="gradient-btn px-4 py-2.5 rounded-xl text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Question</span>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('smartquiz_user');
              router.push('/login');
            }}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 rounded-xl transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400">Total Questions</p>
            <p className="text-2xl font-extrabold text-slate-100 mt-1">{questions.length}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400">Published Questions</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{publishedCount}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400">Needs Review (AI)</p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-2xl font-extrabold text-amber-400">{needsReviewCount}</p>
              {needsReviewCount > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-medium animate-pulse">
                  Action Required
                </span>
              )}
            </div>
          </div>
          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400">Avg Difficulty</p>
            <p className="text-2xl font-extrabold text-indigo-400 mt-1">
              {questions.length > 0
                ? (questions.reduce((sum, q) => sum + (q.difficulty || 1.0), 0) / questions.length).toFixed(1)
                : '1.0'}
              <span className="text-xs text-slate-500 font-normal"> / 5.0</span>
            </p>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            {/* Tabs */}
            <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Questions ({questions.length})
              </button>
              <button
                onClick={() => setActiveTab('needs_review')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 ${
                  activeTab === 'needs_review'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Needs Review</span>
                {needsReviewCount > 0 && (
                  <span className="bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 text-[10px] rounded-full">
                    {needsReviewCount}
                  </span>
                )}
              </button>
            </div>

            {/* Realtime Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search question text or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs text-slate-400 mr-2">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Filters:</span>
            </div>

            {/* Topic Filter */}
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Topics</option>
              <option value="py_basics">Basics & Syntax</option>
              <option value="py_data">Data Structures</option>
              <option value="py_advanced">Advanced Concepts</option>
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDiff}
              onChange={(e) => setSelectedDiff(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy (1.0 - 2.0)</option>
              <option value="medium">Medium (2.1 - 3.5)</option>
              <option value="hard">Hard (3.6 - 5.0)</option>
            </select>

            {(selectedTopic !== 'all' || selectedDiff !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedTopic('all');
                  setSelectedDiff('all');
                  setSearchQuery('');
                }}
                className="text-xs text-indigo-400 hover:underline ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Questions Cards List */}
        {fetching ? (
          <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center text-slate-400 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto" />
            <p className="text-sm">Loading Question Bank...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center text-slate-400 space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-300">No questions found</p>
            <p className="text-xs max-w-sm mx-auto">
              {activeTab === 'needs_review'
                ? 'Great news! There are no pending AI generated questions waiting for review.'
                : 'No questions match your filter criteria. Try resetting filters or add a new question.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className={`glass-card p-5 rounded-2xl border transition hover:border-slate-700 space-y-4 ${
                  !q.reviewed ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-lg">
                      #{q.id}
                    </span>
                    <span className="text-[11px] font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full">
                      {q.topic_id === 'py_basics'
                        ? 'Basics & Syntax'
                        : q.topic_id === 'py_data'
                        ? 'Data Structures'
                        : q.topic_id === 'py_advanced'
                        ? 'Advanced Concepts'
                        : q.topic_id || 'General'}
                    </span>
                    
                    {/* Difficulty Badge */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        q.difficulty <= 2.0
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : q.difficulty <= 3.5
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      Diff: {q.difficulty.toFixed(1)}
                    </span>

                    {/* Source Badge */}
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      {q.source === 'generated' ? '🤖 AI Generated' : '✍️ Manual'}
                    </span>
                  </div>

                  {/* Status & Quick Action */}
                  <div className="flex items-center space-x-2">
                    {!q.reviewed ? (
                      <button
                        onClick={() => handleApprove(q.id)}
                        className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Publish</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Published</span>
                      </span>
                    )}

                    <button
                      onClick={() => openEditModal(q)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-lg transition"
                      title="Edit Question"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(q.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Body */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{q.question_text}</h3>
                  
                  {/* Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {Object.entries(q.options || {}).map(([key, val]) => {
                      const isCorrect = key === q.correct_option;
                      return (
                        <div
                          key={key}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span>
                            <strong className="mr-2">{key}.</strong> {val}
                          </span>
                          {isCorrect && (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                              Correct Key
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <p className="mt-3 text-xs text-slate-400 italic bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
                      💡 <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-slate-800 p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100">
                {editingQuestion ? 'Edit Question' : 'Create New Question'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Subject & Topic Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="python">Python Programming</option>
                    <option value="math">Mathematics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Topic</label>
                  <select
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="py_basics">Basics & Syntax</option>
                    <option value="py_data">Data Structures</option>
                    <option value="py_advanced">Advanced Concepts</option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Question Prompt</label>
                <textarea
                  rows={3}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Enter the complete question prompt..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* 4 Options Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Answer Options & Correct Answer</label>
                
                {[
                  { key: 'A', val: formOptA, setVal: setFormOptA },
                  { key: 'B', val: formOptB, setVal: setFormOptB },
                  { key: 'C', val: formOptC, setVal: setFormOptC },
                  { key: 'D', val: formOptD, setVal: setFormOptD }
                ].map((opt) => (
                  <div key={opt.key} className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setFormCorrect(opt.key)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        formCorrect === opt.key
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      Option {opt.key} {formCorrect === opt.key && '✓'}
                    </button>
                    <input
                      type="text"
                      placeholder={`Enter text for Option ${opt.key}...`}
                      value={opt.val}
                      onChange={(e) => opt.setVal(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Difficulty Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">Target Difficulty Level</label>
                  <span className="text-xs font-bold text-indigo-400">{formDiff.toFixed(1)} / 5.0</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.5"
                  value={formDiff}
                  onChange={(e) => setFormDiff(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>1.0 (Beginner)</span>
                  <span>3.0 (Intermediate)</span>
                  <span>5.0 (Expert)</span>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Explanation (Optional)</label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Explain why the selected option is correct..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gradient-btn px-6 py-2 rounded-xl text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 flex items-center space-x-2"
                >
                  {submitting && <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white" />}
                  <span>{editingQuestion ? 'Save Changes' : 'Create Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full rounded-2xl border border-slate-800 p-6 space-y-4 text-center">
            <div className="p-3 bg-red-500/10 rounded-full w-fit mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Delete Question?</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to delete question <strong className="text-slate-200">#{deletingId}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
