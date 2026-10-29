import { ArrowUp, LoaderCircle } from "lucide-react";
import { useState } from "react";

export default function ChatInput({ onSend, loading, disabled = false }) {
  const [value, setValue] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const question = value.trim();
    if (!question || loading || disabled) return;
    setValue("");
    await onSend(question);
  };
  return (
    <form className="ai-chat-input-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="avenza-ai-question">Ask Avenza AI a question</label>
      <textarea
        id="avenza-ai-question"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Ask about your spending, budget, or savings…"
        rows={2}
        maxLength={1200}
        disabled={loading || disabled}
      />
      <div className="ai-chat-input-footer">
        <span>AI can make mistakes. Verify important financial decisions.</span>
        <button type="submit" aria-label="Send message" disabled={!value.trim() || loading || disabled}>
          {loading ? <LoaderCircle size={17} className="ai-spin" /> : <ArrowUp size={18} />}
        </button>
      </div>
    </form>
  );
}
