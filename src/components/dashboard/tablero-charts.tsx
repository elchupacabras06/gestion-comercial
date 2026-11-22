"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

type Tablero = {
  ventasDiarias: { fecha: string; importe: number }[];
  porFormaDePago: { forma: string; importe: number }[];
  masVendidos: { productoId: number; codigo: string; descripcion: string; unidades: number; importe: number }[];
};

const formaLabel: Record<string, string> = { contado: "Contado", tarjeta: "Tarjeta", cuenta_corriente: "Cuenta corriente" };

export function TableroCharts({ data }: { data: Tablero }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Ventas diarias (últimos 30 días)</CardTitle></CardHeader>
        <CardContent>
          <Line
            data={{
              labels: data.ventasDiarias.map((d) => d.fecha.slice(5).split("-").reverse().join("/")),
              datasets: [{ label: "Importe", data: data.ventasDiarias.map((d) => d.importe / 100), borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,.15)", tension: 0.25, fill: true }],
            }}
            options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v) => `$ ${Number(v).toLocaleString("es-AR")}` } } } }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Ventas por forma de pago (mes)</CardTitle></CardHeader>
        <CardContent className="max-w-md mx-auto">
          <Doughnut
            data={{
              labels: data.porFormaDePago.map((f) => formaLabel[f.forma] ?? f.forma),
              datasets: [{ data: data.porFormaDePago.map((f) => f.importe / 100), backgroundColor: ["#16a34a", "#2563eb", "#f59e0b"] }],
            }}
            options={{ plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatMoney(Math.round(Number(ctx.raw) * 100))}` } } } }}
          />
        </CardContent>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader><CardTitle>Más vendidos del mes</CardTitle></CardHeader>
        <CardContent>
          {data.masVendidos.length === 0 ? <p className="text-sm text-muted-foreground">Sin ventas este mes.</p> : (
            <Bar
              data={{
                labels: data.masVendidos.map((p) => p.descripcion),
                datasets: [{ label: "Unidades", data: data.masVendidos.map((p) => p.unidades), backgroundColor: "#0f766e" }],
              }}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
