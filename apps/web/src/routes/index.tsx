import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { sendChat, type ChatMessage } from "../lib/api";

export const Route = createFileRoute("/")({
  component: ChatPage
});

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      createdAt: Date.now()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setBusy(true);
    const response = await sendChat(userMessage.content);
    if (response) {
      setMessages((prev) => [...prev, response]);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl">Install OpenGrasp</h2>
          <p className="text-sm text-ink-600">Windows quick install commands.</p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">PowerShell</p>
            <code className="mt-2 block rounded-xl bg-white px-3 py-2 text-xs text-ink-800 shadow-sm">
              iwr -useb https://opengrasp.com/install.ps1 | iex
            </code>
          </div>
          <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Windows CMD</p>
            <code className="mt-2 block rounded-xl bg-white px-3 py-2 text-xs text-ink-800 shadow-sm">
              curl -fsSL https://opengrasp.com/install.cmd -o install.cmd && install.cmd && del install.cmd
            </code>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl">Conversation</h2>
          <p className="text-sm text-ink-600">Chat with the local OpenGrasp agent.</p>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[320px] flex-col gap-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 p-6 text-sm text-ink-500">
                Start a conversation. Memory files are loaded automatically.
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${msg.createdAt}-${index}`}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "self-end bg-ink-900 text-ink-50"
                      : msg.role === "assistant"
                        ? "bg-white shadow-sm"
                        : "bg-ink-100"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide opacity-60">{msg.role}</p>
                  <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 flex gap-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask OpenGrasp to plan, build, or remember..."
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSend();
              }}
            />
            <Button onClick={handleSend} disabled={busy}>
              {busy ? "Thinking" : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
