import { map } from "./map.js";
import {
  today,
  sites,
  donors,
  drivers,
  donorBookings,
  legs,
  isBusy,
  status,
  complete,
  stages,
  returnText,
} from "./state.js";
import {
  i,
  esc,
  button,
  arrow,
  chip,
  bookingChip,
  tripChip,
  dateText,
  iconBox,
  routeList,
  dividerTitle,
  initials,
  empty,
  place,
} from "./ui.js";

export const donorNav = [
  ["home", "Home", "house"],
  ["journey", "My Journey", "route"],
  ["profile", "Profile", "user-round"],
];
export const driverNav = [
  ["home", "Workday", "layout-dashboard"],
  ["trips", "My trips", "route"],
  ["profile", "Profile", "user-round"],
];
export function navLinks(nav, current) {
  return nav
    .map(
      ([id, label, ic]) =>
        `<button data-action="nav" data-view="${id}" class="nav-link ${current === id ? "selected" : ""}" ${current === id ? 'aria-current="page"' : ""}>${i(ic, 19)}<span>${label}</span></button>`,
    )
    .join("");
}
function appointment(b) {
  const site = sites[b.site];
  return `<section class="appointment panel"><div class="appointment-label">${iconBox("calendar-days", "tint")}<span>UPCOMING APPOINTMENT</span></div><h2>${esc(site.name)}</h2><p class="location-line">${i("map-pin", 15)} ${esc(site.area)}</p><div class="appointment-meta"><div>${i("calendar-days", 17)}<p><small>Date</small><strong>${dateText(b.date, { weekday: "short", day: "numeric", month: "long" })}</strong></p></div><div>${i("clock-3", 17)}<p><small>Appointment time</small><strong>${b.time} SAST</strong></p></div></div></section>`;
}
const shortDate = () =>
  dateText(today(), { weekday: "long", day: "numeric", month: "long" });
const datePill = () =>
  `<span class="today-pill">${i("calendar-days", 16)} ${shortDate()}</span>`;
