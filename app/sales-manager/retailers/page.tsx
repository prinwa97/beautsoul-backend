// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import RetailerDrawer from "./retailer-drawer";
import ProductDrawer from "./product-drawer";
import CityDrawer from "./city-drawer";

import {
  addDaysLocal,
  clamp,
  getRetailerId,
  isoDate,
  money,
  safeArr,
  startOfFYLocal,
  startOfMonthLocal,
} from "./_components/utils";

import RetailersHeader from "./_components/retailers-header";
import RetailersSummaryStrip from "./_components/retailers-summary-strip";
import AiCommandCenter from "./_components/ai-command-center";
import TopDecisionsSection from "./_components/top-decisions-section";
import TodaysAiTodoPlanSection from "./_components/todays-ai-todo-plan-section";
import TopRetailersAiSection from "./_components/top-retailers-ai-section";
import TopCitiesAiSection from "./_components/top-cities-ai-section";
import TopProductsAiSection from "./_components/top-products-ai-section";
import SlowMoversByCitySection from "./_components/slow-movers-by-city-section";
import MonthPivotSection from "./_components/month-pivot-section";
import RetailerOrdersModal from "./_components/retailer-orders-modal";
import OrderDetailModal from "./_components/order-detail-modal";
import EvidenceModal from "./_components/evidence-modal";
import TaskDetailModal from "./_components/task-detail-modal";

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

