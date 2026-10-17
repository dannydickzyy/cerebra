"use strict";

/* Vanilla JavaScript UI; all predictions and database writes run in Python/Streamlit. */

// ========================================================================
// Shared template rendering
// ========================================================================

/**
 * Fill named HTML slots with values prepared by the page controller.
 * Templates contain markup only: no JavaScript evaluation or network requests.
 * Callers escape external text with esc(); intentional HTML comes from UI helpers.
 * A single replacement pass keeps user text containing {{braces}} literal.
 */
function renderTemplate(name, values = {}) {
  const markup = pageTemplates[name];
  if (markup === undefined) throw new Error(`Unknown template: ${name}`);
  return markup.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      throw new Error(`Missing slot ${key} in template ${name}`);
    }
    return String(values[key] ?? "");
  });
}

// ========================================================================
// Formatting helpers and constants
// ========================================================================

// Shared SVG icons used by the shell and page templates.
const paths = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  predict:
    '<path d="M6 3v5a5 5 0 0010 0V3M4 3h4m6 0h4M11 13v3a5 5 0 0010 0v-3"/><circle cx="21" cy="10" r="2"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  people:
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0112 0v3M16 4a3 3 0 010 6m2 4a5 5 0 013 4v3"/>',
  clipboard:
    '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6m-6 4h6"/>',
  gauge:
    '<path d="M3 18a10 10 0 1118 0M12 13l5-5"/><circle cx="12" cy="13" r="1"/>',
  settings:
    '<path d="M9 3l-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 016 1c0 2-3 2-3 5m0 3h.01"/>',
  moon: '<path d="M20 14A8.5 8.5 0 0110 4a8.5 8.5 0 1010 10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12l1 1M5 19l1-1M18 6l1-1"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l5 5"/>',
  bell: '<path d="M5 17h14l-2-3V9a5 5 0 00-10 0v5zM10 21h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M4 12h16m-6-6l6 6-6 6"/>',
  arrowUp: '<path d="M5 17L19 3M8 3h11v11"/>',
  warning:
    '<path d="M10 4a2 2 0 014 0l8 14a2 2 0 01-2 3H4a2 2 0 01-2-3zM12 9v5m0 3h.01"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trend: '<path d="M3 17l6-6 4 4 8-10m-6 0h6v6"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 10-13h-7z"/>',
  reset: '<path d="M3 4v6h6M4 9a9 9 0 111 10"/>',
  save: '<path d="M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  sparkle: '<path d="M12 3l2 6 6 3-6 2-2 7-3-7-6-2 6-3zM20 2v4m-2-2h4"/>',
  bars: '<path d="M5 20V10m7 10V3m7 17V7"/>',
  book: '<path d="M12 5C8 2 5 3 2 3v16c4 0 6 0 10 2 4-2 6-2 10-2V3c-3 0-6-1-10 2zm0 0v16"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-14 4h2m3 0h2m3 0h1"/>',
  filter:
    '<path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11M8 3v6m6 0v6m-8 0v6"/>',
  download: '<path d="M12 3v12m-5-5l5 5 5-5M4 16v5h16v-5"/>',
  location:
    '<path d="M20 9c0 6-8 13-8 13S4 15 4 9a8 8 0 1116 0z"/><circle cx="12" cy="9" r="3"/>',
  chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6A17 17 0 002 12s3.5 7 10 7a10 10 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9m-4 4l3 3m-6 0l2 2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  logout: '<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l-5-5 5-5M5 12h11"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
};
const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.activity}</svg>`;

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
const n = (v) => Number(v || 0).toLocaleString("en-US");
const pct = (v, decimals = 1) => `${(Number(v) * 100).toFixed(decimals)}%`;
const share = (part, whole) => (whole ? pct(part / whole) : "—");
const shortModel = (name) => name.replace(" + SMOTE", "");
const initials = (name) => name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("");
const isHigh = (p) => p.risk === "High";

const PRETTY_LABELS = {
  Govt_job: "Govt job",
  "never smoked": "Never smoked",
  "formerly smoked": "Formerly smoked",
  smokes: "Smokes",
};
const pretty = (value) => PRETTY_LABELS[value] || value;

// Dates are stored and filtered as Asia/Manila calendar days (YYYY-MM-DD).
const MANILA_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayString = (date) => MANILA_DAY.format(date);
const today = () => dayString(new Date());

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

const SMOKING_STATUSES = ["never smoked", "formerly smoked", "smokes", "Unknown"];
const WORK_TYPES = ["Private", "Self-employed", "Govt_job", "Children"];
const PAGE_SIZE = 25;
const DEFAULT_FILTER = {
  query: "",
  risk: "All",
  date: "all",
  from: "",
  to: "",
  site: "All",
  smoking: "All",
};
// Evaluation metrics in display order; the first three are shown as percentages.
const METRICS = [
  ["accuracy", "Accuracy"],
  ["precision", "Precision"],
  ["recall", "Recall"],
  ["f1", "F1-score"],
  ["roc_auc", "ROC-AUC"],
  ["average_precision", "Avg. precision"],
];
const formatMetric = (key, value) =>
  ["accuracy", "precision", "recall"].includes(key) ? pct(value) : value.toFixed(3);

function stored(key, fallback) {
  try {
    return localStorage.getItem(`cerebra.${key}`) || fallback;
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(`cerebra.${key}`, value);
  } catch {
    /* Preferences are optional. */
  }
}

// ========================================================================
// Application state and navigation
// ========================================================================

// Application state: navigation, preferences, active requests, and server data.
const state = {
  page: "dashboard",
  source: "dataset",
  dark: stored("theme", "light") === "dark",
  collapsed: false,
  mobile: false,
  notifications: false,
  filter: { ...DEFAULT_FILTER },
  dateOpen: false,
  extraFilters: false,
  tablePage: 1,
  selected: null,
  form: {},
  result: null,
  token: null,
  saved: null,
  busy: false,
  error: "",
  pending: null,
  pendingAction: null,
  seenResponse: null,
  modelTab: null,
  notificationFilter: "all",
  auditFilter: "all",
  loginUsername: "",
  editingUser: null,
  userDraft: {},
  confirm: null,
  data: null,
};
let plots = [];
let renderVersion = 0;
let chartsLoading = false;
let localTask = null;
let shownPage = null;

// Page metadata; page markup lives in frontend/templates/.
// Pages with a navLabel appear in the main sidebar navigation.
const pages = {
  dashboard: {
    title: "Health analytics overview",
    subtitle: "Explore the dataset and your screening activity",
    icon: "dashboard",
    navLabel: "Dashboard",
    render: dashboard,
  },
  predict: {
    title: "Risk prediction",
    subtitle: "Enter a health profile to explore the trained classifier",
    icon: "predict",
    navLabel: "Risk prediction",
    render: prediction,
  },
  breakdown: {
    title: "Risk factor breakdown",
    subtitle: "Understand what contributed to an individual model score",
    icon: "activity",
    navLabel: "Risk breakdown",
    render: breakdown,
  },
  population: {
    title: "Population health",
    subtitle: "Aggregate screening patterns for research and outreach planning",
    icon: "people",
    navLabel: "Population health",
    render: population,
  },
  patients: {
    title: "Screened patients",
    subtitle: "Every profile assessed and saved in this workspace",
    icon: "clipboard",
    navLabel: "Screened patients",
    render: patients,
  },
  model: {
    title: "Model performance",
    subtitle: "Measured results on the untouched test set",
    icon: "gauge",
    navLabel: "Model performance",
    render: modelPage,
  },
  notifications: {
    title: "Notifications",
    subtitle: "Screening activity and workspace updates",
    icon: "bell",
    navLabel: "Notifications",
    render: notificationsPage,
  },
  users: {
    title: "User management",
    subtitle: "Create accounts, assign sites, and control access",
    icon: "key",
    roles: ["admin"],
    render: usersPage,
  },
  audit: {
    title: "Audit log",
    subtitle: "Sign-ins and record changes across all users",
    icon: "shield",
    roles: ["admin"],
    render: auditPage,
  },
  system: {
    title: "System & backups",
    subtitle: "Back up or restore data and review the active model",
    icon: "database",
    roles: ["admin"],
    render: systemPage,
  },
  settings: {
    title: "Settings",
    subtitle: "Your account and appearance preferences",
    icon: "settings",
    render: settings,
  },
  help: {
    title: "Help & methodology",
    subtitle: "Using CEREBRA and understanding its limitations",
    icon: "help",
    render: help,
  },
};

// Pages without `roles` are open to every signed-in user.
function canView(page) {
  const roles = pages[page]?.roles;
  return !!pages[page] && (!roles || roles.includes(state.data?.user?.role));
}

function nav(page) {
  state.page = canView(page) ? page : "dashboard";
  state.mobile = false;
  state.notifications = false;
  state.dateOpen = false;
  render();
  document.querySelector(".main")?.scrollTo(0, 0);
}

// ========================================================================
// Streamlit bridge and processing dialog
// ========================================================================

// Send component events to the Python/Streamlit host.
function post(type, details = {}) {
  window.parent.postMessage({ isStreamlitMessage: true, type, ...details }, "*");
}

// Start an explicit server operation and prevent duplicate submissions.
function action(name, payload = {}) {
  if (state.busy || localTask) return;
  const request_id = crypto.randomUUID();
  state.pending = request_id;
  state.pendingAction = name;
  state.busy = true;
  state.error = "";
  render();
  post("streamlit:setComponentValue", {
    value: { action: name, request_id, ...payload },
    dataType: "json",
  });
}

// What to do when the host confirms each successful action.
const RESPONSE_HANDLERS = {
  predict: (response) => {
    state.result = response.result;
    state.token = response.token;
    state.saved = null;
  },
  save: (response) => {
    state.saved = response.id;
    toast(`Screening saved as ${response.id}`);
  },
  follow_up: () => toast("Follow-up status updated."),
  refresh: () => toast("Workspace refreshed."),
  login: () => {
    resetSession();
    lastActivity = lastPing = Date.now();
    toast(`Signed in as ${state.data.user.display_name}.`);
  },
  logout: (response) => {
    resetSession();
    // An idle sign-out explains itself on the sign-in screen instead.
    if (response.reason !== "idle") toast("Signed out.");
  },
  change_password: () => toast("Password updated."),
  screening_delete: () => {
    state.selected = null;
    state.confirm = null;
    toast("Screening deleted.");
  },
  backup_create: (response) => toast(`Backup created: ${response.name}`),
  backup_restore: (response) => {
    state.confirm = null;
    toast(`Backup restored. The previous data was saved as ${response.safety}.`);
  },
  user_create: (response) => {
    state.userDraft = {};
    toast(`Account created: ${response.username}`);
  },
  user_update: () => {
    state.editingUser = null;
    state.confirm = null;
    toast("Account updated.");
  },
};

// Clear everything tied to the previous user when the account changes.
function resetSession() {
  Object.assign(state, {
    page: "dashboard",
    source: "dataset",
    notifications: false,
    mobile: false,
    filter: { ...DEFAULT_FILTER },
    dateOpen: false,
    extraFilters: false,
    tablePage: 1,
    selected: null,
    form: {},
    result: null,
    token: null,
    saved: null,
    error: "",
    modelTab: null,
    notificationFilter: "all",
    auditFilter: "all",
    loginUsername: "",
    editingUser: null,
    userDraft: {},
    confirm: null,
  });
}

// Accept host data and apply only the response matching the pending request.
function onHostMessage(event) {
  if (event.source !== window.parent || event.data?.type !== "streamlit:render") return;
  state.data = event.data.args;
  const response = state.data.response;
  if (
    response &&
    response.request_id === state.pending &&
    response.request_id !== state.seenResponse
  ) {
    state.seenResponse = response.request_id;
    state.busy = false;
    state.pending = null;
    state.pendingAction = null;
    if (!response.ok) {
      state.error = response.error;
      // The sign-in form and the confirmation dialog show their own errors inline.
      if (state.data.user && !state.confirm) toast(response.error, true);
    } else {
      RESPONSE_HANDLERS[response.action]?.(response);
    }
  }
  render();
}

function toast(message, error = false) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = `show${error ? " error" : ""}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = ""), 5000);
}

