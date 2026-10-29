import { Bot, Grip, Minus, Plus, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { askAvenzaAI, saveAIConversation } from "../services/aiService";
import "../styles/aiFloatingCompanion.css";

const POSITION_KEY = "avenza-ai-companion-position";
const HANDOFF_KEY = "avenza-ai-assistant-handoff";
const ACTIVE_CHAT_KEY = "avenza-ai-active-chat";
const DEFAULT_POSITION = { x: Math.max(12, (typeof window === "undefined" ? 1024 : window.innerWidth) - 58 - 24), y: Math.max(12, (typeof window === "undefined" ? 768 : window.innerHeight) - 58 - 24) };
const welcome = {
  id: "welcome",
  role: "assistant",
  content: "Hi! Ask me a quick question about your recorded spending.",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function getSavedPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
  } catch {}
  return DEFAULT_POSITION;
}
function makeMessage(role, content) {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, content, createdAt: new Date().toISOString() };
}

function renderReadableText(text) {
  // Lightweight Markdown presentation for common AI answer formatting.
  return String(text || "").split(/\n/).map((line, index) => {
    const clean = line.trim();
    if (!clean) return <span className="avenza-ai-float-linebreak" key={`space-${index}`} />;
    const heading = clean.match(/^#{1,3}\s+(.*)$/);
    if (heading) return <strong className="avenza-ai-float-heading" key={index}>{heading[1]}</strong>;
    const bullet = clean.match(/^[-*]\s+(.*)$/);
    const numbered = clean.match(/^\d+[.)]\s+(.*)$/);
    const body = (bullet || numbered || [null, clean])[1].replace(/\*\*(.*?)\*\*/g, "$1");
    return <span className={`avenza-ai-float-textline ${(bullet || numbered) ? "is-list" : ""}`} key={index}>{(bullet || numbered) ? "• " : ""}{body}</span>;
  });
}

function getSavedActiveChat() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_CHAT_KEY) || "null");
    if (saved && Array.isArray(saved.messages)) return saved;
  } catch {}
  return null;
}

