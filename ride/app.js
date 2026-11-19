import "@fontsource-variable/inter";
import "./style.css";
import {
  key,
  seed,
  update,
  donors,
  drivers,
  sites,
  today,
  newBooking,
  pickupTime,
  available,
  donorBookings,
  legs,
  complete,
} from "./state.js";
import {
  i,
  esc,
  roleNames,
  button,
  arrow,
  chip,
  field,
  select,
  textarea,
  iconBox,
  routeList,
  dateText,
  initials,
  stamp,
  empty,
} from "./ui.js";
import {
  donorView,
  driverView,
  donorNav,
  driverNav,
  navLinks,
} from "./mobile.js";
import { workplace, bookingDetail } from "./operations.js";
import { map } from "./map.js";

const root = document.querySelector("#app"),
  overlay = document.querySelector("#overlay"),
  toast = document.querySelector("#toast");
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    if (
      Array.isArray(raw?.bookings) &&
      Array.isArray(raw?.issues) &&
      raw?.availability
    )
      return raw;
  } catch {
    /* Demo still works without storage */
  }
  return seed();
}
let state = load(),
  role = "donor",
  view = "home",
  driver = "sipho",
  filters = {},
  zoom = 1,
  menu = false,
  modal = null,
  draft = null,
  timer,
  lastFocus,
  modalFailure = "";
const booking = (id) => state.bookings.find((x) => x.id === id);
const actor = () =>
  role === "driver" ? drivers[driver].name : roleNames[role];
const mobile = () => role === "donor" || role === "driver";
const thabo = () => donorBookings(state)[0];
const notify = (text, error = false) => {
  clearTimeout(timer);
  toast.className = error ? "toast error" : "toast";
  toast.innerHTML = `${i(error ? "circle-alert" : "circle-check", 19)}<span>${esc(text)}</span>`;
  timer = setTimeout(() => {
    toast.className = "";
    toast.innerHTML = "";
  }, 4100);
};
const store = () => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* optional persistence */
  }
};
function dispatch(action, { keep = false } = {}) {
  try {
    const result = update(state, action);
    state = result.state;
    store();
    if (!keep) closeModal(false);
    else modalFailure = "";
    render();
    notify(result.message);
    if (keep && modal) {
      const banner = overlay.querySelector(".modal-feedback");
      if (banner) {
        banner.textContent = result.message;
        banner.hidden = false;
      }
    }
    return true;
  } catch (err) {
    if (modal) {
      modalFailure = err.message;
      const box = overlay.querySelector(".form-error");
      if (box) {
        box.textContent = err.message;
        box.hidden = false;
      } else drawModal();
    }
    notify(err.message, true);
    return false;
  }
}
window.addEventListener("storage", (e) => {
  if (e.key === key) {
    state = load();
    render();
    notify("Transport records updated in another tab");
  }
});
const brand = () =>
  `<button type="button" class="brand" aria-label="SANBS RIDE home" data-action="nav" data-view="home"><span class="brand-mark"><svg width="23" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5s-6.4 7.1-6.4 11.6a6.4 6.4 0 1 0 12.8 0C18.4 9.6 12 2.5 12 2.5Z" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/><path d="M9.3 14.5h5.4m-2.7-2.7v5.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span><span><strong>SANBS <em>RIDE</em></strong><small>DONOR TRANSPORT</small></span></button>`;
