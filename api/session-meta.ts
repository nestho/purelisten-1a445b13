import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Returns rough client IP + country from Vercel/proxy headers.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const fwd = (req.headers["x-forwarded-for"] as string) || "";
  const ip =
    fwd.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.socket?.remoteAddress ||
    null;

  const country =
    (req.headers["x-vercel-ip-country"] as string) ||
    (req.headers["cf-ipcountry"] as string) ||
    null;

  const userAgent = (req.headers["user-agent"] as string) || null;

  return res.status(200).json({
    ip,
    country,
    userAgent,
  });
}
