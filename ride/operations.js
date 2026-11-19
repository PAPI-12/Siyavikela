import {
  today,
  donors,
  drivers,
  sites,
  models,
  legs,
  isBusy,
  available,
  complete,
  status,
  returnText,
  statuses,
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
  stamp,
  iconBox,
  routeList,
  dividerTitle,
  initials,
  empty,
  place,
  pathsFor,
} from "./ui.js";
import { navLinks } from "./mobile.js";

const staffNav = [
  ["home", "Site overview", "layout-dashboard"],
  ["journeys", "Donor journeys", "route"],
  ["returns", "Return readiness", "corner-down-left"],
  ["exceptions", "Exceptions", "flag"],
];
const opsNav = [
  ["home", "Operations overview", "layout-dashboard"],
  ["dispatch", "Dispatch queue", "radio"],
  ["journeys", "All trips", "route"],
  ["drivers", "Drivers", "users-round"],
  ["exceptions", "Exceptions", "flag"],
  ["settings", "Operating model", "settings-2"],
];
const subtitles = {
  home: "",
  journeys: "Search and monitor shared transport records.",
  returns:
    "Check donors in and confirm when they are ready for their return ride.",
  dispatch: "Assign available drivers to outbound and authorised return trips.",
  drivers: "Review driver availability, vehicles and current assignments.",
  exceptions: "Review transport issues reported by drivers, donors and staff.",
  settings: "Configure how Transport Operations supplies rides in this demo.",
};
const heading = (role, v) =>
  v === "home"
    ? role === "staff"
      ? "Collection site overview"
      : "Operations overview"
    : (role === "staff" ? staffNav : opsNav).find((x) => x[0] === v)?.[1];
const openIssues = (s) => s.issues.filter((x) => !x.resolved);
const hasIssue = (s, b, k) =>
  openIssues(s).some(
    (x) => x.booking === b.id && (!k || !x.leg || x.leg === k),
  );
const needDispatch = (s, b, k, t) =>
  t.state === "queued" ||
  (!["done", "delivered"].includes(t.state) && hasIssue(s, b, k));