const LOADING_MESSAGES = {
  startup: [
    "Opening your workspace…",
    "Loading your dashboard, model results, and saved records.",
  ],
  predict: [
    "Analyzing health profile…",
    "Running the prediction model and preparing your risk factor breakdown.",
  ],
  save: [
    "Saving patient record…",
    "Saving this screening and its prediction results to your patient records.",
  ],
  follow_up: [
    "Updating follow-up status…",
    "Saving the latest contact status for this patient record.",
  ],
  refresh: [
    "Refreshing records…",
    "Retrieving the latest screenings from your workspace.",
  ],
  login: ["Signing in…", "Checking your account."],
  logout: ["Signing out…", "Closing your session."],
  change_password: ["Updating password…", "Saving your new password."],
  user_create: ["Creating account…", "Saving the new account."],
  user_update: ["Saving account…", "Updating the account details."],
  screening_delete: ["Deleting record…", "Removing the screening from the database."],
  backup_create: ["Creating backup…", "Copying the database to a backup file."],
  backup_restore: ["Restoring backup…", "Replacing the current data with the selected backup."],
  export: [
    "Preparing your download…",
    "Putting together the selected records or model results.",
  ],
};

// Reserve the blocking dialog for startup and processing, not page changes
// or chart rendering, which should never block the workspace.
function syncLoadingModal() {
  const modal = document.getElementById("loading-modal");
  if (!state.data || state.busy || localTask) {
    const kind = !state.data ? "startup" : state.busy ? state.pendingAction : localTask;
    const [title, description] = LOADING_MESSAGES[kind] || [
      "Processing…",
      "Please wait while this operation completes.",
    ];
    document.getElementById("loading-title").textContent = title;
    document.getElementById("loading-description").textContent = description;
    modal.oncancel = (event) => event.preventDefault();
    if (!modal.open) modal.showModal();
  } else if (modal.open) {
    modal.close();
    restoreFocus();
  }
}

