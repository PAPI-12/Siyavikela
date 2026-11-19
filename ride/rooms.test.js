import test from "node:test";
import assert from "node:assert/strict";
import { memoryRooms, roomPattern, roomService } from "../server/rooms.js";
import { newBooking, stages } from "./state.js";

const create = (svc) => svc({ method: "POST", body: { operation: "create" } });
const get = (svc, room) => svc({ room });
const act = (svc, current, role, action, driver) =>
  svc({
    method: "POST",
    body: {
      operation: "act",
      room: current.room,
      revision: current.revision,
      role,
      driver,
      action,
    },
  });

test("a shared test works across four clients and requires staff permission to dispatch the return", async () => {
  const store = memoryRooms();
  const donor = roomService(store),
    staff = roomService(store),
    ops = roomService(store),
    driver = roomService(store);
  const created = await create(donor);
  assert.equal(created.status, 201);
  assert.match(created.body.room, roomPattern);
  const { room } = created.body;
  const booked = await act(donor, created.body, "donor", {
    type: "book",
    values: newBooking(),
    origin: "Staff-assisted",
  });
  assert.equal(booked.status, 200);
  const id = booked.body.bookingId;
  const snapshot = await get(staff, room);
  assert.equal(snapshot.body.state.bookings[0].id, id);
  assert.equal(snapshot.body.state.bookings[0].origin, "Donor self-booked");
  const outbound = await act(ops, snapshot.body, "ops", {
    type: "assign",
    id,
    leg: "outbound",
    driver: "sipho",
    actor: "SANBS Staff",
  });
  assert.equal(outbound.status, 200);
  assert.equal(
    outbound.body.state.bookings[0].history.at(-1).actor,
    "Transport Operations",
  );
  async function advance(leg, who) {
    for (const expected of stages) {
      const latest = await get(driver, room);
      const result = await act(
        driver,
        latest.body,
        "driver",
        { type: "advance", id, leg, driver: who, expected },
        who,
      );
      assert.equal(result.status, 200, result.body.error);
    }
  }
  const steal = await act(
    driver,
    outbound.body,
    "driver",
    {
      type: "advance",
      id,
      leg: "outbound",
      driver: "sipho",
      expected: "assigned",
    },
    "lerato",
  );
  assert.equal(steal.status, 403);
  await advance("outbound", "sipho");
  let latest = (await get(staff, room)).body;
  assert.equal(latest.state.bookings[0].return, null);
  assert.equal(
    (await act(ops, latest, "ops", { type: "authorise", id })).status,
    403,
  );
  const checked = await act(staff, latest, "staff", { type: "checkin", id });
  assert.equal(checked.status, 200);
  assert.equal(checked.body.state.bookings[0].return, null);
  const ready = await act(staff, checked.body, "staff", {
    type: "authorise",
    id,
  });
  assert.equal(ready.status, 200);
  assert.equal(
    (await get(donor, room)).body.state.bookings[0].return.state,
    "queued",
  );
  const returnRide = await act(ops, ready.body, "ops", {
    type: "assign",
    id,
    leg: "return",
    driver: "lerato",
  });
  assert.equal(returnRide.status, 200);
  await advance("return", "lerato");
  for (const svc of [donor, staff, ops, driver]) {
    latest = (await get(svc, room)).body;
    assert.equal(latest.state.bookings[0].id, id);
    assert.equal(latest.state.bookings[0].return.state, "done");
  }
});

test("concurrent requests cannot overwrite each other, and test rooms are isolated", async () => {
  const svc = roomService(memoryRooms());
  const first = (await create(svc)).body,
    second = (await create(svc)).body;
  assert.notEqual(first.room, second.room);
  const booked = (
    await act(svc, first, "donor", { type: "book", values: newBooking() })
  ).body;
  const a = { type: "assign", id: booked.bookingId, leg: "outbound" };
  const outcomes = await Promise.all([
    act(svc, booked, "ops", { ...a, driver: "sipho" }),
    act(svc, booked, "ops", { ...a, driver: "lerato" }),
  ]);
  assert.deepEqual(outcomes.map((x) => x.status).sort(), [200, 409]);
  assert.equal(
    outcomes.find((x) => x.status === 409).body.latest.revision,
    booked.revision + 1,
  );
  assert.equal((await get(svc, second.room)).body.state.bookings.length, 1);
});

test("invalid or missing sessions are explicit and inputs are whitelisted", async () => {
  assert.equal(
    (await create(roomService(null))).body.code,
    "ROOMS_NOT_CONFIGURED",
  );
  const svc = roomService(memoryRooms());
  const initial = (await create(svc)).body;
  assert.equal((await get(svc, "A".repeat(32))).status, 404);
  assert.equal((await get(svc, "invalid")).status, 400);
  assert.equal(
    (
      await act(svc, initial, "donor", {
        type: "book",
        values: newBooking("nomsa"),
      })
    ).status,
    403,
  );
  assert.equal(
    (await act(svc, initial, "ops", { type: "model", model: "__proto__" }))
      .status,
    400,
  );
  const result = await act(svc, initial, "donor", {
    type: "book",
    values: {
      ...newBooking(),
      requirements: "x".repeat(500),
      arbitrary: "data",
    },
  });
  assert.equal(result.body.state.bookings[0].requirements.length, 400);
  assert.equal(result.body.state.bookings[0].arbitrary, undefined);
});

test("the event stream publishes committed room revisions without exposing the booking", async () => {
  const { createServer } = await import("node:http");
  const { once } = await import("node:events");
  const { roomHttpHandler } = await import("../server/rooms.js");
  const memory = memoryRooms();
  const service = roomService(memory);
  const opening = (await create(service)).body;
  const server = createServer(roomHttpHandler(memory));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    assert.equal(opening.push, true);
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/rooms?room=${opening.room}&watch=1`,
      { signal: controller.signal },
    );
    assert.match(response.headers.get("content-type"), /text\/event-stream/);
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    assert.match((await reader.read()).value, /event: revision\ndata: 0\n\n/);
    const result = await act(service, opening, "donor", {
      type: "book",
      values: newBooking(),
    });
    assert.equal(result.status, 200);
    assert.equal((await reader.read()).value, "event: revision\ndata: 1\n\n");
    await reader.cancel();
  } finally {
    clearTimeout(timeout);
    controller.abort();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
