/**
 * Single place for DATABASE_URL normalization so Prisma CLI and the app use the same URL.
 * - Trims whitespace/newlines
 * - URL-encodes the password (fixes "invalid port" when password has : or @)
 * - If DATABASE_USE_POOLER is set, replaces port 5432 with 6543 (Supabase pooler)
 */
export function getDatabaseUrl(): string {
  const raw = (
    process.env.DATABASE_URL ??
    'postgresql://localhost:5432/placeholder'
  ).trim();

  const match = raw.match(/^(postgres(?:ql)?:\/\/)([^@]+)@(.+)$/);
  if (!match) return raw;

  const [, protocol, userPass, hostPortPath] = match;
  const colonIdx = userPass.indexOf(':');
  if (colonIdx === -1) return raw;

  const user = userPass.slice(0, colonIdx);
  const password = userPass.slice(colonIdx + 1);
  const encodedPassword = encodeURIComponent(password);
  let url = `${protocol}${user}:${encodedPassword}@${hostPortPath}`;

  if (process.env.DATABASE_USE_POOLER === 'true' || process.env.DATABASE_USE_POOLER === '1') {
    url = url.replace(/:5432\//, ':6543/');
  }

  return url;
}
