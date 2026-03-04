// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import RetailerDrawer from "./retailer-drawer";
import ProductDrawer from "./product-drawer";
import CityDrawer from "./city-drawer";
import ModalShell from "./modal-shell";
import TaskRetailerRows from "./task-retailer-rows";

type Mode = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";
type Sort = "SALES" | "ORDERS" | "GROWTH";

type AnalyticsResp = {
  ok: boolean;
  error?: string;
  message?: string;

  mode?: string;
  sort?: string;

  range?: { from: string; to: string };
  prevRange?: { from: string; to: string };

  pivot?: { months: number; monthKeys: string[]; pivotStart: string };

  filters?: {
    distId: string | null;
    city: string | null;
    distributors: Array<{ id: string; name: string }>;
    cities: string[];
  };

  summary?: {
    totalRetailers: number;
    totalDistributors: number;
    newRetailers: number;
    newDistributors: number;
    active30: number;
    inactive31_60: number;
    dormant61_90: number;
    dead90: number;
  };

  top10?: any[];
  nonPerf10?: any[];
  visitTop20?: any[];
  distributorSummary?: any[];
  monthPivot?: any[];
  monthPivot2?: any[];
};

type BriefItem =
  | string
  | { id: string; type: string; title: string; count: number; city?: string; productName?: string };

type AiConsoleResp = {
  ok: boolean;
  aiEnabled?: boolean;
  reason?: string;

  error?: string;
  message?: string;

  day?: string;
  mode?: string;
  range?: { from: string; to: string };
  filters?: { distId: string | null; city: string | null };

  executiveBrief?: BriefItem[];
  todayPlan?: Array<any>;

  leaderboards?: {
    topRetailers?: Array<any>;
    topCities?: Array<any>;
    topProducts?: Array<any>;
    slowMoversByCity?: Array<any>;
  };

  insights?: Array<any>;

  performance?: { score: number; total: number; done: number; openCount: number; reasons: string[] };
};

type OrderRow = {
  id: string;
  orderNo?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  totalAmount?: any;
  itemsCount?: number;
};

function isoDate(d: Date) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // ✅ local YYYY-MM-DD (no timezone shift)
}

