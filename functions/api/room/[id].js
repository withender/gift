const ROOM_RE = /^[a-zA-Z0-9_-]{4,32}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function parseJsonArray(raw, maxLen = 50) {
  let arr;
  try {
    arr = JSON.parse(raw || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;
  return arr
    .filter((s) => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length >= 1 && s.length <= 120)
    .slice(0, maxLen);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const roomId = params.id;

  if (!ROOM_RE.test(roomId || "")) {
    return json({ error: "invalid room id" }, 400);
  }

  if (!env.DB) {
    return json({ error: "database not configured" }, 503);
  }

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT items, drawn, updated_at FROM gift_rooms WHERE room_id = ?"
    )
      .bind(roomId)
      .first();

    if (!row) {
      return json({ room_id: roomId, items: [], drawn: [], updated_at: 0 });
    }

    return json({
      room_id: roomId,
      items: parseJsonArray(row.items) || [],
      drawn: parseJsonArray(row.drawn) || [],
      updated_at: row.updated_at,
    });
  }

  if (request.method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }

    const items = parseJsonArray(JSON.stringify(body.items ?? []));
    const drawn = parseJsonArray(JSON.stringify(body.drawn ?? []));
    if (!items || !drawn) {
      return json({ error: "invalid items or drawn" }, 400);
    }

    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO gift_rooms (room_id, items, drawn, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(room_id) DO UPDATE SET
         items = excluded.items,
         drawn = excluded.drawn,
         updated_at = excluded.updated_at`
    )
      .bind(roomId, JSON.stringify(items), JSON.stringify(drawn), now)
      .run();

    return json({ ok: true, room_id: roomId, updated_at: now });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return json({ error: "method not allowed" }, 405);
}
