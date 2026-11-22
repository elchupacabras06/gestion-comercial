"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<any>(null);
  const [cuenta, setCuenta] = useState<any>(null);
  const [pago, setPago] = useState({ importe: "", medio: "efectivo", observacion: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [c, cc] = await Promise.all([fetch(`/api/clientes/${id}`), fetch(`/api/clientes/${id}/cuenta`)]);
    if (c.ok) setCliente(await c.json());
    if (cc.ok) setCuenta(await cc.json());
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  async function submitPago(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const body = { importe: Math.round(Number(pago.importe) * 100), medio: pago.medio, observacion: pago.observacion || null };
    const r = await fetch(`/api/clientes/${id}/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { setMsg(j?.error?.message || "Error"); return; }
    setMsg(`Pago registrado. Recibo ${j.numeroRecibo}`); setPago({ importe: "", medio: "efectivo", observacion: "" }); load();
  }

  if (!cliente) return <p>Cargando...</p>;
  return <div className="space-y-4">
    <PageHeader title={cliente.nombre} description={`${cliente.tipoDoc} ${cliente.nroDoc}`} />
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><CardTitle>Datos</CardTitle></CardHeader><CardContent className="text-sm space-y-1">
        <div>Teléfono: {cliente.telefono || "-"}</div><div>Email: {cliente.email || "-"}</div><div>Cuenta corriente: {cliente.cuentaCorriente ? "Sí" : "No"}</div><div>Saldo: {formatMoney(cliente.saldo)}</div><div>Límite: {cliente.limiteCredito == null ? "-" : formatMoney(cliente.limiteCredito)}</div>
      </CardContent></Card>
      <Card className="md:col-span-2"><CardHeader><CardTitle>Registrar pago</CardTitle></CardHeader><CardContent>
        <form onSubmit={submitPago} className="grid gap-3 md:grid-cols-4">
          <div><Label>Importe ($)</Label><Input type="number" step="0.01" min="0" value={pago.importe} onChange={e=>setPago({...pago,importe:e.target.value})} required /></div>
          <div><Label>Medio</Label><select className="h-10 w-full rounded-md border px-3 text-sm" value={pago.medio} onChange={e=>setPago({...pago,medio:e.target.value})}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta_debito">Tarjeta débito</option></select></div>
          <div className="md:col-span-2"><Label>Observación</Label><Input value={pago.observacion} onChange={e=>setPago({...pago,observacion:e.target.value})} /></div>
          <div className="md:col-span-4"><Button type="submit">Registrar pago</Button>{msg && <span className="ml-2 text-sm text-muted-foreground">{msg}</span>}</div>
        </form>
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Cuenta corriente</CardTitle></CardHeader><CardContent>
      <Table><THead><TR><TH>Fecha</TH><TH>Tipo</TH><TH>Descripción</TH><TH>Importe</TH><TH>Saldo</TH></TR></THead>
        <TBody>{(cuenta?.movimientos||[]).map((m:any,i:number)=><TR key={i}><TD>{formatDateTime(m.fecha)}</TD><TD>{m.tipo}</TD><TD>{m.descripcion}</TD><TD>{formatMoney(m.importe)}</TD><TD>{formatMoney(m.saldo)}</TD></TR>)}</TBody>
      </Table>
    </CardContent></Card>
  </div>;
}
