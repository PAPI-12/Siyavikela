export async function roomRequest({ room, body } = {}) {
  let res, payload;
  try {
    res = await fetch(
      room ? `/api/rooms?room=${encodeURIComponent(room)}` : "/api/rooms",
      {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    payload = await res.json();
  } catch {
    throw new Error(
      "Could not reach the shared session. Check your connection and try again.",
    );
  }
  if (!res.ok) {
    const err = new Error(
      payload.error || "The shared session is unavailable.",
    );
    err.code = payload.code;
    err.latest = payload.latest;
    err.status = res.status;
    throw err;
  }
  return payload;
}