function mapPanel(
  b,
  { zoom = 1, active = false, progress = 0, reverse = false } = {},
) {
  return `<section class="panel map-panel"><div class="map-heading"><div><h2>${active || reverse ? "Journey route" : "Transport preview"}</h2><p>${active ? "Follow the progress of this trip." : reverse ? "Your return route from the donor centre." : "A preview of your ride to the donor centre."}</p></div><span class="map-heading-icon">${i("map", 20)}</span></div><div class="map-wrap">${map({ site: b.site, zoom, active, progress, reverse })}<div class="map-controls"><button aria-label="Zoom in" data-action="zoom" data-delta=".2" ${zoom >= 1.4 ? "disabled" : ""}>${i("plus", 18)}</button><button aria-label="Zoom out" data-action="zoom" data-delta="-.2" ${zoom <= 1 ? "disabled" : ""}>${i("minus", 18)}</button></div></div><div class="map-footer"><div><span class="legend-dot pickup"></span><p><small>Pickup</small><strong>${esc(reverse ? place(b).short : b.pickup)}</strong></p></div><div><span class="legend-dot"></span><p><small>Destination</small><strong>${esc(reverse ? b.pickup : place(b).short)}</strong></p></div></div></section>`;
}
function helpRow() {
  return `<button class="help-row" data-action="help">${iconBox("headset")}<span><strong>Need a hand?</strong><small>Get help with transport or your booking.</small></span>${i("chevron-right", 19)}</button>`;
}
export function donorView(s, v, zoom) {
  const b = donorBookings(s)[0];
  const preview = b || { ...donors.thabo, date: today() };
  if (v === "profile")
    return `<div class="consumer-content single"><div class="page-intro"><div class="eyebrow"><span></span> DONOR APP</div><h1>Your profile</h1><p>Details used to coordinate your transport.</p></div><section class="panel inset"><div class="person-head"><span class="avatar big">TM</span><div><h2>Thabo Mokoena</h2><p>Demo donor</p></div></div><dl class="facts"><div><dt>Contact number</dt><dd>${b?.phone ? esc(b.phone) : donors.thabo.phone}</dd></div><div><dt>Default pickup address</dt><dd>${esc(b?.pickup || donors.thabo.pickup)}</dd></div></dl></section>${helpRow()}</div>`;
  if (v === "journey") {
    if (!b)
      return `<div class="consumer-content"><div class="page-intro"><div class="eyebrow"><span></span> DONOR APP</div><h1>My Journey</h1><p>Track your transport in one place.</p></div><div class="panel">${empty("No transport booked", "Request a ride for your upcoming appointment.", "route", arrow("Request transport", "book-donor", "primary"))}</div></div>`;
    const k = b.return ? "return" : "outbound",
      t = b[k],
      d = drivers[t.driver],
      step = complete(b)
        ? 4
        : k === "return"
          ? t.state === "onboard"
            ? 3
            : t.state === "arrived"
              ? 2
              : t.driver
                ? 1
                : 0
          : b.checkedIn || t.state === "delivered"
            ? 3
            : t.state === "onboard"
              ? 2
              : t.driver
                ? 1
                : 0;
    const descriptions = {
      queued:
        k === "return"
          ? "The SANBS team has confirmed you’re ready. Transport Operations is finding a driver."
          : "Your request is with Transport Operations. Driver details will appear here once assigned.",
      assigned: t.offer
        ? "Your driver has received the offer. Check back for confirmation."
        : "Your driver has been assigned. Check back for the next update.",
      accepted: "Your driver has confirmed the assignment.",
      enroute: "Please be ready at the pickup location.",
      arrived: "Your driver is waiting at the pickup point.",
      onboard:
        k === "return"
          ? "You’re on the way home."
          : "You’re on the way to your donation appointment.",
      delivered:
        "You’ve reached the donation site. The SANBS team will check you in.",
      done: "Your transport is complete.",
    };
    return `<div class="consumer-content"><div class="page-intro split"><div><div class="eyebrow"><span></span> DONOR APP</div><h1>My Journey</h1><p>Track your transport in one place.</p></div><span class="today-pill">${i("ticket", 16)} ${b.id}</span></div><div class="donor-grid"><div class="stack"><section class="panel inset journey-card"><div class="section-head"><span class="label">${k === "return" ? "RETURN JOURNEY" : "OUTBOUND JOURNEY"}</span>${bookingChip(b)}</div><h2>${esc(status(b))}</h2><p>${complete(b) ? "Your transport is complete." : b.checkedIn && !b.return ? "Your return journey will be arranged once the SANBS team confirms you’re ready." : descriptions[t.state]}</p><div class="progress" aria-label="Journey progress, step ${step + 1} of 5">${(k === "return" ? ["Authorised", "Assigned", "At pickup", "Going home", "Complete"] : ["Requested", "Assigned", "On trip", "At centre", "Complete"]).map((x, n) => `<div class="${n <= step ? "reached" : ""}"><span>${n < step ? i("check", 12) : ""}</span><small>${x}</small></div>`).join("")}</div>${routeList(b, k)}<div class="journey-time"><span>${i("calendar-days", 16)} Appointment: ${dateText(b.date)} · ${b.time}</span><span>${i("clock-3", 16)} Pickup: ${esc(t.time)}</span></div></section>${d ? `<section class="panel inset"><div class="person-head"><span class="avatar">${initials(d.name)}</span><div><h3>${d.name}</h3><p>${d.vehicle} · ${d.plate}</p></div></div></section>` : ""}${!b.return && !b.checkedIn && b.needsReturn && !complete(b) ? `<div class="inline-note">${i("info", 18)}<span>Your return journey will be arranged once the SANBS team confirms you’re ready.</span></div>` : ""}</div><div class="stack">${mapPanel(b, { zoom, active: !!t.driver, reverse: k === "return", progress: routeProgress(t.state) })}${helpRow()}</div></div></div>`;
  }
  return `<div class="consumer-content"><div class="page-intro split"><div><div class="eyebrow"><span></span> DONOR APP</div><h1>Good to see you, Thabo.</h1><p>Plan your ride to and from your next donation appointment.</p></div>${datePill()}</div><div class="donor-grid"><div class="stack">${appointment(preview)}<section class="ride-callout"><div class="ride-top"><span class="ride-icon">${i("car-front", 24)}</span><span class="ride-tag">${b ? "BOOKING " + b.id : "DONOR TRANSPORT"}</span></div><h2>${b ? esc(status(b)) : "Need a ride?"}</h2><p>${b ? "Check your pickup details and follow live demo updates." : "Book transport to your appointment and a ride home, if you need one."}</p>${b ? arrow("View my journey", "nav", "white", 'data-view="journey"') : arrow("Request transport", "book-donor", "white")}</section></div><div class="stack">${mapPanel(preview, { zoom })}${helpRow()}</div></div><div class="private-note">${i("shield-check", 16)} Your transport details are only shared with the team coordinating your ride.</div></div>`;
}
export const routeProgress = (state) =>
  ({
    assigned: 0,
    accepted: 0,
    enroute: 2,
    arrived: 0,
    onboard: 5,
    delivered: 8,
    done: 8,
  })[state] || 0;
