import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireVendor } from "../_auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const vendor = requireVendor(req, res);
  if (!vendor) return;

  res.status(200).json({ vendor });
}
