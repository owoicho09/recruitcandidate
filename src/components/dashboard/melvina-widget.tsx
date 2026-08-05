"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Send, X, Minus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MelvinaState {
  open: boolean;
  position: { x: number; y: number };
  messages: ChatMessage[];
}

const STORAGE_KEY = "melvina_state";
const GREETED_KEY = "melvina_greeted";
const BUBBLE_SIZE = 56;

function defaultPosition() {
  if (typeof window === "undefined") return { x: 24, y: 24 };
  return { x: window.innerWidth - BUBBLE_SIZE - 24, y: window.innerHeight - BUBBLE_SIZE - 24 };
}

function greeting(firstName: string): string {
  return `Welcome to RecruitCandidates${firstName ? `, ${firstName}` : ""}! Let's get your company ready to receive applications.

Here's a quick checklist to get started:
1. Upload your logo and complete your company profile
2. Create your first job
3. Publish it to go live
4. Share your career page link with candidates

I'm Melvina — ask me anything along the way, and I can pass a bug report or complaint straight to the team if something's not working.`;
}

export function MelvinaWidget({ firstName }: { firstName: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = React.useState<MelvinaState>({ open: false, position: defaultPosition(), messages: [] });
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = React.useState(false);
  const bubbleRef = React.useRef<HTMLButtonElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const hydrated = React.useRef(false);

  // Hydrate from sessionStorage once on mount (client-only — position depends on window size,
  // so this can't be a useState initializer, which must be pure/SSR-safe).
  React.useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a browser-only API (sessionStorage), not derivable during SSR/initial render.
        setState(JSON.parse(raw));
      } catch {
        // corrupt/old shape — ignore, keep defaults
      }
    }
    hydrated.current = true;
  }, []);

  // Auto-open once on the dashboard's root overview page right after signup — never on other pages/redirects that happen to carry the same query param (e.g. the billing callback).
  React.useEffect(() => {
    if (!hydrated.current) return;
    if (pathname !== "/dashboard") return;
    if (searchParams.get("onboarding") !== "1") return;
    if (sessionStorage.getItem(GREETED_KEY)) return;

    sessionStorage.setItem(GREETED_KEY, "1");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time onboarding greeting gated on a URL param + sessionStorage flag, not a render-loop concern.
    setState((s) => ({ ...s, open: true, messages: [{ role: "assistant", content: greeting(firstName) }] }));
  }, [pathname, searchParams, firstName]);

  React.useEffect(() => {
    if (!hydrated.current) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, streaming]);

  function onPointerDown(e: React.PointerEvent) {
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setHasDragged(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragOffset) return;
    setHasDragged(true);
    const x = Math.min(Math.max(0, e.clientX - dragOffset.x), window.innerWidth - BUBBLE_SIZE);
    const y = Math.min(Math.max(0, e.clientY - dragOffset.y), window.innerHeight - BUBBLE_SIZE);
    setState((s) => ({ ...s, position: { x, y } }));
  }

  function onPointerUp() {
    setDragOffset(null);
    if (!hasDragged) setState((s) => ({ ...s, open: !s.open }));
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const nextMessages: ChatMessage[] = [...state.messages, { role: "user", content: text }];
    setState((s) => ({ ...s, messages: nextMessages }));
    setStreaming(true);

    try {
      const res = await fetch("/api/melvina/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!res.ok || !res.body) throw new Error("Melvina request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setState((s) => ({ ...s, messages: [...s.messages, { role: "assistant", content: "" }] }));

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setState((s) => ({ ...s, messages: [...s.messages.slice(0, -1), { role: "assistant", content: assistantText }] }));
      }
    } catch {
      setState((s) => ({ ...s, messages: [...s.messages, { role: "assistant", content: "Sorry, I couldn't reach the server just now — please try again in a moment." }] }));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      <button
        ref={bubbleRef}
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ left: state.position.x, top: state.position.y }}
        className="fixed z-50 flex size-14 touch-none items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label={state.open ? "Close Melvina" : "Open Melvina"}
      >
        {state.open ? <Minus className="size-5" /> : <Sparkles className="size-5" />}
      </button>

      {state.open && (
        <Card
          style={{
            left: Math.min(state.position.x, (typeof window !== "undefined" ? window.innerWidth : 400) - 340),
            top: Math.max(16, state.position.y - 440),
          }}
          className="fixed z-50 flex h-[420px] w-80 flex-col overflow-hidden p-0 shadow-2xl sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-2">
              <Avatar name="Melvina" size="sm" />
              <div>
                <p className="text-sm font-semibold text-foreground">Melvina</p>
                <p className="text-[11px] text-foreground-muted">Guide &amp; support</p>
              </div>
            </div>
            <button onClick={() => setState((s) => ({ ...s, open: false }))} className="rounded-md p-1.5 text-foreground-muted hover:bg-surface" aria-label="Minimize">
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {state.messages.length === 0 && (
              <p className="whitespace-pre-wrap px-1 text-sm text-foreground-muted">{greeting(firstName)}</p>
            )}
            <div className="flex flex-col gap-3">
              {state.messages.map((m, i) => (
                <div key={i} className={cn("max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm", m.role === "user" ? "ml-auto bg-accent text-accent-foreground" : "bg-surface-muted text-foreground")}>
                  {m.content || (streaming && i === state.messages.length - 1 ? "…" : "")}
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="flex items-center gap-2 border-t border-border p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Melvina anything…"
              className="flex-1 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              disabled={streaming}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </Card>
      )}
    </>
  );
}
