import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Loader2,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import {
  PATHWAY_SUGGESTED_PROMPTS,
  SUGGESTED_COACH_PROMPTS,
} from '../../data/mockData';
import { generateMockCoachReply } from '../../services/ascendApiService';
import {
  ChatMessage,
  IntakeRecord,
  NavigationTab,
  NutritionGoals,
  ProgressRecord,
  UserProfile,
} from '../../types/ascend';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface AiCoachViewProps {
  messages: ChatMessage[];
  onAppendMessage: (msg: ChatMessage) => void;
  intakeRecords: IntakeRecord[];
  goals: NutritionGoals;
  userProfile: UserProfile;
  progressHistory: ProgressRecord[];
  onNavigate: (tab: NavigationTab) => void;
}

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  messages,
  onAppendMessage,
  intakeRecords,
  goals,
  userProfile,
  progressHistory,
  onNavigate,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [simulateError, setSimulateError] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const pathwayPrompts =
    PATHWAY_SUGGESTED_PROMPTS[userProfile.pathway] || SUGGESTED_COACH_PROMPTS;

  const handleSendMessage = (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isGenerating) return;

    setErrorBanner(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      timestamp: 'Just now',
      content: trimmed,
      isMockResponse: false,
    };

    onAppendMessage(userMsg);
    setInputPrompt('');
    setIsGenerating(true);

    setTimeout(() => {
      if (simulateError) {
        setIsGenerating(false);
        setErrorBanner(
          'Unable to reach the coaching service right now (simulated error state). Please try again.'
        );
        return;
      }

      const generated = generateMockCoachReply(
        trimmed,
        intakeRecords,
        goals,
        userProfile,
        progressHistory
      );

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        timestamp: 'Just now · Demonstration response',
        content: generated.content,
        structuredInsight: generated.structuredInsight,
        isMockResponse: true,
      };

      onAppendMessage(assistantMsg);
      setIsGenerating(false);
    }, 360);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputPrompt);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 lg:pb-12 animate-page-enter">
      {/* Friendly Product Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            AI Nutrition & Performance Coach
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Personalized meal ideas and progress guidance grounded in your{' '}
            <strong className="text-slate-800">{userProfile.pathway}</strong> goals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSimulateError(!simulateError)}
          className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors self-start sm:self-auto ${
            simulateError
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
          }`}
        >
          {simulateError ? 'Error State: Active' : 'Test Error State'}
        </button>
      </div>

      {/* Main Chat Container */}
      {/* Simulation / Gemini API Service Boundary Badge */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-2xs">
        <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900 font-semibold">Simulated AI Assistant (Rule Heuristics):</strong>{' '}
          In this client-side prototype, coaching responses are generated via deterministic nutrition rule heuristics grounded in your active diary logs. The backend handoff architecture establishes the API boundary for production Gemini 1.5 Flash / Pro integration via FastAPI (<code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">POST /api/v1/ai/chat</code>).
        </div>
      </div>

      <Card
        variant="elevated"
        className="flex flex-col h-[620px] p-0 overflow-hidden"
      >
        {/* Chat Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ASCEND Nutrition Coach
              </h2>
              <p className="text-xs text-slate-500">
                Demonstration responses · {userProfile.pathway} ({goals.dailyCalories.toLocaleString()} kcal target)
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(NavigationTab.Diet)}
            >
              Open Food Log
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(NavigationTab.Progress)}
            >
              View Progress
            </Button>
          </div>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3.5 animate-fade-in ${
                  isUser ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isUser
                      ? 'bg-gradient-to-br from-sky-600 to-sky-700 text-white'
                      : 'bg-white border border-slate-200 text-sky-600'
                  }`}
                >
                  {isUser ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-sm space-y-3 ${
                    isUser
                      ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-xs rounded-tr-xs'
                      : 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs rounded-tl-xs'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {msg.structuredInsight && (
                    <div className="mt-3 bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-3 text-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                          <h3 className="text-xs font-bold text-slate-900">
                            {msg.structuredInsight.title}
                          </h3>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Demonstration Insight
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {msg.structuredInsight.summary}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {msg.structuredInsight.metrics.map((m) => (
                          <div
                            key={m.label}
                            className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs"
                          >
                            <span className="text-[11px] text-slate-500 block">
                              {m.label}
                            </span>
                            <strong className="font-mono text-xs font-bold text-slate-900 block mt-0.5">
                              {m.current}
                            </strong>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {m.target}
                            </span>
                          </div>
                        ))}
                      </div>

                      {msg.structuredInsight.suggestedAction && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate(
                                msg.structuredInsight!.suggestedAction!
                                   .targetTab
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200/60 transition-colors"
                          >
                            <span>
                              {msg.structuredInsight.suggestedAction.label}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-[11px] ${isUser ? 'text-sky-100' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-200/70 w-fit animate-fade-in">
              <Loader2 className="h-4 w-4 text-sky-600 animate-spin" />
              <span>Reviewing your logged nutrition...</span>
            </div>
          )}

          {errorBanner && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimulateError(false);
                  setErrorBanner(null);
                }}
                className="font-semibold underline whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pathway-Specific Suggested Questions & Message Composer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 rounded-b-2xl">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {pathwayPrompts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-sky-50 active:scale-[0.98] text-slate-700 hover:text-sky-700 border border-slate-200 rounded-xl transition-all whitespace-nowrap shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <input
              type="text"
              aria-label="Ask your AI coach a question"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask a question about your meals, protein target, or dinner options..."
              className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isGenerating}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
};
