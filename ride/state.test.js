import test from "node:test";
import assert from "node:assert/strict";
import {
  available,
  complete,
  donorBookings,
  legs,
  newBooking,
  seed,
  stages,
  status,
  today,
  update,
} from "./state.js";

const apply = (s, action) => update(s, action).state;
const book = (s, v = newBooking(), origin = "Donor self-booked") =>
  apply(s, { type: "book", values: v, origin });
const thabo = (s) => donorBookings(s)[0];
const assign = (s, leg = "outbound", driver = "sipho", id = thabo(s).id) =>
  apply(s, { type: "assign", id, leg, driver });
const progress = (s, leg = "outbound", driver = "sipho") =>
  stages.reduce(
    (state, expected) =>
      apply(state, {
        type: "advance",
        id: thabo(state).id,
        leg,
        driver,
        expected,
      }),
    s,
  );

test("seed date is based on Johannesburg time; a separate sample assignment occupies James", () => {
  assert.equal(today(new Date("2026-11-18T22:00:00Z")), "2026-11-19");
  const s = seed();
  assert.equal(donorBookings(s).length, 0);
  assert.equal(legs(s).length, 1);
  assert.ok(available(s, "sipho"));
  assert.ok(available(s, "lerato"));
  assert.ok(!available(s, "james"));
});

test("shared round trip requires explicit staff arrival and readiness; a separate driver can complete return", () => {
  const start = seed();
  let s = book(start);
  const { id } = thabo(s);
  assert.equal(start.bookings.length, 1);
  assert.equal(thabo(s).origin, "Donor self-booked");
  assert.equal(thabo(s).outbound.state, "queued");
  assert.throws(() => apply(s, { type: "checkin", id }), /report arrival/);
  assert.throws(
    () => apply(s, { type: "authorise", id }),
    /Check the donor in/,
  );
  assert.throws(() => assign(s, "return"), /cannot be reassigned/);
  s = assign(s);
  assert.equal(thabo(s).outbound.offer, false);
  assert.throws(
    () =>
      apply(s, {
        type: "advance",
        id,
        leg: "outbound",
        driver: "lerato",
        expected: "assigned",
      }),
    /assignment has changed/,
  );
  assert.throws(
    () =>
      apply(s, {
        type: "advance",
        id,
        leg: "outbound",
        driver: "sipho",
        expected: "arrived",
      }),
    /assignment has changed/,
  );
  s = progress(s);
  assert.equal(status(thabo(s)), "Arrived at donation site");
  s = apply(s, { type: "checkin", id });
  assert.equal(thabo(s).return, null);
  assert.equal(status(thabo(s)), "Awaiting return authorisation");
  s = apply(s, { type: "authorise", id });
  assert.ok(thabo(s).authorised);
  assert.equal(thabo(s).history.at(-1).actor, "SANBS Staff");
  assert.equal(thabo(s).return.state, "queued");
  assert.throws(
    () => apply(s, { type: "authorise", id }),
    /Check the donor in/,
  );
  s = assign(s, "return", "lerato");
  assert.equal(thabo(s).return.offer, true);
  assert.equal(status(thabo(s)), "Return driver assigned");
  s = progress(s, "return", "lerato");
  assert.equal(status(thabo(s)), "Journey completed");
  assert.ok(complete(thabo(s)));
  assert.ok(available(s, "lerato"));
});

test("staff bookings use the same records, and a duplicate request is rejected", () => {
  let s = book(
    seed(),
    { ...newBooking(), needsReturn: false },
    "Staff-assisted",
  );
  const { id, origin } = thabo(s);
  assert.equal(origin, "Staff-assisted");
  assert.throws(() => book(s), /already has a booking/);
  s = apply(progress(assign(s)), { type: "checkin", id });
  assert.ok(complete(thabo(s)));
  assert.throws(() => apply(s, { type: "authorise", id }), /requested return/);
});

test("operating models and availability constrain dispatch; declined offers release a car and requeue the leg", () => {
  let s = book(seed());
  s = apply(s, { type: "model", model: "independent" });
  assert.throws(() => assign(s), /not available/);
  s = apply(s, { type: "availability", driver: "lerato" });
  assert.throws(() => assign(s, "outbound", "lerato"), /not available/);
  s = apply(s, { type: "availability", driver: "lerato" });
  s = assign(s, "outbound", "lerato");
  assert.ok(!available(s, "lerato"));
  assert.throws(
    () => apply(s, { type: "availability", driver: "lerato" }),
    /before going offline/,
  );
  s = apply(s, {
    type: "decline",
    id: thabo(s).id,
    leg: "outbound",
    driver: "lerato",
  });
  assert.equal(thabo(s).outbound.state, "queued");
  assert.ok(available(s, "lerato"));
});

test("driver issues and operations resolution both append to the booking history", () => {
  let s = assign(book(seed()));
  s = apply(s, {
    type: "issue",
    id: thabo(s).id,
    leg: "outbound",
    label: "Traffic delay",
    actor: "Sipho Dlamini",
  });
  assert.equal(s.issues[0].leg, "outbound");
  assert.equal(thabo(s).history.at(-1).text, "Reported: Traffic delay");
  s = apply(s, { type: "resolve", issue: s.issues[0].id });
  assert.ok(s.issues[0].resolved);
  assert.equal(thabo(s).history.at(-1).actor, "Transport Operations");
});