export function driverView(s, v, driver, zoom) {
  const d = drivers[driver],
    all = legs(s).filter(({ t }) => t.driver === driver),
    job = all.find(({ t }) => stages.includes(t.state)),
    working = isBusy(s, driver),
    online = s.availability[driver];
  const controls = `<button class="availability" data-action="availability" aria-pressed="${online}" ${working ? "disabled" : ""}><span class="switch ${online ? "on" : ""}"></span>${working ? "On a trip" : online ? "Available" : "Offline"}</button>`;
  const jobCard = job
    ? driverJob(job, zoom)
    : empty(
        online ? "Waiting for an assignment" : "You’re offline",
        online
          ? "Assigned trips will appear here as soon as dispatch sends them."
          : "Go online to be available for dispatch.",
        "car-front",
      );
  return `<div class="driver-content"><div class="driver-head"><div class="eyebrow"><span></span> DRIVER APP</div><div class="driver-title"><div><h1>${v === "home" ? `Hi, ${d.name.split(" ")[0]}.` : v === "trips" ? "My trips" : "Driver profile"}</h1><p>${v === "home" ? "Your workday, one trip at a time." : d.name}</p></div><span class="avatar dark big">${initials(d.name)}</span></div></div><div class="driver-body">
  ${v === "profile" ? `<section class="panel inset"><div class="section-head"><h2>Driver details</h2>${controls}</div><dl class="facts"><div><dt>Driver type</dt><dd>${d.type}</dd></div><div><dt>Vehicle</dt><dd>${d.vehicle} · ${d.plate}</dd></div><div><dt>Contact</dt><dd>${d.phone}</dd></div></dl></section>` : v === "trips" ? `<section class="panel inset">${dividerTitle("Today’s assignments", `<span class="count">${all.length}</span>`)}${all.length ? all.map(({ b, k, t }) => `<div class="driver-trip-row"><div><strong>${k === "return" ? "Return trip" : "Outbound trip"} · ${b.id}</strong><small>${esc(k === "return" ? b.pickup : place(b).short)}</small></div>${tripChip(t)}</div>`).join("") : empty("No trips yet", "Your assigned and completed trips will appear here.", "route")}</section>${job ? jobCard : ""}` : `<div class="driver-shift panel"><div>${iconBox("radio", "tint")}<span><strong>Driver availability</strong><small>${working ? "Finish your current trip before going offline." : online ? "You can receive assignments." : "Dispatch cannot assign trips while you’re offline."}</small></span></div>${controls}</div>${job ? jobCard : `<section class="panel">${jobCard}</section>`}<section class="panel inset today-trips">${dividerTitle("Today’s trips", button("View trips", "nav", "arrow-right", "text", 'data-view="trips"'))}<p>${all.length} assigned · ${all.filter(({ t }) => ["done", "delivered"].includes(t.state)).length} completed${job ? " · 1 active" : ""}</p><small>${job ? "No other upcoming assignments." : "Upcoming trips will appear here once assigned."}</small></section>`}</div></div>`;
}
function driverJob({ b, k, t }, zoom) {
  const actions = {
    assigned: t.offer ? "Accept trip" : "Acknowledge assignment",
    accepted: "Start navigation to pickup",
    enroute: "I’ve arrived at pickup",
    arrived: "Confirm donor picked up",
    onboard:
      k === "return"
        ? "Complete trip at destination"
        : "Arrived at donation site",
  };
  const attrs = `data-id="${b.id}" data-leg="${k}" data-stage="${t.state}"`;
  return `<section class="panel driver-job"><div class="inset"><div class="section-head"><span class="label">${k === "return" ? "RETURN" : "OUTBOUND"} · ${b.id}</span>${tripChip(t)}</div><h2>${t.state === "assigned" ? "New assignment" : t.state === "onboard" ? "Head to destination" : t.state === "arrived" ? "Collect your passenger" : "Head to pickup"}</h2><p class="job-passenger">${i("user-round", 16)} ${donors[b.donor].name.split(" ")[0]} <span>·</span> ${i("clock-3", 16)} ${esc(t.time)} <span>·</span> ~15 min</p>${routeList(b, k)}${k === "outbound" && b.notes ? `<div class="inline-note">${i("info", 17)} ${esc(b.notes)}</div>` : k === "return" ? `<div class="inline-note">${i("info", 17)} Meet the donor at the collection centre reception.</div>` : ""}${b.requirements ? `<p class="driver-requirements"><strong>Transport requirements:</strong> ${esc(b.requirements)}</p>` : ""}</div><div class="map-wrap driver-map">${map({ site: b.site, active: true, progress: routeProgress(t.state), reverse: k === "return", zoom })}</div><div class="inset job-actions">${arrow(actions[t.state], "advance", "primary", attrs)}${t.offer && t.state === "assigned" ? button("Decline trip", "decline", "", "secondary", attrs) : ""}${button("Report an issue", "driver-issue", "flag", "text", attrs)}<small>Only update the trip when safely parked.</small></div></section>`;
}
