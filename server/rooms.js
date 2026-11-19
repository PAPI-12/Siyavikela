import { randomBytes } from "node:crypto";
import {
  donors,
  drivers,
  models,
  seed,
  sites,
  stages,
  today,
  update,
} from "../ride/state.js";

export const roomPattern = /^[A-Za-z0-9_-]{32}$/;
const ttl = 24 * 60 * 60;
const prefix = "sanbs-ride:room:v1:";
const conflict =
  "Someone updated this session. The latest records are shown; review them and try again.";
const permissions = {
  donor: ["book", "issue"],
  driver: ["advance", "decline", "availability", "issue"],
  staff: ["book", "checkin", "authorise", "assign", "issue"],
  ops: ["assign", "advance", "model", "availability", "issue", "resolve"],
};
const names = {
  donor: "Donor",
  staff: "SANBS Staff",
  ops: "Transport Operations",
};
const timestamp = /^([01]\d|2[0-3]):[0-5]\d$/;
const reference = /^SR-\d{4,8}$/;
const exception = /^EX-\d{13}$/;
const cleanText = (v, max) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const owns = (obj, k) => typeof k === "string" && Object.hasOwn(obj, k);
const matches = (expr, str) => typeof str === "string" && expr.test(str);

class RoomError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function invalid(message = "This session action is not valid.") {
  throw new RoomError(400, message);
}
function forbidden() {
  throw new RoomError(
    403,
    "This action is not available to the selected demo role.",
  );
}

// Centralise the role/action rules so the shared endpoint doesn't trust a client-supplied actor or record.
export function prepareAction(state, { role, driver, action: a }) {
  if (!owns(permissions, role) || !a || !permissions[role].includes(a.type))
    forbidden();
  if (role === "driver" && !owns(drivers, driver))
    invalid("Select a demo driver.");
  const actor = role === "driver" ? drivers[driver].name : names[role];
  const type = a.type;
  if (type === "book") {
    const v = a.values;
    if (
      !v ||
      !owns(donors, v.donor) ||
      !owns(sites, v.site) ||
      !matches(timestamp, v.time) ||
      !matches(timestamp, v.pickupAt) ||
      typeof v.needsReturn !== "boolean"
    )
      invalid("Complete the required booking details.");
    if (role === "donor" && v.donor !== "thabo") forbidden();
    if (v.date !== today()) invalid("Choose today’s demo appointment.");
    if (state.bookings.length >= 50)
      invalid(
        "This test session has reached its booking limit. Create a fresh one to continue.",
      );
    const values = {
      donor: v.donor,
      site: v.site,
      date: v.date,
      time: v.time,
      pickupAt: v.pickupAt,
      needsReturn: v.needsReturn,
      pickup: cleanText(v.pickup, 150),
      phone: cleanText(v.phone, 26),
      notes: cleanText(v.notes, 400),
      requirements: cleanText(v.requirements, 400),
    };
    return {
      type,
      values,
      origin: role === "staff" ? "Staff-assisted" : "Donor self-booked",
    };
  }
  if (type === "model") {
    if (!owns(models, a.model)) invalid();
    return { type, model: a.model };
  }
  if (type === "resolve") {
    if (!matches(exception, a.issue)) invalid();
    return { type, issue: a.issue };
  }
  if (type === "availability") {
    if (!owns(drivers, a.driver)) invalid();
    if (role === "driver" && driver !== a.driver) forbidden();
    return { type, driver: a.driver };
  }
  const id = a.id || null;
  if (id !== null && !matches(reference, id)) invalid();
  if (!id && !(type === "issue" && role === "donor")) invalid();
  const b = state.bookings.find((x) => x.id === id);
  if (id && !b) invalid("The booking no longer exists.");
  if (role === "donor" && b && b.donor !== "thabo") forbidden();
  if (type === "checkin" || type === "authorise") return { type, id };
  const leg = a.leg || null;
  if (leg !== null && !["outbound", "return"].includes(leg)) invalid();
  const t = b?.[leg];
  if ((type !== "issue" || id) && !t)
    invalid("This trip is not available yet.");
  if (role === "driver" && t?.driver !== driver) forbidden();
  if (type === "issue") {
    const label = cleanText(a.label, 80);
    if (!label) invalid("Choose an issue.");
    if (state.issues.length >= 100)
      invalid("This test session has reached its exception limit.");
    if (role === "driver" && ["done", "delivered"].includes(t.state))
      invalid("This assignment is already complete.");
    return { type, id, leg, label, detail: cleanText(a.detail, 500), actor };
  }
  if (!owns(drivers, a.driver)) invalid("Choose a driver.");
  if (role === "driver" && a.driver !== driver) forbidden();
  if (type === "advance") {
    if (!stages.includes(a.expected)) invalid();
    if (role === "ops" && drivers[t.driver]?.type !== "Transport partner")
      forbidden();
    return {
      type,
      id,
      leg,
      driver: a.driver,
      expected: a.expected,
      actor: role === "ops" ? "Transport partner (simulated)" : actor,
    };
  }
  return { type, id, leg, driver: a.driver, actor };
}

