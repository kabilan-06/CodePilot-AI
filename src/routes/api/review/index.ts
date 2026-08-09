import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/review/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()

        return new Response(
          JSON.stringify({
            success: true,
            summary: 'AI review endpoint is working.',
            receivedTitle: body.title ?? null,
            language: body.language ?? null,
            codeLength: body.code?.length ?? 0,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
    },
  },
})