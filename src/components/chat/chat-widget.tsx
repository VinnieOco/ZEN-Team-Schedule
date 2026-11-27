"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ pathname: window.location.pathname }),
        fetch: async (input, init) => {
          const response = await globalThis.fetch(input, init);
          const contentType = response.headers.get("content-type") ?? "";
          if (!response.ok && !contentType.includes("text/event-stream")) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(body?.error || "The chat could not answer just now.");
          }
          return response;
        },
      }),
    [],
  );
  const { messages, sendMessage, status, error, clearError } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, busy]);

  const submit = () => {
    const text = draft.trim();
    if (!text || busy) return;
    clearError();
    setDraft("");
    void sendMessage({ text });
  };

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end print:hidden">
      {open && (
        <section
          aria-label="Chat"
          className="mb-3 flex h-[min(32rem,70dvh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Ask ZEN</p>
              <p className="text-xs text-slate-500">
                {pathname.startsWith("/settings")
                  ? "Process questions and how the app works"
                  : "Ask about a process or this page"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm leading-relaxed text-slate-600">
                Ask how something works, or ask about a process from the documents in Settings.
                I’ll explain it, not hand you the file to read.
              </p>
            )}
            {messages
              .filter((message) => message.role !== "system")
              .map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
                    message.role === "user"
                      ? "ml-auto bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-800",
                  )}
                >
                  {messageText(message)}
                </div>
              ))}
            {busy && messages.at(-1)?.role !== "assistant" && (
              <p className="text-sm text-slate-500">Thinking…</p>
            )}
            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error.message || "The chat could not answer just now."}
              </p>
            )}
            <div ref={bottomRef} />
          </div>
          <form
            className="border-t p-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label className="sr-only" htmlFor="zen-chat-input">
              Message
            </label>
            <textarea
              id="zen-chat-input"
              value={draft}
              rows={2}
              placeholder="Ask a question"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <div className="mt-2 flex justify-end">
              <Button type="submit" disabled={busy || draft.trim().length === 0}>
                Send
              </Button>
            </div>
          </form>
        </section>
      )}
      <Button
        type="button"
        size="icon"
        className="h-12 w-12 rounded-full border-[#B6121D] bg-[#B6121D] text-white shadow-lg hover:border-[#961017] hover:bg-[#961017]"
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}
