import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  Clock3,
  CornerDownLeft,
  Flag,
  FlaskConical,
  Headset,
  Heart,
  HeartHandshake,
  House,
  Inbox,
  Info,
  Layers2,
  LayoutDashboard,
  LocateFixed,
  Map,
  MapPin,
  Minus,
  Phone,
  Plus,
  Power,
  Radio,
  RadioTower,
  RotateCcw,
  Route,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Ticket,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide";

const icons = {
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  bell: Bell,
  "calendar-days": CalendarDays,
  "car-front": CarFront,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  circle: Circle,
  "circle-alert": CircleAlert,
  "circle-check": CircleCheck,
  "circle-check-big": CircleCheckBig,
  "clock-3": Clock3,
  "corner-down-left": CornerDownLeft,
  flag: Flag,
  "flask-conical": FlaskConical,
  headset: Headset,
  heart: Heart,
  "heart-handshake": HeartHandshake,
  house: House,
  inbox: Inbox,
  info: Info,
  "layers-2": Layers2,
  "layout-dashboard": LayoutDashboard,
  "locate-fixed": LocateFixed,
  map: Map,
  "map-pin": MapPin,
  minus: Minus,
  phone: Phone,
  plus: Plus,
  power: Power,
  radio: Radio,
  "radio-tower": RadioTower,
  "rotate-ccw": RotateCcw,
  route: Route,
  search: Search,
  send: Send,
  "settings-2": Settings2,
  "shield-check": ShieldCheck,
  ticket: Ticket,
  "user-plus": UserPlus,
  "user-round": UserRound,
  "users-round": UsersRound,
  x: X,
};
import { sites, statuses, status } from "./state.js";
export const esc = (s = "") =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function i(name, size = 20) {
  return (icons[name] || Circle)
    .replace("<svg", '<svg aria-hidden="true"')
    .replace('width="24"', `width="${size}"`)
    .replace('height="24"', `height="${size}"`)
    .replace('stroke-width="2"', 'stroke-width="1.75"');
}
export const roleNames = {
  donor: "Donor",
  driver: "Driver",
  staff: "SANBS Staff",
  ops: "Transport Operations",
};
export const initials = (name) =>
  name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
export const dateText = (
  date,
  options = { day: "numeric", month: "short", year: "numeric" },
) =>
  date
    ? new Intl.DateTimeFormat("en-ZA", { ...options, timeZone: "UTC" })
        .format(new Date(`${date}T12:00:00Z`))
        .replace(/^(\w+),? (\d+ \w+)(?:,)?( \d{4})?$/, "$1, $2$3")
    : "";
export const stamp = (iso) =>
  new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
export const button = (label, action, icon = "", style = "", attrs = "") =>
  `<button type="button" class="btn ${style}" data-action="${action}" ${attrs}>${icon ? i(icon, 17) : ""}<span>${label}</span></button>`;
export const arrow = (label, action, style = "", attrs = "") =>
  `<button type="button" class="btn ${style}" data-action="${action}" ${attrs}><span>${label}</span>${i("arrow-right", 18)}</button>`;
export const chip = (text, tone = "neutral") =>
  `<span class="chip ${tone}"><span></span>${esc(text)}</span>`;
export const tone = (state) =>
  ["queued", "assigned"].includes(state)
    ? "amber"
    : ["delivered", "done"].includes(state)
      ? "green"
      : ["accepted", "enroute", "arrived", "onboard"].includes(state)
        ? "blue"
        : "neutral";
export const bookingChip = (b) =>
  chip(
    status(b),
    b.checkedIn && !b.return && b.needsReturn
      ? "amber"
      : tone((b.return || b.outbound).state),
  );
export const tripChip = (t) =>
  chip(
    t.offer && t.state === "assigned" ? "Offered to driver" : statuses[t.state],
    tone(t.state),
  );
export const dividerTitle = (title, right = "") =>
  `<div class="section-head"><h2>${title}</h2>${right}</div>`;
export const field = (label, name, value = "", type = "text", extra = "") =>
  `<label class="field">${label}<input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`;
export const select = (label, name, options, value) =>
  `<label class="field">${label}<select name="${name}">${Object.entries(options)
    .map(
      ([key, text]) =>
        `<option value="${esc(key)}" ${key === value ? "selected" : ""}>${esc(text)}</option>`,
    )
    .join("")}</select></label>`;
export const textarea = (label, name, value = "", placeholder = "") =>
  `<label class="field">${label}<textarea name="${name}" rows="2" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
export const empty = (title, text, icon = "inbox", action = "") =>
  `<div class="empty"><span class="icon-box">${i(icon, 22)}</span><h3>${title}</h3><p>${text}</p>${action}</div>`;
export const place = (b) => sites[b.site];
export const pathsFor = (b, k) =>
  k === "return" ? [place(b).name, b.pickup] : [b.pickup, place(b).name];
export const routeList = (b, k = "outbound") => {
  const [a, z] = pathsFor(b, k);
  return `<div class="route-list"><div><span class="route-dot"></span><p><small>Pickup</small><strong>${esc(a)}</strong></p></div><div><span class="route-dot destination"></span><p><small>Destination</small><strong>${esc(z)}</strong></p></div></div>`;
};
export const iconBox = (name, style = "") =>
  `<span class="icon-box ${style}">${i(name, 21)}</span>`;
