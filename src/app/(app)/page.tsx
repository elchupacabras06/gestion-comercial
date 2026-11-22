import { getTablero } from "@/server/tablero-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { TableroCharts } from "@/components/dashboard/tablero-charts";

export default async function HomePage() {
  const t = await getTablero();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Inicio</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle>Ventas hoy</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatMoney(t.hoy.importe)}</div><div className="text-sm text-muted-foreground">{t.hoy.cantidad} facturas</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Ventas mes</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatMoney(t.mes.importe)}</div><div className="text-sm text-muted-foreground">{t.mes.cantidad} facturas · ticket {formatMoney(t.mes.ticketPromedio)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Cuentas corrientes</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatMoney(t.cuentasCorrientes.totalAdeudado)}</div><div className="text-sm text-muted-foreground">{t.cuentasCorrientes.clientesConSaldo} clientes con saldo</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Bajo mínimo</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{t.bajoMinimo.cantidad}</div><div className="text-sm text-muted-foreground">productos para reponer</div></CardContent></Card>
      </div>
      <TableroCharts data={t} />
    </div>
  );
}