function demoMenu() {
  return `<div class="demo-dropdown" ${menu ? "" : "hidden"}><div class="dropdown-label">PRESENTATION · SWITCH ROLE</div>${Object.entries(
    roleNames,
  )
    .map(
      ([key, name], n) =>
        `<button data-action="role" data-role="${key}" aria-pressed="${key === role}">${i(["heart", "car-front", "heart-handshake", "radio-tower"][n], 17)}<span>${name}</span>${role === key ? i("check", 16) : ""}</button>`,
    )
    .join("")}${
    role === "driver"
      ? `<label class="driver-select">Demo driver<select data-action="select-driver">${Object.entries(
          drivers,
        )
          .map(
            ([id, d]) =>
              `<option value="${id}" ${driver === id ? "selected" : ""}>${d.name}</option>`,
          )
          .join("")}</select></label>`
      : ""
  }<div class="dropdown-divider"></div><button data-action="reset">${i("rotate-ccw", 17)}<span>Reset demo</span></button></div>`;
}
function render({ preserve = false } = {}) {
  const current = document.activeElement,
    input =
      preserve && current?.matches('[data-filter="query"]')
        ? { start: current.selectionStart, end: current.selectionEnd }
        : null;
  const nav = role === "donor" ? donorNav : driverNav;
  document.body.dataset.role = role;
  document.title = `SANBS RIDE · ${roleNames[role]}`;
  root.innerHTML = `<div class="app-shell"><a class="skip-link" href="#main">Skip to content</a><header class="topbar"><div class="topbar-inner">${brand()}${mobile() ? `<nav class="top-nav" aria-label="${roleNames[role]} navigation">${navLinks(nav, view)}</nav>` : `<span class="header-workspace">${roleNames[role]}</span>`}<div class="top-tools"><div class="demo"><button class="demo-trigger" data-action="menu" aria-expanded="${menu}">${i("layers-2", 16)}<span>Demo mode</span>${i("chevron-down", 14)}</button>${demoMenu()}</div><span class="tool-divider"></span><button class="top-bell icon-btn" aria-label="Activity and notifications" data-action="activity">${i("bell", 19)}${state.bookings.some((x) => x.history.length > (x.id === "SR-1042" ? 2 : 0) && (role !== "donor" || x.donor === "thabo")) ? '<span class="bell-dot"></span>' : ""}</button><span class="avatar header-avatar" aria-label="${roleNames[role]} profile">${role === "donor" ? "TM" : role === "driver" ? initials(drivers[driver].name) : role === "staff" ? "SS" : "TO"}</span></div></div></header>
  ${mobile() ? `<main id="main" class="mobile-main">${role === "donor" ? donorView(state, view, zoom) : driverView(state, view, driver, zoom)}</main><nav class="bottom-nav" aria-label="${roleNames[role]} navigation">${navLinks(nav, view)}</nav><footer class="app-footer"><div><span><strong>SANBS RIDE</strong><span class="footer-dot"></span> Transport coordination prototype</span><span>${i("info", 14)} Simulated data · No live tracking</span></div></footer>` : workplace(state, role, view, filters)}</div>`;
  if (input) {
    const el = root.querySelector('[data-filter="query"]');
    el?.focus({ preventScroll: true });
    el?.setSelectionRange(input.start, input.end);
  }
  if (modal) drawModal();
}
function move(next) {
  view = next;
  filters = {};
  zoom = 1;
  menu = false;
  closeModal(false);
  render();
  window.scrollTo(0, 0);
}
function open(type, props = {}) {
  const dialog = overlay.querySelector("dialog");
  if (!dialog?.open) lastFocus = document.activeElement;
  modalFailure = "";
  modal = { type, ...props };
  drawModal();
}
function closeModal(restore = true) {
  if (!modal) return;
  const dialog = overlay.querySelector("dialog");
  if (dialog?.open) dialog.close();
  overlay.innerHTML = "";
  modal = null;
  modalFailure = "";
  if (restore && lastFocus?.isConnected) lastFocus.focus();
}
function draftStart(staff) {
  draft = {
    ...newBooking(),
    staff,
    step: staff ? 0 : 1,
    donor: staff ? "" : "thabo",
  };
  open("booking");
}
function bookingForm() {
  const d = draft,
    b = booking(d.result),
    labels = ["Appointment", "Pickup", "Preferences", "Review"];
  if (d.step === 5 && !b)
    return {
      title: "Booking no longer available",
      label: "TRANSPORT REQUEST",
      html: "<p>The demo may have been reset in another tab.</p>",
    };
  if (d.step === 5)
    return {
      title: "Booking confirmed",
      label: "TRANSPORT REQUEST",
      html: `<div class="confirm-content">${iconBox("circle-check-big", "success")}<h2>Your transport is requested.</h2><p>Transport Operations will assign a driver. You’ll see the next update on the journey record.</p><div class="confirm-ref"><small>BOOKING REFERENCE</small><strong>${b.id}</strong>${chip("Awaiting assignment", "amber")}</div><p><strong>${sites[b.site].name}</strong><br>${dateText(b.date)} · ${b.time} SAST</p>${arrow(d.staff ? "Open booking" : "View my journey", "booking-done", "primary")}</div>`,
    };
  const titles = [
    "Find a donor",
    "Choose an appointment",
    "Confirm pickup details",
    "Transport preferences",
    "Review your journey",
  ];
  let html = "";
  if (d.step === 0)
    html = `<label class="search-field donor-search">${i("search", 18)}<input placeholder="Search by donor name or number" aria-label="Search donor directory" data-donor-search></label><div class="donor-options">${Object.entries(
      donors,
    )
      .map(
        ([id, p]) =>
          `<button type="button" data-action="choose-donor" data-donor="${id}" data-donor-text="${esc(`${p.name} ${p.phone}`.toLowerCase())}"><span class="avatar">${initials(p.name)}</span><span><strong>${p.name}</strong><small>${p.phone}${donorBookings(state, id).length ? " · Existing booking" : ""}</small></span>${i("chevron-right", 19)}</button>`,
      )
      .join("")}<p data-no-donors hidden>No matching donors.</p></div>`;
  if (d.step === 1)
    html = `<p class="form-lead">${d.staff ? `Booking on behalf of <strong>${donors[d.donor].name}</strong>.` : "Choose the donation appointment you need a ride for."}</p><div class="option-list">${Object.entries(
      sites,
    )
      .map(([id, p]) => {
        const time =
          id === donors[d.donor].site
            ? donors[d.donor].time
            : id === "rosebank"
              ? "12:30"
              : "10:00";
        return `<label class="option"><input type="radio" name="site" value="${id}" data-time="${time}" ${d.site === id ? "checked" : ""}><span><strong>${p.name}</strong><small>${dateText(today(), { weekday: "short", day: "numeric", month: "short" })} · ${time} SAST · ${p.type}</small></span>${i("map-pin", 18)}</label>`;
      })
      .join("")}</div>`;
  if (d.step === 2)
    html = `${field("Pickup address", "pickup", d.pickup, "text", 'required maxlength="150" autocomplete="street-address"')}<details class="pin-picker" ${d.pinOpen ? "open" : ""}><summary>${i("map-pin", 17)} Check pickup on a map</summary><div class="map-wrap pin-map">${map({ site: d.site, selection: true })}</div><div class="pin-options">${button("Use saved home address", "use-pin", "house", "secondary tiny", 'data-pin="home"')}${button("Use main entrance", "use-pin", "map-pin", "secondary tiny", 'data-pin="entrance"')}</div><small>Map pins and routes are illustrative.</small></details>${field("Contact number", "phone", d.phone, "tel", 'required maxlength="26" autocomplete="tel"')}${d.staff ? field("Scheduled pickup time (SAST)", "pickupAt", d.pickupAt, "time", "required") : ""}${textarea("Pickup notes (optional)", "notes", d.notes, "For example, which entrance to use.")}`;
  if (d.step === 3)
    html = `<div class="inline-note">${i("car-front", 19)} Transport to your donation appointment is included.</div><label class="check-option"><input type="checkbox" name="needsReturn" ${d.needsReturn ? "checked" : ""}><span><strong>I need a return ride</strong><small>SANBS staff will confirm when the donor is ready to leave.</small></span></label>${textarea("Accessibility or transport requirements (optional)", "requirements", d.requirements, "For example, space for a folding wheelchair.")}<p class="info-text">Only include transport needs, not clinical details.</p>`;
  if (d.step === 4)
    html = `<p class="form-lead">Check the details before sending the request to Transport Operations.</p>${routeList(d)}<dl class="facts compact"><div><dt>Donor</dt><dd>${donors[d.donor].name}</dd></div><div><dt>Appointment</dt><dd>${dateText(d.date)} · ${d.time} SAST</dd></div><div><dt>Estimated pickup</dt><dd>${esc(d.pickupAt)} SAST</dd></div><div><dt>Contact number</dt><dd>${esc(d.phone)}</dd></div><div><dt>Return ride</dt><dd>${d.needsReturn ? "Requested · subject to staff authorisation" : "Not requested"}</dd></div>${d.notes ? `<div><dt>Pickup notes</dt><dd>${esc(d.notes)}</dd></div>` : ""}${d.requirements ? `<div><dt>Transport requirements</dt><dd>${esc(d.requirements)}</dd></div>` : ""}</dl>`;
  return {
    title: titles[d.step],
    label: d.staff ? "STAFF-ASSISTED BOOKING" : "REQUEST TRANSPORT",
    html: `${d.step > 0 ? `<div class="wizard-steps">${labels.map((x, n) => `<div class="${n + 1 <= d.step ? "active" : ""}"><span></span><small>${x}</small></div>`).join("")}</div>` : ""}<form id="booking-form" class="form-stack">${html}<p class="form-error" ${modalFailure ? "" : "hidden"}>${esc(modalFailure)}</p>${d.step > 0 ? `<div class="modal-actions">${d.staff || d.step > 1 ? button("Back", "book-back", "arrow-left", "secondary") : button("Cancel", "close", "", "secondary")}<button class="btn primary" type="submit">${d.step === 4 ? "Confirm booking" : "Continue"} ${i("arrow-right", 17)}</button></div>` : ""}</form>`,
  };
}
const issues = {
  driver: [
    "Donor not present",
    "Incorrect pickup location",
    "Traffic delay",
    "Vehicle issue",
    "Trip cancellation",
    "Safety concern",
  ],
  donor: [
    "Driver unable to find me",
    "Change my pickup location",
    "I missed my pickup",
    "Other transport issue",
  ],
  staff: ["Trip delayed", "Donor unable to travel", "Transport issue"],
};
function modalContent() {
  const { type, id, leg, issue } = modal,
    b = booking(id),
    attrs = `data-id="${id || ""}" data-leg="${leg || ""}"`;
  if (type === "booking") return bookingForm();
  if (type === "reset")
    return {
      title: "Reset the demo?",
      label: "PRESENTATION MODE",
      html: `<p>This removes demo bookings, exceptions and settings changes. Thabo, the driver roster and the sample trip will be restored.</p><div class="modal-actions">${button("Cancel", "close", "", "secondary")}${button("Reset demo", "confirm-reset", "rotate-ccw", "primary")}</div>`,
    };
  if (type === "detail" && b)
    return {
      title: "Journey record",
      label: "TRANSPORT RECORD",
      drawer: true,
      html: bookingDetail(state, b, leg, role),
    };
  if (type === "assign" && b?.[leg]) {
    const choices = Object.entries(drivers).filter(([id]) =>
      available(state, id),
    );
    return {
      title: b[leg].driver ? "Change assigned driver" : "Assign a driver",
      label: `DISPATCH · ${b.id}`,
      html: `<p>${leg === "return" ? "Return" : "Outbound"} trip for <strong>${donors[b.donor].name}</strong>. Only available drivers in the current operating model are shown.</p><div class="assignment-list">${choices.length ? choices.map(([id, d]) => `<button data-action="confirm-assign" data-driver="${id}" ${attrs}><span class="avatar">${initials(d.name)}</span><span><strong>${d.name}</strong><small>${d.type} · ${d.vehicle}</small></span>${i("arrow-right", 18)}</button>`).join("") : empty("No available drivers", "Check the driver roster or current operating model.", "users-round")}</div><div class="modal-actions">${button("Back to record", "detail", "arrow-left", "secondary", attrs)}</div>`,
    };
  }
  if (type === "help")
    return {
      title: "How can we help?",
      label: "TRANSPORT SUPPORT",
      html: `<p>Choose what you need help with. This demo logs requests for Transport Operations; it does not contact a live team.</p><div class="help-options">${[["Contact support", "headset", "support"], ["Report a transport issue", "flag", "report"], ...issues.donor.slice(0, 3).map((x, n) => [x, ["map-pin", "locate-fixed", "clock-3"][n], "report"])].map(([x, ic, to], n) => `<button data-action="${to}" ${n > 1 ? `data-label="${esc(x)}"` : ""}>${i(ic, 19)} <span>${x}</span>${i("chevron-right", 18)}</button>`).join("")}</div>`,
    };
  if (type === "issue")
    return {
      title: "Report a transport issue",
      label: b ? `EXCEPTION · ${b.id}` : "TRANSPORT SUPPORT",
      html: `<form id="issue-form" class="form-stack">${select("Issue type", "label", Object.fromEntries((issues[role] || issues.staff).map((x) => [x, x])), modal.label)}${textarea("Add context (optional)", "detail", "", "Only share details needed to coordinate transport.")}<p class="form-error" ${modalFailure ? "" : "hidden"}>${esc(modalFailure)}</p><div class="modal-actions">${button("Cancel", "close", "", "secondary")}<button class="btn primary" type="submit">Send report ${i("send", 16)}</button></div></form>`,
    };
  if (type === "exception") {
    const x = state.issues.find((x) => x.id === issue);
    if (!x) return;
    return {
      title: x.label,
      label: "TRANSPORT EXCEPTION",
      html: `${chip(x.resolved ? "Resolved" : "Open", x.resolved ? "green" : "amber")}<dl class="facts compact"><div><dt>Booking</dt><dd>${x.booking || "General support"}</dd></div><div><dt>Reported by</dt><dd>${esc(x.actor)}</dd></div><div><dt>Reported at</dt><dd>${stamp(x.time)}</dd></div><div><dt>Details</dt><dd>${esc(x.detail || "No additional details provided.")}</dd></div></dl><div class="modal-actions">${x.booking ? button("Open journey", "detail", "", "secondary", `data-id="${x.booking}" data-leg="${x.leg || "outbound"}"`) : ""}${!x.resolved && role === "ops" ? button("Mark resolved", "resolve", "check", "primary", `data-issue="${x.id}"`) : ""}</div>`,
    };
  }
  if (type === "contact")
    return {
      title: modal.contact === "driver" ? "Contact driver" : "Contact donor",
      label: "SIMULATED CONTACT",
      html: `<p>${b ? esc(modal.contact === "driver" ? drivers[b[leg]?.driver]?.phone : b.phone) : "No number available."}</p><p class="info-text">Calls are disabled in this prototype.</p><div class="modal-actions">${button("Close", "close", "", "secondary")}</div>`,
    };
  if (type === "support")
    return {
      title: "Contact transport support",
      label: "SIMULATED SUPPORT",
      html: `<p>For a pickup or journey problem, send a report to the demo operations queue. No phone call or external message will be sent.</p><div class="modal-actions">${button("Back", "help", "arrow-left", "secondary")}${button("Send a report", "report", "flag", "primary")}</div>`,
    };
  if (type === "activity") {
    const list = (
      role === "donor"
        ? donorBookings(state)
        : role === "driver"
          ? state.bookings.filter((b) =>
              [b.outbound.driver, b.return?.driver].includes(driver),
            )
          : state.bookings
    )
      .flatMap((b) => b.history.map((h) => ({ ...h, id: b.id })))
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 12);
    return {
      title: "Recent activity",
      label: "DEMO NOTIFICATIONS",
      html: list.length
        ? `<ol class="history activity">${list.map((x) => `<li><strong>${esc(x.text)}</strong><small>${x.id} · ${stamp(x.time)}</small></li>`).join("")}</ol>`
        : empty(
            "No updates yet",
            "Updates will appear as your transport progresses.",
            "bell",
          ),
    };
  }
  return {
    title: "Record unavailable",
    label: "SANBS RIDE",
    html: "<p>This record is no longer available.</p>",
  };
}
function drawModal() {
  if (!modal) return;
  const content = modalContent();
  let dialog = overlay.querySelector("dialog");
  const fresh = !dialog;
  if (fresh) {
    overlay.innerHTML = '<dialog aria-labelledby="dialog-title"></dialog>';
    dialog = overlay.firstElementChild;
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeModal();
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          closeModal();
      }
    });
  }
  dialog.className = `dialog ${content.drawer ? "drawer" : ""} ${modal.type === "booking" ? "wizard" : ""}`;
  dialog.innerHTML = `<div class="modal-head"><div><span class="label">${esc(content.label)}</span><h2 id="dialog-title">${esc(content.title)}</h2></div><button type="button" class="icon-btn" data-action="close" aria-label="Close dialog">${i("x", 21)}</button></div><div class="modal-body"><p class="modal-feedback" role="status" hidden></p>${content.html}</div>`;
  dialog.scrollTop = 0;
  if (fresh) dialog.showModal();
  else
    dialog
      .querySelector('[data-action="close"]')
      ?.focus({ preventScroll: true });
}
function saveDraft(form) {
  const data = new FormData(form);
  if (draft.step === 1) {
    const selected = form.querySelector("[name=site]:checked");
    if (selected) {
      draft.site = selected.value;
      draft.time = selected.dataset.time;
      draft.pickupAt = pickupTime(draft.time);
    }
  }
  if (draft.step === 2) {
    for (const name of ["pickup", "phone", "notes", "pickupAt"])
      if (data.has(name)) draft[name] = data.get(name).trim();
    draft.pinOpen = form.querySelector("details")?.open;
  }
  if (draft.step === 3) {
    draft.needsReturn = data.has("needsReturn");
    draft.requirements = data.get("requirements").trim();
  }
}

