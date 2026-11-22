"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";

type Factura = { numeroFormateado:string; fecha:string; estado:string; total:number; cliente?:{nombre:string}|null; vendedor?:{nombre:string}; pago?:{forma:string}; anulacion?:{motivo:string}; items?:{descripcion:string;cantidad:number;precioUnitario:number;subtotal:number}[] };
export default function FacturaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [f, setF] = useState<Factura | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  async function load() { const r = await fetch(`/api/facturas/${id}`); if (r.ok) setF(await r.json()); }
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [id]);
  async function anular() {
    const motivo = prompt("Motivo de anulación:");
    if (!motivo) return;
    const r = await fetch(`/api/facturas/${id}/anulacion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo }) });
    const j = await r.json().catch(()=>null);
    if (!r.ok) { setMsg(j?.error?.message || "Error"); return; }
    load();
  }
  if (!f) return <p>Cargando...</p>;
  return <div className="space-y-4">
    <PageHeader title={`Factura ${f.numeroFormateado}`} description={formatDateTime(f.fecha)} actions={<div className="flex gap-2"><Button variant="outline" onClick={() => window.print()}>Imprimir</Button>{f.estado === "emitida" ? <Button variant="destructive" onClick={anular}>Anular</Button> : null}</div>} />
    {msg && <p className="text-sm text-danger">{msg}</p>}
    <Card><CardContent className="pt-5 text-sm space-y-1"><div>Cliente: {f.cliente?.nombre || "Consumidor final"}</div><div>Vendedor: {f.vendedor?.nombre}</div><div>Pago: {f.pago?.forma}</div><div>Estado: {f.estado}</div>{f.anulacion && <div>Anulación: {f.anulacion.motivo}</div>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Detalle</CardTitle></CardHeader><CardContent><Table><THead><TR><TH>Producto</TH><TH>Cant.</TH><TH>Precio</TH><TH>Subtotal</TH></TR></THead><TBody>{f.items?.map((it:any,i:number)=><TR key={i}><TD>{it.descripcion}</TD><TD>{it.cantidad}</TD><TD>{formatMoney(it.precioUnitario)}</TD><TD>{formatMoney(it.subtotal)}</TD></TR>)}</TBody></Table><div className="mt-4 text-right font-semibold">Total: {formatMoney(f.total)}</div></CardContent></Card>
  </div>;
}
