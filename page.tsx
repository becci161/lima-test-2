"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { TrainFront, AlertTriangle, XCircle, Gauge, RefreshCw, Clock } from "lucide-react";
import type { DepartureRow } from "@/lib/supabase";

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function Dashboard() {
  const [rows, setRows] = useState<DepartureRow[]>([]);
  const [stationEva, setStationEva] = useState("8000105");
  const [stationName, setStationName] = useState("");
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [cronSecret, setCronSecret] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setCronSecret(localStorage.getItem("cronSecret") ?? "");
    fetch("/api/meta")
      .then((r) => r.json())
      .then((m) => {
        if (m.stationEva) setStationEva(m.stationEva);
        if (m.stationName) setStationName(m.stationName);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const supa = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supa
        .from("departures")
        .select("*")
        .eq("station_eva", stationEva)
        .order("planned_time", { ascending: false })
        .limit(50);
      if (error) throw error;
      setRows((data ?? []) as DepartureRow[]);
      setLastFetch(new Date().toISOString());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, [stationEva]);

  useEffect(() => {
    load();
  }, [load]);

  const kpi = useMemo(() => {
    const total = rows.length;
    const cancelled = rows.filter((r) => r.cancelled).length;
    const delayed = rows.filter((r) => !r.cancelled && (r.delay_minutes ?? 0) > 5).length;
    const punctual = total === 0 ? 100 : Math.round(((total - delayed - cancelled) / total) * 100);
    return { total, delayed, cancelled, punctual };
  }, [rows]);

  const trigger = async () => {
    setTriggering(true);
    setMsg("");
    try {
      localStorage.setItem("cronSecret", cronSecret);
      const r = await fetch("/api/cron/check-station", {
        headers: { Authorization: `Bearer ${cronSecret}` }
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Trigger fehlgeschlagen");
      setMsg(`OK: ${j.processed} verarbeitet, ${j.upserted} gespeichert (${j.timestamp})`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Trigger fehlgeschlagen");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-5">
        <div className="flex items-center gap-3">
          <TrainFront className="h-8 w-8 text-rose-500" />
          <div>
            <h1 className="text-xl font-bold">
              {stationName || "Bahnhof"} <span className="text-slate-400">· EVA {stationEva}</span>
            </h1>
            <p className="flex items-center gap-1 text-sm text-slate-400">
              <Clock className="h-3 w-3" />
              Letzte Abfrage: {lastFetch ? new Date(lastFetch).toLocaleString("de-DE") : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder="CRON_SECRET"
            value={cronSecret}
            onChange={(e) => setCronSecret(e.target.value)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={trigger}
            disabled={triggering}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold hover:bg-rose-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${triggering ? "animate-spin" : ""}`} />
            {triggering ? "Läuft…" : "Fetch triggern"}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
          >
            Neu laden
          </button>
        </div>
      </header>

      {msg && <p className="rounded-lg bg-slate-900 p-3 text-sm text-slate-300">{msg}</p>}

      <section className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-900 p-4">
          <p className="text-xs uppercase text-slate-400">Erfasst</p>
          <p className="text-2xl font-bold">{kpi.total}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <p className="flex items-center gap-1 text-xs uppercase text-slate-400">
            <AlertTriangle className="h-3 w-3" /> Verspätet (&gt;5 min)
          </p>
          <p className="text-2xl font-bold text-amber-400">{kpi.delayed}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <p className="flex items-center gap-1 text-xs uppercase text-slate-400">
            <XCircle className="h-3 w-3" /> Ausfälle
          </p>
          <p className="text-2xl font-bold text-rose-400">{kpi.cancelled}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <p className="flex items-center gap-1 text-xs uppercase text-slate-400">
            <Gauge className="h-3 w-3" /> Pünktlich
          </p>
          <p className="text-2xl font-bold text-emerald-400">{kpi.punctual}%</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="p-3">Zug</th>
              <th className="p-3">Ziel / Gleis</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Ist</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const delay = r.delay_minutes ?? 0;
              const late = !r.cancelled && delay > 5;
              return (
                <tr key={r.trip_id} className="border-t border-slate-800">
                  <td className="p-3 font-semibold">
                    {r.category} {r.train_number}
                  </td>
                  <td className="p-3">
                    {r.destination ?? "—"} <span className="text-slate-400">· Gl. {r.platform ?? "—"}</span>
                  </td>
                  <td className="p-3">{fmt(r.planned_time)}</td>
                  <td className="p-3">{fmt(r.changed_time ?? r.planned_time)}</td>
                  <td className="p-3">
                    {r.cancelled ? (
                      <span className="rounded-full bg-rose-600 px-2 py-1 text-xs font-bold">Ausfall</span>
                    ) : late ? (
                      <span className="rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-black">
                        +{delay} min
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold">
                        {delay > 0 ? `+${delay} min` : "pünktlich"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-slate-400">
                  Keine Daten – Cron schon gelaufen? CRON_SECRET prüfen und Fetch triggern.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