function startOfMonthLocal(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDaysLocal(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfYearLocal(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

// ✅ NEW: Indian Financial Year start (IST/local)
function startOfFYLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1..12
  // Apr–Dec => FY starts current year Apr 1
  // Jan–Mar => FY starts previous year Apr 1
  const fyYear = m >= 4 ? y : y - 1;
  return new Date(fyYear, 3, 1); // month=3 => April (0-indexed)
}
function money(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function fmtDateTime(s: any) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("en-IN");
}
function dtShort(s: any) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}

/** ✅ FIX: AI payload me retailerId kabhi id / retailer.id form me hota hai */
function getRetailerId(r: any): string {
  return String(r?.retailerId || r?.id || r?.retailer?.id || "").trim();
}
function safeArr<T = any>(x: any): T[] {
  return Array.isArray(x) ? x : [];
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/* =========================
   ✅ NEW: Today Plan Card UI utils
   ========================= */

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatINR(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  try {
    return x.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(x)}`;
  }
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const cls =
    tone === "good"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : tone === "bad"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black", cls)}>
      {children}
    </span>
  );
}

function ProductsPreview({ products, onOpenProduct }: { products: string[]; onOpenProduct: (p: string) => void }) {
  const list = safeArr<string>(products).filter(Boolean);
  const shown = list.slice(0, 2);
  const rest = Math.max(0, list.length - shown.length);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shown.map((p, i) => (
        <button
          key={i}
          className="max-w-[260px] truncate rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-black hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProduct(p);
          }}
          title={p}
        >
          {p}
        </button>
      ))}
      {rest > 0 && <span className="text-[11px] text-gray-500 font-semibold">+{rest} more</span>}
      {!list.length && <span className="text-[11px] text-gray-500">—</span>}
    </div>
  );
}

function TargetsPreview({
  targets,
  retailerIds,
  onOpenDetail,
}: {
  targets: Array<any>;
  retailerIds: string[];
  onOpenDetail: () => void;
}) {
  const tgs = safeArr<any>(targets);
  const ids = safeArr<string>(retailerIds).filter(Boolean);

  const nameList = tgs
    .map((x) => ({
      id: getRetailerId(x),
      name: String(x?.retailerName || x?.retailer?.name || "").trim(),
    }))
    .filter((x) => x.id);

  const totalCount = nameList.length ? nameList.length : ids.length;

  if (!totalCount) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-gray-500">No targets found (API missing / data not ready)</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail();
          }}
          className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-black hover:bg-gray-50"
        >
          Details
        </button>
      </div>
    );
  }

  const shown = nameList.length
    ? nameList.slice(0, 3).map((x) => x.name || `${x.id.slice(0, 8)}…`)
    : ids.slice(0, 3).map((id) => `${String(id).slice(0, 8)}…`);

  const rest = Math.max(0, totalCount - shown.length);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {shown.map((nm, i) => (
          <span key={i} className="max-w-[260px] truncate text-[11px] text-gray-800 font-semibold">
            {nm}
          </span>
        ))}
        {rest > 0 && <span className="text-[11px] text-gray-500 font-semibold">+{rest}</span>}
      </div>
      <div className="text-[10px] text-gray-500">{totalCount} retailers • AI targets</div>
    </div>
  );
}

/* =========================
   PAGE
   ========================= */

export default function SMRetailersAnalyticsPage() {
  // Retailer drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRetailerId, setDrawerRetailerId] = useState<string>("");

  function openRetailer(retailerId: string) {
    const id = String(retailerId || "").trim();
    if (!id) {
      console.warn("OPEN RETAILER: missing id", retailerId);
      return;
    }
    setDrawerRetailerId(id);
    setDrawerOpen(true);
  }

  // Product drawer
  const [productOpen, setProductOpen] = useState(false);
  const [productName, setProductName] = useState<string>("");
  function openProduct(name: string) {
    const nm = String(name || "").trim();
    if (!nm) return;
    setProductName(nm);
    setProductOpen(true);
  }

  // City drawer
  const [cityOpen, setCityOpen] = useState(false);
  const [cityName, setCityName] = useState<string>("");
  function openCity(name: string) {
    const nm = String(name || "").trim();
    if (!nm) return;
    setCityName(nm);
    setCityOpen(true);
  }

  const [mode, setMode] = useState<Mode>("YEAR");
const [sort, setSort] = useState<Sort>("SALES");

// ✅ Default range: FY start -> today (IST/local)
const [from, setFrom] = useState<string>(() => isoDate(startOfFYLocal(new Date())));
const [to, setTo] = useState<string>(() => isoDate(new Date()));
  const [distId, setDistId] = useState<string>("");
  const [city, setCity] = useState<string>("");

  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsResp | null>(null);

  // AI Console
  const [ai, setAi] = useState<AiConsoleResp | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Task completion (remarks mandatory)
  const [remarkTaskId, setRemarkTaskId] = useState<string>("");
  const [remarkText, setRemarkText] = useState<string>("");
  const [remarkSaving, setRemarkSaving] = useState(false);

  // ✅ Top Retailers -> Orders Modal
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersRetailer, setOrdersRetailer] = useState<{ id: string; name: string } | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersData, setOrdersData] = useState<{ ok: boolean; error?: string; orders?: OrderRow[] } | null>(null);
  const ordersBodyRef = useRef<HTMLDivElement>(null);

  // ✅ Order Detail Modal
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderId, setOrderId] = useState<string>("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const orderBodyRef = useRef<HTMLDivElement>(null);

  // ✅ Evidence / Proof modal
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState<string>("Evidence");
  const [evidenceJson, setEvidenceJson] = useState<any>(null);
  const [showRawEvidence, setShowRawEvidence] = useState(false);

  // ✅ Task Detail Popup (Details button)
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskDetailTask, setTaskDetailTask] = useState<any>(null);

  function openTaskDetail(t: any) {
    setTaskDetailTask(t || null);
    setTaskDetailOpen(true);
  }
  function closeTaskDetail() {
    setTaskDetailOpen(false);
    setTaskDetailTask(null);
  }

  // last selected task for keyboard “E”
  const [lastSelectedTask, setLastSelectedTask] = useState<any>(null);

  function openEvidence(title: string, payload: any) {
    setEvidenceTitle(title || "Evidence");
    setEvidenceJson(payload ?? null);
    setShowRawEvidence(false);
    setEvidenceOpen(true);
  }
  function closeEvidence() {
    setEvidenceOpen(false);
    setEvidenceTitle("Evidence");
    setEvidenceJson(null);
  }

  // local search within tasks
  const [taskSearch, setTaskSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

    function startMyDay() {
    const el = document.getElementById("today-plan");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

    // ✅ Analytics query string
  // ✅ Analytics query string
const qs = useMemo(() => {
  const p = new URLSearchParams();
  p.set("mode", mode);
  p.set("sort", sort);
  p.set("months", "4");

  // ✅ Always send from/to (IST local), and make `to` exclusive by sending tomorrow
  if (mode === "CUSTOM") {
    p.set("from", from);
    p.set("to", isoDate(addDaysLocal(new Date(to), 1)));
  } else if (mode === "MONTH") {
    const start = startOfMonthLocal(new Date());
    const end = addDaysLocal(new Date(), 1);
    p.set("from", isoDate(start));
    p.set("to", isoDate(end));
  } else if (mode === "YEAR") {
  // ✅ Financial Year (India): 1 Apr -> today (exclusive tomorrow)
  const start = startOfFYLocal(new Date());
  const end = addDaysLocal(new Date(), 1);
  p.set("from", isoDate(start));
  p.set("to", isoDate(end));
  } 
  else if (mode === "TODAY") {
    const start = new Date();
    const end = addDaysLocal(new Date(), 1);
    p.set("from", isoDate(start));
    p.set("to", isoDate(end));
  }

  if (distId) p.set("distId", distId);
  if (city) p.set("city", city);

  return p.toString();
}, [mode, sort, from, to, distId, city]);

// ✅ AI console query string
const aiQs = useMemo(() => {
  const p = new URLSearchParams();
  p.set("mode", mode);

  if (mode === "CUSTOM") {
    p.set("from", from);
    p.set("to", isoDate(addDaysLocal(new Date(to), 1)));
  } else if (mode === "MONTH") {
    const start = startOfMonthLocal(new Date());
    const end = addDaysLocal(new Date(), 1);
    p.set("from", isoDate(start));
    p.set("to", isoDate(end));
  } else if (mode === "YEAR") {
  // ✅ Financial Year (India): 1 Apr -> today (exclusive tomorrow)
  const start = startOfFYLocal(new Date());
  const end = addDaysLocal(new Date(), 1);
  p.set("from", isoDate(start));
  p.set("to", isoDate(end));
}
  else if (mode === "TODAY") {
    const start = new Date();
    const end = addDaysLocal(new Date(), 1);
    p.set("from", isoDate(start));
    p.set("to", isoDate(end));
  }

  if (distId) p.set("distId", distId);
  if (city) p.set("city", city);

  p.set("limit", "10");
  return p.toString();
}, [mode, from, to, distId, city]);
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales-manager/retailers/analytics?${qs}`, { cache: "no-store" });
      const j = (await res.json().catch(() => null)) as AnalyticsResp | null;
      if (!res.ok) {
        setData(j || { ok: false, error: "FAILED" });
        return;
      }
      setData(j);
    } catch (e: any) {
      setData({ ok: false, error: "NETWORK_ERROR", message: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  async function loadAi() {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/sales-manager/retailers/ai/console?${aiQs}`, { cache: "no-store" });
      const j = (await res.json().catch(() => null)) as AiConsoleResp | null;

      if (!res.ok) {
        setAi(
          (j as any) || {
            ok: false,
            aiEnabled: false,
            error: "AI_CONSOLE_FAILED",
            message: `HTTP ${res.status}`,
            executiveBrief: [`AI console failed (HTTP ${res.status}).`],
            todayPlan: [],
            performance: { score: 0, total: 0, done: 0, openCount: 0, reasons: [`HTTP ${res.status}`] },
          }
        );
        return;
      }

      setAi(j || { ok: false, error: "EMPTY" });
    } catch (e: any) {
      setAi({
        ok: false,
        aiEnabled: false,
        error: "NETWORK_ERROR",
        message: String(e?.message || e),
        executiveBrief: [`AI console network error: ${String(e?.message || e)}`],
        todayPlan: [],
        performance: { score: 0, total: 0, done: 0, openCount: 0, reasons: ["NETWORK_ERROR"] },
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function completeTask(taskId: string) {
    setRemarkTaskId(taskId);
    setRemarkText("");
  }

  async function submitRemarkAndComplete() {
    if (!remarkTaskId) return;
    if (!remarkText.trim()) return alert("Remarks mandatory!");

    setRemarkSaving(true);
    try {
      const res = await fetch(`/api/sales-manager/retailers/tasks/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: remarkTaskId, remarkText }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        alert(j?.error || "FAILED");
        return;
      }
      setRemarkTaskId("");
      setRemarkText("");
      await loadAi();
    } finally {
      setRemarkSaving(false);
    }
  }

  // ✅ Orders modal open (All orders of retailer)
  async function openRetailerOrders(retailerId: string, retailerName: string) {
    const rid = String(retailerId || "").trim();
    if (!rid) {
      alert("Retailer missing (id).");
      return;
    }

    setOrdersRetailer({ id: rid, name: retailerName });
    setOrdersOpen(true);
    setOrdersLoading(true);
    setOrdersData(null);

    try {
      const url = `/api/sales-manager/retailers/${encodeURIComponent(rid)}/orders?limit=80`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      setOrdersData(j || { ok: false, error: "FAILED" });
    } catch (e: any) {
      setOrdersData({ ok: false, error: String(e?.message || e) });
    } finally {
      setOrdersLoading(false);
    }
  }

  // ✅ Order detail open (retailer scoped path)  ✅ FIXED catch
  async function openOrderDetail(oid: string) {
    const rid = ordersRetailer?.id;
    if (!rid) {
      alert("Retailer missing. Close & reopen Orders modal.");
      return;
    }

    setOrderId(oid);
    setOrderOpen(true);
    setOrderLoading(true);
    setOrderData(null);

    try {
      const url = `/api/sales-manager/retailers/${encodeURIComponent(rid)}/orders/${encodeURIComponent(oid)}/detail`;
      const res = await fetch(url, { cache: "no-store" });
      const j2 = await res.json().catch(() => null);
      setOrderData(j2 || { ok: false, error: "FAILED" });
    } catch (e: any) {
      setOrderData({ ok: false, error: String(e?.message || e) });
    } finally {
      setOrderLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadAi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, aiQs]);

  // scroll top on modal open
  useEffect(() => {
    if (!ordersOpen) return;
    ordersBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [ordersOpen, ordersRetailer?.id]);

  useEffect(() => {
    if (!orderOpen) return;
    orderBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [orderOpen, orderId]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();

      // ESC closes
      if (e.key === "Escape") {
        if (evidenceOpen) closeEvidence();
        if (taskDetailOpen) closeTaskDetail();
        if (remarkTaskId) setRemarkTaskId("");
        if (ordersOpen) setOrdersOpen(false);
        if (orderOpen) setOrderOpen(false);
        return;
      }

      // Ctrl/Cmd + K => focus search
      if ((e.ctrlKey || e.metaKey) && k === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // ignore typing in inputs/textareas
      const tag = (e.target as any)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as any)?.isContentEditable) return;

      if (k === "r") {
        loadAi();
        return;
      }
      if (k === "s") {
        startMyDay();
        return;
      }
      if (k === "e") {
        if (lastSelectedTask) {
          openEvidence(
            `Task Proof: ${lastSelectedTask?.title || lastSelectedTask?.type}`,
            lastSelectedTask?.reasonJson || lastSelectedTask
          );
        }
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceOpen, taskDetailOpen, remarkTaskId, ordersOpen, orderOpen, lastSelectedTask]);

  const s = data?.summary;
  const months = data?.pivot?.monthKeys || [];
  const pivotRowsAll = (data?.monthPivot || []) as any[];

  const pivotRows = pivotRowsAll.filter((r) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    const a = String(r.retailerName || "").toLowerCase();
    const b = String(r.distributorName || "").toLowerCase();
    const c = String(r.city || "").toLowerCase();
    return a.includes(needle) || b.includes(needle) || c.includes(needle);
  });

  // ✅ Top Sales at page top (sum of last 4 months pivot sales)
  const totalSales4m = useMemo(() => {
    const rows = (data?.monthPivot || []) as any[];
    const ms = data?.pivot?.monthKeys || [];
    let sum = 0;
    for (const r of rows) {
      for (const m of ms) {
        const cell = r?.byMonth?.[m];
        sum += Number(cell?.sales || 0);
      }
    }
    return sum;
  }, [data?.monthPivot, data?.pivot?.monthKeys]);

  const aiEnabled = ai?.aiEnabled !== false;

  function onBriefClick(x: BriefItem) {
    if (typeof x === "string") return;
    const type = String((x as any).type || "");
    if (type === "TOP_CITY" && (x as any).city && (x as any).city !== "—") return openCity((x as any).city);
    if (type === "TOP_PRODUCT" && (x as any).productName && (x as any).productName !== "—")
      return openProduct((x as any).productName);
    if (type === "TODAY_PLAN") {
      const el = document.getElementById("today-plan");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ✅ Top Decisions as ROW LIST (cards removed)
  const topDecisionsRows = useMemo(() => {
    const brief = safeArr<any>(ai?.executiveBrief);
    const out: Array<{
      id: string;
      type: string;
      title: string;
      count?: number;
      city?: string;
      productName?: string;
      raw?: any;
    }> = [];

    for (let i = 0; i < brief.length; i++) {
      const x = brief[i];
      if (typeof x === "string") {
        out.push({ id: `S_${i}`, type: "NOTE", title: x, raw: x });
      } else if (x && typeof x === "object") {
        out.push({
          id: String(x.id || `O_${i}`),
          type: String(x.type || "DECISION"),
          title: String(x.title || "Decision"),
          count: typeof x.count === "number" ? x.count : Number((x as any).count || 0),
          city: (x as any).city,
          productName: (x as any).productName,
          raw: x,
        });
      }
    }
    return out.slice(0, 8);
  }, [ai?.executiveBrief]);

  // Today plan filtering
  const todayPlanAll = safeArr<any>(ai?.todayPlan);
  const todayPlanFiltered = useMemo(() => {
    const needle = taskSearch.trim().toLowerCase();
    if (!needle) return todayPlanAll;
    return todayPlanAll.filter((t) => {
      const a = String(t.title || t.type || "").toLowerCase();
      const b = String(t.aiReason || "").toLowerCase();
      const c = String(t.city || "").toLowerCase();
      const products = safeArr<string>(t.productNames).join(" ").toLowerCase();
      return a.includes(needle) || b.includes(needle) || c.includes(needle) || products.includes(needle);
    });
  }, [todayPlanAll, taskSearch]);

  const tasksOpen = todayPlanFiltered.filter((t) => String(t.status || "").toUpperCase() !== "DONE");
  const tasksDone = todayPlanFiltered.filter((t) => String(t.status || "").toUpperCase() === "DONE");

  const perf = ai?.performance;
  const total = Number(perf?.total || 0);
  const done = Number(perf?.done || 0);
  const openCount = Number(perf?.openCount || 0);
  const progressPct = total > 0 ? clamp(Math.round((done / total) * 100), 0, 100) : 0;

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Retailer Analytics</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ModeBtn active={mode === "TODAY"} onClick={() => setMode("TODAY")}>
            Today
          </ModeBtn>
          <ModeBtn active={mode === "MONTH"} onClick={() => setMode("MONTH")}>
            This Month
          </ModeBtn>
          <ModeBtn active={mode === "YEAR"} onClick={() => setMode("YEAR")}>
            This Year
          </ModeBtn>
          <ModeBtn active={mode === "CUSTOM"} onClick={() => setMode("CUSTOM")}>
            Custom
          </ModeBtn>

          <div className="hidden md:block w-px h-8 bg-gray-200 mx-1" />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="border rounded-2xl px-3 py-2 text-sm font-bold bg-white"
          >
            <option value="SALES">Sort: Sales</option>
            <option value="ORDERS">Sort: Orders</option>
            <option value="GROWTH">Sort: Growth%</option>
          </select>

          {mode === "CUSTOM" ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-sm bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-sm bg-white"
                />
              </div>
              <button onClick={load} className="px-3 py-2 rounded-2xl bg-gray-900 text-white text-sm font-black">
                Apply
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Filters + Search (ONLY ONE PLACE) */}
      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={distId}
            onChange={(e) => setDistId(e.target.value)}
            className="border rounded-2xl px-3 py-2 text-sm font-bold bg-white"
          >
            <option value="">All Distributors</option>
            {(data?.filters?.distributors || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border rounded-2xl px-3 py-2 text-sm font-bold bg-white"
          >
            <option value="">All Cities</option>
            {(data?.filters?.cities || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              load();
              loadAi();
            }}
            className="px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm font-black"
          >
            Apply Filters
          </button>

          <div className="text-xs text-gray-500">
  {(() => {
    const f = data?.range?.from ? new Date(String(data.range.from).slice(0, 10) + "T00:00:00") : null;
    const t0 = data?.range?.to ? new Date(String(data.range.to).slice(0, 10) + "T00:00:00") : null;

    // because backend/UI query uses exclusive "to" (tomorrow), show "to-1 day"
    const t = t0 ? addDaysLocal(t0, -1) : null;

    const fTxt = f ? f.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    const tTxt = t ? t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    return `Showing: ${fTxt} → ${tTxt}`;
  })()}
</div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search retailer / distributor / city…"
            className="border rounded-2xl px-3 py-2 text-sm bg-white w-full md:w-80"
          />
        </div>
      </div>

      {/* Loading / error */}
      <div className="mt-4">
        {loading ? <div className="text-sm text-gray-600">Loading analytics…</div> : null}
        {!loading && data && !data.ok ? (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            Error: {data.error || "UNKNOWN"} {data.message ? `— ${data.message}` : ""}
          </div>
        ) : null}
      </div>

      {/* Metrics strip */}
      <div className="mt-5 p-3 rounded-2xl border bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <MiniStat label="Sales (last 4m)" value={`₹${money(totalSales4m)}`} cls="bg-blue-50 border-blue-200" />
          <MiniStat label="Retailers" value={s?.totalRetailers ?? 0} cls="bg-gray-50 border-gray-200" />
          <MiniStat label="Active ≤30d" value={s?.active30 ?? 0} cls="bg-green-50 border-green-200" />
          <MiniStat label="Inactive 31–60d" value={s?.inactive31_60 ?? 0} cls="bg-yellow-50 border-yellow-200" />
          <MiniStat label="Dormant 61–90d" value={s?.dormant61_90 ?? 0} cls="bg-orange-50 border-orange-200" />
          <MiniStat label="Dead 90+d" value={s?.dead90 ?? 0} cls="bg-red-50 border-red-200" />
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <MiniStat label="Distributors" value={s?.totalDistributors ?? 0} cls="bg-gray-50 border-gray-200" />
          <MiniStat label="New Retailers" value={s?.newRetailers ?? 0} cls="bg-gray-50 border-gray-200" />
          <MiniStat label="New Distributors" value={s?.newDistributors ?? 0} cls="bg-gray-50 border-gray-200" />
        </div>
      </div>

      {/* Compact AI Command Center */}
      <div className="mt-6 p-4 rounded-2xl border bg-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-500">AI Command Center</div>
            <div className="text-lg font-black text-gray-900">Decide → Execute → Prove</div>
            <div className="text-xs text-gray-600 mt-1">Compact view · simple + clear.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={startMyDay}
              className="px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm font-black hover:opacity-95"
            >
              ▶ Start Day
            </button>

            <button onClick={loadAi} className="px-4 py-2 rounded-2xl border bg-white text-sm font-black hover:bg-gray-50">
              ↻ Refresh AI
            </button>

            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-50">
              {aiLoading
                ? "AI: Loading…"
                : ai?.ok
                ? aiEnabled
                  ? "AI: Enabled"
                  : `AI: Disabled (${ai.reason || "UNKNOWN"})`
                : "AI: Error"}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <KpiCard label="AI Score" value={ai?.performance?.score ?? 0} />
          <KpiCard label="Done/Total" value={`${done}/${total}`} />
          <KpiCard label="Open Tasks" value={openCount} />
          <KpiCard label="Progress" value={`${progressPct}%`} />
        </div>

        <div className="mt-3">
          <div className="h-2 rounded-full bg-gray-100 border overflow-hidden">
            <div className="h-full bg-gray-900" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(ai?.performance?.reasons || []).slice(0, 8).map((x, i) => (
              <Chip key={i}>{x}</Chip>
            ))}
          </div>
        </div>

        {!aiEnabled ? (
          <div className="mt-3 p-3 rounded-xl border bg-yellow-50 text-yellow-800 text-sm">
            AI disabled: <b>{ai?.reason || "UNKNOWN"}</b>
          </div>
        ) : null}
        {!aiLoading && ai && !ai.ok ? (
          <div className="mt-3 p-3 rounded-xl border bg-red-50 text-red-700 text-sm">
            AI error: <b>{ai.error || "UNKNOWN"}</b> {ai.message ? `— ${ai.message}` : ""}
          </div>
        ) : null}
      </div>

      {/* Top Decisions (ROW LIST) */}
      <div className="mt-3 p-4 rounded-2xl border bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-500">Top Decisions</div>
            <div className="text-lg font-black text-gray-900">Where to focus today</div>
          </div>
          <button
            className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
            onClick={() => openEvidence("AI Executive Brief (Raw)", ai?.executiveBrief)}
          >
            View Proof
          </button>
        </div>

        <div className="mt-3 overflow-x-auto border rounded-2xl bg-white">
          <table className="min-w-[900px] w-full text-[12px]">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left">
                <TH>#</TH>
                <TH>Type</TH>
                <TH>Decision</TH>
                <TH className="text-right">Count</TH>
                <TH className="text-right">Open</TH>
              </tr>
            </thead>
            <tbody>
              {topDecisionsRows.map((x, idx) => (
                <tr
                  key={x.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => onBriefClick(x.raw)}
                  title="Open related drawer if available"
                >
                  <TD className="font-black">{idx + 1}</TD>
                  <TD className="text-xs">{x.type}</TD>
                  <TD className="font-bold">
                    {x.title}
                    {x.city ? (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-gray-50">City: {x.city}</span>
                    ) : null}
                    {x.productName ? (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-gray-50">
                        Product: {x.productName}
                      </span>
                    ) : null}
                  </TD>
                  <TD className="text-right font-black">{typeof x.count === "number" ? x.count : "—"}</TD>
                  <TD className="text-right">
                    {x.city ? (
                      <button
                        className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCity(x.city!);
                        }}
                      >
                        City
                      </button>
                    ) : x.productName ? (
                      <button
                        className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProduct(x.productName!);
                        }}
                      >
                        Product
                      </button>
                    ) : (
                      <button
                        className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEvidence("Decision Evidence", x.raw);
                        }}
                      >
                        Proof
                      </button>
                    )}
                  </TD>
                </tr>
              ))}

              {!topDecisionsRows.length ? (
                <tr className="border-t">
                  <TD colSpan={5} className="text-center text-gray-600 py-6">
                    {aiLoading ? "Loading decisions…" : aiEnabled ? "No decisions." : "AI disabled."}
                  </TD>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ TODAY PLAN (TABLE like Top Retailers AI) */}
<div id="today-plan" className="mt-3 p-4 rounded-2xl border bg-white">
  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
    <div>
      <div className="text-[11px] font-semibold text-gray-500">Execution</div>
      <div className="text-lg font-black text-gray-900">Today’s AI To-Do Plan</div>
      <div className="text-xs text-gray-600 mt-1">Row-click table · Details/Proof/Complete buttons removed.</div>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={searchRef}
        value={taskSearch}
        onChange={(e) => setTaskSearch(e.target.value)}
        placeholder="Search tasks… (Ctrl/Cmd+K)"
        className="border rounded-2xl px-3 py-2 text-sm bg-white w-full md:w-72"
      />
      <button onClick={loadAi} className="px-3 py-2 rounded-2xl border bg-white text-sm font-black hover:bg-gray-50">
        ↻ Refresh
      </button>
    </div>
  </div>

  {!aiEnabled ? (
    <div className="mt-3 p-3 rounded-xl border bg-yellow-50 text-yellow-800 text-sm">
      Tasks not loaded because AI is disabled: <b>{ai?.reason || "UNKNOWN"}</b>
    </div>
  ) : null}

  {aiLoading ? (
    <div className="mt-3 grid grid-cols-1 gap-2">
      <SkeletonTask />
      <SkeletonTask />
      <SkeletonTask />
    </div>
  ) : (
    <div className="mt-3 overflow-x-auto border rounded-2xl bg-white">
      <table className="min-w-[1200px] w-full text-[12px]">
        <thead className="bg-gray-50 border-b">
          <tr className="text-left">
            <TH className="w-[90px]">Priority</TH>
            <TH className="w-[340px]">Task</TH>
            <TH className="w-[160px]">City</TH>
            <TH className="w-[120px] text-right">Targets</TH>
            <TH className="w-[170px] text-right">Impact</TH>
            <TH className="w-[140px] text-right">Confidence</TH>
            <TH className="w-[120px]">Status</TH>
          </tr>
        </thead>

        <tbody>
          {[...tasksOpen, ...(tasksDone.length ? tasksDone : [])].map((t: any, idx: number) => {
            const pri = Number(t?.priority || 0) || idx + 1;
            const status = String(t?.status || "OPEN").toUpperCase();
            const cityText = String(t?.city || "").trim() || "—";

            const targetsCount = Array.isArray(t?.targets) && t.targets.length
              ? t.targets.length
              : Array.isArray(t?.retailerIds)
              ? t.retailerIds.length
              : 0;

           
            const impactText =
              t?.expectedImpactMin
                ? `₹${money(t.expectedImpactMin)}–₹${money(t.expectedImpactMax || t.expectedImpactMin)}`
                : "—";

            const confPct = (() => {
              const v = Number(t?.confidence);
              if (!Number.isFinite(v)) return null;
              if (v > 0 && v <= 1) return Math.round(v * 100);
              if (v >= 0 && v <= 100) return Math.round(v);
              return null;
            })();

            return (
              <tr
                key={t.id || idx}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onMouseEnter={() => setLastSelectedTask(t)}
                onClick={() => openTaskDetail(t)} // ✅ row clickable
                title="Open task detail"
              >
                <TD className="font-black">{pri}</TD>

                <TD className="font-bold">
                  {t.title || t.type || "Task"}
                  <div className="text-[10px] text-gray-500 mt-0.5">{t.type || t.typeKey || ""}</div>
                  {t.aiReason ? (
                    <div className="text-[11px] text-gray-700 mt-1 line-clamp-1">{t.aiReason}</div>
                  ) : null}
                </TD>

                <TD className="font-semibold">{cityText}</TD>

                <TD className="text-right font-black">{targetsCount}</TD>

              

                <TD className="text-right font-black">{impactText}</TD>

                <TD className="text-right font-black">{confPct == null ? "—" : `${confPct}%`}</TD>

                <TD className={status === "DONE" ? "font-black text-green-700" : "font-black"}>{status}</TD>
              </tr>
            );
          })}

          {!tasksOpen.length && !tasksDone.length ? (
            <tr className="border-t">
              <TD colSpan={7} className="text-center text-gray-600 py-8">
                {aiEnabled ? "No tasks for today." : "AI disabled."}
              </TD>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )}
</div>
      {/* LEADERBOARDS */}
      <div className="mt-6 flex flex-col gap-3">
        <Section title="Top Retailers (AI)">
          <Table wide>
            <thead>
              <tr className="text-left">
                <TH>#</TH>
                <TH>Retailer</TH>
                <TH>City</TH>
                <TH className="text-right">Orders</TH>
                <TH className="text-right">Sales</TH>
                <TH className="text-right">Growth%</TH>
              </tr>
            </thead>
            <tbody>
              {(ai?.leaderboards?.topRetailers || []).map((r: any, idx: number) => {
                const rid = getRetailerId(r);
                return (
                  <tr
                    key={rid || idx}
                    className="border-t cursor-pointer hover:bg-gray-50"
                    onClick={() => {window.location.href = `/sales-manager/retailers/${rid}`;
}}
                    title="Open retailer drawer"
                  >
                    <TD>{idx + 1}</TD>
                    <TD className="font-bold">{r.retailerName}</TD>
                    <TD>{r.city || "—"}</TD>

                    <TD className="text-right">
                      <button
                        className="px-2 py-1 rounded-xl border bg-white text-xs font-black hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRetailerOrders(rid, r.retailerName);
                        }}
                        title="Open all orders of this retailer"
                      >
                        {Number(r.orders || 0)}
                      </button>
                    </TD>

                    <TD className="text-right">₹{money(r.sales)}</TD>
                    <TD className="text-right">{Number(r.growthPct || 0).toFixed(1)}%</TD>
                  </tr>
                );
              })}
              {!(ai?.leaderboards?.topRetailers || []).length ? (
                <tr className="border-t">
                  <TD colSpan={6} className="text-center text-gray-600 py-6">
                    No leaderboard data.
                  </TD>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Section>

        <Section title="Top Cities (AI)">
          <Table wide>
            <thead>
              <tr className="text-left">
                <TH>#</TH>
                <TH>City</TH>
                <TH className="text-right">Orders</TH>
                <TH className="text-right">Sales</TH>
                <TH className="text-right">Growth%</TH>
              </tr>
            </thead>
            <tbody>
              {(ai?.leaderboards?.topCities || []).map((c: any, idx: number) => (
                <tr
                  key={c.city || idx}
                  className="border-t cursor-pointer hover:bg-gray-50"
                  onClick={() => openCity(c.city)}
                  title="Open city drawer"
                >
                  <TD>{idx + 1}</TD>
                  <TD className="font-bold">{c.city}</TD>
                  <TD className="text-right">{Number(c.orders || 0)}</TD>
                  <TD className="text-right">₹{money(c.sales)}</TD>
                  <TD className="text-right">{Number(c.growthPct || 0).toFixed(1)}%</TD>
                </tr>
              ))}
              {!(ai?.leaderboards?.topCities || []).length ? (
                <tr className="border-t">
                  <TD colSpan={5} className="text-center text-gray-600 py-6">
                    No cities data.
                  </TD>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Section>

        <Section title="Top Products (AI)">
          <Table wide>
            <thead>
              <tr className="text-left">
                <TH>#</TH>
                <TH>Product</TH>
                <TH className="text-right">Orders</TH>
                <TH className="text-right">Qty</TH>
                <TH className="text-right">Sales</TH>
                <TH className="text-right">Growth%</TH>
              </tr>
            </thead>
            <tbody>
              {(ai?.leaderboards?.topProducts || []).map((p: any, idx: number) => (
                <tr
                  key={p.productName || idx}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => openProduct(p.productName)}
                  title="Open product drawer"
                >
                  <TD>{idx + 1}</TD>
                  <TD className="font-bold underline underline-offset-2">{p.productName}</TD>
                  <TD className="text-right">{Number(p.orders || 0)}</TD>
                  <TD className="text-right">{Number(p.qty || 0)}</TD>
                  <TD className="text-right">₹{money(p.sales)}</TD>
                  <TD className="text-right">{Number(p.growthPct || 0).toFixed(1)}%</TD>
                </tr>
              ))}
              {!(ai?.leaderboards?.topProducts || []).length ? (
                <tr className="border-t">
                  <TD colSpan={6} className="text-center text-gray-600 py-6">
                    No products data.
                  </TD>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Section>

        <Section title="Slow Movers by City (AI)">
          <Table wide>
            <thead>
              <tr className="text-left">
                <TH>City</TH>
                <TH>Product</TH>
                <TH className="text-right">Orders</TH>
                <TH className="text-right">Sales</TH>
              </tr>
            </thead>
            <tbody>
              {(ai?.leaderboards?.slowMoversByCity || []).map((x: any, idx: number) => (
                <tr key={`${x.city}-${x.productName}-${idx}`} className="border-t">
                  <TD
                    className="font-bold cursor-pointer hover:underline"
                    onClick={() => openCity(x.city)}
                    title="Open city drawer"
                  >
                    {x.city}
                  </TD>
                  <TD
                    className="font-bold cursor-pointer hover:underline"
                    onClick={() => openProduct(x.productName)}
                    title="Open product drawer"
                  >
                    {x.productName}
                  </TD>
                  <TD className="text-right">{Number(x.orders || 0)}</TD>
                  <TD className="text-right">₹{money(x.sales)}</TD>
                </tr>
              ))}
              {!(ai?.leaderboards?.slowMoversByCity || []).length ? (
                <tr className="border-t">
                  <TD colSpan={4} className="text-center text-gray-600 py-6">
                    No slow mover data.
                  </TD>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Section>
      </div>

      {/* Month pivot */}
      <Section title="All Retailers Month-wise (Orders + Sales) + Health Score (Click to open drawer)">
        <div className="text-xs text-gray-600 mb-2">
          Months: {(months || []).join(", ")} (showing last {months.length} months)
        </div>

        <div className="overflow-x-auto border rounded-2xl bg-white">
          <table className="min-w-[1200px] w-full text-[12px]">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <TH>Retailer</TH>
                <TH>Distributor</TH>
                <TH>City</TH>
                <TH className="text-right">Health</TH>
                <TH>Trend</TH>
                {months.map((m) => (
                  <TH key={m} className="text-right">
                    {m}
                  </TH>
                ))}
                <TH>Last Order</TH>
              </tr>
            </thead>
            <tbody>
              {pivotRows.map((r: any) => (
                <tr
                  key={r.retailerId}
                  className="border-t cursor-pointer hover:bg-gray-50"
                  onClick={() => openRetailer(getRetailerId(r))}
                >
                  <TD className="font-bold">{r.retailerName}</TD>
                  <TD>{r.distributorName}</TD>
                  <TD>{r.city || "—"}</TD>
                  <TD className="text-right">{Number(r.healthScore || 0)}</TD>
                  <TD>{String(r.trend || "—")}</TD>
                  {months.map((m) => {
                    const cell = r.byMonth?.[m];
                    const ord = Number(cell?.orders || 0);
                    const sal = Number(cell?.sales || 0);
                    return (
                      <TD key={m} className="text-right">
                        <div className="font-bold">{ord}</div>
                        <div className="text-[10px] text-gray-500">₹{money(sal)}</div>
                      </TD>
                    );
                  })}
                  <TD>{fmtDateTime(r.lastOrderAt)}</TD>
                </tr>
              ))}

              {!pivotRows.length ? (
                <tr className="border-t">
                  <TD colSpan={5 + months.length + 1} className="text-center text-gray-600 py-6">
                    No retailers found.
                  </TD>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Remark Modal */}
      {remarkTaskId ? (
        <div className="fixed inset-0 z-[110]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRemarkTaskId("")} />
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="w-full max-w-2xl rounded-2xl bg-white border shadow-xl">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Complete Task</div>
                  <div className="text-lg font-black">Remarks mandatory</div>
                </div>
                <button
                  className="px-3 py-2 rounded-xl border bg-white text-sm font-black"
                  onClick={() => setRemarkTaskId("")}
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <textarea
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  className="w-full border rounded-2xl p-3 text-sm"
                  rows={5}
                  placeholder="Write: retailer/city + action taken + outcome + next step/date…"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded-2xl border bg-white text-sm font-black"
                    onClick={() => setRemarkTaskId("")}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={remarkSaving}
                    className="px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm font-black disabled:opacity-60"
                    onClick={submitRemarkAndComplete}
                  >
                    Save Remark & Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Evidence Modal */}
      {evidenceOpen ? (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/40" onClick={closeEvidence} />
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="w-full max-w-3xl rounded-2xl bg-white border shadow-xl">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Proof / Explainability</div>
                  <div className="text-lg font-black text-gray-900">{evidenceTitle}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 rounded-xl border bg-white text-sm font-black hover:bg-gray-50"
                    onClick={() => setShowRawEvidence((v) => !v)}
                  >
                    {showRawEvidence ? "Hide Raw" : "Show Raw"}
                  </button>
                  <button className="px-3 py-2 rounded-xl border bg-white text-sm font-black" onClick={closeEvidence}>
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-4 max-h-[75vh] overflow-auto">
                <div className="text-xs text-gray-600 mb-2">
                  Evidence is explainable. Below are key reasons (if available) + optional raw JSON.
                </div>

                <EvidenceSummary payload={evidenceJson} />

                {showRawEvidence ? (
                  <pre className="mt-3 text-[12px] bg-gray-50 border rounded-2xl p-3 overflow-auto">
                    {JSON.stringify(evidenceJson, null, 2)}
                  </pre>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Orders List Modal */}
      <ModalShell
        open={ordersOpen}
        onClose={() => {
          setOrdersOpen(false);
          setOrderOpen(false);
          setOrderId("");
          setOrderData(null);
        }}
        zIndex={90}
        widthClass="max-w-5xl"
        titleTop={
          <div>
            <div className="text-xs font-semibold text-gray-500">Orders</div>
            <div className="text-lg font-black text-gray-900">{ordersRetailer?.name || "—"}</div>
            <div className="text-xs text-gray-600 mt-1">Retailer ke sabhi orders.</div>
          </div>
        }
      >
        <div ref={ordersBodyRef} className="p-4 overflow-auto max-h-[75vh]">
          {ordersLoading ? <div className="text-sm text-gray-600">Loading orders…</div> : null}

          {!ordersLoading && ordersData && !ordersData.ok ? (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
              Error: {ordersData.error || "UNKNOWN"}
            </div>
          ) : null}

          {!ordersLoading && ordersData?.ok ? (
            <div className="overflow-x-auto border rounded-2xl bg-white">
              <table className="min-w-[900px] w-full text-[12px]">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left">
                    <TH>Order No</TH>
                    <TH>Status</TH>
                    <TH>Date</TH>
                    <TH className="text-right">Items</TH>
                    <TH className="text-right">Total</TH>
                  </tr>
                </thead>
                <tbody>
                  {(ordersData.orders || []).map((o) => (
                    <tr
                      key={o.id}
                      className="border-t cursor-pointer hover:bg-gray-50"
                      onClick={() => openOrderDetail(o.id)}
                      title="Open order detail"
                    >
                      <TD className="font-bold">{o.orderNo || o.id}</TD>
                      <TD>{o.status || "—"}</TD>
                      <TD>{o.createdAt ? dtShort(o.createdAt) : "—"}</TD>
                      <TD className="text-right">{Number(o.itemsCount || 0)}</TD>
                      <TD className="text-right font-black">₹{money(o.totalAmount)}</TD>
                    </tr>
                  ))}

                  {!(ordersData.orders || []).length ? (
                    <tr className="border-t">
                      <TD colSpan={5} className="text-center text-gray-600 py-6">
                        No orders found.
                      </TD>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </ModalShell>

      {/* Order Detail Modal */}
      <ModalShell
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        zIndex={95}
        widthClass="max-w-5xl"
        titleTop={
          <div>
            <div className="text-xs font-semibold text-gray-500">Order Detail</div>
            <div className="text-lg font-black text-gray-900">{orderData?.order?.orderNo || orderId || "—"}</div>
          </div>
        }
      >
        <div ref={orderBodyRef} className="p-4 overflow-auto max-h-[75vh]">
          {orderLoading ? <div className="text-sm text-gray-600">Loading order detail…</div> : null}
          {!orderLoading && orderData && !orderData?.ok ? (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
              Error: {orderData?.error || "UNKNOWN"}
            </div>
          ) : null}
          {!orderLoading && orderData?.ok ? (
            <pre className="text-[12px] bg-gray-50 border rounded-2xl p-3 overflow-auto">{JSON.stringify(orderData, null, 2)}</pre>
          ) : null}
        </div>
      </ModalShell>

      {/* Task Detail Modal */}
      <ModalShell
        open={taskDetailOpen}
        onClose={closeTaskDetail}
        zIndex={100}
        widthClass="max-w-5xl"
        titleTop={
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="text-xs font-semibold text-gray-500">Task Detail</div>
      <div className="text-lg font-black text-gray-900 truncate">
        {taskDetailTask?.title || taskDetailTask?.type || "—"}
      </div>
      <div className="text-xs text-gray-600 mt-1 line-clamp-1">{taskDetailTask?.aiReason || "—"}</div>
    </div>

    {taskDetailTask ? (
      <div className="shrink-0 flex items-center gap-2">
        <button
          className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
          onClick={() =>
            openEvidence(`Task Proof: ${taskDetailTask?.title || taskDetailTask?.type}`, taskDetailTask?.reasonJson || taskDetailTask?.evidenceJson || taskDetailTask)
          }
        >
          Proof
        </button>

        {String(taskDetailTask?.status || "").toUpperCase() === "DONE" ? (
          <div className="px-3 py-2 rounded-2xl bg-green-600 text-white text-xs font-black text-center">Done</div>
        ) : (
          <button
            className="px-3 py-2 rounded-2xl bg-gray-900 text-white text-xs font-black hover:opacity-95"
            onClick={() => completeTask(taskDetailTask.id)}
          >
            Complete
          </button>
        )}
      </div>
    ) : null}
  </div>
}
      >
        <div className="p-4 overflow-auto max-h-[75vh]">
          {taskDetailTask ? (
            <TaskDetailBody t={taskDetailTask} money={money} onOpenRetailer={openRetailer} />
          ) : (
            <div className="text-sm text-gray-600">No task selected.</div>
          )}
        </div>
      </ModalShell>

      {/* DRAWERS */}
      <RetailerDrawer
        retailerId={drawerRetailerId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={mode}
        from={from}
        to={to}
      />
      <ProductDrawer
  productName={productName}
  open={productOpen}
  onClose={() => setProductOpen(false)}
  onOpenRetailer={openRetailer}
  onOpenCity={openCity}
  mode={mode}
  from={from}
  to={to}
/>

<CityDrawer
  city={cityName}
  open={cityOpen}
  onClose={() => setCityOpen(false)}
  onOpenRetailer={openRetailer}
  onOpenProduct={openProduct}
  mode={mode}
  from={from}
  to={to}
/>
    </div>
  );
}

/* =========================
   UI Components
   ========================= */

function ModeBtn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-2xl border text-sm font-black transition whitespace-nowrap",
        active
          ? "bg-gray-900 border-gray-900 text-white"
          : "bg-white border-pink-200 text-gray-900 hover:bg-[#fff0f0] hover:shadow-sm",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 p-4 rounded-2xl border bg-white">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MiniStat({ label, value, cls }: { label: string; value: any; cls: string }) {
  return (
    <div className={["px-3 py-2 rounded-2xl border", cls].join(" ")}>
      <div className="text-[10px] font-extrabold text-gray-600">{label}</div>
      <div className="text-sm font-black text-gray-900">{value}</div>
    </div>
  );
}

function Table({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="overflow-x-auto border rounded-2xl bg-white">
      <table className={[wide ? "min-w-[1200px]" : "min-w-[900px]", "w-full text-[12px]"].join(" ")}>{children}</table>
    </div>
  );
}

function TH({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={["px-4 py-2 font-black text-[12px]", className].join(" ")}>{children}</th>;
}
function TD({
  children,
  className = "",
  colSpan,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  onClick?: React.MouseEventHandler<HTMLTableCellElement>;
  title?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      className={["px-4 py-2 align-top text-[12px]", className].join(" ")}
      onClick={onClick}
      title={title}
    >
      {children}
    </td>
  );
}
function KpiCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-3 rounded-2xl border bg-white">
      <div className="text-[11px] font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-black text-gray-900">{value}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-50">{children}</span>;
}

function SkeletonTask() {
  return (
    <div className="p-4 rounded-2xl border bg-white">
      <div className="h-4 w-40 bg-gray-100 rounded" />
      <div className="mt-3 h-3 w-3/4 bg-gray-100 rounded" />
      <div className="mt-2 h-3 w-2/3 bg-gray-100 rounded" />
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-28 bg-gray-100 rounded-2xl" />
        <div className="h-8 w-28 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}

function EvidenceSummary({ payload }: { payload: any }) {
  const reasons: Array<{ feature?: string; detail?: string; strength?: number }> = [];

  // accept many shapes (task, decision, raw json)
  const rj =
    payload?.reasonJson ||
    payload?.evidenceJson ||
    payload?.reason ||
    payload?.evidence ||
    payload;

  const push = (arr: any) => {
    if (!Array.isArray(arr)) return;
    for (const x of arr) {
      reasons.push({
        feature: x?.feature || x?.key || x?.name,
        detail: x?.detail || x?.msg || x?.reason,
        strength: typeof x?.strength === "number" ? x.strength : undefined,
      });
    }
  };

  // structured AI evidence (old + new shapes)
  const risk =
    rj?.riskEvidence ||
    rj?.risk?.evidence ||
    rj?.risk?.reasons ||
    rj?.riskReasons ||
    null;

  const opp =
    rj?.oppEvidence ||
    rj?.opportunity?.evidence ||
    rj?.opportunity?.reasons ||
    rj?.oppReasons ||
    null;

  push(risk);
  push(opp);

  // fallback if no structured reasons exist
  if (!reasons.length) {
    const type = String(rj?.type || "");
    const title = String(rj?.title || "");
    const city = String(rj?.city || "");
    const product = String(rj?.productName || "");
    const count = typeof rj?.count === "number" ? rj.count : Number(rj?.count || 0);

    if (type) reasons.push({ feature: "Type", detail: type });
    if (title) reasons.push({ feature: "Summary", detail: title });
    if (city && city !== "—") reasons.push({ feature: "City", detail: city });
    if (product && product !== "—") reasons.push({ feature: "Product", detail: product });
    if (Number.isFinite(count) && count > 0) reasons.push({ feature: "Count", detail: String(count) });
  }

  const safe = reasons.slice(0, 8);

  return (
    <div className="p-3 rounded-2xl border bg-white">
      <div className="text-[11px] font-semibold text-gray-500">Top Reasons</div>

      {safe.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {safe.map((x, i) => (
            <span key={i} className="text-[11px] px-2 py-1 rounded-xl border bg-gray-50">
              <b>{x.feature || "Signal"}</b>
              {x.detail ? <span className="text-gray-700"> · {x.detail}</span> : null}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-xs text-gray-700">No structured reasons found. Use “Show Raw”.</div>
      )}
    </div>
  );
}
/* =========================
   TASK DETAIL MODAL BODY
   ✅ UPDATED: Reactivate shows row/table (no Targets box cards)
   ========================= */

function TaskDetailBody({
  t,
  money,
  onOpenRetailer,
}: {
  t: any;
  money: (n: any) => string;
  onOpenRetailer: (rid: string) => void;
}) {
  const typeKey = String(t?.typeKey || "").toUpperCase();
  const isReactivate = typeKey === "REACTIVATE_RETAILER";

  const retailerIds: string[] = Array.isArray(t?.retailerIds) ? t.retailerIds : [];
const targets = safeArr<any>(t.targets);

const targetRows = targets.length
    ? targets
        .map((x) => ({
          retailerId: String(x.retailerId || x.id || x.retailer?.id || "").trim(),
          retailerName: String(x.retailerName || x.retailer?.name || "").trim(),
          distributorName: String(x.distributorName || "").trim(),
          city: String(x.city || "").trim(),
          lastOrderAt: x.lastOrderAt || null,
          lastOrderAmount: x.lastOrderAmount ?? null,
          personalizedReason: String(x.personalizedReason || x.reason || "").trim(),
        }))
        .filter((r) => r.retailerId)
    : retailerIds
        .map((id) => ({
          retailerId: String(id || "").trim(),
          retailerName: "",
          distributorName: "",
          city: "",
          lastOrderAt: null,
          lastOrderAmount: null,
          personalizedReason: "",
        }))
        .filter((r) => r.retailerId);

 const callScript = `Hi, order update.\nReason: ${t?.aiReason || "AI insight"}\nCan we confirm order today?`;
const visitScript = `Visit: check stock + pitch.\nGoal: order today.\nReason: ${t?.aiReason || "AI insight"}`;
  const impactText =
    t?.expectedImpactMin ? `₹${money(t.expectedImpactMin)}–₹${money(t.expectedImpactMax || t.expectedImpactMin)}` : "—";

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-2xl border bg-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <KpiCard label="Priority" value={t?.priority ?? 0} />
          <KpiCard label="Impact" value={impactText} />
          <KpiCard label="Confidence" value={t?.confidence ? `${Number(t.confidence || 0)}%` : "—"} />
          <KpiCard label={isReactivate ? "Retailers" : "Targets"} value={targetRows.length} />
        </div>
      </div>

      {isReactivate ? (
        <div className="p-3 rounded-2xl border bg-white">
          <div className="text-sm font-black text-gray-900">Retailers</div>
          <div className="mt-2">
            <TaskRetailerRows targets={targetRows} onOpenRetailer={onOpenRetailer} />
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl border bg-white">
          <div className="text-sm font-black text-gray-900">Targets</div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {targetRows.slice(0, 50).map((x, idx) => (
              <div key={`${x.retailerId}-${idx}`} className="p-3 rounded-2xl border bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate">
                      {x.retailerName ? x.retailerName : `${x.retailerId.slice(0, 10)}…`}
                    </div>
                    <div className="text-xs text-gray-600">
                      {x.city ? `City: ${x.city}` : "City: —"} · ID: {x.retailerId}
                    </div>
                    {x.personalizedReason ? <div className="mt-1 text-xs text-gray-700">{x.personalizedReason}</div> : null}
                  </div>
                  <button
                    className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                    onClick={() => onOpenRetailer(x.retailerId)}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
            {!targetRows.length ? <div className="text-sm text-gray-600">No targets.</div> : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <SimpleScript title="Call Script" text={callScript} />
        <SimpleScript title="Visit Script" text={visitScript} />
      </div>
    </div>
  );
}

function SimpleScript({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-3 rounded-2xl border bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black text-gray-900">{title}</div>
        <button
          className="px-3 py-1.5 rounded-xl border bg-white text-[11px] font-black hover:bg-gray-50"
          onClick={() => {
            try {
              navigator.clipboard.writeText(text);
              alert("Copied ✅");
            } catch {
              alert("Copy failed");
            }
          }}
        >
          Copy
        </button>
      </div>
      <pre className="mt-2 text-[12px] whitespace-pre-wrap text-gray-800">{text}</pre>
    </div>
  );
}

/* =========================
   ✅ TODAY PLAN CARD
   ✅ UPDATED: Reactivate shows retailer rows (no TargetsPreview box)
   ========================= */

function TaskCard({
  t,
  money,
  done,
  onHover,
  onOpenEvidence,
  onComplete,
  onOpenRetailer,
  onOpenCity,
  onOpenProduct,
  onOpenDetail,
}: {
  t: any;
  money: (n: any) => string;
  done?: boolean;
  onHover: () => void;
  onOpenEvidence: () => void;
  onComplete: () => void;
  onOpenRetailer: (rid: string) => void;
  onOpenCity: (c: string) => void;
  onOpenProduct: (p: string) => void;
  onOpenDetail: () => void;
}) {
  const status = String(t.status || "").toUpperCase();
  const retailerIds: string[] = Array.isArray(t?.retailerIds) ? t.retailerIds : [];
  const targets = safeArr<any>(t.targets);

  const typeKey = String(t?.typeKey || "").toUpperCase();
  const isReactivate = typeKey === "REACTIVATE_RETAILER";

  const impactText =
    t?.expectedImpactMin ? `₹${money(t.expectedImpactMin)}–₹${money(t.expectedImpactMax || t.expectedImpactMin)}` : "—";

  const confText = t?.confidence ? `${Number(t.confidence || 0)}%` : "—";
  const pri = Number(t?.priority || 0);

  // ✅ normalize targets for rows
  const targetRows = targets
    .map((x: any) => ({
      retailerId: String(x?.retailerId || x?.id || x?.retailer?.id || "").trim(),
      retailerName: String(x?.retailerName || x?.retailer?.name || "").trim(),
      distributorName: String(x?.distributorName || "").trim(),
      city: String(x?.city || "").trim(),
      lastOrderAt: x?.lastOrderAt || null,
      lastOrderAmount: x?.lastOrderAmount ?? null,
      personalizedReason: String(x?.personalizedReason || x?.reason || "").trim(),
    }))
    .filter((r: any) => r.retailerId);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4 hover:bg-gray-50/50 transition",
        status === "DONE" || done ? "opacity-80 bg-gray-50" : ""
      )}
      onMouseEnter={onHover}
      onClick={onHover}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <div className="h-9 w-9 rounded-2xl border bg-gray-900 text-white flex items-center justify-center font-black">
                {pri || 0}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-gray-900 truncate">{t.title || t.type || "Task"}</div>
                <Pill>{t.type || "TASK"}</Pill>

                {t.city ? (
                  <button
                    className="inline-flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCity(t.city);
                    }}
                  >
                    <Pill tone="neutral">City: {t.city}</Pill>
                  </button>
                ) : null}

                {status === "DONE" || done ? <Pill tone="good">DONE</Pill> : null}
              </div>

              <div className="mt-1 text-[12px] text-gray-700 line-clamp-2">{t.aiReason || "—"}</div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* ✅ LEFT BOX */}
                <div className="rounded-2xl border bg-white p-3">
                  <div className="text-[11px] font-black text-gray-900">{isReactivate ? "Retailers" : "Targets"}</div>

                  <div className="mt-2">
                    {isReactivate ? (
                      <TaskRetailerRows
                        targets={targetRows.length ? targetRows : retailerIds.map((id: string) => ({ retailerId: id }))}
                        onOpenRetailer={onOpenRetailer}
                      />
                    ) : (
                      <TargetsPreview targets={targets} retailerIds={retailerIds} onOpenDetail={onOpenDetail} />
                    )}
                  </div>
                </div>

                {/* ✅ RIGHT BOX */}
                <div className="rounded-2xl border bg-white p-3">
                  <div className="text-[11px] font-black text-gray-900">Products</div>
                  <div className="mt-2">
                    <ProductsPreview products={safeArr<string>(t.productNames)} onOpenProduct={onOpenProduct} />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Pill tone="good">Impact: {impactText}</Pill>
                <Pill tone="neutral">Confidence: {confText}</Pill>
              </div>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="shrink-0 flex flex-row md:flex-col gap-2 md:items-end">
          <button
            className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
          >
            Details
          </button>

          <button
            className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEvidence();
            }}
          >
            Proof
          </button>

          {status === "DONE" || done ? (
            <div className="px-3 py-2 rounded-2xl bg-green-600 text-white text-xs font-black text-center">Done</div>
          ) : (
            <button
              className="px-3 py-2 rounded-2xl bg-gray-900 text-white text-xs font-black hover:opacity-95"
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
            >
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}