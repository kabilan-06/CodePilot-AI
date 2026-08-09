import { createFileRoute } from "@tanstack/react-router";

function back(origin: string, status: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/repositories?github=${status}` },
  });
}

export const Route = createFileRoute("/api/public/github/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (url.searchParams.get("error") || !code || !state) {
          return back(origin, "denied");
        }

        const { verifyState, exchangeCodeForToken, githubFetch, saveConnection } =
          await import("@/lib/github.server");

        const userId = verifyState(state);
        if (!userId) return back(origin, "invalid_state");

        try {
          const { accessToken, scope } = await exchangeCodeForToken(origin, code);
          const profile = await githubFetch<{ login: string; id: number; avatar_url: string }>(
            accessToken,
            "user",
          );
          await saveConnection(userId, {
            github_login: profile.login,
            github_id: profile.id,
            avatar_url: profile.avatar_url,
            scope,
            accessToken,
          });
          return back(origin, "connected");
        } catch (error) {
          console.error("GitHub OAuth callback failed", error);
          return back(origin, "failed");
        }
      },
    },
  },
});
