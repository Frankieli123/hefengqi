"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Report } from "@/lib/ga4-reporting";
import styles from "./page.module.css";

const series = [
 { key: "totalUsers", label: "用户", color: "#2563eb", width: 2.6 },
 { key: "sessions", label: "会话", color: "#64748b", width: 1.9 },
 { key: "screenPageViews", label: "浏览量", color: "#94a3b8", width: 1.9 },
] as const;

export function TrendChart({ report }: { report: Report }) {
 const dateIndex = report.headers.indexOf("date");
 const rows = [...report.rows].sort((a, b) => (a[dateIndex] ?? "").localeCompare(b[dateIndex] ?? ""));
 const data = rows.map(row => {
  const point: Record<string, string | number | null> = { date: row[dateIndex]?.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3") ?? "" };
  for (const item of series) {
   const index = report.headers.indexOf(item.key);
   const raw = index >= 0 ? row[index]?.trim() : undefined;
   point[item.key] = raw && Number.isFinite(Number(raw)) ? Number(raw) : null;
  }
  return point;
 });
 return <div className={styles.trendChart} role="img" aria-label="每日用户、会话与浏览量趋势图">
  <ResponsiveContainer width="100%" height="100%">
   <LineChart data={data} margin={{ top: 12, right: 20, left: 0, bottom: 4 }}>
    <CartesianGrid vertical={false} stroke="#e6ebf1" />
    <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5).replace("-", "/")} minTickGap={38} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={8} />
    <YAxis allowDecimals={false} width={46} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, "auto"]} />
    <Tooltip contentStyle={{ border: "1px solid #dce2eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,.08)", fontSize: 13 }} labelStyle={{ color: "#172033", fontWeight: 650, marginBottom: 6 }} cursor={{ stroke: "#cbd5e1" }} labelFormatter={(label) => `日期 ${label}`} formatter={(value, name) => [value ?? "—", series.find(item => item.key === String(name))?.label ?? String(name)]} />
    <Legend verticalAlign="top" align="left" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, color: "#475569", paddingBottom: 12 }} formatter={(value: string) => series.find(item => item.key === value)?.label ?? value} />
    {series.map(item => <Line key={item.key} type="monotone" dataKey={item.key} name={item.key} stroke={item.color} strokeWidth={item.width} dot={data.length <= 31 ? { r: 2.5, strokeWidth: 0 } : false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />)}
   </LineChart>
  </ResponsiveContainer>
 </div>;
}
