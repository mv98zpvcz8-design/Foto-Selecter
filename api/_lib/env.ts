/** Reads a required server-side secret; throws loudly instead of silently proceeding with an empty value. */
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
