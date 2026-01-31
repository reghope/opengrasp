export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
};

export async function getSession(): Promise<{ authenticated: boolean }> {
  const res = await fetch("/api/session", { credentials: "include" });
  if (!res.ok) return { authenticated: false };
  return res.json();
}

export async function login(token: string): Promise<boolean> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token })
  });
  return res.ok;
}

export async function sendChat(message: string): Promise<ChatMessage | null> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message })
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.message ?? null;
}

export async function getDevPreview(): Promise<string | null> {
  const res = await fetch("/api/dev-preview", { credentials: "include" });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.url ?? null;
}