// The form is re-rendered during requests, so restore focus to the new DOM.
function restoreFocus() {
  let selector = "#content";
  if (!state.data?.user) {
    selector = state.error ? "#login-password" : "#login-username";
  } else if (state.page === "predict") {
    selector = state.error ? '#prediction-form button[type="submit"]' : ".result-name";
  }
  const target = document.querySelector(selector);
  if (!target) return;
  if (!target.matches("button")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

// Keep the processing dialog active while a local export completes.
async function runLocalTask(kind, task) {
  if (state.busy || localTask) return;
  localTask = kind;
  syncLoadingModal();
  try {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await task();
  } catch (error) {
    toast("The operation could not be completed. Please try again.", true);
  } finally {
    localTask = null;
    syncLoadingModal();
  }
}

function download(name, data, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([data], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// ========================================================================
// Shared UI pieces
// ========================================================================

function riskBadge(risk) {
  return `<span class="badge-risk ${risk === "Low" ? "low" : ""}">${esc(risk)} risk label</span>`;
}

function empty(title, description, ico = "clipboard", cta = false) {
  const button = cta
    ? `<button class="btn btn-primary" data-nav="predict">${icon("plus")} New screening</button>`
    : "";
  return `<div class="empty"><div class="empty-icon">${icon(ico)}</div><strong>${esc(title)}</strong><p>${esc(description)}</p>${button}</div>`;
}

function panel(label, title, body, hint = "", cls = "") {
  const hintHtml = hint ? `<div class="panel-hint">${hint}</div>` : "";
  return `<section class="panel ${cls}"><div class="panel-head"><div><div class="eyebrow">${label}</div><h3>${title}</h3></div>${hintHtml}</div>${body}</section>`;
}

function stat(label, value, sub, ico, cls = "") {
  return `<div class="stat ${cls}"><div class="stat-top"><div class="eyebrow">${label}</div><div class="stat-icon">${icon(ico)}</div></div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></div>`;
}

function gauge(result) {
  return `<div class="gauge ${result.risk === "Low" ? "low" : ""}" style="--score:${result.score * 100}%"><div class="gauge-inner"><strong>${pct(result.score)}</strong><small>MODEL SCORE</small></div></div>`;
}

function researchNote() {
  const m = state.data.report.results[state.data.report.selected];
  return `<div class="research-note">${icon("warning")}<span><strong>Research prototype.</strong> Synthetic-data model · test ROC-AUC ${m.roc_auc.toFixed(3)}. Scores are uncalibrated model outputs, not clinical risk estimates.</span><button data-nav="model">View model evidence ↗</button></div>`;
}

function patientMini(p) {
  const color = p.risk === "Low" ? "var(--green)" : "var(--orange)";
  return `<button class="patient-mini ${state.selected === p.id ? "active" : ""}" data-patient="${esc(p.id)}"><span class="avatar">${esc(initials(p.profile.name))}</span><span><strong>${esc(p.profile.name)}</strong><small>${esc(p.id)}</small></span><span class="score" style="color:${color}">${pct(p.score, 0)}</span></button>`;
}

function confusionCells(cm) {
  return [
    ["True positive", cm.tp, "Correctly flagged", false],
    ["False negative", cm.fn, "Missed positive labels", true],
    ["False positive", cm.fp, "False alarms", true],
    ["True negative", cm.tn, "Correctly unflagged", false],
  ]
    .map(([label, value, note, error]) =>
      renderTemplate("model-confusion-cell", {
        error_class: error ? "error" : "",
        label,
        count: n(value),
        note,
      }),
    )
    .join("");
}

function legendItems(names, colors) {
  return names
    .map((name, i) =>
      renderTemplate("model-legend-item", { color: colors[i], model_name: esc(name) }),
    )
    .join("");
}

function explanationChart(result, id = "contributions") {
  const bars = result.explanation.contributions;
  return plot(
    id,
    [
      {
        x: bars.map((b) => b.value * 100),
        y: bars.map((b) => b.label),
        type: "bar",
        orientation: "h",
        width: 0.65,
        marker: {
          color: bars.map((b) => (b.value >= 0 ? "#ed6528" : "#8974b0")),
          cornerradius: 4,
        },
        hovertemplate: "%{y}: %{x:+.2f} percentage points<extra></extra>",
      },
    ],
    {
      margin: { l: 125, r: 25, t: 20, b: 45 },
      xaxis: {
        ticksuffix: " pp",
        zeroline: true,
        zerolinecolor: state.dark ? "#6c6279" : "#c7bfce",
        showgrid: true,
      },
      yaxis: { autorange: "reversed", showgrid: false },
    },
    "chart-contributions",
  );
}

function explanationNote(result) {
  return `<div class="notice">Reference score <strong>${pct(result.explanation.baseline)}</strong> + feature contributions = <strong>${pct(result.score)}</strong>.<br>Orange increases and purple decreases the model score relative to ${result.explanation.reference_count} training reference profiles. Effects are model explanations, not causal health claims.</div>`;
}

// ========================================================================
// Charts
// ========================================================================

// Queue a chart for drawing after the page markup is in the DOM.
function plot(id, traces, layout = {}, cls = "") {
  plots.push({ id, traces, layout });
  return `<div id="${id}" class="chart ${cls}" role="img" aria-label="${esc(layout.meta || id.replaceAll("-", " "))}"></div>`;
}

// Theme-aware defaults shared by every chart; each chart's layout overrides these.
function baseLayout() {
  const axis = () => ({
    gridcolor: state.dark ? "#322b3f" : "#eeecf1",
    zeroline: true,
    zerolinecolor: state.dark ? "#91849f" : "#94899f",
    zerolinewidth: 1.5,
    fixedrange: true,
    automargin: true,
    ticklabelstandoff: 12,
    tickfont: { size: 12 },
  });
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Arial, sans-serif", size: 12, color: state.dark ? "#b6abc5" : "#787184" },
    margin: { l: 56, r: 24, t: 24, b: 56 },
    showlegend: false,
    hoverlabel: { font: { family: "Arial", size: 13 } },
    xaxis: { ...axis(), showgrid: false },
    yaxis: axis(),
  };
}

// Draw queued charts and ignore completion from an older page render.
async function drawPlots(version, queuedPlots) {
  if (version !== renderVersion) return;
  try {
    if (!window.Plotly) throw new Error("Chart library unavailable");
    await Promise.all(
      queuedPlots.map(async ({ id, traces, layout }) => {
        if (!document.getElementById(id)) return;
        const base = baseLayout();
        const combined = {
          ...base,
          ...layout,
          xaxis: { ...base.xaxis, ...layout.xaxis },
          yaxis: { ...base.yaxis, ...layout.yaxis },
        };
        for (const axis of [combined.xaxis, combined.yaxis]) {
          if (axis.title) axis.title = { standoff: 18, ...axis.title };
        }
        await Plotly.newPlot(id, traces, combined, {
          responsive: true,
          displayModeBar: false,
          displaylogo: false,
        });
      }),
    );
  } catch (error) {
    if (version === renderVersion)
      toast("Some charts could not load. Please refresh the page to retry.", true);
  } finally {
    if (version === renderVersion) {
      chartsLoading = false;
      syncLoadingModal();
    }
  }
}

// Bar chart of grouped rows; the first two bars are highlighted.
function barPlot(id, rows, key = "rate", horizontal = false) {
  const values = rows.map((x) => x[key]),
    labels = rows.map((x) => pretty(x.label)),
    suffix = key === "rate" ? "%" : "";
  return plot(
    id,
    [
      {
        type: "bar",
        x: horizontal ? values : labels,
        y: horizontal ? labels : values,
        orientation: horizontal ? "h" : "v",
        marker: {
          color: rows.map((_, i) => (i < 2 ? "#f5ba32" : "#ed5b20")),
          cornerradius: 5,
        },
        width: horizontal ? 0.46 : 0.42,
        hovertemplate: horizontal
          ? `%{y}: %{x}${suffix}<extra></extra>`
          : `%{x}: %{y}${suffix}<extra></extra>`,
      },
    ],
    {
      xaxis: horizontal ? { ticksuffix: suffix, showgrid: true } : {},
      yaxis: horizontal
        ? { autorange: "reversed", showgrid: false }
        : { ticksuffix: suffix, rangemode: "tozero" },
      margin: { l: horizontal ? 112 : 40, r: 15, t: 20, b: 35 },
    },
  );
}

// Model curve (ROC or precision-recall) with a dotted reference line.
function curvePlot(id, curve, line, baseline, [xTitle, yTitle]) {
  const series = (x, y, name, style) => ({ x, y, type: "scatter", mode: "lines", line: style, name });
  return plot(
    id,
    [
      series(curve.x, curve.y, "Active model", line),
      series([0, 1], baseline.y, baseline.name, { color: "#a99db6", dash: "dot" }),
    ],
    {
      xaxis: { title: { text: xTitle }, range: [0, 1], showgrid: true },
      yaxis: { title: { text: yTitle }, range: [0, 1] },
    },
  );
}

// ========================================================================
// Rendering and event binding
// ========================================================================

// Rebuild the shared shell, render the chosen page, and then schedule its charts.
function render() {
  if (!state.data) return;
  plots = [];
  document.body.classList.toggle("dark", state.dark);
  if (!state.data.user) return renderLogin();
  if (!canView(state.page)) state.page = "dashboard";
  const samePage = state.page === shownPage;
  const scrollTop = samePage ? document.querySelector(".main")?.scrollTop : 0;
  const pageHtml = pages[state.page].render();
  document.getElementById("app").innerHTML = shell(pageHtml, !samePage);
  shownPage = state.page;
  if (scrollTop) document.querySelector(".main").scrollTo({ top: scrollTop, behavior: "instant" });
  bind();
  const version = ++renderVersion,
    queuedPlots = [...plots];
  chartsLoading = queuedPlots.length > 0;
  syncLoadingModal();
  if (chartsLoading)
    requestAnimationFrame(() => requestAnimationFrame(() => drawPlots(version, queuedPlots)));
}

function shell(pageHtml, entering) {
  const { title, subtitle } = pages[state.page];
  const active = (key) => (state.page === key ? "active" : "");
  const mainNav = Object.entries(pages)
    .filter(([, page]) => page.navLabel)
    .map(
      ([key, page]) =>
        `<button class="nav-item ${active(key)}" data-nav="${key}" title="${page.title}" ${state.page === key ? 'aria-current="page"' : ""}>${icon(page.icon)}<span>${page.navLabel}</span></button>`,
    )
    .join("");
  // Settings opens from the profile avatar in the top bar.
  const toolNav = ["users", "audit", "system", "help"]
    .filter(canView)
    .map(
      (key) =>
        `<button class="nav-item ${active(key)}" data-nav="${key}" title="${pages[key].title}">${icon(pages[key].icon)}<span>${pages[key].title}</span></button>`,
    )
    .join("");
  const theme = state.dark ? "light" : "dark";
  const { user } = state.data;
  const collapseLabel = state.collapsed ? "Expand sidebar" : "Collapse sidebar";
  const hasPending = state.data.patients.some((p) => isHigh(p) && !p.contacted);
  return `<div class="app-shell large-text">
    <div class="sidebar-frame"><aside class="sidebar ${state.collapsed ? "collapsed" : ""} ${state.mobile ? "mobile-open" : ""}" aria-label="Main navigation">
      <div class="brand"><div class="brand-mark"><img src="assets/logo.png" alt="CEREBRA brain logo"></div><div class="brand-copy"><div class="brand-name">CEREBRA</div><div class="brand-sub">STROKE ANALYTICS</div></div></div>
      <nav>${mainNav}</nav>
      <div class="sidebar-tools">${toolNav}</div>
      <div class="sidebar-bottom"><div class="model-banner"><img src="assets/logo.png" alt=""><div><div class="mini-label">RESEARCH POWERED</div><strong>Neural Analytics</strong><small>${esc(shortModel(state.data.report.selected))} · SMOTE</small></div></div>
      <div class="sidebar-signout"><button class="nav-item" id="sidebar-sign-out" title="Sign out">${icon("logout")}<span>Sign out</span></button></div></div>
    </aside><button id="collapse-nav" class="collapse-nav" title="${collapseLabel}" aria-label="${collapseLabel}" aria-expanded="${!state.collapsed}">${icon(state.collapsed ? "chevronRight" : "chevronLeft")}</button></div><main class="main"><header class="topbar"><button id="mobile-nav" class="icon-button mobile-nav" aria-label="Toggle navigation">${icon("menu")}</button><div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>
      <div class="top-actions"><button class="icon-button" id="theme-toggle" aria-label="Switch to ${theme} mode" title="Switch to ${theme} mode">${icon(state.dark ? "sun" : "moon")}</button><button class="icon-button notifications-button" id="notifications" aria-label="Notifications summary" aria-expanded="${state.notifications}" aria-controls="notification-summary">${icon("bell")}${hasPending ? '<span class="notification-dot"></span>' : ""}</button><button class="btn btn-primary" data-nav="predict">${icon("plus")}<span class="new-label">New screening</span></button><button class="topbar-profile ${active("settings")}" data-nav="settings" title="${esc(user.display_name)} · ${esc(user.role_label)} · ${esc(user.site || "All sites")}" aria-label="Account settings for ${esc(user.display_name)}"><span class="avatar">${esc(initials(user.display_name).toUpperCase())}</span></button></div>
      ${state.notifications ? notificationSummary() : ""}
      </header><div class="content${entering ? " page-enter" : ""}" id="content" tabindex="-1">${pageHtml}</div></main>${state.confirm && !state.busy ? confirmDialog() : ""}</div>`;
}

// Small binding helpers: controls that are absent on the current page are skipped.
function on(id, type, handler) {
  document.getElementById(id)?.addEventListener(type, handler);
}

function onClickAll(selector, handler) {
  document.querySelectorAll(selector).forEach((el) => (el.onclick = () => handler(el)));
}

function toggle(key) {
  state[key] = !state[key];
  render();
}

function setTheme(dark) {
  state.dark = dark;
  store("theme", dark ? "dark" : "light");
  render();
}

// Reconnect controls after rendering; server writes always go through action().
function bind() {
  bindConfirmDialog();
  bindSystem();
  bindShell();
  bindPatients();
  bindPrediction();
  bindFilters();
  bindPageActions();
}

function bindShell() {
  onClickAll("[data-notification-filter]", (el) => {
    state.notificationFilter = el.dataset.notificationFilter;
    render();
  });
  onClickAll("[data-nav]", (el) => nav(el.dataset.nav));
  on("theme-toggle", "click", () => setTheme(!state.dark));
  on("notifications", "click", () => toggle("notifications"));
  on("collapse-nav", "click", () => toggle("collapsed"));
  on("mobile-nav", "click", () => toggle("mobile"));
  onClickAll("[data-source]", (el) => {
    state.source = el.dataset.source;
    render();
  });
}

function clearPrediction() {
  state.result = null;
  state.token = null;
  state.saved = null;
  state.error = "";
}

function bindPrediction() {
  const form = document.getElementById("prediction-form");
  if (!form) return;
  // Any edit invalidates the previous result so a stale score cannot be saved.
  form.addEventListener("input", () => {
    captureForm();
    clearPrediction();
    plots = [];
    document.getElementById("prediction-results").innerHTML = predictionResults();
    document.getElementById("form-error").innerHTML = "";
  });
  on("bmi_missing", "change", () => {
    captureForm();
    const bmi = document.getElementById("bmi");
    bmi.disabled = state.form.bmi_missing;
    bmi.required = !state.form.bmi_missing;
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    if (state.busy) return;
    captureForm();
    action("predict", { profile: formProfile(state.form) });
  };
  on("reset-form", "click", () => {
    state.form = {};
    clearPrediction();
    render();
  });
  on("save-screening", "click", () => action("save", { token: state.token }));
  if (state.busy) form.querySelectorAll("input,select").forEach((el) => (el.disabled = true));
}

// Reset to the first table page whenever the patient filters change.
function setFilter(changes, refresh = render) {
  Object.assign(state.filter, changes);
  state.tablePage = 1;
  refresh();
}

function bindFilters() {
  on("patient-search", "input", (e) => setFilter({ query: e.target.value }, updatePatientTable));
  onClickAll("[data-risk]", (el) => setFilter({ risk: el.dataset.risk }));
  on("date-toggle", "click", () => toggle("dateOpen"));
  onClickAll("[data-date]", (el) => {
    state.dateOpen = false;
    setFilter({ date: el.dataset.date });
  });
  on("date-form", "submit", (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    if (d.get("from") > d.get("to")) {
      toast("The start date must be before the end date.", true);
      return;
    }
    state.dateOpen = false;
    setFilter({ from: d.get("from"), to: d.get("to"), date: "custom" });
  });
  on("extra-filters", "click", () => toggle("extraFilters"));
  for (const key of ["site", "smoking"]) {
    on(`${key}-filter`, "change", (e) => setFilter({ [key]: e.target.value }, updatePatientTable));
  }
  on("clear-filters", "click", () => {
    state.filter = { ...DEFAULT_FILTER };
    state.tablePage = 1;
    render();
  });
  on("export-csv", "click", () => runLocalTask("export", exportCSV));
}

function bindPageActions() {
  on("delete-screening", "click", () => {
    const record = state.data.patients.find((p) => p.id === state.selected);
    if (!record) return;
    askConfirm({
      title: `Delete ${esc(record.profile.name)}'s screening?`,
      body: `<b>${esc(record.id)}</b> and its saved explanation will be removed for every user. This cannot be undone unless you restore a backup.`,
      confirmLabel: "Delete record",
      action: "screening_delete",
      payload: { id: record.id },
    });
  });
  on("follow-up", "click", (e) => {
    const el = e.currentTarget;
    action("follow_up", { id: el.dataset.id, contacted: el.dataset.contacted === "true" });
  });
  on("model-select", "change", (e) => {
    state.modelTab = e.target.value;
    render();
  });
  on("export-report", "click", () =>
    runLocalTask("export", () =>
      download(
        "cerebra-evaluation.json",
        JSON.stringify(state.data.report, null, 2),
        "application/json",
      ),
    ),
  );
  on("view-pending", "click", () => {
    Object.assign(state.filter, { risk: "High", query: "", date: "all", site: "All", smoking: "All" });
    nav("patients");
  });
  onClickAll("[data-theme]", (el) => setTheme(el.dataset.theme === "dark"));
  on("sign-out", "click", () => action("logout"));
  on("sidebar-sign-out", "click", () => action("logout"));
  on("password-form", "submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const [current, next, confirm] = ["current", "new", "confirm"].map((k) => String(f.get(k)));
    if (!current || next.length < 8) {
      toast("Enter your current password and a new password of at least 8 characters.", true);
    } else if (next !== confirm) {
      toast("The new passwords do not match.", true);
    } else {
      action("change_password", { current, new: next });
    }
  });
  bindUsers();
  onClickAll("[data-audit-filter]", (el) => {
    state.auditFilter = el.dataset.auditFilter;
    render();
  });
  on("refresh-data", "click", () => action("refresh"));
}

// ========================================================================
// Dashboard page
// ========================================================================

// Map a numeric value to the label of the first band whose upper edge exceeds it.
function band(edges, labels) {
  return (x) => {
    if (x == null) return null;
    const i = edges.findIndex((edge) => x < edge);
    return labels[i === -1 ? edges.length : i];
  };
}

// Aggregate saved screenings into the same chart data shape as the source dataset.
function liveSummary() {
  const rows = state.data.patients.map((p) => ({
    ...p.profile,
    stroke: isHigh(p) ? 1 : 0,
    score: p.score,
  }));
  function group(key, toLabel = (x) => x) {
    const groups = new Map();
    rows.forEach((r) => {
      const label = toLabel(r[key]);
      if (label == null) return;
      const g = groups.get(label) || { label, count: 0, positive: 0 };
      g.count++;
      g.positive += r.stroke;
      groups.set(label, g);
    });
    return [...groups.values()].map((g) => ({ ...g, rate: (g.positive / g.count) * 100 }));
  }
  const positives = rows.filter((p) => p.stroke).length;
  return {
    rows: rows.length,
    positives,
    prevalence: rows.length ? positives / rows.length : 0,
    missing_bmi: rows.filter((p) => p.bmi == null).length,
    age: group(
      "age",
      band([30, 40, 50, 60, 70], ["18–29", "30–39", "40–49", "50–59", "60–69", "70+"]),
    ).sort((a, b) => a.label.localeCompare(b.label)),
    glucose: group(
      "avg_glucose_level",
      band([90, 126, 161, 201], ["<90", "90–125", "126–160", "161–200", ">200"]),
    ),
    bmi: group(
      "bmi",
      band([18.5, 25, 30, 35], ["Under", "Normal", "Overweight", "Obese I", "Obese II+"]),
    ),
    smoking: group("smoking_status"),
    residence: group("Residence_type"),
    work: group("work_type"),
  };
}

function dashboardStats(dataset, data, metrics) {
  return renderTemplate("dashboard-stats", {
    record_stat: stat(
      dataset ? "Dataset records" : "Patients screened",
      n(data.rows),
      dataset ? "Synthetic source records" : "Saved in this workspace",
      "people",
      "lavender",
    ),
    label_stat: stat(
      dataset ? "Recorded stroke labels" : "Flagged high label",
      pct(data.prevalence),
      `${n(data.positives)} ${dataset ? "positive labels" : "screenings"}`,
      "warning",
      "peach",
    ),
    recall_stat: stat(
      "Model recall",
      pct(metrics.recall),
      "Held-out synthetic test set",
      "target",
      "sage",
    ),
    auc_stat: stat(
      "ROC–AUC",
      metrics.roc_auc.toFixed(3),
      "0.50 ≈ chance discrimination",
      "trend",
      "cream",
    ),
  });
}

// Dataset view: records by age band. Screenings view: saved screenings per day.
function throughputChart(dataset, data) {
  let x, totals, positives;
  if (dataset) {
    x = data.age.map((r) => r.label);
    totals = data.age.map((r) => r.count);
    positives = data.age.map((r) => r.positive);
  } else {
    const days = {};
    state.data.patients.forEach((p) => {
      const day = p.created_at.slice(0, 10);
      days[day] ??= { count: 0, high: 0 };
      days[day].count++;
      days[day].high += isHigh(p) ? 1 : 0;
    });
    x = Object.keys(days).sort();
    totals = x.map((d) => days[d].count);
    positives = x.map((d) => days[d].high);
  }
  const mode = dataset ? "lines" : "lines+markers";
  return plot(
    "throughput",
    [
      {
        x,
        y: totals,
        name: dataset ? "All source records" : "Screenings",
        type: "scatter",
        mode,
        line: { color: "#f57930", width: 2.5 },
        fill: "tozeroy",
        fillcolor: dataset ? "rgba(245,121,48,.09)" : "rgba(245,121,48,.1)",
      },
      {
        x,
        y: positives,
        name: dataset ? "Recorded stroke labels" : "High labels",
        type: "scatter",
        mode,
        line: { color: "#d94d15", width: 2 },
      },
    ],
    dataset
      ? { meta: "Dataset records and positive stroke labels by age band" }
      : { yaxis: { dtick: 1, rangemode: "tozero" } },
    "chart-tall",
  );
}

function importanceChart(report) {
  const imp = report.importance.slice(0, 7);
  return plot(
    "global-importance",
    [
      {
        type: "bar",
        x: imp.map((x) => x.value),
        y: imp.map((x) => x.label),
        orientation: "h",
        marker: {
          color: imp.map((x) => (x.value >= 0 ? "#ed6e29" : "#9f91b2")),
          cornerradius: 4,
        },
        width: 0.46,
        hovertemplate: "%{y}: %{x:.4f} ROC-AUC change<extra></extra>",
      },
    ],
    {
      margin: { l: 125, r: 20, t: 20, b: 45 },
      xaxis: { showgrid: true, zeroline: true, tickformat: ".3f" },
      yaxis: { autorange: "reversed", showgrid: false },
    },
    "chart-tall",
  );
}

const SMOKE_COLORS = ["#2e9e44", "#f57930", "#dc4835", "#8060bb"];

function smokingChart(data) {
  return plot(
    "smoking",
    [
      {
        type: "pie",
        labels: data.smoking.map((x) => pretty(x.label)),
        values: data.smoking.map((x) => x.count),
        hole: 0.7,
        marker: {
          colors: SMOKE_COLORS,
          line: { color: state.dark ? "#1d1929" : "#fff", width: 2 },
        },
        textinfo: "none",
        sort: false,
        hovertemplate: "%{label}<br>%{value:,} records · %{percent}<extra></extra>",
      },
    ],
    {
      margin: { l: 0, r: 0, t: 15, b: 10 },
      annotations: [
        {
          x: 0.5,
          y: 0.5,
          xref: "paper",
          yref: "paper",
          // Plotly keeps whitespace in annotation text, so this stays on one line to stay centered.
          text: `<b>${data.smoking.length}</b><br><span style="font-size:8px">GROUPS</span>`,
          showarrow: false,
          font: { size: 20, color: state.dark ? "#ede8f4" : "#211a2e" },
        },
      ],
    },
    "chart-short",
  );
}

// Build summary cards and chart series for the selected analytics source.
function dashboard() {
  const dataset = state.source === "dataset",
    data = dataset ? state.data.dataset : liveSummary(),
    report = state.data.report;
  const header =
    renderTemplate("dashboard-source-switch", {
      source_label: dataset
        ? "SOURCE DATASET · SYNTHETIC RECORDS"
        : "WORKSPACE · SAVED SCREENINGS",
      dataset_active: dataset ? "active" : "",
      screenings_active: !dataset ? "active" : "",
    }) +
    researchNote() +
    dashboardStats(dataset, data, report.results[report.selected]);
  if (!dataset && !data.rows)
    return (
      header +
      panel(
        "Your workspace",
        "Start your screening history",
        empty(
          "No screenings yet",
          "Run a prediction and save it to populate your live dashboard.",
          "predict",
          true,
        ),
      )
    );
  // Queue charts in the same order they appear on the page.
  const throughput = throughputChart(dataset, data),
    importance = importanceChart(report),
    smokers = smokingChart(data);
  const basis = dataset ? "Recorded stroke rate" : "High-label share";
  const high = state.data.patients.filter(isHigh).slice(0, 4);
  const recent = high.length
    ? high.map(patientMini).join("") +
      renderTemplate("dashboard-records-link", { icon_1: icon("arrowUp") })
    : empty("No high-label screenings", "Saved high-label results will appear here.", "clipboard");
  const smokingLegend = data.smoking
    .map((r, i) =>
      renderTemplate("dashboard-smoking-legend-item", {
        color: SMOKE_COLORS[i],
        label: esc(pretty(r.label)),
        share: pct(r.count / data.rows, 0),
      }),
    )
    .join("");
  return (
    header +
    renderTemplate("dashboard", {
      throughput_panel: panel(
        dataset ? "Dataset composition" : "Throughput",
        dataset ? "Records & stroke labels by age" : "Screenings & high labels",
        throughput +
          renderTemplate("dashboard-throughput-legend", {
            records_label: dataset ? "All records" : "Screenings",
            positives_label: dataset ? "Positive stroke labels" : "High labels",
          }),
        dataset
          ? "Actual source counts; no screening dates in CSV"
          : "Screening dates · Manila time",
      ),
      importance_panel: panel(
        "Global drivers",
        "Feature importance",
        importance + renderTemplate("dashboard-importance-note", {}),
        "Held-out sample · 3 repeats",
      ),
      glucose_panel: panel(
        "Metabolic",
        "Glucose level vs. label rate",
        plot(
          "glucose",
          [
            {
              x: data.glucose.map((r) => r.label),
              y: data.glucose.map((r) => r.rate),
              type: "scatter",
              mode: "lines+markers",
              line: { color: "#5964df", width: 2 },
              marker: { color: "#f57930", size: 8, line: { color: "white", width: 2 } },
              hovertemplate: "%{x}: %{y:.2f}%<extra></extra>",
            },
          ],
          { yaxis: { ticksuffix: "%", rangemode: "tozero" } },
        ),
        `${basis} by glucose bucket (mg/dL)`,
      ),
      bmi_panel: panel(
        "Anthropometric",
        "BMI vs. label rate",
        barPlot("bmi", data.bmi),
        `${basis} · ${n(data.missing_bmi)} missing BMI excluded`,
      ),
      smoking_panel: panel(
        "Lifestyle",
        "Smoking status",
        smokers +
          renderTemplate("dashboard-smoking-legend", { legend_items: smokingLegend }),
        "Population composition",
      ),
      age_panel: panel("Demographic", "Label rate by age band", barPlot("age-risk", data.age), basis),
      recent_panel: panel(
        "Workspace attention",
        "Recent high-label screenings",
        recent,
        "Saved records only",
      ),
      residence_panel: panel(
        "Geographic",
        dataset ? "Recorded stroke labels · Urban vs. Rural" : "High labels · Urban vs. Rural",
        barPlot("residence", data.residence, "positive"),
        "Actual record counts",
      ),
      work_panel: panel(
        "Occupational",
        dataset ? "Recorded stroke labels by work type" : "High labels by work type",
        barPlot("work", data.work, "positive", true),
        "Actual record counts",
      ),
    })
  );
}

// ========================================================================
// Help page
// ========================================================================

// Render methodology, data attribution, and interpretation guidance.
function help() {
  const { dataset, report } = state.data;
  return renderTemplate("help", {
    getting_started_panel: panel(
      "Getting started",
      "From profile to insight",
      renderTemplate("help-getting-started", {}),
    ),
    source_panel: panel(
      "Data source",
      "Synthetic Stroke Prediction Dataset",
      renderTemplate("help-data-source", {
        record_count: n(dataset.rows),
        positive_count: n(dataset.positives),
        missing_bmi_count: n(dataset.missing_bmi),
        external_icon: icon("arrowUp"),
      }),
    ),
    interpretation_panel: panel(
      "Interpretation",
      "Read model outputs carefully",
      renderTemplate("help-interpretation", {
        limitations: report.limitations
          .map((x) => renderTemplate("help-limitation", { limitation: esc(x) }))
          .join(""),
      }),
    ),
    technology_panel: panel(
      "Technology",
      "Built around your requested stack",
      renderTemplate("help-technology", {}),
    ),
  });
}

// ========================================================================
// Model Performance page
// ========================================================================

// Render a selected model, its confusion matrix, and evaluation curves.
function modelPage() {
  if (!state.modelTab || state.modelTab === "all") return modelOverview();
  const r = state.data.report,
    key = r.results[state.modelTab] ? state.modelTab : r.selected,
    m = r.results[key];
  const stats = renderTemplate("model-stats", {
    accuracy_stat: stat("Accuracy", pct(m.accuracy), "Overall test correctness", "target"),
    precision_stat: stat(
      "Precision",
      pct(m.precision),
      "Positive labels among flagged records",
      "predict",
    ),
    recall_stat: stat("Recall", pct(m.recall), "Positive test labels detected", "people"),
    f1_stat: stat("F1-score", m.f1.toFixed(3), "Balance of precision and recall", "activity"),
  });
  // Radar covers the first five metrics, repeating the first to close the shape.
  const radarMetrics = METRICS.slice(0, 5),
    colors = ["#9b8aa9", "#7051a0", "#f47830"],
    names = Object.keys(r.validation),
    gridcolor = state.dark ? "#3b324a" : "#eae6ee";
  const radar = plot(
    "model-radar",
    names.map((name, i) => {
      const values = radarMetrics.map(([k]) => r.results[name][k] * 100);
      const labels = radarMetrics.map(([, label]) => label);
      return {
        type: "scatterpolar",
        r: [...values, values[0]],
        theta: [...labels, labels[0]],
        fill: "toself",
        name: shortModel(name),
        line: { color: colors[i], width: 2 },
        opacity: 0.8,
        hovertemplate: "%{theta}: %{r:.1f}%<extra>%{fullData.name}</extra>",
      };
    }),
    {
      polar: {
        bgcolor: "rgba(0,0,0,0)",
        radialaxis: {
          visible: true,
          range: [0, 100],
          tickvals: [25, 50, 75, 100],
          tickfont: { size: 11 },
          gridcolor,
        },
        angularaxis: { gridcolor, tickfont: { size: 12 } },
      },
      margin: { l: 55, r: 55, t: 35, b: 30 },
    },
    "chart-tall",
  );
  const matrix = renderTemplate("model-confusion-matrix", {
    cells: confusionCells(m.cm),
    test_count: n(r.test_count),
    positive_count: n(r.test_distribution["1"]),
    recall_status: m.recall >= 0.7 ? "met on this synthetic test set" : "not met",
  });
  const compare = renderTemplate("model-results-table", {
    headers: METRICS.map(([k, label]) =>
      renderTemplate("model-results-heading", { label: k === "f1" ? "F1" : label }),
    ).join(""),
    rows: Object.entries(r.results)
      .map(([name, v]) =>
        renderTemplate("model-results-row", {
          selected_class: name === r.selected ? "selected" : "",
          model_name: esc(name),
          active_label:
            name === r.selected
              ? '<div class="micro" style="color:var(--orange)">ACTIVE RESEARCH MODEL</div>'
              : "",
          metrics: METRICS.map(([k]) =>
            renderTemplate("model-results-value", { value: formatMetric(k, v[k]) }),
          ).join(""),
        }),
      )
      .join(""),
  });
  const prevalence = r.test_distribution["1"] / r.test_count;
  const selected = r.results[r.selected];
  const protocolRows = [
    ["Training / test split", `${n(r.train_count)} / ${n(r.test_count)}`],
    ["Validation selection", `${n(r.validation_count)} rows within training`],
    [
      "Training class counts",
      `${n(r.train_distribution["0"])} negative / ${n(r.train_distribution["1"])} positive`,
    ],
    [
      "After training-only SMOTE",
      `${n(r.smote_distribution["0"])} / ${n(r.smote_distribution["1"])}`,
    ],
    ["Training BMI median", r.bmi_training_median.toFixed(1)],
  ];
  return (
    researchNote() +
    renderTemplate("model-selector", {
      test_count: n(r.test_count),
      model_options: Object.keys(r.results)
        .map((name) =>
          renderTemplate("model-option", {
            selected: key === name ? "selected" : "",
            model_name: esc(name),
          }),
        )
        .join(""),
    }) +
    stats +
    renderTemplate("model-detail", {
      comparison_panel: panel(
        "Benchmark",
        "Candidate model comparison",
        radar +
          renderTemplate("model-legend", {
            legend_items: legendItems(names.map(shortModel), colors),
          }),
        "All candidates trained with SMOTE",
      ),
      matrix_panel: panel(
        "Confusion matrix",
        `${esc(shortModel(key))} · test set`,
        matrix,
        "Measured classifications",
      ),
      evidence_panel: panel(
        "Measured evidence",
        "Full experiment results",
        compare,
        "Includes an unbalanced baseline",
      ),
      roc_panel: panel(
        "Discrimination",
        "ROC curve · active model",
        curvePlot(
          "roc",
          r.roc_curve,
          { color: "#ec6726", width: 2.5 },
          { y: [0, 1], name: "Chance" },
          ["False positive rate", "True positive rate"],
        ),
        `ROC-AUC ${selected.roc_auc.toFixed(3)}`,
      ),
      precision_recall_panel: panel(
        "Minority-class performance",
        "Precision–recall curve · active model",
        curvePlot(
          "pr",
          r.pr_curve,
          { color: "#8261bd", width: 2 },
          { y: [prevalence, prevalence], name: "Prevalence baseline" },
          ["Recall", "Precision"],
        ),
        `Average precision ${selected.average_precision.toFixed(3)}`,
      ),
      protocol_panel: panel(
        "Reproducibility",
        "Training & evaluation protocol",
        renderTemplate("model-protocol", {
          protocol_rows: protocolRows
            .map(([label, value]) => renderTemplate("model-protocol-row", { label, value }))
            .join(""),
          model_name: esc(r.selected),
          model_version: r.version,
          download_icon: icon("download"),
        }),
      ),
    })
  );
}

// Compare every evaluated model on the same held-out test set.
function modelOverview() {
  const r = state.data.report,
    entries = Object.entries(r.results),
    colors = ["#eb672b", "#8563bd", "#ddaa32", "#8d99ad"],
    colorAt = (i) => colors[i % colors.length];
  const modelStatus = (name) =>
    name === r.selected
      ? '<div class="model-status">ACTIVE RESEARCH MODEL</div>'
      : `<div class="model-status muted">${name.includes("baseline") ? "UNBALANCED BASELINE" : "SMOTE CANDIDATE"}</div>`;
  const table = renderTemplate("models-table", {
    headers: METRICS.map(([, label]) =>
      renderTemplate("model-results-heading", { label }),
    ).join(""),
    rows: entries
      .map(([name, m]) =>
        renderTemplate("models-table-row", {
          selected_class: name === r.selected ? "selected" : "",
          model_name: esc(name),
          model_status: modelStatus(name),
          metrics: METRICS.map(([k]) =>
            renderTemplate("model-results-value", { value: formatMetric(k, m[k]) }),
          ).join(""),
        }),
      )
      .join(""),
  });
  const comparison = plot(
    "all-model-comparison",
    entries.map(([name, m], i) => ({
      type: "bar",
      name,
      x: METRICS.map(([, label]) => label),
      y: METRICS.map(([k]) => m[k] * 100),
      marker: { color: colorAt(i), cornerradius: 4 },
      hovertemplate: "%{x}: %{y:.2f}%<extra>%{fullData.name}</extra>",
    })),
    {
      barmode: "group",
      yaxis: { range: [0, 105], ticksuffix: "%" },
      margin: { l: 55, r: 20, t: 20, b: 55 },
    },
    "chart-tall",
  );
  const matrices = entries
    .map(([name, m]) =>
      panel(
        "Confusion matrix",
        esc(name),
        renderTemplate("models-confusion-matrix", {
          cells: confusionCells(m.cm),
          recall_status: m.recall >= 0.7 ? "met" : "not met",
          roc_auc: m.roc_auc.toFixed(3),
        }),
        name === r.selected ? "Active research model" : "Held-out test set",
      ),
    )
    .join("");
  return (
    researchNote() +
    renderTemplate("models-selector", {
      test_count: n(r.test_count),
      model_options: entries
        .map(([name]) => renderTemplate("model-option", { selected: "", model_name: esc(name) }))
        .join(""),
    }) +
    panel(
      "All models",
      "Model performance at a glance",
      table + renderTemplate("models-comparison-note", { model_count: entries.length }),
      "Direct comparison",
    ) +
    renderTemplate("models-overview", {
      comparison_panel: panel(
        "Benchmark",
        "Compare every metric",
        comparison +
          renderTemplate("model-legend", {
            legend_items: legendItems(
              entries.map(([name]) => name),
              entries.map((_, i) => colorAt(i)),
            ),
          }),
        "All metrics shown on a 0–100% scale",
      ),
      matrices,
      download_icon: icon("download"),
    })
  );
}

// ========================================================================
// Notifications page
// ========================================================================

// Derive newest-first activity and pending status from saved screenings.
function notificationItems() {
  return [...state.data.patients]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((p) => {
      const pending = isHigh(p) && !p.contacted;
      return {
        patient: p.id,
        pending,
        title: pending ? "Follow-up pending" : "Screening saved",
        description: `${p.profile.name} · ${p.id} · ${p.risk} model label${p.contacted ? " · Contacted" : ""}`,
        date: formatDate(p.created_at),
        icon: pending ? "bell" : "clipboard",
      };
    });
}

// Render one notification; compact rows omit the screening action.
function notificationRow(item, compact = false) {
  return renderTemplate("notification-row", {
    pending_class: item.pending ? "pending" : "",
    item_icon: icon(item.icon),
    title: esc(item.title),
    description: esc(item.description),
    screened_date: esc(item.date),
    row_attributes: compact
      ? ` data-patient="${esc(item.patient)}" role="button" tabindex="0" aria-label="Open screening ${esc(item.patient)}"`
      : "",
    screening_link: compact
      ? ""
      : renderTemplate("notification-screening-link", {
          patient_id: esc(item.patient),
          arrow_icon: icon("arrow"),
        }),
  });
}

// Limit the bell preview to three recent items and link to the full page.
function notificationSummary() {
  const items = notificationItems();
  return renderTemplate("notification-summary", {
    pending_count: n(items.filter((item) => item.pending).length),
    screening_count: n(items.length),
    preview_rows:
      items
        .slice(0, 3)
        .map((item) => notificationRow(item, true))
        .join("") || '<p class="small muted">No screening activity yet.</p>',
    arrow_icon: icon("arrow"),
  });
}

// Render all activity or only pending follow-ups with summary counts.
function notificationsPage() {
  const items = notificationItems(),
    pending = items.filter((item) => item.pending),
    pendingOnly = state.notificationFilter === "pending",
    shown = pendingOnly ? pending : items;
  return renderTemplate("notifications", {
    screenings_stat: stat(
      "Saved screenings",
      n(items.length),
      "All recorded screening activity",
      "clipboard",
    ),
    pending_stat: stat(
      "Follow-up pending",
      n(pending.length),
      "High-label records not yet contacted",
      "bell",
    ),
    updates_stat: stat("Workspace updates", "1", "Model evaluation available", "gauge"),
    filters: [
      ["all", "All"],
      ["pending", "Follow-up pending"],
    ]
      .map(([key, label]) =>
        renderTemplate("notifications-filter", {
          filter_key: key,
          active_class: state.notificationFilter === key ? "active" : "",
          pressed: state.notificationFilter === key,
          label,
        }),
      )
      .join(""),
    activity_rows:
      shown.map((item) => notificationRow(item)).join("") ||
      empty(
        pendingOnly ? "No follow-ups pending" : "No screening activity yet",
        pendingOnly
          ? "There are no high-label records awaiting contact."
          : "Saved screenings will appear here.",
        "bell",
      ),
    workspace_update:
      state.notificationFilter === "all"
        ? renderTemplate("notifications-model-update", {
            model_icon: icon("gauge"),
            model_name: esc(shortModel(state.data.report.selected)),
            arrow_icon: icon("arrow"),
          })
        : "",
  });
}

// ========================================================================
// Population Health page
// ========================================================================

// Summarize saved screenings by site, follow-up status, and demographics.
function population() {
  const rows = state.data.patients,
    high = rows.filter(isHigh),
    pending = high.filter((p) => !p.contacted),
    hypertensive = high.filter((p) => p.profile.hypertension).length,
    sites = [...new Set(rows.map((p) => p.profile.site))];
  const avgGlucose = high.length
    ? high.reduce((sum, p) => sum + p.profile.avg_glucose_level, 0) / high.length
    : null;
  const cards = renderTemplate("population-stats", {
    share_stat: stat(
      "High-label share",
      share(high.length, rows.length),
      `${high.length} of ${rows.length} saved screenings`,
      "target",
      "peach",
    ),
    sites_stat: stat(
      "Screening sites",
      n(sites.length),
      "Sites entered with saved records",
      "location",
      "lavender",
    ),
    flagged_stat: stat(
      "Flagged today",
      n(high.filter((p) => p.created_at.startsWith(today())).length),
      "High labels · Asia/Manila",
      "warning",
      "cream",
    ),
    glucose_stat: stat(
      "Avg. glucose · high labels",
      avgGlucose ? renderTemplate("population-glucose", { glucose: avgGlucose.toFixed(1) }) : "—",
      "Saved high-label cohort",
      "activity",
      "sage",
    ),
  });
  if (!rows.length)
    return (
      researchNote() +
      cards +
      panel(
        "Outreach planning",
        "Build a view of your population",
        empty(
          "No population records yet",
          "Save screenings with a site name to see actual site-level summaries here. No site data is inferred from the synthetic dataset.",
          "people",
          true,
        ),
      )
    );
  // Sites ranked by their share of high-label screenings.
  const siteRows =
    sites
      .map((site) => {
        const records = rows.filter((p) => p.profile.site === site);
        return { site, count: records.length, high: records.filter(isHigh).length };
      })
      .sort((a, b) => b.high / b.count - a.high / a.count)
      .map((s, i) =>
        renderTemplate("population-site-row", {
          rank: i + 1,
          site_name: esc(s.site),
          screening_count: n(s.count),
          high_share: pct(s.high / s.count),
          bar_width: (s.high / s.count) * 100,
        }),
      )
      .join("") + renderTemplate("population-no-sites", {});
  const live = liveSummary();
  return (
    researchNote() +
    cards +
    panel(
      "Outreach planning · by site",
      "Screening activity across your sites",
      siteRows,
      `${sites.length} sites`,
    ) +
    renderTemplate("population-health", {
      follow_up_panel: panel(
        "Follow-up",
        "Follow-up backlog",
        renderTemplate("population-follow-up", {
          pending_count: n(pending.length),
          arrow_icon: icon("arrow"),
        }),
      ),
      hypertension_panel: panel(
        "Cohort context",
        "Hypertension among high labels",
        renderTemplate("population-hypertension", {
          hypertension_share: share(hypertensive, high.length),
          hypertension_count: hypertensive,
          high_count: high.length,
        }),
      ),
      source_panel: panel(
        "Source transparency",
        "Workspace population",
        renderTemplate("population-source-note", { screening_count: rows.length }),
      ),
      age_panel: panel("Demographic", "High-label share by age", barPlot("pop-age", live.age)),
      residence_panel: panel(
        "Geographic",
        "High labels by residence",
        barPlot("pop-residence", live.residence, "positive"),
      ),
    })
  );
}

// ========================================================================
// Risk Breakdown page
// ========================================================================

// Show the selected saved screening, contributions, and current follow-up action.
function breakdown() {
  const rows = state.data.patients;
  if (!rows.length)
    return (
      researchNote() +
      panel(
        "Individual explanation",
        "Risk factor breakdown",
        empty(
          "No saved screenings yet",
          "Save a prediction to compare individual profiles and view their model explanations.",
          "activity",
          true,
        ),
      )
    );
  const selected = rows.find((p) => p.id === state.selected) || rows[0];
  state.selected = selected.id;
  const p = selected.profile;
  const yesNo = (v) => (v ? "Yes" : "No");
  const details = [
    ["Glucose", `${p.avg_glucose_level} mg/dL`],
    ["BMI", p.bmi ?? "Missing · imputed"],
    ["Smoking", pretty(p.smoking_status)],
    ["Hypertension", yesNo(p.hypertension)],
    ["Heart disease", yesNo(p.heart_disease)],
    ["Ever married", p.ever_married],
    ["Work type", pretty(p.work_type)],
    ["Residence", p.Residence_type],
    ["Screened", formatDate(selected.created_at)],
    ["Gender", p.gender],
    ["Site", p.site],
    ["Model version", selected.model_version],
  ];
  return (
    researchNote() +
    renderTemplate("risk-breakdown", {
      screening_count: n(rows.length),
      patient_list: rows.map(patientMini).join(""),
      overview_panel: panel(
        "Individual explanation",
        "",
        renderTemplate("breakdown-profile", {
          gauge: gauge(selected),
          participant_name: esc(p.name),
          risk_badge: riskBadge(selected.risk),
          patient_id: esc(selected.id),
          age: p.age,
          detail_rows: details
            .map(([label, value]) =>
              renderTemplate("breakdown-detail-row", { label, value: esc(value) }),
            )
            .join(""),
        }),
      ),
      explanation_panel: panel(
        "Risk factor contribution",
        "Which factors drove this model score",
        explanationChart(selected, "saved-contributions") + explanationNote(selected),
        esc(shortModel(selected.model)),
      ),
      follow_up_status: selected.contacted ? "Marked as contacted" : "Not yet marked as contacted",
      patient_id: esc(selected.id),
      contacted_value: !selected.contacted,
      disabled: state.busy ? "disabled" : "",
      follow_up_icon: icon(selected.contacted ? "reset" : "check"),
      follow_up_label: selected.contacted ? "Mark pending" : "Mark as contacted",
      admin_panel:
        state.data.user.role === "admin"
          ? renderTemplate("breakdown-admin", {
              disabled: state.busy ? "disabled" : "",
              trash_icon: icon("trash"),
            })
          : "",
    })
  );
}

// ========================================================================
// Risk Prediction page
// ========================================================================

// Render a text or numeric field using the current prediction form value.
function inputField(key, label, type, attributes, placeholder) {
  return renderTemplate("prediction-input", {
    key,
    label,
    type,
    value: esc(state.form[key] ?? ""),
    attributes,
    placeholder,
  });
}

// Render a required dropdown and preserve its selected option.
function selectField(key, label, values) {
  return renderTemplate("prediction-select", {
    key,
    label,
    placeholder_selected: !state.form[key] ? "selected" : "",
    placeholder_label: label.toLowerCase(),
    options: options(values, state.form[key]),
  });
}

function options(values, current) {
  return values
    .map((v) =>
      renderTemplate("prediction-option", {
        value: esc(v),
        selected: current === v ? "selected" : "",
        label: esc(pretty(v)),
      }),
    )
    .join("");
}

// Render the Yes/No radio group for a model input.
function binaryField(key, label) {
  return renderTemplate("prediction-binary", {
    key,
    label,
    options: ["0", "1"]
      .map((v, i) =>
        renderTemplate("prediction-binary-option", {
          key,
          value: v,
          checked: String(state.form[key]) === v ? "checked" : "",
          label: i ? "Yes" : "No",
        }),
      )
      .join(""),
  });
}

// Assemble the health profile form and its prediction result panels.
function prediction() {
  const busy = state.busy;
  return (
    researchNote() +
    renderTemplate("risk-prediction", {
      prediction_icon: icon("predict"),
      name_field: inputField(
        "name",
        "Participant name / research alias",
        "text",
        'maxlength="100"',
        "e.g. Participant A",
      ),
      age_field: inputField(
        "age",
        "Age (years)",
        "number",
        'required min="18" max="90" step="0.1"',
        "18–90",
      ),
      gender_field: selectField("gender", "Gender", ["Female", "Male"]),
      glucose_field: inputField(
        "avg_glucose_level",
        "Avg. glucose (mg/dL)",
        "number",
        'required min="70.01" max="250" step="0.01"',
        "70.01–250",
      ),
      bmi_field: inputField(
        "bmi",
        "Body mass index (BMI)",
        "number",
        `${state.form.bmi_missing ? "disabled" : "required"} min="15" max="40" step="0.1"`,
        "15–40",
      ),
      bmi_missing_checked: state.form.bmi_missing ? "checked" : "",
      hypertension_field: binaryField("hypertension", "Hypertension"),
      heart_disease_field: binaryField("heart_disease", "Heart disease"),
      married_field: binaryField("married", "Ever married"),
      smoking_field: selectField("smoking_status", "Smoking status", SMOKING_STATUSES),
      work_field: selectField("work_type", "Work type", WORK_TYPES),
      residence_field: selectField("Residence_type", "Residence type", ["Urban", "Rural"]),
      site_field:
        state.data.user.role === "worker"
          ? renderTemplate("prediction-input", {
              key: "site",
              label: "Screening site (assigned)",
              type: "text",
              value: esc(state.data.user.site),
              attributes: "readonly",
              placeholder: "",
            })
          : inputField(
              "site",
              "Screening site (optional)",
              "text",
              'maxlength="100"',
              "e.g. Campus research clinic",
            ),
      form_error: state.error
        ? renderTemplate("prediction-error", { message: esc(state.error) })
        : "",
      submit_disabled: busy ? "disabled" : "",
      submit_icon: busy ? '<span class="spinner"></span>' : icon("bolt"),
      submit_label: busy ? "Processing…" : "Predict stroke risk",
      reset_disabled: busy ? "disabled" : "",
      reset_icon: icon("reset"),
      bmi_median: state.data.report.bmi_training_median.toFixed(1),
      results: predictionResults(),
    })
  );
}

// Show the latest score, save action, and explanation or the initial empty state.
function predictionResults() {
  const r = state.result;
  let saveLabel = "Save to screened patients";
  if (state.saved) saveLabel = `Saved as ${esc(state.saved)}`;
  else if (state.busy) saveLabel = "Saving…";
  const resultBody = r
    ? renderTemplate("prediction-result", {
        gauge: gauge(r),
        risk_badge: riskBadge(r.risk),
        participant_name: esc(r.profile.name),
        score_description: isHigh(r)
          ? "This model score is at or above the experimental 50% cutoff."
          : "This model score is below the experimental 50% cutoff.",
        model_name: esc(shortModel(r.model)),
        save_class: state.saved ? "btn-outline-secondary" : "btn-primary",
        save_disabled: state.saved || state.busy ? "disabled" : "",
        save_icon: icon(state.saved ? "check" : "save"),
        save_label: saveLabel,
        records_link: state.saved
          ? renderTemplate("prediction-records-link", { arrow_icon: icon("arrow") })
          : "",
      })
    : empty(
        "Your result will appear here",
        "Complete the profile and select Predict stroke risk to run the trained model.",
        "sparkle",
      );
  const explanation = r
    ? explanationChart(r) + explanationNote(r)
    : empty(
        "An explanation for every score",
        "A signed contribution chart appears after a prediction is run.",
        "bars",
      );
  return (
    panel("Prediction result", r ? "Experimental model output" : "Ready when you are", resultBody) +
    panel("Risk factor breakdown", "What drove this result", explanation) +
    panel(
      "Model context",
      "Know what the score means",
      renderTemplate("prediction-model-context", {}),
    )
  );
}

// Keep entered values in memory before a render replaces the form DOM.
function captureForm() {
  const form = document.getElementById("prediction-form");
  if (!form) return;
  const f = new FormData(form);
  state.form = Object.fromEntries(f.entries());
  state.form.bmi_missing = f.has("bmi_missing");
}

// Convert raw form strings into the profile shape the Python model validates.
function formProfile(f) {
  return {
    name: f.name,
    site: f.site,
    age: Number(f.age),
    gender: f.gender,
    avg_glucose_level: Number(f.avg_glucose_level),
    bmi: f.bmi_missing ? null : Number(f.bmi),
    hypertension: Number(f.hypertension),
    heart_disease: Number(f.heart_disease),
    ever_married: f.married === "1" ? "Yes" : "No",
    smoking_status: f.smoking_status,
    work_type: f.work_type,
    Residence_type: f.Residence_type,
  };
}

// ========================================================================
// Screened Patients page
// ========================================================================

// Resolve the active date preset into an inclusive [from, to] day range.
function dateRange(f) {
  if (f.date === "today") return [today(), today()];
  if (f.date === "week") {
    const day = new Date(`${today()}T12:00:00+08:00`);
    day.setUTCDate(day.getUTCDate() - 6);
    return [dayString(day), today()];
  }
  return [f.from, f.to];
}

// Apply query, risk, date, site, and smoking filters to saved records.
function filteredPatients() {
  const f = state.filter,
    q = f.query.toLowerCase().trim(),
    [from, to] = dateRange(f);
  return state.data.patients.filter((p) => {
    const date = p.created_at.slice(0, 10);
    return (
      (!q || `${p.profile.name} ${p.id}`.toLowerCase().includes(q)) &&
      (f.risk === "All" || p.risk === f.risk) &&
      (f.date === "all" || ((!from || date >= from) && (!to || date <= to))) &&
      (f.site === "All" || p.profile.site === f.site) &&
      (f.smoking === "All" || p.profile.smoking_status === f.smoking)
    );
  });
}

const DATE_LABELS = {
  all: "Date range",
  today: "Today",
  week: "Last 7 days",
  custom: "Custom range",
};

// Render the screening toolbar, filters, and paginated table.
function patients() {
  const rows = filteredPatients(),
    f = state.filter,
    sites = [...new Set(state.data.patients.map((p) => p.profile.site))];
  const datePopover = renderTemplate("patients-date-popover", {
    date_presets: [
      ["all", "All time"],
      ["today", "Today"],
      ["week", "Last 7 days"],
    ]
      .map(([key, label]) =>
        renderTemplate("patients-date-preset", {
          active_class: f.date === key ? "active" : "",
          date_key: key,
          label,
        }),
      )
      .join(""),
    from_date: esc(f.from),
    to_date: esc(f.to),
  });
  const extraFilters = renderTemplate("patients-extra-filters", {
    site_options: ["All", ...sites]
      .map((s) =>
        renderTemplate("patients-site-option", {
          selected: f.site === s ? "selected" : "",
          site: esc(s),
        }),
      )
      .join(""),
    smoking_options: options(["All", ...SMOKING_STATUSES], f.smoking),
  });
  return renderTemplate("screened-patients", {
    record_count: n(rows.length),
    search_icon: icon("search"),
    query: esc(f.query),
    risk_filters: ["All", "High", "Low"]
      .map((risk) =>
        renderTemplate("patients-risk-filter", {
          active_class: f.risk === risk ? "active" : "",
          risk_label: risk,
          label: risk === "All" ? "All" : `${risk} risk`,
        }),
      )
      .join(""),
    date_expanded: state.dateOpen,
    calendar_icon: icon("calendar"),
    date_label: DATE_LABELS[f.date],
    date_popover: state.dateOpen ? datePopover : "",
    filters_expanded: state.extraFilters,
    filter_icon: icon("filter"),
    download_icon: icon("download"),
    extra_filters: state.extraFilters ? extraFilters : "",
    patient_table: patientTable(rows),
  });
}

const TABLE_HEADERS = [
  "Patient",
  "Age",
  "Glucose",
  "BMI",
  "Conditions",
  "Smoking",
  "Married",
  "Work type",
  "Residence",
  "Score",
  "Risk label",
];

function patientRow(p) {
  const { profile } = p;
  const none = !profile.hypertension && !profile.heart_disease;
  return renderTemplate("patients-table-row", {
    patient_id: esc(p.id),
    accessible_name: esc(profile.name),
    participant_name: esc(profile.name),
    display_id: esc(p.id),
    screened_date: formatDate(p.created_at),
    age: profile.age,
    glucose: profile.avg_glucose_level,
    bmi: profile.bmi ?? "—",
    hypertension_badge: profile.hypertension
      ? '<span class="condition">● Hypertension</span>'
      : "",
    heart_disease_badge: profile.heart_disease
      ? '<span class="condition heart">● Heart disease</span>'
      : "",
    no_conditions_badge: none ? '<span class="condition none">● None reported</span>' : "",
    smoking_status: esc(pretty(profile.smoking_status)),
    married: profile.ever_married,
    work_type: esc(pretty(profile.work_type)),
    residence: profile.Residence_type,
    risk_class: p.risk === "Low" ? "low" : "",
    score: pct(p.score, 0),
    risk_badge: riskBadge(p.risk),
  });
}

// Render one page of records while preserving the full filtered count.
function patientTable(rows) {
  const total = state.data.patients.length;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  state.tablePage = Math.min(state.tablePage, pageCount);
  if (!rows.length)
    return empty(
      total ? "No matching screenings" : "Your screening history starts here",
      total
        ? "Try another name, risk label, or date range."
        : "Save a prediction to create your first record. Records remain available after restarting the app.",
      "clipboard",
      !total,
    );
  const start = (state.tablePage - 1) * PAGE_SIZE,
    end = state.tablePage * PAGE_SIZE;
  return renderTemplate("patients-table", {
    headers: TABLE_HEADERS.map((label) =>
      renderTemplate("patients-table-heading", { label }),
    ).join(""),
    rows: rows.slice(start, end).map(patientRow).join(""),
    first_record: start + 1,
    last_record: Math.min(end, rows.length),
    matched_count: n(rows.length),
    total_count: n(total),
    pagination:
      pageCount > 1
        ? renderTemplate("patients-pagination", {
            previous_disabled: state.tablePage === 1 ? "disabled" : "",
            current_page: state.tablePage,
            total_pages: pageCount,
            next_disabled: state.tablePage === pageCount ? "disabled" : "",
          })
        : "",
  });
}

// Connect record selection, keyboard activation, and pagination controls.
function bindPatients() {
  document.querySelectorAll("[data-patient]").forEach((el) => {
    el.onclick = () => {
      state.selected = el.dataset.patient;
      nav("breakdown");
    };
    if (el.tagName !== "BUTTON")
      el.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          el.click();
        }
      };
  });
  onClickAll("[data-page-step]", (el) => {
    state.tablePage += Number(el.dataset.pageStep);
    updatePatientTable();
  });
}

// Refresh table results without rebuilding the search field or losing focus.
function updatePatientTable() {
  const rows = filteredPatients();
  document.getElementById("patients-table").innerHTML = patientTable(rows);
  document.getElementById("record-count").textContent = `${n(rows.length)} records`;
  bindPatients();
  onClickAll("#patients-table [data-nav]", (el) => nav(el.dataset.nav));
}

// CSV columns in export order: [header, value for a saved screening].
const PROFILE_COLUMNS = [
  "name",
  "site",
  "age",
  "gender",
  "avg_glucose_level",
  "bmi",
  "hypertension",
  "heart_disease",
  "ever_married",
  "work_type",
  "Residence_type",
  "smoking_status",
];
const CSV_COLUMNS = [
  ["id", (p) => p.id],
  ["screened_at", (p) => p.created_at],
  ...PROFILE_COLUMNS.map((key) => [key, (p) => p.profile[key]]),
  ["model_score", (p) => p.score],
  ["risk_label", (p) => p.risk],
  ["threshold", (p) => p.threshold],
  ["model", (p) => p.model],
  ["model_version", (p) => p.model_version],
  ["contacted", (p) => p.contacted],
];

// Quote every cell and neutralize spreadsheet formulas (=, +, -, @).
function csvCell(value) {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}

// Export filtered records with spreadsheet-formula protection and CSV quoting.
function exportCSV() {
  const rows = filteredPatients();
  if (!rows.length) {
    toast("No matched records to export.");
    return;
  }
  const csv = [
    CSV_COLUMNS.map(([header]) => header),
    ...rows.map((p) => CSV_COLUMNS.map(([, value]) => value(p))),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  download(`cerebra-screenings-${today()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
  toast(`Exported ${rows.length} matched records.`);
}

// ========================================================================
// Settings page
// ========================================================================

// Render appearance preferences, workspace name, and record refresh controls.
function settings() {
  const { user } = state.data;
  return renderTemplate("settings", {
    account_panel: panel(
      "Account",
      "Signed-in user",
      renderTemplate("settings-account", {
        initials: esc(initials(user.display_name).toUpperCase()),
        display_name: esc(user.display_name),
        username: esc(user.username),
        role: esc(user.role),
        role_label: esc(user.role_label),
        site_label: esc(user.site || "All sites"),
        disabled: state.busy ? "disabled" : "",
        sign_out_icon: icon("logout"),
      }),
    ),
    appearance_panel: panel(
      "Appearance",
      "Make the workspace yours",
      renderTemplate("settings-appearance", {
        light_active: !state.dark ? "active" : "",
        sun_icon: icon("sun"),
        dark_active: state.dark ? "active" : "",
        moon_icon: icon("moon"),
      }),
    ),

    storage_panel: panel(
      "Data & storage",
      "Local records",
      renderTemplate("settings-storage", {
        screening_count: n(state.data.patients.length),
        refresh_disabled: state.busy ? "disabled" : "",
        refresh_icon: icon("reset"),
      }),
    ),
  });
}

// ========================================================================
// Sign-in screen
// ========================================================================

function renderLogin() {
  document.getElementById("app").innerHTML = renderTemplate("login", {
    notice:
      state.data.notice && !state.error
        ? `<div class="login-notice" role="status">${esc(state.data.notice)}</div>`
        : "",
    error: state.error ? renderTemplate("prediction-error", { message: esc(state.error) }) : "",
    username: esc(state.loginUsername),
    disabled: state.busy ? "disabled" : "",
    submit_icon: state.busy ? '<span class="spinner"></span>' : "",
    submit_label: state.busy ? "Signing in…" : "Sign in",
    eye_icon: icon("eye"),
  });
  chartsLoading = false;
  syncLoadingModal();
  on("password-toggle", "click", (e) => {
    const button = e.currentTarget,
      input = document.getElementById("login-password"),
      show = input.type === "password";
    input.type = show ? "text" : "password";
    button.innerHTML = icon(show ? "eyeOff" : "eye");
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    input.focus();
  });
  on("login-form", "submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const username = String(f.get("username")).trim(),
      password = String(f.get("password"));
    state.loginUsername = username;
    if (!username || !password) {
      state.error = "Enter your username and password.";
      return renderLogin();
    }
    action("login", { username, password });
  });
  if (!document.getElementById("loading-modal").open) {
    document.getElementById(state.loginUsername ? "login-password" : "login-username")?.focus();
  }
}

// ========================================================================
// Audit Log page (admin only)
// ========================================================================

const AUDIT_ACTIONS = {
  login: "Signed in",
  logout: "Signed out",
  session_timeout: "Session timed out",
  login_failed: "Failed sign-in",
  password_changed: "Password changed",
  screening_saved: "Screening saved",
  follow_up: "Follow-up updated",
  user_created: "Account created",
  user_updated: "Account updated",
  screening_deleted: "Screening deleted",
  backup_created: "Backup created",
  backup_restored: "Backup restored",
};
const AUDIT_FILTERS = {
  all: ["All", null],
  account: ["Sign-ins", ["login", "logout", "session_timeout", "login_failed", "password_changed"]],
  records: ["Records", ["screening_saved", "follow_up"]],
  admin: ["Admin actions", ["user_created", "user_updated", "screening_deleted", "backup_created", "backup_restored"]],
  failed: ["Failed sign-ins", ["login_failed"]],
};
const ROLE_LABELS = { admin: "Admin", worker: "Healthcare worker" };

function formatDateTime(date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

function auditPage() {
  const events = state.data.audit || [],
    failed = events.filter((e) => e.action === "login_failed"),
    users = new Set(events.filter((e) => e.action !== "login_failed").map((e) => e.username)),
    actions = AUDIT_FILTERS[state.auditFilter][1],
    shown = actions ? events.filter((e) => actions.includes(e.action)) : events;
  const rows = shown
    .map((e) =>
      renderTemplate("audit-row", {
        row_class: e.action === "login_failed" ? "failed" : "",
        time: esc(formatDateTime(e.created_at)),
        username: esc(e.username || "—"),
        role: esc(ROLE_LABELS[e.role] || "—"),
        action_class: esc(e.action),
        action: esc(AUDIT_ACTIONS[e.action] || e.action),
        detail: esc(e.detail || "—"),
      }),
    )
    .join("");
  return renderTemplate("audit-log", {
    events_stat: stat("Recorded events", n(events.length), "Latest 500 shown", "shield", "lavender"),
    failed_stat: stat("Failed sign-ins", n(failed.length), "Wrong username or password", "warning", "peach"),
    users_stat: stat("Active accounts", n(users.size), "Users with recorded activity", "people", "sage"),
    filters: Object.entries(AUDIT_FILTERS)
      .map(([key, [label]]) =>
        renderTemplate("audit-filter", {
          key,
          label,
          active_class: state.auditFilter === key ? "active" : "",
        }),
      )
      .join(""),
    table: rows
      ? renderTemplate("audit-table", { rows })
      : empty("No matching activity", "Events appear here as people sign in and work with records.", "shield"),
  });
}

// ========================================================================
// User Management page (admin only)
// ========================================================================

function roleOptions(selected) {
  return Object.entries(ROLE_LABELS)
    .map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`)
    .join("");
}

// Admins see every site, so their site field is disabled.
function siteFieldState(role) {
  return {
    site_disabled: role === "admin" || state.busy ? "disabled" : "",
    site_placeholder: role === "admin" ? "Admins see every site" : "e.g. Barangay health center",
  };
}

function usersPage() {
  const users = state.data.users || [],
    me = state.data.user,
    busy = state.busy ? "disabled" : "",
    draft = state.userDraft,
    draftRole = draft.role || "worker";
  const sites = [
    ...new Set([...state.data.patients.map((p) => p.profile.site), ...users.map((u) => u.site)].filter(Boolean)),
  ].sort();
  const createForm = renderTemplate("user-create", {
    username: esc(draft.username ?? ""),
    display_name: esc(draft.display_name ?? ""),
    role_options: roleOptions(draftRole),
    site: esc(draft.site ?? ""),
    ...siteFieldState(draftRole),
    disabled: busy,
    plus_icon: icon("plus"),
  });
  const rows = users
    .map((u) => {
      const editing = state.editingUser === u.id,
        self = u.id === me.id;
      const editor = renderTemplate("user-edit", {
        id: u.id,
        display_name: esc(u.display_name),
        role_options: roleOptions(u.role),
        site: esc(u.site ?? ""),
        ...siteFieldState(u.role),
        active_checked: u.active ? "checked" : "",
        disabled: busy,
        self_disabled: self || state.busy ? "disabled" : "",
        self_note: self
          ? '<p class="small muted user-self-note">You cannot disable or remove the admin role from your own account.</p>'
          : "",
      });
      return renderTemplate("user-row", {
        row_class: u.active ? "" : "inactive",
        display_name: esc(u.display_name),
        you_label: self ? ' <span class="you-tag">You</span>' : "",
        username: esc(u.username),
        role: esc(u.role),
        role_label: esc(u.role_label),
        site: esc(u.site || "All sites"),
        status_class: u.active ? "active" : "inactive",
        status: u.active ? "Active" : "Disabled",
        created: esc(formatDate(u.created_at)),
        id: u.id,
        editing,
        edit_label: editing ? "Close" : "Edit",
        edit_row: editing ? editor : "",
      });
    })
    .join("");
  const count = (fn) => n(users.filter(fn).length);
  return renderTemplate("users", {
    accounts_stat: stat("Accounts", n(users.length), "All roles", "people", "lavender"),
    admins_stat: stat("Admins", count((u) => u.role === "admin" && u.active), "Active, all sites", "key", "peach"),
    workers_stat: stat("Healthcare workers", count((u) => u.role === "worker" && u.active), "Active, one site each", "predict", "sage"),
    disabled_stat: stat("Disabled", count((u) => !u.active), "Cannot sign in", "warning", "cream"),
    create_panel: panel("New account", "Add a healthcare worker or admin", createForm),
    rows,
    site_options: sites.map((site) => `<option value="${esc(site)}"></option>`).join(""),
  });
}

function bindUsers() {
  onClickAll("[data-edit-user]", (el) => {
    const id = Number(el.dataset.editUser);
    state.editingUser = state.editingUser === id ? null : id;
    render();
  });
  document.querySelectorAll("[data-site-target]").forEach((select) =>
    select.addEventListener("change", () => {
      const site = document.getElementById(select.dataset.siteTarget);
      const { site_disabled, site_placeholder } = siteFieldState(select.value);
      site.disabled = !!site_disabled;
      site.placeholder = site_placeholder;
    }),
  );
  on("user-create-form", "submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const [username, display_name, role, site] = ["username", "display_name", "role", "site"].map((k) =>
      String(f.get(k) ?? "").trim(),
    );
    const password = String(f.get("password") ?? "");
    state.userDraft = { username, display_name, role, site };
    if (password.length < 8) return toast("The initial password needs at least 8 characters.", true);
    action("user_create", { username, display_name, role, site, password });
  });
  on("user-edit-form", "submit", (e) => {
    e.preventDefault();
    const form = e.target,
      f = new FormData(form),
      id = Number(form.dataset.userId),
      account = (state.data.users || []).find((u) => u.id === id),
      self = id === state.data.user.id;
    const password = String(f.get("password") ?? "");
    if (password && password.length < 8) return toast("A reset password needs at least 8 characters.", true);
    const payload = {
      id,
      display_name: String(f.get("display_name") ?? "").trim(),
      // Disabled controls are not submitted, so keep the stored values for them.
      role: f.get("role") ?? account.role,
      site: String(f.get("site") ?? "").trim(),
      active: self ? true : f.has("active"),
      password,
    };
    if (account.active && !payload.active) {
      return askConfirm({
        title: `Deactivate ${esc(account.display_name)}?`,
        body: `<b>${esc(account.username)}</b> will be signed out right away and cannot sign in until an admin reactivates the account. Their saved screenings stay in the records.`,
        confirmLabel: "Deactivate account",
        action: "user_update",
        payload,
      });
    }
    action("user_update", payload);
  });
}