export function workplace(s, role, v, filters) {
  const staff = role === "staff",
    nav = staff ? staffNav : opsNav,
    all = legs(s),
    issues = openIssues(s);
  const waiting = s.bookings.filter(
    (b) => b.needsReturn && b.outbound.state === "delivered" && !b.return,
  );
  const dispatch = all.filter(({ b, k, t }) => needDispatch(s, b, k, t));
  const metrics = staff
    ? [
        [
          "calendar-days",
          "Upcoming pickups",
          s.bookings.filter(
            (b) => !["onboard", "delivered"].includes(b.outbound.state),
          ).length,
          "journeys",
        ],
        [
          "car-front",
          "Donors in transit",
          all.filter(({ t }) => t.state === "onboard").length,
          "journeys",
        ],
        [
          "corner-down-left",
          "Awaiting return clearance",
          waiting.length,
          "returns",
        ],
        ["flag", "Open exceptions", issues.length, "exceptions"],
      ]
    : [
        [
          "radio",
          "Ready for dispatch",
          all.filter(({ t }) => t.state === "queued").length,
          "dispatch",
        ],
        [
          "users-round",
          "Available drivers",
          Object.keys(drivers).filter((d) => available(s, d)).length,
          "drivers",
        ],
        [
          "car-front",
          "Trips in progress",
          all.filter(({ t }) =>
            ["accepted", "enroute", "arrived", "onboard"].includes(t.state),
          ).length,
          "journeys",
        ],
        ["flag", "Open exceptions", issues.length, "exceptions"],
      ];
  const desc =
    v === "home"
      ? staff
        ? "Monitor arrivals, pickups and return readiness."
        : "Coordinate assignments and track your transport network."
      : subtitles[v];
  let content = "";
  if (v === "home")
    content = `<div class="metrics">${metrics.map(([ic, label, count, to]) => `<button class="metric" data-action="nav" data-view="${to}"><span>${i(ic, 18)} ${label}</span><strong>${count}</strong>${i("arrow-up-right", 16)}</button>`).join("")}</div><div class="overview-line">${staff ? `<span><strong>${s.bookings.filter((b) => b.outbound.state === "delivered").length}</strong> site arrivals</span><span><strong>${all.filter(({ t }) => t.state === "enroute").length}</strong> drivers on approach</span><span><strong>${all.filter(({ k, t }) => k === "return" && !["queued", "done"].includes(t.state)).length}</strong> returns in progress</span>` : `<span><strong>${all.filter(({ k, t }) => k === "return" && t.state === "queued").length}</strong> returns awaiting dispatch</span><span><strong>${all.filter(({ t }) => ["assigned", "accepted", "enroute", "arrived"].includes(t.state)).length}</strong> upcoming pickups</span><span><strong>${all.filter(({ t }) => ["done", "delivered"].includes(t.state)).length}</strong> completed trips</span>`}</div>`;
  if (v === "drivers")
    content += `<section class="panel work-panel">${dividerTitle("Driver roster", chip(`${Object.keys(drivers).filter((d) => available(s, d)).length} dispatchable`, "green"))}<div class="table-scroll"><table><thead><tr><th>Driver</th><th>Type / Verification</th><th>Vehicle</th><th>Availability</th><th>Current assignment</th><th></th></tr></thead><tbody>${Object.entries(
      drivers,
    )
      .map(([id, d]) => {
        const job = all.find(
          ({ t }) =>
            t.driver === id && !["done", "delivered"].includes(t.state),
        );
        return `<tr><td><div class="table-person"><span class="avatar">${initials(d.name)}</span><div><strong>${d.name}</strong><small>${d.phone}</small></div></div></td><td>${d.type}<small>Demo verified</small></td><td>${d.vehicle}<small>${d.plate}</small></td><td>${chip(job ? "On assignment" : !s.availability[id] ? "Offline" : available(s, id) ? "Available" : "Outside model", job ? "blue" : available(s, id) ? "green" : "neutral")}</td><td>${job ? `${job.b.id} · ${job.k}` : "—"}<small>No other upcoming trips</small></td><td>${job ? "" : button(s.availability[id] ? "Set offline" : "Set available", "availability", "power", "secondary tiny", `data-driver="${id}"`)}</td></tr>`;
      })
      .join("")}</tbody></table></div></section>`;
  else if (v === "settings")
    content += `<section class="panel work-panel">${dividerTitle("Supply configuration", chip("Demo setting", "neutral"))}<div class="settings-list">${Object.entries(
      models,
    )
      .map(
        ([id, name], n) =>
          `<button class="model-row ${s.model === id ? "selected" : ""}" data-action="model" data-model="${id}" aria-pressed="${s.model === id}"><span class="model-letter">${"ABCD"[n]}</span><span><strong>${name}</strong><small>${["Assign employed drivers. Drivers acknowledge assignments.", "Offer rides to independent drivers. Drivers accept or decline.", "Assign verified partner drivers. Operations can enter simulated provider updates.", "Dispatch across all available driver types."][n]}</small></span>${s.model === id ? i("circle-check", 21) : i("circle", 21)}</button>`,
      )
      .join(
        "",
      )}<p class="info-text">Changing the model filters new assignments. Existing trips are not interrupted. No partner API or payments are connected.</p></div></section>`;
  else if (v === "exceptions")
    content += `<section class="panel work-panel">${dividerTitle("Transport exceptions", `<span class="count">${issues.length} open</span>`)}${s.issues.length ? `<div class="table-scroll"><table><thead><tr><th>Issue</th><th>Booking</th><th>Reported by</th><th>Reported at</th><th>Status</th><th></th></tr></thead><tbody>${s.issues.map((x) => `<tr><td><strong>${esc(x.label)}</strong></td><td>${x.booking || "General support"}</td><td>${esc(x.actor)}</td><td>${stamp(x.time)}</td><td>${chip(x.resolved ? "Resolved" : "Open", x.resolved ? "green" : "amber")}</td><td>${button("View", "exception-detail", "chevron-right", "secondary tiny", `data-issue="${x.id}"`)}</td></tr>`).join("")}</tbody></table></div>` : empty("No exceptions reported", "New transport issues will appear here.", "circle-check")}</section>`;
  else {
    const isDispatch = v === "dispatch",
      isReturn = v === "returns",
      showTrips = !staff;
    const title = isDispatch
      ? "Dispatch worklist"
      : isReturn
        ? "Donors awaiting action"
        : showTrips
          ? "Trip activity"
          : "Donor transport list";
    let rows = showTrips
      ? isDispatch
        ? dispatch
        : all
      : (isReturn ? waiting : s.bookings).map((b) => ({
          b,
          k: b.return ? "return" : "outbound",
          t: b.return || b.outbound,
        }));
    const query = (filters.query || "").trim().toLowerCase();
    const stateOptions = staff
      ? Object.fromEntries(
          [...new Set(rows.map(({ b }) => status(b)))].map((x) => [x, x]),
        )
      : v === "dispatch"
        ? Object.fromEntries(
            [...new Set(rows.map(({ t }) => statuses[t.state]))].map((x) => [
              x,
              x,
            ]),
          )
        : Object.fromEntries(Object.values(statuses).map((x) => [x, x]));
    if (filters.status && !stateOptions[filters.status]) filters.status = "";
    rows = rows.filter(
      ({ b, t }) =>
        (!query ||
          `${b.id} ${donors[b.donor].name} ${b.pickup} ${place(b).name} ${drivers[t.driver]?.name || ""}`
            .toLowerCase()
            .includes(query)) &&
        (!filters.site || b.site === filters.site) &&
        (!filters.date || b.date === filters.date) &&
        (!filters.status ||
          filters.status === (staff ? status(b) : statuses[t.state])),
    );
    content += `<section class="panel work-panel">${dividerTitle(title, `<span class="count">${rows.length} ${showTrips ? "trips" : "journeys"}</span>`)}${filtersBar(filters, stateOptions)}${rows.length ? tripTable(rows, s, staff) : empty("No matching records", isDispatch ? "New requests and authorised returns appear here when they need a driver." : isReturn ? "Donors appear here after the driver marks arrival at the donation site." : "Try changing the search or filters.", isDispatch ? "radio" : "search")}</section>`;
  }
  return `<div class="workplace ${staff ? "staff-mode" : "ops-mode"}"><aside class="sidebar"><div class="workspace-identity">${iconBox(staff ? "heart-handshake" : "radio-tower", "tint")}<div><strong>${staff ? "SANBS Staff" : "Transport Operations"}</strong><small>${staff ? "Collection & contact centre" : "Dispatch workspace"}</small></div></div><span class="sidebar-label">WORKSPACE</span><nav aria-label="Workspace navigation">${navLinks(nav, v)}</nav><div class="sidebar-bottom">${i("flask-conical", 17)} Demo workspace</div></aside><main class="work-main" id="main"><div class="work-intro"><div><div class="eyebrow"><span></span> ${staff ? "COLLECTION & CONTACT CENTRE" : "TRANSPORT OPERATIONS"}</div><h1>${heading(role, v)}</h1><p>${desc}</p></div>${staff ? button("New booking", "book-staff", "plus", "primary") : `<span class="today-pill">${i("calendar-days", 16)} ${dateText(today())}</span>`}</div>${content}</main></div>`;
}
function filtersBar(f, options) {
  const opts = (values, value) =>
    Object.entries(values)
      .map(
        ([k, v]) =>
          `<option value="${esc(k)}" ${k === value ? "selected" : ""}>${esc(v)}</option>`,
      )
      .join("");
  return `<div class="filter-bar"><label class="search-field">${i("search", 17)}<input aria-label="Search bookings" placeholder="Search donor or reference…" data-filter="query" value="${esc(f.query || "")}"></label><select aria-label="Filter by status" data-filter="status">${opts({ "": "All statuses", ...options }, f.status)}</select><select aria-label="Filter by site" data-filter="site">${opts({ "": "All locations", ...Object.fromEntries(Object.entries(sites).map(([id, p]) => [id, p.short])) }, f.site)}</select><input aria-label="Filter by date" type="date" data-filter="date" value="${esc(f.date || "")}"></div>`;
}
function tripTable(rows, s, staff) {
  return `<div class="table-scroll"><table><thead><tr><th>${staff ? "Donor / Reference" : "Trip / Donor"}</th><th>Pickup → Destination</th><th>${staff ? "Appointment" : "Pickup time"}</th><th>Driver</th><th>Status</th><th>${staff ? "Return" : "Priority"}</th><th></th></tr></thead><tbody>${rows
    .map(({ b, k, t }) => {
      const [p, z] = pathsFor(b, staff ? "outbound" : k),
        d = drivers[t.driver];
      return `<tr><td><button class="row-link" data-action="detail" data-id="${b.id}" data-leg="${k}"><strong>${staff ? donors[b.donor].name : `${b.id}-${k === "return" ? "R" : "O"}`}</strong><small>${staff ? `${b.id} · ${b.origin}` : `${donors[b.donor].name} · ${k === "return" ? "Return" : "Outbound"}`}</small></button></td><td><span>${esc(p)}</span><small>${esc(z)}</small></td><td><strong>${staff ? b.time : esc(t.time)}</strong><small>${dateText(b.date, { day: "numeric", month: "short" })}</small></td><td>${d ? `${d.name}<small>${d.vehicle}</small>` : '<span class="muted">Unassigned</span>'}</td><td>${staff ? bookingChip(b) : tripChip(t)}</td><td>${staff ? esc(returnText(b)) : hasIssue(s, b, k) ? chip("Attention", "amber") : k === "return" && t.state === "queued" ? chip("Ready now", "green") : "Standard"}</td><td>${!staff && t.state === "queued" ? button("Assign", "assign", "user-plus", "secondary tiny", `data-id="${b.id}" data-leg="${k}"`) : `<button class="icon-btn" title="Open ${b.id}" aria-label="Open ${b.id}" data-action="detail" data-id="${b.id}" data-leg="${k}">${i("chevron-right", 18)}</button>`}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}
