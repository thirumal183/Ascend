import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import {
  PATHWAY_SUGGESTED_PROMPTS,
  SUGGESTED_COACH_PROMPTS,
} from '../../data/mockData';
import { generateMockCoachReply } from '../../services/ascendApiService';
import { aiCoachApi, ApiError } from '../../services/api';
import { mapBackendChatMessageToFrontend } from '../../services/api/mappers';
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
  onClearMessages?: () => void;
  conversationId?: string | null;
  onConversationIdChange?: (id: string | null) => void;
  intakeRecords: IntakeRecord[];
  goals: NutritionGoals;
  userProfile: UserProfile;
  progressHistory: ProgressRecord[];
  onNavigate: (tab: NavigationTab) => void;
  isDemoAccount?: boolean;
}

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  messages,
  onAppendMessage,
  onClearMessages,
  conversationId = null,
  onConversationIdChange,
  intakeRecords,
  goals,
  userProfile,
  progressHistory,
  onNavigate,
  isDemoAccount = false,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [simulateError, setSimulateError] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const pathwayPrompts =
    PATHWAY_SUGGESTED_PROMPTS[userProfile.pathway] || SUGGESTED_COACH_PROMPTS;

  const handleSendMessage = async (promptText: string) => {
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

    if (simulateError) {
      setTimeout(() => {
        setIsGenerating(false);
        setErrorBanner(
          'Unable to reach the coaching service right now (simulated error state). Please try again.'
        );
      }, 300);
      return;
    }

    if (isDemoAccount) {
      // In Demo Mode: execute local rule heuristics
      setTimeout(() => {
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
          timestamp: 'Just now · Demo Rule Heuristics',
          content: generated.content,
          structuredInsight: generated.structuredInsight,
          isMockResponse: true,
        };

        onAppendMessage(assistantMsg);
        setIsGenerating(false);
      }, 400);
      return;
    }

    // Live Backend Mode: dispatch to FastAPI POST /api/v1/ai/chat
    try {
      const response = await aiCoachApi.sendChatMessage({
        conversationId: conversationId || undefined,
        message: trimmed,
      });

      if (response.conversationId && onConversationIdChange) {
        onConversationIdChange(response.conversationId);
      }

      const assistantMsg = mapBackendChatMessageToFrontend(response);
      onAppendMessage(assistantMsg);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || 'Coaching service unreachable.';
      setErrorBanner(
        `Backend AI request failed: ${msg}. You can retry or verify your connection to the ASCEND backend.`
      );
    } finally {
      setIsGenerating(false);
    }
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onClearMessages && messages.length > 0 && (
            <button
              type="button"
              onClick={onClearMessages}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-200 transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}

          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => setSimulateError(!simulateError)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                simulateError
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              {simulateError ? 'Test Error: Active' : 'Test Error State'}
            </button>
          )}
        </div>
      </div>

      {/* Batch 6.1 External AI Privacy & Non-Medical Boundary Banner */}
      {showPrivacyNotice && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50/60 border border-sky-200/80 text-xs text-slate-700 space-y-2 shadow-2xs relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sky-950">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span>AI Data Privacy & Model Disclosure (Batch 6.1 Audit Passed)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPrivacyNotice(false)}
              className="text-slate-400 hover:text-slate-600 font-semibold text-[11px]"
            >
              Dismiss
            </button>
          </div>
          <p className="leading-relaxed text-slate-600">
            Coaching insights are synthesized by <strong className="text-slate-900">Google Gemini 2.5 Flash</strong> (<code className="font-mono text-slate-800 bg-white/80 px-1 py-0.5 rounded">gemini-2.5-flash</code>) or deterministic local rule heuristics when offline. Transmitted context includes only your active pathway, nutritional goals, logged day totals, and recent workout summaries.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-600" /> Zero credentials, emails, or names transmitted
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-amber-600" /> Educational only — non-medical boundary
            </span>
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3 w-3 text-sky-600" /> Server-side API key containment
            </span>
          </div>
        </div>
      )}

      {/* Main Chat Container */}
      <Card
        variant="elevated"
        className="flex flex-col h-[620px] p-0 overflow-hidden"
      >
        {/* Chat Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#0A1628] text-blue-300 border border-blue-500/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  ASCEND Performance Coach
                </h2>
                {isDemoAccount ? (
                  <Badge variant="amber" size="sm">
                    Demo Heuristics
                  </Badge>
                ) : (
                  <Badge variant="emerald" size="sm">
                    Live Gemini Connected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Grounding: {userProfile.pathway} ({goals.dailyCalories.toLocaleString()} kcal target)
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
          {messages.length === 0 && (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3 py-8">
              <div className="h-11 w-11 rounded-2xl bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-[#0A1628]">
                  Ask anything about today’s fuel & training
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Grounded in your active <strong className="text-[#0A1628]">{userProfile.pathway}</strong> targets ({goals.dailyCalories.toLocaleString()} kcal · {goals.proteinG}g protein) and logged entries.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {pathwayPrompts.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-[#0A1628] hover:text-[#1D4ED8] text-xs font-medium border border-slate-200 hover:border-blue-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
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

                  {/* Structured Insight Card */}
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
                          Structured Guidance
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
                                  .targetTab as NavigationTab
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

                  {/* Model Lineage Badge and Timestamp */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    {!isUser && (
                      <div className="flex items-center gap-1.5">
                        {msg.isMockResponse ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
                            <Zap className="h-3 w-3 text-amber-600" />
                            Pathway Heuristic Fallback
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            Gemini 2.5 Flash
                          </span>
                        )}
                      </div>
                    )}
                    <div className={`text-[11px] ${isUser ? 'text-sky-100 ml-auto' : 'text-slate-500'}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-200/70 w-fit animate-fade-in">
              <Loader2 className="h-4 w-4 text-sky-600 animate-spin" />
              <span>Synthesizing coaching advice with Gemini 2.5 Flash...</span>
            </div>
          )}

          {errorBanner && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimulateError(false);
                  setErrorBanner(null);
                }}
                className="font-semibold underline whitespace-nowrap text-rose-700 hover:text-rose-900"
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
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>

          {/* Persistent Non-Medical Disclaimer */}
          <p className="text-[10px] text-center text-slate-400">
            Educational coaching only · Not intended as clinical nutrition or medical therapy.
          </p>
        </div>
      </Card>
    </div>
  );
};
