'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  apiStartQuiz,
  apiSubmitAnswer,
  apiGetQuizResult,
  Question,
  StartQuizResponse,
  SubmitAnswerResponse,
  QuizResultResponse
} from '@/lib/api';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Award,
  AlertTriangle,
  BrainCircuit,
  Home,
  Check,
  ChevronRight
} from 'lucide-react';

type QuizState = 'SELECT_SUBJECT' | 'ANSWERING' | 'FEEDBACK' | 'RESULTS';

export default function StudentQuizPage() {
  const router = useRouter();

  // Quiz setup state
  const [selectedSubject, setSelectedSubject] = useState('python');
  const [totalQuestions, setTotalQuestions] = useState(5);

  // Active Session state
  const [quizState, setQuizState] = useState<QuizState>('SELECT_SUBJECT');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Progress tracking
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentAbility, setCurrentAbility] = useState(1.0);
  const [score, setScore] = useState(0);

  // Feedback state
  const [lastFeedback, setLastFeedback] = useState<SubmitAnswerResponse | null>(null);
  const [finalResult, setFinalResult] = useState<QuizResultResponse | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start Quiz Session
  const handleStartQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = localStorage.getItem('smartquiz_user');
      const userId = stored ? JSON.parse(stored).id : 'student_demo';

      const data = await apiStartQuiz(selectedSubject, totalQuestions, userId);
      setSessionId(data.session_id);
      setCurrentAbility(data.current_ability);
      setCurrentQuestion(data.first_question);
      setQuestionNumber(1);
      setScore(0);
      setSelectedOption(null);
      setQuizState('ANSWERING');
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend server. Make sure FastAPI server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer for Current Question
  const handleSubmitAnswer = async () => {
    if (!sessionId || !selectedOption) return;

    setLoading(true);
    setError(null);
    try {
      const feedback = await apiSubmitAnswer(sessionId, selectedOption);
      setLastFeedback(feedback);
      setCurrentAbility(feedback.current_ability);
      setScore(feedback.score);

      if (feedback.session_status === 'completed') {
        // Fetch full quiz summary
        const res = await apiGetQuizResult(sessionId);
        setFinalResult(res);
      }
      setQuizState('FEEDBACK');
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  // Move to Next Question or Final Results
  const handleNextQuestion = () => {
    if (!lastFeedback) return;

    if (lastFeedback.session_status === 'completed' || !lastFeedback.next_question) {
      setQuizState('RESULTS');
    } else {
      setCurrentQuestion(lastFeedback.next_question);
      setQuestionNumber((prev) => prev + 1);
      setSelectedOption(null);
      setLastFeedback(null);
      setQuizState('ANSWERING');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800/80 z-10">
        <Link href="/student" className="flex items-center space-x-2 text-slate-400 hover:text-white text-xs font-semibold transition">
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <div className="flex items-center space-x-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-bold gradient-text">SmartQuiz Engine</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl w-full mx-auto my-auto py-6 z-10">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start space-x-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Backend Connection Issue</p>
              <p className="text-xs text-red-300/80 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-lg text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STATE 1: SUBJECT SELECTION */}
        {quizState === 'SELECT_SUBJECT' && (
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 mb-4 border border-indigo-500/20">
              <Sparkles className="w-8 h-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Select Quiz Subject</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Our AI engine will dynamically adapt question difficulty to match your performance in real time.
            </p>

            <div className="mt-8 space-y-4 text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose Subject
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'python', title: 'Python Programming', desc: 'Core syntax, data structures & OOP' },
                  { id: 'math', title: 'Mathematics', desc: 'Algebra, logic & computation' }
                ].map((subj) => (
                  <button
                    key={subj.id}
                    onClick={() => setSelectedSubject(subj.id)}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      selectedSubject === subj.id
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-xl shadow-indigo-500/10'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-base">{subj.title}</span>
                      {selectedSubject === subj.id && (
                        <div className="p-1 bg-indigo-500 rounded-full text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{subj.desc}</p>
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Number of Questions
                </label>
                <div className="flex space-x-3">
                  {[3, 5, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setTotalQuestions(num)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                        totalQuestions === num
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {num} Questions
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleStartQuiz}
              disabled={loading}
              className="w-full gradient-btn text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 mt-8 shadow-xl text-sm"
            >
              {loading ? (
                <span>Initializing Adaptive Engine...</span>
              ) : (
                <>
                  <span>Begin Adaptive Quiz</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* STATE 2: ANSWERING QUESTION */}
        {quizState === 'ANSWERING' && currentQuestion && (
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800">
            {/* Header Stats */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-800/60 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Question {questionNumber} of {totalQuestions}
                </span>
                <div className="w-36 bg-slate-900 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Ability Rating:</span>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-extrabold">
                  {currentAbility.toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-8">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20 inline-block mb-3">
                Difficulty Level: {currentQuestion.difficulty.toFixed(1)}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* Options List */}
            <div className="space-y-3.5">
              {Object.entries(currentQuestion.options).map(([key, value]) => {
                const isSelected = selectedOption === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedOption(key)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <span
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center border transition ${
                          isSelected
                            ? 'bg-indigo-500 border-indigo-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {key}
                      </span>
                      <span className="text-sm font-medium">{value}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Button */}
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedOption || loading}
              className={`w-full mt-8 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition ${
                selectedOption && !loading
                  ? 'gradient-btn text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span>Evaluating Response...</span>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* STATE 3: INSTANT FEEDBACK VIEW */}
        {quizState === 'FEEDBACK' && lastFeedback && currentQuestion && (
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800">
            {/* Feedback Alert Banner */}
            <div
              className={`p-5 rounded-2xl border flex items-center space-x-4 mb-6 ${
                lastFeedback.is_correct
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {lastFeedback.is_correct ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-lg font-bold">
                  {lastFeedback.is_correct ? 'Correct Answer!' : 'Incorrect Answer'}
                </h3>
                <p className="text-xs opacity-90 mt-0.5">
                  {lastFeedback.is_correct
                    ? 'Great job! Your ability rating increased.'
                    : `Correct option was (${lastFeedback.correct_option}). Your ability rating was adjusted.`}
                </p>
              </div>
            </div>

            {/* Question Recap & Explanation */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 mb-6">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Question Recap</p>
              <p className="text-sm font-semibold text-slate-200">{currentQuestion.question_text}</p>

              {lastFeedback.explanation && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Explanation</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{lastFeedback.explanation}</p>
                </div>
              )}
            </div>

            {/* Updated Ability Score */}
            <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800 mb-8">
              <span className="text-xs text-slate-400">Updated Ability Estimate</span>
              <span className="text-sm font-extrabold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                {lastFeedback.current_ability.toFixed(1)} / 5.0
              </span>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleNextQuestion}
              className="w-full gradient-btn text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg"
            >
              <span>
                {lastFeedback.session_status === 'completed' ? 'View Final Results' : 'Next Question'}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STATE 4: RESULTS SCREEN */}
        {quizState === 'RESULTS' && (
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-purple-500/10 rounded-2xl text-purple-400 mb-4 border border-purple-500/20">
              <Award className="w-10 h-10" />
            </div>

            <h1 className="text-3xl font-extrabold text-slate-100">Quiz Completed!</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Here is your performance diagnostic summary</p>

            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Score</span>
                <p className="text-3xl font-black text-emerald-400 mt-1">
                  {score} / {totalQuestions}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {Math.round((score / totalQuestions) * 100)}% Accuracy
                </p>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Final Ability</span>
                <p className="text-3xl font-black text-indigo-400 mt-1">
                  {currentAbility.toFixed(1)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Scale 1.0 - 5.0</p>
              </div>
            </div>

            {/* History Review */}
            {finalResult && finalResult.history.length > 0 && (
              <div className="mt-8 text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Question Breakdown
                </h3>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {finalResult.history.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        {item.is_correct ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <span className="text-slate-300 font-medium">Question #{idx + 1}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-400">Choice: ({item.student_answer})</span>
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px] text-purple-300">
                          Diff: {item.difficulty_at_time.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setQuizState('SELECT_SUBJECT')}
                className="flex-1 gradient-btn text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Take Another Quiz</span>
              </button>
              <Link
                href="/student"
                className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-slate-500 pt-6 z-10">
        SmartQuiz Adaptive Engine • Secure Client Filtering Active
      </footer>
    </div>
  );
}
