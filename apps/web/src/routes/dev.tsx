import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { getDevPreview } from "../lib/api";

export const Route = createFileRoute("/dev")({
  component: DevPage
});

function DevPage() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const next = await getDevPreview();
    setUrl(next);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl">Dev Preview</h2>
          <p className="text-sm text-ink-600">See the local dev server OpenGrasp detects.</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button onClick={refresh} variant="outline">
              Refresh
            </Button>
            <span className="text-xs text-ink-500">
              {loading ? "Scanning local ports..." : url ? `Detected ${url}` : "No dev server detected"}
            </span>
          </div>
          <div className="mt-6 h-[70vh] overflow-hidden rounded-2xl border border-ink-200 bg-white">
            {url ? (
              <iframe title="Dev preview" src={url} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-500">
                Start your dev server and refresh.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