const compareAndSwap = `local raw = redis.call('GET', KEYS[1]); if not raw then return 0 end; if cjson.decode(raw).revision ~= tonumber(ARGV[1]) then return 0 end; local remaining = redis.call('PTTL', KEYS[1]); if remaining <= 0 then return 0 end; redis.call('SET', KEYS[1], ARGV[2], 'PX', remaining); return 1`;
export function redisRooms(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  async function command(...args) {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`Room datastore request failed: ${r.status}`);
    const payload = await r.json();
    if (payload.error) throw new Error("Room datastore command failed");
    return payload.result;
  }
  return {
    create: async (id, record) =>
      (await command(
        "SET",
        prefix + id,
        JSON.stringify(record),
        "EX",
        ttl,
        "NX",
      )) === "OK",
    get: async (id) => {
      const value = await command("GET", prefix + id);
      return value ? JSON.parse(value) : null;
    },
    write: async (id, revision, record) =>
      (await command(
        "EVAL",
        compareAndSwap,
        1,
        prefix + id,
        revision,
        JSON.stringify(record),
      )) === 1,
  };
}
export function memoryRooms() {
  const cache = new Map();
  const get = (id) => {
    const v = cache.get(id);
    if (v && Date.parse(v.expiresAt) > Date.now()) return structuredClone(v);
    cache.delete(id);
    return null;
  };
  return {
    get: async (id) => get(id),
    create: async (id, record) => {
      if (get(id)) return false;
      cache.set(id, structuredClone(record));
      return true;
    },
    write: async (id, revision, record) => {
      if (get(id)?.revision !== revision) return false;
      cache.set(id, structuredClone(record));
      return true;
    },
  };
}
const response = (status, body) => ({ status, body });
export function roomService(store) {
  return async function service({ method = "GET", room, body }) {
    if (!["GET", "POST"].includes(method))
      return response(405, { error: "Method not allowed." });
    if (!store)
      return response(503, {
        error:
          "Live sessions aren’t configured on this deployment. Connect a Redis store to enable shared testing. Solo demo is still available.",
        code: "ROOMS_NOT_CONFIGURED",
      });
    try {
      if (method === "POST" && body?.operation === "create") {
        const record = {
          room: randomBytes(24).toString("base64url"),
          revision: 0,
          expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
          state: seed(),
          message: "Shared test session created",
        };
        if (!(await store.create(record.room, record)))
          throw new Error("Room identifier collision");
        return response(201, record);
      }
      const id = method === "GET" ? room : body?.room;
      if (!matches(roomPattern, id))
        invalid(
          "This session link is not valid. Ask your organiser for a fresh link.",
        );
      const record = await store.get(id);
      if (!record)
        return response(404, {
          error:
            "This session has expired or could not be found. Ask your organiser for a new link.",
          code: "ROOM_NOT_FOUND",
        });
      if (method === "GET") return response(200, record);
      if (body.operation !== "act" || !Number.isInteger(body.revision))
        invalid();
      if (body.revision !== record.revision)
        return response(409, { error: conflict, latest: record });
      if (record.revision >= 500)
        invalid(
          "This session has reached its update limit. Create a fresh session to continue testing.",
        );
      const action = prepareAction(record.state, body);
      let result;
      try {
        result = update(record.state, action);
      } catch (err) {
        return response(422, { error: err.message });
      }
      const next = { ...record, ...result, revision: record.revision + 1 };
      if (action.type === "book") next.bookingId = `SR-${record.state.next}`;
      else delete next.bookingId;
      if (!(await store.write(id, record.revision, next)))
        return response(409, { error: conflict, latest: await store.get(id) });
      return response(200, next);
    } catch (err) {
      if (err instanceof RoomError)
        return response(err.status, { error: err.message });
      console.error("SANBS RIDE room operation failed:", err.message);
      return response(503, {
        error:
          "The shared session isn’t responding. Check your connection and try again.",
      });
    }
  };
}

const maxBytes = 8192;
async function bodyFrom(req) {
  if (req.body !== undefined) {
    const text =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!text || Buffer.byteLength(text) > maxBytes)
      throw new RoomError(413, "The request is too large.");
    return JSON.parse(text);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new RoomError(413, "The request is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
export function roomHttpHandler(store) {
  const service = roomService(store);
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Referrer-Policy", "no-referrer");
    let result;
    try {
      if (
        req.method === "POST" &&
        !/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")
      )
        throw new RoomError(415, "Send session actions as JSON.");
      result = await service({
        method: req.method,
        room: new URL(req.url, "http://localhost").searchParams.get("room"),
        body: req.method === "POST" ? await bodyFrom(req) : undefined,
      });
    } catch (err) {
      result = response(err.status || 400, {
        error: err.status ? err.message : "The request contains invalid JSON.",
      });
    }
    res.statusCode = result.status;
    if (result.status === 405) res.setHeader("Allow", "GET, POST");
    res.end(JSON.stringify(result.body));
  };
}
