// =============================================================================
// api/projects/[id]/views.js — POST: Increment view count
// Public endpoint — no authentication required.
// Uses Supabase RPC to atomically increment view_count.
// =============================================================================

import { createClient } from "@supabase/supabase-js";

// Prevent view count spamming: track IPs per project per hour in memory
// In production, use Upstash Redis for distributed rate limiting.
const viewLog = new Map(); // key: `${ip}:${projectId}`, value: timestamp

function hasViewedRecently(ip, projectId) {
  const key       = `${ip}:${projectId}`;
  const lastSeen  = viewLog.get(key);
  const ONE_HOUR  = 60 * 60 * 1000;

  if (lastSeen && Date.now() - lastSeen < ONE_HOUR) return true;

  viewLog.set(key, Date.now());

  // Cleanup old entries to avoid memory leak
  if (viewLog.size > 10_000) {
    const threshold = Date.now() - ONE_HOUR;
    for (const [k, ts] of viewLog.entries()) {
      if (ts < threshold) viewLog.delete(k);
    }
  }

  return false;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const { id } = req.query;

  // Validate UUID
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }

  // De-duplicate views from the same IP within 1 hour
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (hasViewedRecently(clientIp, id)) {
    return res.status(200).json({ message: "View already counted recently." });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    // Call the atomic RPC function defined in the SQL migration
    const { error } = await supabase.rpc("increment_view_count", {
      p_project_id: id,
    });

    if (error) throw error;

    return res.status(200).json({ message: "View counted." });

  } catch (err) {
    console.error("[views.js] Error:", err.message);
    return res.status(500).json({ error: "Failed to increment view count." });
  }
}
