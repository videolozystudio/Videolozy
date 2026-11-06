// =============================================================================
// api/projects/[id]/views.js — POST: Increment view count
// Public endpoint — no authentication required.
// Uses Supabase RPC to atomically increment view_count.
//
// Security hardening applied (OWASP Top 10):
//   [A01] CORS header set (POST-only endpoint)
//   [A07] View deduplication migrated from in-memory Map → Upstash Redis
//         (in-memory Map does NOT work across Vercel serverless instances)
//   [A09] Safe error handler — no internal detail leaks
// =============================================================================

import { createClient }           from "@supabase/supabase-js";
import { getRedis }               from "../../_lib/redis.js";
import { sendError }              from "../../_lib/errorHandler.js";
import { getSanitizedSupabaseUrl } from "../../_lib/supabaseUrl.js";

// ---------------------------------------------------------------------------
// Redis-backed view deduplication
// Key: rl:view:{projectId}:{ip}  TTL: 1 hour
// This replaces the previous in-memory Map that was broken on serverless.
// ---------------------------------------------------------------------------
const VIEW_DEDUP_TTL = 3600; // 1 hour in seconds

async function hasViewedRecently(ip, projectId) {
  const key = `view:${projectId}:${ip}`;
  try {
    const redis  = getRedis();
    // SET key 1 EX 3600 NX  — only sets if NOT already present
    const result = await redis.set(key, 1, { ex: VIEW_DEDUP_TTL, nx: true });
    // result === "OK" → first view (key was NOT present) → count it
    // result === null  → already viewed within window → skip
    return result === null;
  } catch (err) {
    console.error("[views.js] Redis dedup error — allowing view:", err.message);
    return false; // fail open
  }
}

export default async function handler(req, res) {
  // [A01] CORS — only POST allowed, open origin (public endpoint)
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed." });

  const { id } = req.query;

  // [A04] Validate UUID or demo ID
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isDemo = typeof id === "string" && id.startsWith("demo-showcase-");
  if (!id || (!UUID_RE.test(id) && !isDemo)) {
    return res.status(400).json({ error: "Invalid project ID." });
  }

  if (isDemo) {
    return res.status(200).json({ message: "Demo view counted." });
  }

  // [A07] Redis-backed deduplication (works across all Vercel instances)
  const clientIp = (req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || "unknown";
  const alreadyCounted = await hasViewedRecently(clientIp, id);
  if (alreadyCounted) {
    return res.status(200).json({ message: "View already counted recently." });
  }


  try {
    const url = getSanitizedSupabaseUrl();
    const key = (process.env.SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "");
    const supabase = createClient(
      url,
      key,
      { auth: { persistSession: false } }
    );

    const { error } = await supabase.rpc("increment_view_count", {
      p_project_id: id,
    });

    if (error) throw error;

    return res.status(200).json({ message: "View counted." });

  } catch (err) {
    // [A09] Safe error handler
    return sendError(res, err, "api/projects/[id]/views.js");
  }
}
