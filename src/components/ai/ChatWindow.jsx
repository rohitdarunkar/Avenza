import { MessageCircle, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";

const SUGGESTIONS = [
  { title: "Spending snapshot", question: "Summarize my spending and income using the transactions available to you." },
  { title: "Top expense categories", question: "Which categories account for most of my expenses? Show the amounts and percentages." },
  { title: "Find savings", question: "Based on my recorded expenses, suggest realistic areas where I could reduce spending. Separate recorded facts from estimates." },
  { title: "Build a savings plan", question: "Help me build a practical monthly savings plan from my recorded income and expenses. Ask me for a target if you need one, and label any estimates clearly." },
  { title: "Monthly comparison", question: "Compare my recorded income and expenses across the available months." },
];

export default function ChatWindow({ messages, onSend, loading, disabled, hasMessages }) {
  const messagesContainerRef = useRef(null);
  const latestMessageRef = useRef(null);

  useEffect(() => {
    // Keep the newest question/answer in view automatically. The user only
    // needs to scroll inside the conversation if they want to read older turns.
    const frame = window.requestAnimationFrame(() => {
      latestMessageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, loading]);

  return (
    <section className="ai-chat-panel" aria-label="Avenza AI conversation">
      <div className="ai-chat-messages" ref={messagesContainerRef} aria-live="polite">
        {!hasMessages ? (
          <div className="ai-chat-welcome">
            <div className="ai-welcome-icon"><Sparkles size={23} /></div>
            <span className="ai-kicker">YOUR FINANCIAL COPILOT</span>
            <h2>Make sense of your money.</h2>
            <p>Ask a question about the transaction data available in this workspace. Avenza AI will help you spot patterns and plan your next steps.</p>
            <div className="ai-suggestions">
              {SUGGESTIONS.map((item) => (
                <button key={item.title} type="button" onClick={() => onSend(item.question)} disabled={loading || disabled}>
                  <MessageCircle size={16} />
                  <span><strong>{item.title}</strong><small>{item.question}</small></span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-message-list">
            {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
            {loading && <div className="ai-thinking"><span /><span /><span /> Avenza is thinking…</div>}
            <div ref={latestMessageRef} className="ai-chat-latest-anchor" aria-hidden="true" />
          </div>
        )}
      </div>
      <ChatInput onSend={onSend} loading={loading} disabled={disabled} />
    </section>
  );
}
