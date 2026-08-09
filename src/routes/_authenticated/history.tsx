import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteReview, reviewsQuery } from "@/lib/reviews";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Review history — CodePilot AI" },
      {
        name: "description",
        content: "Search, filter and revisit every AI code review you have run.",
      },
      { property: "og:title", content: "Review history — CodePilot AI" },
      {
        property: "og:description",
        content: "Search and revisit every AI code review you have run.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const queryClient = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery(reviewsQuery);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const [grade, setGrade] = useState("all");

  const languages = useMemo(
    () => Array.from(new Set(reviews.map((r) => r.language))).sort(),
    [reviews],
  );

  const filtered = reviews.filter((review) => {
    const matchesSearch = review.title.toLowerCase().includes(search.trim().toLowerCase());
    const matchesLanguage = language === "all" || review.language === language;
    const matchesGrade = grade === "all" || review.grade === grade;
    return matchesSearch && matchesLanguage && matchesGrade;
  });

  const remove = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review deleted");
    },
    onError: () => toast.error("Could not delete that review"),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Review history</h1>
        <p className="mt-1 text-sm text-muted-foreground">{reviews.length} reviews stored.</p>
      </header>

      <Card className="glass-panel flex flex-col gap-3 p-4 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title"
          className="sm:max-w-xs"
        />
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {languages.map((item) => (
              <SelectItem key={item} value={item} className="font-mono text-xs">
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            {["A+", "A", "B", "C", "D"].map((item) => (
              <SelectItem key={item} value={item} className="font-mono text-xs">
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <Card className="glass-panel p-10 text-center">
            <p className="text-sm text-muted-foreground">No reviews match these filters.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/review">Run a review</Link>
            </Button>
          </Card>
        )}
        {filtered.map((review) => (
          <Card key={review.id} className="glass-panel flex-row items-center gap-4 p-4">
            <Link
              to="/history/$reviewId"
              params={{ reviewId: review.id }}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-sm font-medium">{review.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {review.language}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {review.source}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {review.issues.length} findings · {new Date(review.created_at).toLocaleString()}
                </span>
              </div>
            </Link>
            <span className="font-mono text-lg font-bold">{review.grade}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete review"
              onClick={() => remove.mutate(review.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
