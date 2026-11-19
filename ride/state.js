export const key = "sanbs-ride-v1";
export const today = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const sites = {
  sandton: {
    name: "SANBS Sandton Donor Centre",
    short: "Sandton Donor Centre",
    area: "Sandton City, Sandton",
    type: "Fixed donor centre",
  },
  rosebank: {
    name: "Rosebank Community Blood Drive",
    short: "Rosebank Blood Drive",
    area: "Rosebank, Johannesburg",
    type: "Temporary blood drive",
  },
};
export const donors = {
  thabo: {
    name: "Thabo Mokoena",
    phone: "082 000 0142",
    pickup: "18 Alice Lane, Sandton",
    notes: "Meet me at the main entrance.",
    time: "10:00",
    site: "sandton",
  },
  amira: {
    name: "Amira Patel",
    phone: "082 000 0237",
    pickup: "24 Rivonia Road, Sandton",
    notes: "Use the visitor entrance.",
    time: "11:30",
    site: "sandton",
  },
  nomsa: {
    name: "Nomsa Khumalo",
    phone: "082 000 0176",
    pickup: "9 Keyes Avenue, Rosebank",
    notes: "Wait by the security desk.",
    time: "12:30",
    site: "rosebank",
  },
};
export const drivers = {
  sipho: {
    name: "Sipho Dlamini",
    type: "SANBS fleet",
    vehicle: "Toyota Corolla",
    plate: "KM 48 DV GP",
    phone: "082 000 0421",
  },
  lerato: {
    name: "Lerato Nkosi",
    type: "Independent",
    vehicle: "Hyundai Grand i10",
    plate: "LR 39 PK GP",
    phone: "082 000 0562",
  },
  james: {
    name: "James Peterson",
    type: "Transport partner",
    vehicle: "Toyota Quantum",
    plate: "JP 26 TS GP",
    phone: "082 000 0643",
  },
};
export const models = {
  fleet: "SANBS fleet",
  independent: "Independent drivers",
  partner: "Transport partner",
  hybrid: "Hybrid fleet",
};
export const statuses = {
  queued: "Awaiting assignment",
  assigned: "Driver assigned",
  accepted: "Assignment confirmed",
  enroute: "Driver on the way",
  arrived: "Driver arrived",
  onboard: "Donor in transit",
  delivered: "Arrived at donation site",
  done: "Completed",
};
export const stages = ["assigned", "accepted", "enroute", "arrived", "onboard"];
export const trip = (state = "queued", driver = null, time = "") => ({
  state,
  driver,
  time,
  offer: false,
});
export const at = () => new Date().toISOString();
const event = (text, actor) => ({ text, actor, time: at() });
export function pickupTime(time) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.max(0, h * 60 + m - 35);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function newBooking(donor = "thabo") {
  const p = donors[donor];
  return {
    donor,
    site: p.site,
    date: today(),
    time: p.time,
    pickup: p.pickup,
    phone: p.phone,
    notes: p.notes,
    needsReturn: true,
    requirements: "",
    pickupAt: pickupTime(p.time),
  };
}
function record(values, id, origin) {
  return {
    ...values,
    id,
    origin,
    created: at(),
    checkedIn: null,
    authorised: null,
    outbound: trip("queued", null, values.pickupAt),
    return: null,
    history: [
      event(
        "Transport request submitted",
        origin === "Staff-assisted" ? "SANBS Staff" : "Donor",
      ),
    ],
  };
}
export function seed() {
  const b = record(newBooking("amira"), "SR-1042", "Staff-assisted");
  b.outbound = trip("onboard", "james", "10:55");
  b.history.push(event("Donor picked up", "James Peterson"));
  return {
    next: 1043,
    bookings: [b],
    availability: { sipho: true, lerato: true, james: true },
    model: "hybrid",
    issues: [],
  };
}
export const donorBookings = (s, id = "thabo") =>
  s.bookings.filter((b) => b.donor === id);
export const complete = (b) =>
  b.return?.state === "done" || (!b.needsReturn && !!b.checkedIn);
export const status = (b) =>
  complete(b)
    ? "Journey completed"
    : b.return
      ? {
          ...statuses,
          queued: "Return awaiting assignment",
          assigned: "Return driver assigned",
          accepted: "Return assignment confirmed",
          enroute: "Return driver on the way",
          arrived: "Return driver arrived",
          onboard: "On the way home",
        }[b.return.state]
      : b.checkedIn
        ? "Awaiting return authorisation"
        : statuses[b.outbound.state];
export const returnText = (b) =>
  !b.needsReturn
    ? "Not requested"
    : b.return
      ? statuses[b.return.state]
      : "Awaiting authorisation";
export const legs = (s) =>
  s.bookings.flatMap((b) =>
    ["outbound", "return"].filter((k) => b[k]).map((k) => ({ b, k, t: b[k] })),
  );
export const isBusy = (s, id) =>
  legs(s).some(
    ({ t }) => t.driver === id && !["done", "delivered"].includes(t.state),
  );
export const eligible = (s, id) =>
  s.model === "hybrid" ||
  drivers[id]?.type ===
    {
      fleet: "SANBS fleet",
      independent: "Independent",
      partner: "Transport partner",
    }[s.model];