// ========================================================================
// Confirmation dialog for risky admin actions
// ========================================================================

// `body` and `title` are trusted HTML built by the caller (escape any user data).
function askConfirm(request) {
  state.confirm = request;
  state.error = "";
  render();
}

function confirmDialog() {
  const { title, body, confirmLabel } = state.confirm;
  return renderTemplate("confirm-dialog", {
    title,
    body,
    confirm_label: confirmLabel,
    warning_icon: icon("warning"),
    error: state.error ? renderTemplate("prediction-error", { message: esc(state.error) }) : "",
  });
}

// The signed-in user's password is sent with the action; the server checks it.
function bindConfirmDialog() {
  const dialog = document.getElementById("confirm-modal");
  if (!dialog) return;
  const close = () => {
    state.confirm = null;
    state.error = "";
    render();
  };
  dialog.oncancel = (e) => {
    e.preventDefault();
    close();
  };
  on("confirm-cancel", "click", close);
  on("confirm-form", "submit", (e) => {
    e.preventDefault();
    const confirm_password = String(new FormData(e.target).get("password") ?? "");
    if (!confirm_password) {
      state.error = "Enter your password to continue.";
      return render();
    }
    dialog.close();
    action(state.confirm.action, { ...state.confirm.payload, confirm_password });
  });
  dialog.showModal();
  document.getElementById("confirm-password").focus();
}

