import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { login } from "../lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage
});

function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const ok = await login(token.trim());
    if (!ok) {
      setError("Login failed. Check the gateway token.");
      setBusy(false);
      return;
    }
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="font-display text-2xl">Gateway Login</h2>
          <p className="text-sm text-ink-600">Paste your OpenGrasp token to continue.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Gateway token"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? "Signing in" : "Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
