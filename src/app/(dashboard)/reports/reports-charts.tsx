"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatPaise, formatNumber } from "@/lib/utils";

const COLORS = ["#6366f1", "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#94a3b8", "#a855f7"];

export type NamedCount = { name: string; value: number };
export type AdsTrendPoint = { date: string; META_ADS: number; GOOGLE_ADS: number };

export function ReportsCharts({
  leadsByStatus,
  leadsBySource,
  leadsTrend,
  adsTrend,
  whatsappStats,
  dealStats,
}: {
  leadsByStatus: NamedCount[];
  leadsBySource: NamedCount[];
  leadsTrend: { date: string; leads: number }[];
  adsTrend: AdsTrendPoint[];
  whatsappStats: { total: number; delivered: number; read: number; failed: number };
  dealStats: { wonValuePaise: number; wonCount: number; lostValuePaise: number; lostCount: number; winRate: number };
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">WhatsApp sent</p>
            <p className="mt-1 text-2xl font-bold">{formatNumber(whatsappStats.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Delivered / Read</p>
            <p className="mt-1 text-2xl font-bold">
              {formatNumber(whatsappStats.delivered)} / {formatNumber(whatsappStats.read)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Deal win rate</p>
            <p className="mt-1 text-2xl font-bold">{dealStats.winRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Won vs Lost value</p>
            <p className="mt-1 text-lg font-bold">
              {formatPaise(dealStats.wonValuePaise)} <span className="text-muted-foreground">/</span>{" "}
              {formatPaise(dealStats.lostValuePaise)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by source</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsBySource}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadsByStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {leadsByStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New leads — last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={leadsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad spend — last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={adsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                allowDecimals={false}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip formatter={(v: number) => `₹${formatNumber(v)}`} />
              <Legend />
              <Line type="monotone" dataKey="META_ADS" name="Meta Ads" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="GOOGLE_ADS" name="Google Ads" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