// ========================================================================
// System & Backups page (admin only)
// ========================================================================

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

function systemPage() {
  const { report, users = [], patients } = state.data,
    backups = state.data.backups || { folder: "", items: [] },
    busy = state.busy ? "disabled" : "",
    latest = backups.items[0];
  const rows = backups.items
    .map((b) =>
      renderTemplate("backup-row", {
        name: esc(b.name),
        safety_tag: b.safety ? ' <span class="you-tag">Before restore</span>' : "",
        created: esc(formatDateTime(b.created_at)),
        size: formatBytes(b.size),
        screenings: b.valid ? n(b.screenings) : "—",
        users: b.valid ? n(b.users) : "—",
        disabled: b.valid && !state.busy ? "" : "disabled",
      }),
    )
    .join("");
  const modelRows = [
    ["Active model", esc(report.selected)],
    ["Model version", esc(report.version)],
    ["Trained", esc(formatDateTime(report.trained_at))],
    ["Training / test records", `${n(report.train_count)} / ${n(report.test_count)}`],
    ["Classification threshold", pct(report.threshold, 0)],
    ["Dataset SHA-256", `<code>${esc(String(report.dataset_sha256).slice(0, 16))}…</code>`],
    ["Python", esc(report.python)],
    ...Object.entries(report.versions || {}).map(([lib, v]) => [esc(lib), esc(v)]),
  ]
    .map(([label, value]) => `<div class="mini-row"><span>${label}</span><b>${value}</b></div>`)
    .join("");
  return renderTemplate("system", {
    model_stat: stat("Active model", esc(shortModel(report.selected)), `Version ${esc(report.version)}`, "gauge", "lavender"),
    records_stat: stat("Screenings", n(patients.length), "All sites", "clipboard", "peach"),
    accounts_stat: stat("Accounts", n(users.length), "Admins and healthcare workers", "people", "sage"),
    backups_stat: stat(
      "Backups",
      n(backups.items.length),
      latest ? `Latest ${esc(formatDate(latest.created_at))}` : "None yet",
      "database",
      "cream",
    ),
    disabled: busy,
    backup_icon: icon("database"),
    folder: esc(backups.folder),
    table: rows
      ? renderTemplate("backup-table", { rows })
      : empty("No backups yet", "Create a backup before large changes such as deleting records.", "database"),
    model_panel: panel(
      "Active model",
      "Model and training data",
      `${modelRows}<p class="small muted mt-3">Retraining runs on the server with <code>train.py</code>; the app picks up the new model after a restart.</p>`,
    ),
  });
}

