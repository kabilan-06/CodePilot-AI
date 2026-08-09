import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/github/file')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const fileUrl = url.searchParams.get('url')

        if (!fileUrl) {
          return new Response(
            JSON.stringify({ error: 'Missing url parameter' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        // Convert GitHub blob URL to raw URL
        const rawUrl = fileUrl
          .replace('https://github.com/', 'https://raw.githubusercontent.com/')
          .replace('/blob/', '/')

        const response = await fetch(rawUrl)

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch GitHub file' }),
            {
              status: response.status,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        const content = await response.text()

        return new Response(JSON.stringify({ content }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})