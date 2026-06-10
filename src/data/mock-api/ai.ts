import { supabase } from '@/lib/supabase';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}
export interface ChatThread {
  id: string;
  title: string;
  updatedAt: string;
}

export const aiApi = {
  /** Send the conversation to the assistant; returns the reply + thread id. */
  async chat(messages: ChatTurn[], threadId: string | null): Promise<{ reply: string; threadId: string }> {
    const { data, error } = await supabase.functions.invoke('ai-chat', { body: { messages, thread_id: threadId } });
    if (error) throw error;
    const res = data as { reply?: string; thread_id?: string; error?: string };
    if (res.error) throw new Error(res.error);
    return { reply: res.reply ?? '', threadId: res.thread_id ?? threadId ?? '' };
  },

  async threads(): Promise<ChatThread[]> {
    const { data, error } = await supabase
      .from('ai_chat_threads')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((t) => ({ id: t.id as string, title: (t.title as string) ?? 'Chat', updatedAt: t.updated_at as string }));
  },

  async messages(threadId: string): Promise<ChatTurn[]> {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map((m) => ({ role: m.role as ChatTurn['role'], content: m.content as string }));
  },
};