export default function AIFloatingCompanion({ user = null, transactions = [], onOpenFullAssistant }) {
  const [position, setPosition] = useState(getSavedPosition);
  const [viewport, setViewport] = useState({ width: typeof window === "undefined" ? 1024 : window.innerWidth, height: typeof window === "undefined" ? 768 : window.innerHeight });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [initialChat] = useState(getSavedActiveChat);
  const [messages, setMessages] = useState(initialChat?.messages?.length ? initialChat.messages : [welcome]);
  const [conversationId, setConversationId] = useState(initialChat?.conversationId || null);
  const [conversationTitle, setConversationTitle] = useState(initialChat?.conversationTitle || "New conversation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dragRef = useRef(null);
  const movedRef = useRef(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const buttonSize = 58;
  const margin = 12;

  const persistPosition = useCallback((next) => {
    setPosition(next);
    try { localStorage.setItem(POSITION_KEY, JSON.stringify(next)); } catch {}
  }, []);

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const applyActiveChat = (activeChat) => {
      if (!activeChat || !Array.isArray(activeChat.messages)) return;
      setConversationId(activeChat.conversationId || null);
      setConversationTitle(activeChat.conversationTitle || "New conversation");
      setMessages(activeChat.messages.length ? activeChat.messages : [welcome]);
    };
    const onSharedUpdate = (event) => {
      if (event?.detail?.source === "companion") return;
      if (event?.detail) applyActiveChat(event.detail);
      else {
        try { applyActiveChat(JSON.parse(localStorage.getItem(ACTIVE_CHAT_KEY) || "null")); } catch {}
      }
    };
    const onStorage = (event) => {
      if (event.key !== ACTIVE_CHAT_KEY) return;
      try { applyActiveChat(JSON.parse(event.newValue || "null")); } catch {}
    };
    window.addEventListener("avenza-ai-active-chat-updated", onSharedUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("avenza-ai-active-chat-updated", onSharedUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const activeChat = { conversationId, conversationTitle, messages };
    try {
      localStorage.setItem(ACTIVE_CHAT_KEY, JSON.stringify(activeChat));
      window.dispatchEvent(new CustomEvent("avenza-ai-active-chat-updated", {
        detail: { ...activeChat, source: "companion" },
      }));
    } catch {}
  }, [conversationId, conversationTitle, messages]);

  useEffect(() => {
    const onOutside = (event) => {
      if (!open) return;
      if (panelRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  useEffect(() => {
    const x = clamp(position.x, margin, Math.max(margin, viewport.width - buttonSize - margin));
    const y = clamp(position.y, margin, Math.max(margin, viewport.height - buttonSize - margin));
    if (x !== position.x || y !== position.y) persistPosition({ x, y });
  }, [position, viewport, persistPosition]);

  const startDrag = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y };
    movedRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
    setPosition({ x: clamp(drag.originX + dx, margin, Math.max(margin, viewport.width - buttonSize - margin)), y: clamp(drag.originY + dy, margin, Math.max(margin, viewport.height - buttonSize - margin)) });
  };
  const endDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const current = buttonRef.current?.getBoundingClientRect();
    if (!current) return;
    const left = current.left + current.width / 2 < viewport.width / 2;
    const top = current.top + current.height / 2 < viewport.height / 2;
    persistPosition({ x: left ? margin : Math.max(margin, viewport.width - buttonSize - margin), y: top ? margin : Math.max(margin, viewport.height - buttonSize - margin) });
  };
  const handleButtonClick = () => {
    if (movedRef.current) { movedRef.current = false; return; }
    setOpen((value) => !value);
  };

  const send = async (event) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || loading) return;
    const prior = messages.filter((message) => message.id !== welcome.id);
    const userMessage = makeMessage("user", question);
    const pendingMessages = [...prior, userMessage];
    setMessages(pendingMessages);
    setDraft("");
    setLoading(true);
    setError("");
    try {
      const response = await askAvenzaAI({ question, transactions, history: prior });
      const assistantMessage = makeMessage("assistant", response.content);
      const finalMessages = [...pendingMessages, assistantMessage];
      setMessages(finalMessages);
      const title = conversationTitle === "New conversation" ? question.slice(0, 58) : conversationTitle;
      setConversationTitle(title);
      if (user?.uid) {
        const id = await saveAIConversation(user.uid, { id: conversationId, title, messages: finalMessages });
        if (id) setConversationId(id);
      }
    } catch (requestError) {
      setError(requestError?.message || "Avenza AI couldn't answer right now.");
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    if (loading) return;
    setMessages([welcome]);
    setConversationId(null);
    setConversationTitle("New conversation");
    setDraft("");
    setError("");
  };

  const openFull = () => {
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ conversationId, conversationTitle, messages: messages.filter((message) => message.id !== welcome.id) }));
    } catch {}
    setOpen(false);
    onOpenFullAssistant?.();
  };

  return (
    <div className="avenza-ai-float-root">
      {open && (
        <section ref={panelRef} className="avenza-ai-float-panel"
          style={{ left: clamp(position.x + buttonSize + 12, margin, Math.max(margin, viewport.width - 360 - margin)), top: clamp(position.y - 330, margin, Math.max(margin, viewport.height - 440 - margin)) }}
          aria-label="Avenza AI quick chat">
          <header className="avenza-ai-float-header">
            <span className="avenza-ai-float-brand">
              <span className="avenza-ai-float-mark"><Sparkles size={16} /></span>
              <span><strong>Avenza AI</strong><small>Quick money insights</small></span>
            </span>
            <div className="avenza-ai-float-actions">
              <button type="button" title="New chat" aria-label="New chat" onClick={startNewConversation} disabled={loading}><Plus size={16} /></button>
              {onOpenFullAssistant && <button type="button" title="Open full AI assistant" onClick={openFull}><Grip size={16} /></button>}
              <button type="button" title="Close chat" aria-label="Close chat" onClick={() => setOpen(false)}><Minus size={17} /></button>
            </div>
          </header>
          <div className="avenza-ai-float-messages" aria-live="polite">
            {messages.filter((message) => message.id !== welcome.id || !messages.some((m) => m.id !== welcome.id)).map((message) => (
              <div className={`avenza-ai-float-message ${message.role}`} key={message.id}>
                {message.role === "assistant" && <span className="avenza-ai-float-avatar"><Bot size={15} /></span>}
                <p>{renderReadableText(message.content)}</p>
              </div>
            ))}
            {messages.filter((message) => message.id !== welcome.id).length >= 24 && !loading && <div className="avenza-ai-float-chat-nudge">This chat is getting long. You can start a new conversation in the full assistant whenever you’re ready.</div>}
            {loading && <div className="avenza-ai-float-loading">Avenza AI is thinking…</div>}
            {error && <div className="avenza-ai-float-error" role="alert">{error}</div>}
          </div>
          <form className="avenza-ai-float-form" onSubmit={send}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about your spending…" aria-label="Ask Avenza AI" disabled={loading} />
            <button type="submit" aria-label="Send message" disabled={!draft.trim() || loading}><Send size={16} /></button>
          </form>
          {!user && <div className="avenza-ai-float-demo-note">Demo data · Sign in to save conversations</div>}
        </section>
      )}
      {!open && <button ref={buttonRef} type="button" className="avenza-ai-float-button" style={{ left: position.x, top: position.y }} aria-label="Open Avenza AI quick chat" aria-expanded={open}
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={handleButtonClick}>
        <Sparkles size={20} /><span className="avenza-ai-float-button-label">AI</span>
      </button>}
    </div>
  );
}