function bindSystem() {
  on("create-backup", "click", () => action("backup_create"));
  onClickAll("[data-restore]", (el) =>
    askConfirm({
      title: "Restore this backup?",
      body: `All screenings, accounts, and the audit log will be replaced with <b>${esc(el.dataset.restore)}</b>. The current data is saved as a new backup first. Anyone whose account is not in the backup will be signed out.`,
      confirmLabel: "Restore backup",
      action: "backup_restore",
      payload: { name: el.dataset.restore },
    }),
  );
}

// ========================================================================
// Idle sign-out
// ========================================================================

// Any input counts as activity. While active, a quiet "ping" keeps the server
// session alive; after the idle limit with no input, the browser signs out.
// The server enforces the same limit on its own.
let lastActivity = Date.now(),
  lastPing = Date.now();
const PING_INTERVAL_MS = 5 * 60 * 1000;

function markActivity() {
  lastActivity = Date.now();
}

function checkIdle() {
  if (!state.data?.user || state.busy || localTask) return;
  const idleMs = (state.data.idle_seconds || 30 * 60) * 1000;
  if (Date.now() - lastActivity >= idleMs) {
    action("logout", { reason: "idle" });
  } else if (lastActivity > lastPing && Date.now() - lastPing >= Math.min(PING_INTERVAL_MS, idleMs / 3)) {
    lastPing = Date.now();
    post("streamlit:setComponentValue", {
      value: { action: "ping", request_id: crypto.randomUUID() },
      dataType: "json",
    });
  }
}

// ========================================================================
// Startup
// ========================================================================

window.addEventListener("message", onHostMessage);
for (const type of ["pointerdown", "pointermove", "keydown", "wheel", "scroll", "touchstart"]) {
  window.addEventListener(type, markActivity, { passive: true, capture: true });
}
setInterval(checkIdle, 5000);
window.addEventListener("resize", () => {
  if (window.Plotly)
    document.querySelectorAll(".js-plotly-plot").forEach((el) => Plotly.Plots.resize(el));
});
syncLoadingModal();
post("streamlit:componentReady", { apiVersion: 1 });
post("streamlit:setFrameHeight", { height: 900 });