document.addEventListener("submit", (e) => {
  if (!e.target.matches("#booking-form,#issue-form")) return;
  e.preventDefault();
  if (e.target.id === "issue-form") {
    const data = new FormData(e.target);
    dispatch({
      type: "issue",
      id: modal.id,
      leg: modal.leg,
      label: data.get("label"),
      detail: data.get("detail").trim().slice(0, 500),
      actor: actor(),
    });
    return;
  }
  saveDraft(e.target);
  modalFailure = "";
  if (draft.step === 4) {
    const { step, staff, pinOpen, ...values } = draft;
    const oldNext = state.next;
    try {
      const result = update(state, {
        type: "book",
        values,
        origin: staff ? "Staff-assisted" : "Donor self-booked",
      });
      state = result.state;
      store();
      draft.step = 5;
      draft.result = `SR-${oldNext}`;
      render();
      notify(result.message);
    } catch (err) {
      modalFailure = err.message;
      drawModal();
      notify(err.message, true);
    }
  } else {
    draft.step++;
    drawModal();
  }
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.matches('[data-filter="query"]')) {
    filters.query = el.value;
    render({ preserve: true });
  }
  if (el.matches("[data-donor-search]")) {
    const q = el.value.toLowerCase().trim();
    let n = 0;
    overlay.querySelectorAll("[data-donor-text]").forEach((x) => {
      x.hidden = !x.dataset.donorText.includes(q);
      if (!x.hidden) n++;
    });
    overlay.querySelector("[data-no-donors]").hidden = !!n;
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.matches('[data-filter]:not([data-filter="query"])')) {
    filters[el.dataset.filter] = el.value;
    render();
  }
  if (el.dataset.action === "select-driver") {
    driver = el.value;
    move("home");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menu) {
    menu = false;
    render();
    root.querySelector(".demo-trigger")?.focus();
  }
});
document.addEventListener("click", (e) => {
  const el = e.target.closest("button[data-action]");
  if (menu && !e.target.closest(".demo")) {
    menu = false;
    root.querySelector(".demo-dropdown").hidden = true;
    root.querySelector(".demo-trigger").setAttribute("aria-expanded", "false");
  }
  if (!el || el.disabled) return;
  const { action, id, leg, issue } = el.dataset,
    props = { id, leg, issue };
  switch (action) {
    case "menu":
      menu = !menu;
      root.querySelector(".demo-dropdown").hidden = !menu;
      el.setAttribute("aria-expanded", menu);
      break;
    case "role":
      role = el.dataset.role;
      if (role === "driver") {
        const current = legs(state).find(
          ({ b, t }) =>
            b.donor === "thabo" &&
            t.driver &&
            !["done", "delivered"].includes(t.state),
        );
        if (current) driver = current.t.driver;
      }
      move("home");
      break;
    case "nav":
      move(el.dataset.view);
      break;
    case "zoom":
      zoom = Math.min(
        1.4,
        Math.max(1, Math.round((zoom + Number(el.dataset.delta)) * 10) / 10),
      );
      render();
      break;
    case "reset":
      menu = false;
      root.querySelector(".demo-dropdown").hidden = true;
      root
        .querySelector(".demo-trigger")
        .setAttribute("aria-expanded", "false");
      open("reset");
      break;
    case "confirm-reset":
      state = seed();
      store();
      role = "donor";
      driver = "sipho";
      draft = null;
      move("home");
      notify("Demo reset · Ready to book a ride");
      break;
    case "close":
      closeModal();
      break;
    case "book-donor":
      if (!thabo()) draftStart(false);
      else move("journey");
      break;
    case "book-staff":
      draftStart(true);
      break;
    case "choose-donor": {
      const existing = donorBookings(state, el.dataset.donor).find(
        (b) => !complete(b),
      );
      if (existing) {
        open("detail", {
          id: existing.id,
          leg: existing.return ? "return" : "outbound",
        });
        notify("This donor already has an active journey");
      } else {
        Object.assign(draft, newBooking(el.dataset.donor), { step: 1 });
        drawModal();
      }
      break;
    }
    case "book-back":
      saveDraft(overlay.querySelector("#booking-form"));
      draft.step--;
      modalFailure = "";
      drawModal();
      break;
    case "booking-done":
      if (draft.staff) {
        const id = draft.result;
        move("journeys");
        open("detail", { id, leg: "outbound" });
      } else move("journey");
      break;
    case "use-pin": {
      const form = overlay.querySelector("#booking-form");
      form.elements.pickup.value = donors[draft.donor].pickup;
      if (el.dataset.pin === "entrance")
        form.elements.notes.value = "Meet me at the main entrance.";
      else form.elements.notes.value = donors[draft.donor].notes;
      notify("Demo pickup location selected");
      break;
    }
    case "detail":
      open("detail", { ...props, leg: leg || "outbound" });
      break;
    case "assign":
      open("assign", props);
      break;
    case "confirm-assign":
      if (
        dispatch(
          {
            type: "assign",
            id,
            leg,
            driver: el.dataset.driver,
            actor: actor(),
          },
          { keep: true },
        )
      )
        open("detail", props);
      break;
    case "advance":
      dispatch(
        {
          type: "advance",
          id,
          leg,
          driver: el.dataset.driver || driver,
          expected: el.dataset.stage,
          actor: role === "ops" ? "Transport partner (simulated)" : undefined,
        },
        { keep: role === "ops" },
      );
      break;
    case "decline":
      dispatch({ type: "decline", id, leg, driver });
      break;
    case "availability":
      dispatch({ type: "availability", driver: el.dataset.driver || driver });
      break;
    case "model":
      dispatch({ type: "model", model: el.dataset.model });
      break;
    case "checkin":
    case "authorise":
      dispatch({ type: action, id }, { keep: true });
      break;
    case "flag-delay":
      open("issue", { ...props, label: "Trip delayed" });
      break;
    case "driver-issue":
      open("issue", props);
      break;
    case "report":
      open("issue", {
        id: thabo()?.id,
        leg: thabo()?.return ? "return" : "outbound",
        label: el.dataset.label,
      });
      break;
    case "exception-detail":
      open("exception", props);
      break;
    case "resolve":
      dispatch({ type: "resolve", issue }, { keep: true });
      break;
    case "contact":
      open("contact", { ...props, contact: el.dataset.contact });
      break;
    case "help":
    case "support":
    case "activity":
      open(action);
      break;
  }
});
render();
