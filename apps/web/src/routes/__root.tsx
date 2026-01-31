import { createRootRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { Tabs } from "../components/ui/tabs";
import { useEffect, useMemo, useState } from "react";
import { getSession } from "../lib/api";

export const Route = createRootRoute({
  component: RootLayout
});

function RootLayout() {
  const location = useRouterState({ select: (state) => state.location.pathname });
  const [auth, setAuth] = useState<"unknown" | "ok" | "required">("unknown");

  useEffect(() => {
    getSession()
      .then((res) => setAuth(res.authenticated ? "ok" : "required"))
      .catch(() => setAuth("required"));
  }, [location]);

  const tabValue = useMemo(() => {
    if (location.startsWith("/dev")) return "dev";
    return "chat";
  }, [location]);

  if (auth === "required" && !location.startsWith("/login")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="rounded-3xl border border-ink-200 bg-white px-8 py-10 text-center shadow-sm">
          <h1 className="font-display text-3xl">OpenGrasp</h1>
          <p className="mt-2 text-sm text-ink-600">Authentication required.</p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-ink-50"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="flex items-center justify-between border-b border-ink-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div>
          <p className="font-display text-2xl">OpenGrasp</p>
          <p className="text-xs text-ink-500">Local AI workspace</p>
        </div>
        <Tabs
          value={tabValue}
          onChange={(value) => {
            if (value === "dev") {
              window.location.href = "/dev";
            } else {
              window.location.href = "/";
            }
          }}
          items={[
            { value: "chat", label: "Chat" },
            { value: "dev", label: "Dev" }
          ]}
        />
      </header>
      <main className="px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
