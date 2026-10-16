import { getBaseUrl } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);

  const robots = `User-agent: *
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: bingbot
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`.trim();

  return new Response(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