export function bookingDetail(s, b, k, role) {
  let t = b[k];
  if (!t) {
    k = "outbound";
    t = b.outbound;
  }
  const d = drivers[t.driver],
    staff = role === "staff",
    attrs = `data-id="${b.id}" data-leg="${k}"`;
  return `<div class="detail-top"><div class="avatar big">${initials(donors[b.donor].name)}</div><div><h2>${donors[b.donor].name}</h2><p>${b.id} · ${b.origin}</p></div>${bookingChip(b)}</div><div class="detail-tabs"><button data-action="detail" data-id="${b.id}" data-leg="outbound" class="${k === "outbound" ? "active" : ""}">Outbound</button>${b.return ? `<button data-action="detail" data-id="${b.id}" data-leg="return" class="${k === "return" ? "active" : ""}">Return</button>` : ""}</div>${routeList(b, k)}<dl class="facts compact"><div><dt>Appointment</dt><dd>${dateText(b.date)} · ${b.time} SAST</dd></div><div><dt>Pickup time</dt><dd>${esc(t.time)}</dd></div><div><dt>Driver / Vehicle</dt><dd>${d ? `${d.name} · ${d.vehicle} · ${d.plate}` : "Unassigned"}</dd></div><div><dt>Return status</dt><dd>${esc(returnText(b))}${b.authorised ? ` · Authorised ${stamp(b.authorised)}` : ""}</dd></div>${b.notes ? `<div><dt>Pickup notes</dt><dd>${esc(b.notes)}</dd></div>` : ""}${b.requirements ? `<div><dt>Transport requirements</dt><dd>${esc(b.requirements)}</dd></div>` : ""}</dl><div class="detail-actions">
${staff && b.outbound.state === "delivered" && !b.checkedIn ? button("Confirm donor arrived", "checkin", "check", "primary", attrs) : ""}${staff && b.checkedIn && b.needsReturn && !b.return ? button("Confirm donor ready for return", "authorise", "corner-down-left", "primary", attrs) : ""}
${["queued", "assigned", "accepted", "enroute", "arrived"].includes(t.state) ? button(t.driver ? "Change driver" : "Assign driver", "assign", "user-plus", "secondary", attrs) : ""}
${!staff && d?.type === "Transport partner" && !["done", "delivered"].includes(t.state) ? button("Simulate provider update", "advance", "radio", "primary", `${attrs} data-stage="${t.state}" data-driver="${t.driver}"`) : ""}
${button("Contact donor", "contact", "phone", "secondary", `${attrs} data-contact="donor"`)}${d ? button("Contact driver", "contact", "phone", "secondary", `${attrs} data-contact="driver"`) : ""}${!complete(b) ? button("Flag delay", "flag-delay", "flag", "secondary", attrs) : ""}</div>
<div class="detail-section"><h3>Operational exceptions</h3>${
    s.issues
      .filter((x) => x.booking === b.id)
      .map(
        (x) =>
          `<button class="issue-link" data-action="exception-detail" data-issue="${x.id}">${esc(x.label)} ${chip(x.resolved ? "Resolved" : "Open", x.resolved ? "green" : "amber")}</button>`,
      )
      .join("") || "<p>No issues reported.</p>"
  }</div><div class="detail-section"><h3>Journey history</h3><ol class="history">${b.history
    .slice()
    .reverse()
    .map(
      (x) =>
        `<li><strong>${esc(x.text)}</strong><small>${esc(x.actor)} · ${stamp(x.time)}</small></li>`,
    )
    .join("")}</ol></div>`;
}
