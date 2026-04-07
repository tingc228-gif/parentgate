import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Plus, Bot, User } from 'lucide-react';
import { buildDocumentContext, sendChatMessage } from '../api/ai';
import type { DocumentContext, ChatMessage, ExtractedEvent } from '../api/ai';

interface Props {
  files: File[];
  onAddEvents: (events: ExtractedEvent[]) => void;
}

export default function ChatBox({ files, onAddEvents }: Props) {
  const [context, setContext] = useState<DocumentContext | null>(null);
  const [building, setBuilding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 文件变化时重新初始化上下文
  useEffect(() => {
    if (files.length === 0) {
      setContext(null);
      setMessages([]);
      return;
    }
    setBuilding(true);
    setContext(null);
    setMessages([]);
    buildDocumentContext(files)
      .then(ctx => {
        setContext(ctx);
        setMessages([{
          role: 'assistant',
          content: `文件已读取完毕（${files.length} 个）。你可以告诉我需要提取哪些活动，比如："我孩子叫 XX，帮我找她的参赛时间"。`,
        }]);
      })
      .catch(err => {
        setMessages([{
          role: 'assistant',
          content: `读取文件失败：${err instanceof Error ? err.message : '未知错误'}`,
        }]);
      })
      .finally(() => setBuilding(false));
  }, [files]);

  // 自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !context || sending) return;
    const userText = input.trim();
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const { text, events } = await sendChatMessage(context, messages, userText);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: text,
        events: events.length > 0 ? events : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `出错了：${err instanceof Error ? err.message : '未知错误'}`,
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (files.length === 0) return null;

  return (
    <div className="border border-indigo-100 rounded-xl overflow-hidden bg-white">
      {/* 标题 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100">
        <Bot className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-primary">和 Kimi 对话</span>
        {building && <Loader2 className="w-3 h-3 text-primary animate-spin ml-auto" />}
        {building && <span className="text-xs text-indigo-400">正在读取文件...</span>}
      </div>

      {/* 消息列表 */}
      <div className="h-52 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* 头像 */}
            <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-primary' : 'bg-indigo-100'
            }`}>
              {msg.role === 'user'
                ? <User className="w-3 h-3 text-white" />
                : <Bot className="w-3 h-3 text-primary" />
              }
            </div>

            {/* 气泡 */}
            <div className={`flex flex-col gap-1.5 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-white text-gray-700 rounded-tl-sm shadow-sm border border-gray-100'
              }`}>
                {msg.content}
              </div>

              {/* 识别到的活动 */}
              {msg.events && msg.events.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2 w-full space-y-1.5">
                  <p className="text-xs font-medium text-primary">识别到 {msg.events.length} 个活动：</p>
                  {msg.events.map((evt, j) => (
                    <div key={j} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-700 truncate">{evt.title}</p>
                        <p className="text-gray-400">
                          {evt.eventDate}{evt.eventTime ? ' ' + evt.eventTime : ''}
                          {evt.location ? ' · ' + evt.location : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => onAddEvents(msg.events!)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    全部加入日程
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-primary" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm border border-gray-100">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <div className="flex items-end gap-2 p-2 border-t border-gray-100 bg-white">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={context ? '告诉我需要什么，如：我孩子叫 XX...' : '等待文件读取...'}
          disabled={!context || sending}
          rows={1}
          className="flex-1 resize-none px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 max-h-24"
          style={{ overflowY: 'auto' }}
        />
        <button
          onClick={handleSend}
          disabled={!context || !input.trim() || sending}
          className="p-2 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
