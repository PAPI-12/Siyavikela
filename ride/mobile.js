import { atlas } from "./atlas.js";
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
  pathsFor,
} from "./ui.js";

export const donorNav = [
  ["home", "Home", "house"],
  ["journey", "My Journey", "route"],
  ["profile", "Profile", "user-round"],
];
export const driverNav = [
  ["home", "Current trip", "car-front"],
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
  const site = sites[b.site],
    day =
      b.date === today()
        ? "Today"
        : dateText(b.date, {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
  return `<section class="appointment-ticket"><div class="ticket-top"><span>${i("calendar-days", 15)} NEXT APPOINTMENT</span><span>${day.toUpperCase()} · ${dateText(b.date, { day: "numeric", month: "short" }).toUpperCase()}</span></div><div class="ticket-main"><div><h2>${esc(site.name)}</h2><p>${i("map-pin", 14)} ${esc(site.area)}</p></div><div class="ticket-time"><strong>${b.time}</strong><small>SAST</small></div></div></section>`;
}
const shortDate = () =>
  dateText(today(), { weekday: "long", day: "numeric", month: "long" });
function mapPanel(
  b,
  { zoom = 1, active = false, progress = 0, reverse = false } = {},
) {
  const [pickup, destination] = pathsFor(b, reverse ? "return" : "outbound");
  return `<section class="route-board" aria-label="Journey route"><header class="route-board-head"><div class="route-board-title"><span class="route-board-glyph">${i("route", 21)}</span><div><span class="micro">${b.site === "sandton" ? "SANDTON" : "ROSEBANK"} / JOHANNESBURG</span><h2>${active ? "Journey route" : "Route preview"}</h2></div></div><span class="route-board-index"><b>${reverse ? "02" : "01"}</b><span>${reverse ? "RETURN" : "OUTBOUND"}</span></span></header><div class="map-wrap">${atlas({ site: b.site, zoom, active, progress, reverse })}<div class="map-controls"><button aria-label="Zoom in" data-action="zoom" data-delta=".2" ${zoom >= 1.4 ? "disabled" : ""}>${i("plus", 19)}</button><button aria-label="Zoom out" data-action="zoom" data-delta="-.2" ${zoom <= 1 ? "disabled" : ""}>${i("minus", 19)}</button></div></div><div class="route-board-stops"><div><span class="stop-symbol origin">${i(reverse ? "plus" : "house", 16)}</span><div><span class="micro">A / PICKUP</span><strong>${esc(pickup)}</strong></div></div><span class="stop-connector" aria-hidden="true">${i("arrow-right", 17)}</span><div><span class="stop-symbol destination">${i(reverse ? "house" : "plus", 17)}</span><div><span class="micro">B / DROP-OFF</span><strong>${esc(destination)}</strong></div></div></div></section>`;
}
function helpRow() {
  return `<button class="donor-help" data-action="help">${i("headset", 20)}<span><strong>Need help with your ride?</strong><small>Contact the transport team</small></span>${i("chevron-right", 18)}</button>`;
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
    return `<div class="consumer-content donor-tracking"><div class="page-intro split"><div><div class="eyebrow"><span></span> DONOR APP</div><h1>My Journey</h1><p>Your pickup, driver and next update.</p></div><span class="today-pill">${i("ticket", 16)} ${b.id}</span></div><div class="donor-grid"><div class="stack"><section class="inset journey-card"><div class="section-head"><span class="label">${k === "return" ? "RETURN JOURNEY" : "OUTBOUND JOURNEY"}</span>${bookingChip(b)}</div><h2>${esc(status(b))}</h2><p>${complete(b) ? "Your transport is complete." : b.checkedIn && !b.return ? "Your return journey will be arranged once the SANBS team confirms you’re ready." : descriptions[t.state]}</p><div class="progress" aria-label="Journey progress, step ${step + 1} of 5">${(k === "return" ? ["Authorised", "Assigned", "At pickup", "Going home", "Complete"] : ["Requested", "Assigned", "On trip", "At centre", "Complete"]).map((x, n) => `<div class="${n <= step ? "reached" : ""}"><span>${n < step ? i("check", 12) : ""}</span><small>${x}</small></div>`).join("")}</div>${routeList(b, k)}<div class="journey-time"><span>${i("calendar-days", 16)} Appointment: ${dateText(b.date)} · ${b.time}</span><span>${i("clock-3", 16)} Pickup: ${esc(t.time)}</span></div></section>${d ? `<section class="assigned-driver inset"><div class="person-head"><span class="avatar">${initials(d.name)}</span><div><h3>${d.name}</h3><p>${d.vehicle} · ${d.plate}</p></div></div></section>` : ""}${!b.return && !b.checkedIn && b.needsReturn && !complete(b) ? `<div class="inline-note">${i("info", 18)}<span>Your return journey will be arranged once the SANBS team confirms you’re ready.</span></div>` : ""}</div><div class="stack">${mapPanel(b, { zoom, active: !!t.driver, reverse: k === "return", progress: routeProgress(t.state) })}${helpRow()}</div></div></div>`;
  }
  const action = b
    ? arrow(
        "View my journey",
        "nav",
        "primary donor-primary",
        'data-view="journey"',
      )
    : arrow("Request transport", "book-donor", "primary donor-primary");
  const t = b?.return || b?.outbound;
  return `<div class="consumer-content donor-home"><div class="home-context"><div class="eyebrow"><span></span> DONOR APP <span class="context-slash">/</span> <b>HOME</b></div><span class="home-date">${i("calendar-days", 15)} ${shortDate()}</span></div><div class="home-layout"><div class="home-task"><div class="home-greeting"><h1>Hey, <em>Thabo.</em></h1><p>Let’s get you to your next donation.</p></div>${appointment(preview)}<div class="ride-action"><div class="ride-action-copy"><span class="ride-action-icon">${i("car-front", 22)}</span><div><h2>${b ? esc(status(b)) : "Ride to your appointment"}</h2><p>${b ? `${b.id} · Check your pickup and driver status.` : "Request a pickup and, if you need it, a ride home."}</p></div></div>${action}</div>${helpRow()}</div><div class="home-map">${mapPanel(preview, { zoom, active: !!t?.driver, reverse: !!b?.return, progress: routeProgress(t?.state) })}</div></div></div>`;
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
  if (v === "home" && job) return driverJob(job, d, zoom);
  return `<div class="driver-content driver-rest"><header class="driver-head"><div class="driver-headline"><div><div class="eyebrow"><span></span> DRIVER APP</div><h1>${v === "home" ? `Hi, ${d.name.split(" ")[0]}.` : v === "trips" ? "My trips" : "Driver profile"}</h1><p>${d.name} · ${d.vehicle}</p></div>${controls}</div></header><div class="driver-log">
  ${v === "profile" ? `<dl class="facts"><div><dt>Driver type</dt><dd>${d.type}</dd></div><div><dt>Vehicle</dt><dd>${d.vehicle} · ${d.plate}</dd></div><div><dt>Contact</dt><dd>${d.phone}</dd></div></dl>` : v === "trips" ? `${dividerTitle("Today’s assignments", `<span class="count">${all.length}</span>`)}${all.length ? all.map(({ b, k, t }) => `<div class="driver-trip-row"><div><strong>${k === "return" ? "Return trip" : "Outbound trip"} · ${b.id}</strong><small>${esc(k === "return" ? b.pickup : place(b).short)}</small></div>${tripChip(t)}</div>`).join("") : empty("No trips yet", "Your assigned and completed trips will appear here.", "route")}` : `<div class="driver-wait">${empty(online ? "Waiting for an assignment" : "You’re offline", online ? "Your trip will open here as soon as dispatch assigns it." : "Go online to receive assignments.", "car-front")}</div><div class="driver-log-link"><span><b>${all.length}</b> assigned today</span>${button("View trips", "nav", "arrow-right", "text", 'data-view="trips"')}</div>`}</div></div>`;
}
function driverJob({ b, k, t }, d, zoom) {
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
  const [pickup, destination] = pathsFor(b, k),
    heading = {
      assigned: "New assignment",
      accepted: "Ready for pickup",
      enroute: "Head to pickup",
      arrived: "Meet your passenger",
      onboard: "Head to drop-off",
    }[t.state];
  const note =
    k === "return"
      ? "Meet your passenger at the collection centre reception."
      : b.notes;
  return `<div class="driver-content driver-active"><header class="driver-command"><div><div class="eyebrow"><span></span> ${k === "return" ? "RETURN" : "OUTBOUND"} · ${b.id}</div><h1>${heading}</h1></div><div class="driver-command-name"><span class="avatar dark">${initials(d.name)}</span><div><strong>${d.name}</strong><small>On assignment</small></div></div></header><section class="driver-waypoint"><span class="waypoint-icon">${i(t.state === "onboard" ? "route" : "map-pin", 24)}</span><div><div class="micro">${t.state === "onboard" ? "DROP-OFF" : "PICKUP"}</div><h2>${esc(t.state === "onboard" ? destination : pickup)}</h2><p>${i("user-round", 15)} ${donors[b.donor].name.split(" ")[0]} <span>·</span> ${i("clock-3", 15)} ${esc(t.time)}</p></div>${button("Issue", "driver-issue", "flag", "text driver-report", `${attrs} aria-label="Report an issue"`)}</section><div class="map-wrap driver-map">${atlas({ site: b.site, active: true, progress: routeProgress(t.state), reverse: k === "return", zoom })}</div><details class="driver-itinerary"><summary>${i("route", 17)} Trip details ${i("chevron-down", 16)}</summary>${routeList(b, k)}${note ? `<p>${esc(note)}</p>` : ""}${b.requirements ? `<p><strong>Transport requirements:</strong> ${esc(b.requirements)}</p>` : ""}</details><div class="driver-dock">${arrow(actions[t.state], "advance", "primary", attrs)}${t.offer && t.state === "assigned" ? button("Decline trip", "decline", "", "secondary", attrs) : ""}<small>${i("shield-check", 14)} Update only when safely parked.</small></div></div>`;
}
