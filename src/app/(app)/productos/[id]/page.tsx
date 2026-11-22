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

export default function ProductoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [prod, setProd] = useState<any>(null);
  const [movs, setMovs] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [mov, setMov] = useState({ tipo: "ingreso", cantidad: "1", motivo: "Reposición", observacion: "" });

  async function load() {
    const [p, m] = await Promise.all([fetch(`/api/productos/${id}`), fetch(`/api/productos/${id}/movimientos`)]);
    if (p.ok) setProd(await p.json());
    if (m.ok) { const j = await m.json(); setMovs(j.data); }
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  async function submitMov(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const r = await fetch(`/api/productos/${id}/movimientos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...mov, cantidad: Number(mov.cantidad) }) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { setMsg(j?.error?.message || "Error"); return; }
    setMsg("Movimiento registrado."); load();
  }

  if (!prod) return <p>Cargando...</p>;
  return <div className="space-y-4">
    <PageHeader title={prod.descripcion} description={`${prod.codigo} · ${prod.categoria?.nombre || ""}`} />
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><CardTitle>Datos</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><div>Precio: {formatMoney(prod.precio)}</div><div>Existencia: {prod.existencia}</div><div>Stock mínimo: {prod.stockMinimo}</div><div>Estado: {prod.activo ? "Activo" : "Inactivo"}</div></CardContent></Card>
      <Card className="md:col-span-2"><CardHeader><CardTitle>Ingreso / Egreso manual</CardTitle></CardHeader><CardContent>
        <form onSubmit={submitMov} className="grid gap-3 md:grid-cols-4">
          <div><Label>Tipo</Label><select className="h-10 w-full rounded-md border px-3 text-sm" value={mov.tipo} onChange={e=>setMov({...mov,tipo:e.target.value,motivo:e.target.value==="ingreso"?"Reposición":"Rotura"})}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></div>
          <div><Label>Cantidad</Label><Input type="number" min="1" value={mov.cantidad} onChange={e=>setMov({...mov,cantidad:e.target.value})} /></div>
          <div><Label>Motivo</Label><select className="h-10 w-full rounded-md border px-3 text-sm" value={mov.motivo} onChange={e=>setMov({...mov,motivo:e.target.value})}>{(mov.tipo==="ingreso"?["Reposición","Stock inicial","Devolución de cliente"]:["Rotura","Vencimiento","Ajuste de inventario","Uso interno"]).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          <div className="flex items-end"><Button type="submit" className="w-full">Registrar</Button></div>
          <div className="md:col-span-4"><Label>Observación</Label><Input value={mov.observacion} onChange={e=>setMov({...mov,observacion:e.target.value})} /></div>
        </form>
        {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Movimientos</CardTitle></CardHeader><CardContent>
      <Table><THead><TR><TH>Fecha</TH><TH>Tipo</TH><TH>Cantidad</TH><TH>Existencia</TH><TH>Motivo</TH><TH>Usuario</TH><TH>Referencia</TH></TR></THead>
      <TBody>{movs.map(m=><TR key={m.id}><TD>{formatDateTime(m.fecha)}</TD><TD>{m.tipo}</TD><TD>{m.cantidad}</TD><TD>{m.existenciaResultante}</TD><TD>{m.motivo}</TD><TD>{m.usuario?.nombre}</TD><TD>{m.referencia?.numero || "-"}</TD></TR>)}</TBody></Table>
    </CardContent></Card>
  </div>;
}