export const available = (s, id) =>
  !!s.availability[id] && !isBusy(s, id) && eligible(s, id);
export function update(s, action) {
  const next = structuredClone(s),
    a = action;
  const b = next.bookings.find((x) => x.id === a.id),
    t = b?.[a.leg];
  const log = (label, actor) => b?.history.push(event(label, actor));
  const fail = (text) => {
    throw new Error(text);
  };
  let message = "";
  switch (a.type) {
    case "book": {
      const v = a.values;
      if (
        !donors[v.donor] ||
        !sites[v.site] ||
        !v.date ||
        !v.time ||
        !v.pickupAt ||
        !v.pickup?.trim() ||
        !v.phone?.trim()
      )
        fail("Complete the required booking details.");
      if (
        next.bookings.some(
          (x) =>
            x.donor === v.donor &&
            ((x.date === v.date && x.site === v.site && x.time === v.time) ||
              !complete(x)),
        )
      )
        fail(
          "This donor already has a booking for this appointment or an active journey. Open the existing record instead.",
        );
      const newRecord = record(v, `SR-${next.next++}`, a.origin);
      next.bookings.unshift(newRecord);
      message = `${newRecord.id} · Transport requested`;
      break;
    }
    case "model":
      if (!models[a.model]) fail("Choose a valid operating model.");
      next.model = a.model;
      message = `${models[a.model]} model selected`;
      break;
    case "availability":
      if (!drivers[a.driver]) fail("Choose a driver.");
      if (isBusy(next, a.driver) && next.availability[a.driver])
        fail("Finish or hand over the active assignment before going offline.");
      next.availability[a.driver] = !next.availability[a.driver];
      message = next.availability[a.driver]
        ? "Driver is now available"
        : "Driver is now offline";
      break;
    case "assign":
      if (
        !t ||
        !["queued", "assigned", "accepted", "enroute", "arrived"].includes(
          t.state,
        )
      )
        fail("This trip cannot be reassigned at its current stage.");
      if (!available(next, a.driver))
        fail("This driver is not available in the current operating model.");
      t.driver = a.driver;
      t.state = "assigned";
      t.offer = drivers[a.driver].type === "Independent";
      log(
        `${a.leg === "return" ? "Return" : "Outbound"} ${t.offer ? "offered to" : "assigned to"} ${drivers[a.driver].name}`,
        a.actor || "Transport Operations",
      );
      message = `${drivers[a.driver].name} ${t.offer ? "received the trip offer" : "assigned"}`;
      break;
    case "decline":
      if (!t || t.driver !== a.driver || !t.offer || t.state !== "assigned")
        fail("This trip offer is no longer available.");
      log(`${drivers[a.driver].name} declined the trip`, "Driver");
      t.driver = null;
      t.state = "queued";
      t.offer = false;
      message = "Trip returned to dispatch";
      break;
    case "advance": {
      const index = stages.indexOf(t?.state);
      if (index < 0 || t.driver !== a.driver || t.state !== a.expected)
        fail("This assignment has changed. Check the latest trip status.");
      t.state =
        stages[index + 1] || (a.leg === "return" ? "done" : "delivered");
      const label =
        t.state === "onboard"
          ? a.leg === "return"
            ? "Donor on the way home"
            : "Donor picked up"
          : t.state === "done"
            ? "Return trip completed"
            : statuses[t.state];
      log(label, a.actor || drivers[a.driver].name);
      message = label;
      break;
    }
    case "checkin":
      if (b?.outbound.state !== "delivered" || b.checkedIn)
        fail(
          "The driver must report arrival before staff can check in the donor.",
        );
      b.checkedIn = at();
      log("Donation site arrival acknowledged", "SANBS Staff");
      message = b.needsReturn
        ? "Donor checked in"
        : "Donor checked in · Journey completed";
      break;
    case "authorise":
      if (!b?.checkedIn || !b.needsReturn || b.return)
        fail("Check the donor in before authorising a requested return.");
      b.authorised = at();
      b.return = trip("queued", null, "As soon as possible");
      log("Donor confirmed ready for return", "SANBS Staff");
      message = "Return authorised · Sent to dispatch";
      break;
    case "issue":
      if (a.id && !b) fail("Booking no longer exists.");
      if (!a.label) fail("Choose an issue.");
      next.issues.unshift({
        id: `EX-${Date.now()}`,
        booking: a.id || null,
        leg: a.leg || null,
        label: a.label,
        detail: a.detail || "",
        actor: a.actor,
        time: at(),
        resolved: null,
      });
      log(`Reported: ${a.label}`, a.actor);
      message = "Issue reported to Transport Operations";
      break;
    case "resolve": {
      const i = next.issues.find((x) => x.id === a.issue);
      if (!i || i.resolved) fail("This exception is already closed.");
      i.resolved = at();
      next.bookings
        .find((x) => x.id === i.booking)
        ?.history.push(event(`Resolved: ${i.label}`, "Transport Operations"));
      message = "Exception marked resolved";
      break;
    }
    default:
      fail("This action is unavailable.");
  }
  return { state: next, message };
}
