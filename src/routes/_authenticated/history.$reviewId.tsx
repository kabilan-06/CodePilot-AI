import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewDetail } from "@/components/review-detail";
import { downloadFile, reviewQuery, toMarkdown } from "@/lib/reviews";
import { ArrowLeft, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history/$reviewId")({
  head: () => ({
    meta: [
      { title: "Review detail — CodePilot AI" },
      {
        name: "description",
        content: "Full AI review breakdown with findings, fixes and quality scores.",
      },
      { property: "og:title", content: "Review detail — CodePilot AI" },
      { property: "og:description", content: "Full AI review breakdown with findings and fixes." },
    ],
  }),
  component: ReviewDetailPage,
});

function ReviewDetailPage() {
  const { reviewId } = Route.useParams();
  const { data, isLoading, error } = useQuery(reviewQuery(reviewId));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">
            <ArrowLeft className="size-4" />
            Back to history
          </Link>
        </Button>
        {data && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadFile(`${data.title.replace(/\s+/g, "-")}.md`, toMarkdown(data))}
          >
            <Download className="size-4" />
            Export report
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading review…</p>}
      {error && (
        <Card className="glass-panel p-8 text-center text-sm text-muted-foreground">
          This review could not be found.
        </Card>
      )}
      {data && (
        <>
          <ReviewDetail review={data} />
          <Card className="glass-panel p-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Reviewed code</h3>
            <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs">
              {data.code}
            </pre>
          </Card>
        </>
      )}
    </div>
  );
}
