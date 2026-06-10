import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Send, History, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, Tabs } from '@ds/primitives';
import { Avatar } from '@ds/data-display';
import { springs } from '@ds/motion';
import { useUIStore } from '@/app/stores/ui';
import { aiContextFor } from './aiContext';
import { aiApi, type ChatThread } from '@/data/mock-api';
import { timeAgo } from '@/lib/format';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

let mid = 0;

export function AIAssistant() {
  const open = useUIStore((s) => s.assistantOpen);
  const setOpen = useUIStore((s) => s.setAssistantOpen);
  const { pathname } = useLocation();
  const ctx = aiContextFor(pathname);
  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  // Load past sessions when the History tab opens.
  useEffect(() => {
    if (tab === 'history') aiApi.threads().then(setThreads).catch(() => setThreads([]));
  }, [tab]);

  const send = async (text: string) => {
    if (!text.trim() || thinking) return;
    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { id: `m${++mid}`, role: 'user', text }]);
    setInput('');
    setThinking(true);
    try {
      const { reply, threadId: tid } = await aiApi.chat([...history, { role: 'user', content: text }], threadId);
      setThreadId(tid);
      setMessages((m) => [...m, { id: `m${++mid}`, role: 'assistant', text: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { id: `m${++mid}`, role: 'assistant', text: e instanceof Error ? `Sorry — ${e.message}` : 'Something went wrong. Try again.' }]);
    } finally {
      setThinking(false);
    }
  };

  const openThread = async (t: ChatThread) => {
    setThreadId(t.id);
    const turns = await aiApi.messages(t.id);
    setMessages(turns.map((m) => ({ id: `m${++mid}`, role: m.role, text: m.content })));
    setTab('chat');
  };

  const newChat = () => { setThreadId(null); setMessages([]); setTab('chat'); };

  return (
    <>
      {/* Floating pill */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...springs.snappy, delay: 0.3 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700"
        aria-label="Open AI Assistant"
      >
        <Sparkles size={18} />
        <span className="hidden sm:inline">AI Assistant</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={springs.snappy}
            className="fixed bottom-24 right-6 z-50 flex h-[560px] max-h-[calc(100vh-8rem)] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-line bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><Sparkles size={18} /></span>
                <div>
                  <p className="text-sm font-semibold leading-tight">AI Assistant</p>
                  <p className="text-2xs text-white/80">{ctx.subtitle}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 hover:bg-white/15"><X size={18} /></button>
            </div>

            <div className="border-b border-line px-3 pt-2">
              <Tabs
                variant="pills"
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'chat', label: 'Chat', icon: <MessageSquare size={14} /> },
                  { value: 'history', label: 'History', icon: <History size={14} /> },
                ]}
              />
            </div>

            {tab === 'chat' ? (
              <>
                <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40"><Sparkles size={24} /></span>
                      <p className="text-sm font-medium text-content">How can I help?</p>
                      <p className="max-w-[240px] text-xs text-content-muted">{ctx.subtitle}. Try one of the suggestions below.</p>
                    </div>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
                      {m.role === 'assistant' ? (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40"><Sparkles size={14} /></span>
                      ) : (
                        <Avatar name="You" size="xs" />
                      )}
                      <div className={cn('max-w-[78%] rounded-2xl px-3 py-2 text-sm', m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-content')}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {thinking && (
                    <div className="flex gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40"><Sparkles size={14} /></span>
                      <div className="flex items-center gap-1 rounded-2xl bg-surface-sunken px-3 py-3">
                        {[0, 1, 2].map((i) => (
                          <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-content-subtle" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggested prompts */}
                {messages.length === 0 && (
                  <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                    {ctx.prompts.map((p) => (
                      <button key={p} onClick={() => send(p)} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-content-muted transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-line p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && send(input)}
                      placeholder="Ask anything…"
                      className="h-10 flex-1 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:border-brand-500 focus-visible:ring-2"
                    />
                    <Button icon={Send} aria-label="Send" onClick={() => send(input)} disabled={!input.trim()} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-3">
                <button onClick={newChat} className="mb-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm text-content-muted transition-colors hover:border-brand-400 hover:text-brand-700">
                  <MessageSquare size={15} /> Start a new chat
                </button>
                {threads.length === 0 ? (
                  <p className="py-8 text-center text-xs text-content-subtle">No past conversations yet.</p>
                ) : threads.map((s) => (
                  <button key={s.id} onClick={() => openThread(s)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-surface-sunken">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-content-muted"><MessageSquare size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-content">{s.title}</span>
                      <span className="block text-2xs text-content-subtle">{timeAgo(s.updatedAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
