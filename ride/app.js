import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/latin-800.css";
import "./style.css";
import "./experience.css";
import sanbsLogo from "./sanbs-logo.png";
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
import { roomRequest } from "./room-client.js";

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
  workSelection = null,
  zoom = 1,
  menu = false,
  modal = null,
  draft = null,
  timer,
  lastFocus,
  modalFailure = "";
const roomUrl = new URL(location.href);
let roomId = roomUrl.searchParams.get("room"),
  roomRevision = null,
  roomStatus = roomId !== null ? "connecting" : "solo",
  roomError = "",
  roomExpiry,
  pending = false,
  polling = false,
  pollTimer,
  pushEnabled = false,
  pushSource,
  pushActive = false,
  pendingRevision = -1,
  driverPinned = false;
const isShared = () => roomId !== null;
const roomPrefs = () => {
  try {
    return JSON.parse(sessionStorage.getItem(`sanbs-ride-session:${roomId}`));
  } catch {
    return null;
  }
};
function rememberRole() {
  if (!isShared()) return;
  try {
    sessionStorage.setItem(
      `sanbs-ride-session:${roomId}`,
      JSON.stringify({ role, driver, driverPinned }),
    );
  } catch {
    /* session still works if browser storage is blocked */
  }
}
function followDriver() {
  if (role !== "driver" || (isShared() && driverPinned)) return;
  const current = legs(state).find(
    ({ b, t }) =>
      b.donor === "thabo" &&
      t.driver &&
      !["done", "delivered"].includes(t.state),
  );
  if (current) driver = current.t.driver;
}
function acceptRoom(record) {
  if (
    !record ||
    record.room !== roomId ||
    !Number.isInteger(record.revision) ||
    record.revision < (roomRevision ?? -1)
  )
    return false;
  const changed = record.revision !== roomRevision;
  roomRevision = record.revision;
  roomExpiry = record.expiresAt;
  state = record.state;
  if (typeof record.push === "boolean") {
    pushEnabled = record.push;
    if (!pushEnabled) closePush();
  }
  roomStatus = "live";
  roomError = "";
  followDriver();
  return changed;
}
function closePush() {
  pushSource?.close();
  pushSource = undefined;
  pushActive = false;
  pendingRevision = -1;
}
function connectPush() {
  if (
    !pushEnabled ||
    pushSource ||
    !isShared() ||
    document.hidden ||
    typeof EventSource !== "function"
  )
    return;
  const target = roomId;
  const source = new EventSource(
    `/api/rooms?room=${encodeURIComponent(target)}&watch=1`,
  );
  pushSource = source;
  source.addEventListener("revision", (e) => {
    if (source !== pushSource || target !== roomId) return;
    pushActive = true;
    pendingRevision = Math.max(pendingRevision, Number(e.data) || 0);
    if (pendingRevision > (roomRevision ?? -1)) schedulePoll(true);
    else schedulePoll();
  });
  source.onerror = () => {
    if (source !== pushSource) return;
    pushActive = false;
    // Native EventSource reconnects after intentional stream rotation. If a
    // proxy blocks streams entirely, stay on polling until the next refresh.
    if (source.readyState === EventSource.CLOSED) pushEnabled = false;
    schedulePoll(true);
  };
}
function schedulePoll(immediate = false) {
  clearTimeout(pollTimer);
  if (isShared() && roomStatus !== "unavailable")
    pollTimer = setTimeout(
      pollRoom,
      immediate ? 0 : document.hidden ? 9000 : pushActive ? 15000 : 2000,
    );
}
async function pollRoom() {
  if (!isShared()) return;
  if (pending || polling) {
    schedulePoll();
    return;
  }
  const target = roomId,
    prev = roomStatus,
    first = roomRevision === null;
  polling = true;
  try {
    const record = await roomRequest({ room: target });
    if (roomId !== target) return;
    const changed = acceptRoom(record);
    connectPush();
    if (changed || prev !== roomStatus)
      render({ preserve: true, refresh: true });
    if (first && !roomPrefs()) open("choose-role");
    else if (changed)
      notify(
        first
          ? "Joined the shared test session"
          : record.message || "Shared session updated",
      );
  } catch (err) {
    if (roomId !== target) return;
    roomStatus =
      err.status === 400 ||
      err.status === 404 ||
      err.code === "ROOMS_NOT_CONFIGURED"
        ? "unavailable"
        : "reconnecting";
    roomError = err.message;
    if (prev !== roomStatus || first) render({ preserve: true, refresh: true });
  } finally {
    polling = false;
    schedulePoll();
    // A notification can beat an eventually consistent GET. Retry briefly without spinning.
    if (
      pushActive &&
      pendingRevision > (roomRevision ?? -1) &&
      roomStatus === "live"
    ) {
      clearTimeout(pollTimer);
      pollTimer = setTimeout(pollRoom, 300);
    }
  }
}
function invitation() {
  const url = new URL(location.href);
  const share = url.searchParams.get("vercel-share");
  url.search = "";
  url.hash = "";
  if (share) url.searchParams.set("vercel-share", share);
  url.searchParams.set("room", roomId);
  return url.href;
}
function exitRoom() {
  clearTimeout(pollTimer);
  closePush();
  pushEnabled = false;
  roomId = null;
  roomRevision = null;
  roomStatus = "solo";
  roomError = "";
  roomExpiry = undefined;
  const url = new URL(location.href);
  url.searchParams.delete("room");
  history.replaceState(null, "", url);
  state = load();
  role = "donor";
  driver = "sipho";
  driverPinned = false;
  draft = null;
  move("home");
}
async function startRoom() {
  pending = true;
  try {
    const record = await roomRequest({ body: { operation: "create" } });
    roomId = record.room;
    roomRevision = null;
    acceptRoom(record);
    history.replaceState(null, "", invitation());
    rememberRole();
    menu = false;
    closeModal(false);
    render();
    open("invite");
    connectPush();
    schedulePoll();
    notify("Shared session created. Send this link to your testers.");
  } catch (err) {
    showFailure(err.message);
  } finally {
    pending = false;
  }
}
async function copyInvite() {
  const input = overlay.querySelector("[data-invitation]");
  try {
    await navigator.clipboard.writeText(invitation());
    showModalFeedback("Invite link copied");
  } catch {
    input?.focus();
    input?.select();
    showModalFeedback("Link selected. Copy it to share with your testers.");
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    closePush();
    schedulePoll();
  } else schedulePoll(true);
});
window.addEventListener("online", () => {
  if (isShared()) {
    roomStatus = "reconnecting";
    schedulePoll(true);
  }
});
window.addEventListener("offline", () => {
  if (isShared()) {
    roomStatus = "reconnecting";
    roomError =
      "Your device is offline. Changes won’t be saved until it reconnects.";
    render({ preserve: true, refresh: true });
  }
});
if (isShared()) {
  const saved = roomPrefs();
  if (saved && Object.hasOwn(roleNames, saved.role)) role = saved.role;
  if (saved && Object.hasOwn(drivers, saved.driver)) driver = saved.driver;
  driverPinned = saved?.driverPinned === true;
}
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
function showModalFeedback(message, error = false) {
  const banner = overlay.querySelector(".modal-feedback");
  if (banner) {
    banner.textContent = message;
    banner.classList.toggle("error", error);
    banner.hidden = false;
  }
}
function showFailure(message) {
  modalFailure = message;
  const box = overlay.querySelector(".form-error");
  if (box) {
    box.textContent = message;
    box.hidden = false;
  } else showModalFeedback(message, true);
  notify(message, true);
}
async function dispatch(action, { keep = false, onSuccess } = {}) {
  if (pending) return false;
  const target = roomId;
  if (isShared() && roomStatus !== "live") {
    showFailure(
      "The shared session is not connected. Wait for the connection before submitting a change.",
    );
    return false;
  }
  pending = true;
  if (isShared()) showModalFeedback("Saving to the shared session…");
  try {
    let result;
    if (isShared()) {
      result = await roomRequest({
        body: {
          operation: "act",
          room: target,
          revision: roomRevision,
          role,
          driver,
          action,
        },
      });
      if (roomId !== target) return false;
      acceptRoom(result);
    } else {
      result = update(state, action);
      if (action.type === "book") result.bookingId = `SR-${state.next}`;
      state = result.state;
      store();
    }
    if (!keep) closeModal(false);
    else modalFailure = "";
    onSuccess?.(result);
    render();
    notify(result.message);
    if (keep && modal && action.type !== "book")
      showModalFeedback(result.message);
    return true;
  } catch (err) {
    if (isShared() && (!err.status || err.status >= 500)) {
      roomStatus = "reconnecting";
      roomError = err.message;
      render({ preserve: true, refresh: true });
      schedulePoll(true);
    } else if (err.latest) {
      acceptRoom(err.latest);
      render({ preserve: true, refresh: true });
    } else if (err.status === 404) {
      roomStatus = "unavailable";
      roomError = err.message;
      render({ preserve: true, refresh: true });
    }
    showFailure(err.message);
    return false;
  } finally {
    pending = false;
    if (pushActive && pendingRevision > (roomRevision ?? -1))
      schedulePoll(true);
  }
}
window.addEventListener("storage", (e) => {
  if (e.key === key && !isShared()) {
    state = load();
    render();
    notify("Transport records updated in another tab");
  }
});
const brand = () =>
  `<button type="button" class="brand" aria-label="SANBS RIDE home" data-action="nav" data-view="home"><img class="sanbs-logo" src="${sanbsLogo}" width="48" height="48" alt=""><span class="brand-product"><strong>RIDE</strong><small>DONOR TRANSPORT</small></span></button>`;

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
  }<div class="dropdown-divider"></div>${isShared() ? `<button data-action="invite">${i("users-round", 17)}<span>Share session link</span></button><button data-action="leave-room">${i("arrow-left", 17)}<span>Leave shared session</span></button>` : `<button data-action="shared">${i("users-round", 17)}<span>Shared testing</span></button><button data-action="reset">${i("rotate-ccw", 17)}<span>Reset demo</span></button>`}</div>`;
}
function sessionBar() {
  if (!isShared()) return "";
  const captions = {
    live: "Live test session",
    connecting: "Joining shared session…",
    reconnecting: "Reconnecting · changes paused",
    unavailable: "Shared session unavailable",
  };
  return `<div class="session-bar ${roomStatus}"><div><span class="session-label" role="status"><span></span>${captions[roomStatus]}</span><span class="session-role">${roleNames[role]}${role === "driver" ? ` · ${drivers[driver].name}` : ""}</span></div><button class="session-share" data-action="${roomRevision === null ? "retry-room" : "invite"}">${i(roomRevision === null ? "rotate-ccw" : "users-round", 16)} ${roomRevision === null ? "Retry" : "Invite"}</button></div>`;
}
function render({ preserve = false, refresh = false } = {}) {
  const itineraryOpen = !!root.querySelector(".driver-itinerary[open]"),
    current = document.activeElement,
    input =
      preserve && current?.matches('[data-filter="query"]')
        ? { start: current.selectionStart, end: current.selectionEnd }
        : null;
  const nav = role === "donor" ? donorNav : driverNav;
  document.body.dataset.role = role;
  document.title = `SANBS RIDE · ${roleNames[role]}`;
  root.innerHTML = `<div class="app-shell"><a class="skip-link" href="#main">Skip to content</a><header class="topbar"><div class="topbar-inner">${brand()}${mobile() ? `<nav class="top-nav" aria-label="${roleNames[role]} navigation">${navLinks(nav, view)}</nav>` : `<span class="header-workspace">${roleNames[role]}</span>`}<div class="top-tools"><div class="demo"><button class="demo-trigger" data-action="menu" aria-expanded="${menu}">${i("layers-2", 16)}<span>Demo mode</span>${i("chevron-down", 14)}</button>${demoMenu()}</div><span class="tool-divider"></span><button class="top-bell icon-btn" aria-label="Activity and notifications" data-action="activity">${i("bell", 19)}${state.bookings.some((x) => x.history.length > (x.id === "SR-1042" ? 2 : 0) && (role !== "donor" || x.donor === "thabo")) ? '<span class="bell-dot"></span>' : ""}</button><span class="avatar header-avatar" aria-label="${roleNames[role]} profile">${role === "donor" ? "TM" : role === "driver" ? initials(drivers[driver].name) : role === "staff" ? "SS" : "TO"}</span></div></div></header>${sessionBar()}
  ${isShared() && roomRevision === null ? `<main class="consumer-content session-entry" id="main"><section class="panel">${empty(roomStatus === "connecting" ? "Joining your team…" : "Couldn’t open the shared session", esc(roomError || "Loading the shared transport records."), "users-round", button("Return to solo demo", "exit-room", "arrow-left", "secondary"))}</section></main>` : mobile() ? `<main id="main" class="mobile-main">${role === "donor" ? donorView(state, view, zoom) : driverView(state, view, driver, zoom)}</main><nav class="bottom-nav" aria-label="${roleNames[role]} navigation">${navLinks(nav, view)}</nav><footer class="app-footer"><div><span><strong>SANBS RIDE</strong><span class="footer-dot"></span> Transport coordination prototype</span><span>${i("info", 14)} Simulated data · No live tracking</span></div></footer>` : workplace(state, role, view, filters, workSelection)}</div>`;
  if (itineraryOpen) {
    const itinerary = root.querySelector(".driver-itinerary");
    if (itinerary) itinerary.open = true;
  }
  if (input) {
    const el = root.querySelector('[data-filter="query"]');
    el?.focus({ preventScroll: true });
    el?.setSelectionRange(input.start, input.end);
  }
  if (
    modal &&
    (!refresh ||
      (roomStatus === "live" &&
        ["detail", "assign", "exception", "activity"].includes(modal.type)))
  )
    drawModal({ refresh });
}
function move(next) {
  view = next;
  filters = {};
  workSelection = null;
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
  if (type === "shared")
    return {
      title: "Test together on separate devices",
      label: "SHARED TESTING",
      html: `<p>Create a fresh session and send its invite link to your group. Each person picks a role. Bookings and updates are shared automatically.</p><p class="session-note">Use the seeded demo people and addresses only. Anyone with the link can switch roles; this is not a production login.</p><div class="modal-actions">${button("Cancel", "close", "", "secondary")}${button("Create shared session", "create-room", "users-round", "primary")}</div>`,
    };
  if (type === "invite")
    return {
      title: "Invite your testers",
      label: "SHARED TEST SESSION",
      html: `<p>Send this exact link to all four testers. They’ll choose Donor, Driver, SANBS Staff or Transport Operations when they open it.</p>${roomRevision === null ? "" : `<label class="field invite-field">Session link<input data-invitation readonly value="${esc(invitation())}"></label>`}<p class="session-note">This room expires 24 hours after creation. Use test data only and don’t post the link publicly.</p><div class="modal-actions">${button("Choose my role", "choose-role", "", "secondary")}${roomRevision === null ? "" : button("Copy invite link", "copy-invite", "", "primary")}</div>`,
    };
  if (type === "choose-role")
    return {
      title: "Choose your test role",
      label: "JOIN SHARED SESSION",
      html: `<p>Each tester should choose a different role. Updates appear automatically on the other devices.</p><div class="help-options">${Object.entries(
        roleNames,
      )
        .map(
          ([id, name], n) =>
            `<button data-action="role" data-role="${id}">${i(["heart", "car-front", "heart-handshake", "radio-tower"][n], 20)}<span><strong>${name}</strong><small>${["Book and track Thabo’s transport.", "Manage availability and update trips.", "Confirm arrival and authorise return.", "Assign drivers and manage exceptions."][n]}</small></span>${i("chevron-right", 18)}</button>`,
        )
        .join("")}</div>`,
    };
  if (type === "leave-room")
    return {
      title: "Leave the shared session?",
      label: "SHARED TEST SESSION",
      html: `<p>This device will return to its solo demo. Other testers can continue, and you can rejoin using the same link.</p><div class="modal-actions">${button("Cancel", "close", "", "secondary")}${button("Leave session", "exit-room", "arrow-left", "primary")}</div>`,
    };
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
function drawModal({ refresh = false } = {}) {
  if (!modal) return;
  const content = modalContent();
  let dialog = overlay.querySelector("dialog");
  const fresh = !dialog,
    oldScroll = dialog?.scrollTop || 0;
  if (fresh) {
    overlay.innerHTML = '<dialog aria-labelledby="dialog-title"></dialog>';
    dialog = overlay.firstElementChild;
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      if (!pending) closeModal();
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
          if (!pending) closeModal();
      }
    });
  }
  dialog.className = `dialog ${content.drawer ? "drawer" : ""} ${modal.type === "booking" ? "wizard" : ""}`;
  dialog.innerHTML = `<div class="modal-head"><div><span class="label">${esc(content.label)}${modal.type === "booking" && draft.step > 0 && draft.step < 5 ? ` <span class="wizard-count">/ STEP ${draft.step} OF 4</span>` : ""}</span><h2 id="dialog-title">${esc(content.title)}</h2></div><button type="button" class="icon-btn" data-action="close" aria-label="Close dialog">${i("x", 21)}</button></div><div class="modal-body"><p class="modal-feedback" role="status" hidden></p>${content.html}</div>`;
  dialog.scrollTop = refresh ? oldScroll : 0;
  if (fresh) dialog.showModal();
  else if (!refresh)
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
  if (pending) return;
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
    dispatch(
      {
        type: "book",
        values,
        origin: staff ? "Staff-assisted" : "Donor self-booked",
      },
      {
        keep: true,
        onSuccess(result) {
          draft.step = 5;
          draft.result = result.bookingId;
        },
      },
    );
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
    driverPinned = true;
    rememberRole();
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
document.addEventListener("click", async (e) => {
  const el = e.target.closest("button[data-action]");
  if (menu && !e.target.closest(".demo")) {
    menu = false;
    root.querySelector(".demo-dropdown").hidden = true;
    root.querySelector(".demo-trigger").setAttribute("aria-expanded", "false");
  }
  if (!el || el.disabled || pending) return;
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
      followDriver();
      rememberRole();
      move("home");
      break;
    case "shared":
      open("shared");
      break;
    case "create-room":
      await startRoom();
      break;
    case "invite":
      open("invite");
      break;
    case "copy-invite":
      await copyInvite();
      break;
    case "choose-role":
      open("choose-role");
      break;
    case "leave-room":
      open("leave-room");
      break;
    case "exit-room":
      exitRoom();
      break;
    case "retry-room":
      roomStatus = "connecting";
      roomError = "";
      render();
      schedulePoll(true);
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
      if (isShared()) break;
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
    case "inspect":
      if (matchMedia("(min-width: 1020px)").matches) {
        workSelection = { id, leg };
        render();
      } else open("detail", { ...props, leg: leg || "outbound" });
      break;
    case "work-assign":
      workSelection = { id, leg };
      await dispatch({
        type: "assign",
        id,
        leg,
        driver: el.dataset.driver,
        actor: actor(),
      });
      break;
    case "detail":
      open("detail", { ...props, leg: leg || "outbound" });
      break;
    case "assign":
      open("assign", props);
      break;
    case "confirm-assign":
      if (
        await dispatch(
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

schedulePoll(true);
