import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CodePilot AI" },
      {
        name: "description",
        content: "Manage your CodePilot AI profile, display name and account session.",
      },
      { property: "og:title", content: "Settings — CodePilot AI" },
      { property: "og:description", content: "Manage your CodePilot AI profile and account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, github_username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.display_name ?? "");
        setGithubUsername(data?.github_username ?? "");
      });
  }, [user]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: fullName.trim().slice(0, 80) || null,
        github_username: githubUsername.trim().slice(0, 39) || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Could not save your profile");
    else toast.success("Profile updated");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and session.</p>
      </header>

      <Card className="glass-panel p-6">
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled className="font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gh">GitHub username</Label>
            <Input
              id="gh"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="octocat"
              maxLength={39}
              className="font-mono text-sm"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </form>
      </Card>

      <Card className="glass-panel p-6">
        <h2 className="text-sm font-semibold">Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign out of CodePilot AI on this device.
        </p>
        <Button variant="outline" className="mt-4" onClick={signOut}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </Card>
    </div>
  );
}