export default function SMRetailersAnalyticsPage() {
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

  const [productOpen, setProductOpen] = useState(false);
  const [productName, setProductName] = useState<string>("");

  function openProduct(name: string) {
    const nm = String(name || "").trim();
    if (!nm) return;
    setProductName(nm);
    setProductOpen(true);
  }

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

  const [from, setFrom] = useState<string>(() => isoDate(startOfFYLocal(new Date())));
  const [to, setTo] = useState<string>(() => isoDate(new Date()));

  const [distId, setDistId] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsResp | null>(null);

  const [ai, setAi] = useState<AiConsoleResp | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [remarkTaskId, setRemarkTaskId] = useState<string>("");
  const [remarkText, setRemarkText] = useState<string>("");
  const [remarkSaving, setRemarkSaving] = useState(false);

  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersRetailer, setOrdersRetailer] = useState<{ id: string; name: string } | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersData, setOrdersData] = useState<{ ok: boolean; error?: string; orders?: OrderRow[] } | null>(null);
  const ordersBodyRef = useRef<HTMLDivElement>(null);

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderId, setOrderId] = useState<string>("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const orderBodyRef = useRef<HTMLDivElement>(null);

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState<string>("Evidence");
  const [evidenceJson, setEvidenceJson] = useState<any>(null);
  const [showRawEvidence, setShowRawEvidence] = useState(false);

  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskDetailTask, setTaskDetailTask] = useState<any>(null);

  const [lastSelectedTask, setLastSelectedTask] = useState<any>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  function openTaskDetail(t: any) {
    setTaskDetailTask(t || null);
    setTaskDetailOpen(true);
  }

  function closeTaskDetail() {
    setTaskDetailOpen(false);
    setTaskDetailTask(null);
  }

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

  function startMyDay() {
    const el = document.getElementById("today-plan");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("mode", mode);
    p.set("sort", sort);
    p.set("months", "4");

    if (mode === "CUSTOM") {
      p.set("from", from);
      p.set("to", isoDate(addDaysLocal(new Date(to), 1)));
    } else if (mode === "MONTH") {
      const start = startOfMonthLocal(new Date());
      const end = addDaysLocal(new Date(), 1);
      p.set("from", isoDate(start));
      p.set("to", isoDate(end));
    } else if (mode === "YEAR") {
      const start = startOfFYLocal(new Date());
      const end = addDaysLocal(new Date(), 1);
      p.set("from", isoDate(start));
      p.set("to", isoDate(end));
    } else if (mode === "TODAY") {
      const start = new Date();
      const end = addDaysLocal(new Date(), 1);
      p.set("from", isoDate(start));
      p.set("to", isoDate(end));
    }

    if (distId) p.set("distId", distId);
    if (city) p.set("city", city);

    return p.toString();
  }, [mode, sort, from, to, distId, city]);

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
      const start = startOfFYLocal(new Date());
      const end = addDaysLocal(new Date(), 1);
      p.set("from", isoDate(start));
      p.set("to", isoDate(end));
    } else if (mode === "TODAY") {
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

  async function openRetailerMonthOrders(retailerId: string, retailerName: string, month: string) {
    const rid = String(retailerId || "").trim();
    const m = String(month || "").trim();

    if (!rid || !/^\d{4}-\d{2}$/.test(m)) {
      alert("Retailer/month missing.");
      return;
    }

    const fromDate = `${m}-01`;
    const [yy, mm] = m.split("-").map(Number);
    const toDate =
      mm === 12 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 1).padStart(2, "0")}-01`;

    setOrdersRetailer({ id: rid, name: `${retailerName} • ${m}` });
    setOrdersOpen(true);
    setOrdersLoading(true);
    setOrdersData(null);

    try {
      const url = `/api/sales-manager/retailers/${encodeURIComponent(
        rid
      )}/orders?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&limit=200`;

      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      setOrdersData(j || { ok: false, error: "FAILED" });
    } catch (e: any) {
      setOrdersData({ ok: false, error: String(e?.message || e) });
    } finally {
      setOrdersLoading(false);
    }
  }

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

  useEffect(() => {
    if (!ordersOpen) return;
    ordersBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [ordersOpen, ordersRetailer?.id]);

  useEffect(() => {
    if (!orderOpen) return;
    orderBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [orderOpen, orderId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();

      if (e.key === "Escape") {
        if (evidenceOpen) closeEvidence();
        if (taskDetailOpen) closeTaskDetail();
        if (remarkTaskId) setRemarkTaskId("");
        if (ordersOpen) setOrdersOpen(false);
        if (orderOpen) setOrderOpen(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && k === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

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
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceOpen, taskDetailOpen, remarkTaskId, ordersOpen, orderOpen, lastSelectedTask]);

  const summary = data?.summary;
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
    if (type === "TOP_CITY" && (x as any).city && (x as any).city !== "—") {
      return openCity((x as any).city);
    }
    if (type === "TOP_PRODUCT" && (x as any).productName && (x as any).productName !== "—") {
      return openProduct((x as any).productName);
    }
    if (type === "TODAY_PLAN") {
      const el = document.getElementById("today-plan");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

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
      <RetailersHeader
        mode={mode}
        setMode={setMode}
        sort={sort}
        setSort={setSort}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        distId={distId}
        setDistId={setDistId}
        city={city}
        setCity={setCity}
        q={q}
        setQ={setQ}
        data={data}
        onApply={() => {
          load();
          loadAi();
        }}
      />

      <div className="mt-4">
        {loading ? <div className="text-sm text-gray-600">Loading analytics…</div> : null}
        {!loading && data && !data.ok ? (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            Error: {data.error || "UNKNOWN"} {data.message ? `— ${data.message}` : ""}
          </div>
        ) : null}
      </div>

      <RetailersSummaryStrip
        totalSales4m={`₹${money(totalSales4m)}`}
        summary={summary}
      />

      <AiCommandCenter
        ai={ai}
        aiLoading={aiLoading}
        aiEnabled={aiEnabled}
        done={done}
        total={total}
        openCount={openCount}
        progressPct={progressPct}
        onStartMyDay={startMyDay}
        onRefreshAi={loadAi}
      />

      <TopDecisionsSection
        rows={topDecisionsRows}
        aiLoading={aiLoading}
        aiEnabled={aiEnabled}
        onBriefClick={onBriefClick}
        openCity={openCity}
        openProduct={openProduct}
        openEvidence={openEvidence}
      />

      <TodaysAiTodoPlanSection
        aiEnabled={aiEnabled}
        aiLoading={aiLoading}
        taskSearch={taskSearch}
        setTaskSearch={setTaskSearch}
        searchRef={searchRef}
        tasksOpen={tasksOpen}
        tasksDone={tasksDone}
        setLastSelectedTask={setLastSelectedTask}
        openTaskDetail={openTaskDetail}
        loadAi={loadAi}
        money={money}
      />

      <div className="mt-6 flex flex-col gap-3">
        <TopRetailersAiSection
          rows={ai?.leaderboards?.topRetailers || []}
          openRetailerOrders={openRetailerOrders}
        />

        <TopCitiesAiSection
          rows={ai?.leaderboards?.topCities || []}
          openCity={openCity}
        />

        <TopProductsAiSection
          rows={ai?.leaderboards?.topProducts || []}
          openProduct={openProduct}
        />

        <SlowMoversByCitySection
          rows={ai?.leaderboards?.slowMoversByCity || []}
          openCity={openCity}
          openProduct={openProduct}
        />
      </div>

      <MonthPivotSection
        months={months}
        pivotRows={pivotRows}
        openRetailer={openRetailer}
        openRetailerMonthOrders={openRetailerMonthOrders}
      />

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

      <EvidenceModal
        evidenceOpen={evidenceOpen}
        closeEvidence={closeEvidence}
        evidenceTitle={evidenceTitle}
        showRawEvidence={showRawEvidence}
        setShowRawEvidence={setShowRawEvidence}
        evidenceJson={evidenceJson}
      />

      <RetailerOrdersModal
        open={ordersOpen}
        onClose={() => {
          setOrdersOpen(false);
          setOrderOpen(false);
          setOrderId("");
          setOrderData(null);
        }}
        ordersRetailer={ordersRetailer}
        ordersLoading={ordersLoading}
        ordersData={ordersData}
        ordersBodyRef={ordersBodyRef}
        openOrderDetail={openOrderDetail}
      />

      <OrderDetailModal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        orderData={orderData}
        orderId={orderId}
        orderLoading={orderLoading}
        orderBodyRef={orderBodyRef}
      />

      <TaskDetailModal
        taskDetailOpen={taskDetailOpen}
        closeTaskDetail={closeTaskDetail}
        taskDetailTask={taskDetailTask}
        openEvidence={openEvidence}
        completeTask={completeTask}
        money={money}
        openRetailer={openRetailer}
      />

      <RetailerDrawer
        retailerId={drawerRetailerId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenProduct={openProduct}
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