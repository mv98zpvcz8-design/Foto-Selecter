// Edge Functions aren't Node.js — there's no ambient `process` type there,
// even though Vercel's Edge runtime does populate `process.env` at runtime
// for reading configured environment variables. Reading it via globalThis
// with an inline cast avoids depending on @types/node's global `process`
// declaration, which isn't available in the edge build's type-checking
// environment (confirmed via a real Vercel build failure: TS2591 "Cannot
// find name 'process'").
function readEnv(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

/** Reads a required server-side secret; throws loudly instead of silently proceeding with an empty value. */
export function requiredEnv(name: string): string {
  const value = readEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
