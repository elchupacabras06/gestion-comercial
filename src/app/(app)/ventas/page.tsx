"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatMoney } from "@/lib/format";

export default function VentasPage() {
  type FacturaRow = { id:number; numeroFormateado:string; fecha:string; cliente?:{nombre:string}|null; pago?:{forma:string}; total:number; estado:string };
  const [rows, setRows] = useState<FacturaRow[]>([]);
  async function load() { const r = await fetch("/api/facturas"); const j = await r.json(); if (r.ok) setRows(j.data); }
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);
  return <div className="space-y-4"><PageHeader title="Facturas" actions={<Link href="/ventas/nueva"><Button>Nueva venta</Button></Link>} />
    <Card><CardContent className="pt-5"><Table><THead><TR><TH>Número</TH><TH>Fecha</TH><TH>Cliente</TH><TH>Pago</TH><TH>Total</TH><TH>Estado</TH><TH></TH></TR></THead>
      <TBody>{rows.map(f=><TR key={f.id}><TD>{f.numeroFormateado}</TD><TD>{formatDateTime(f.fecha)}</TD><TD>{f.cliente?.nombre || "Consumidor final"}</TD><TD>{f.pago?.forma}</TD><TD>{formatMoney(f.total)}</TD><TD><Badge variant={f.estado==="emitida"?"success":"danger"}>{f.estado}</Badge></TD><TD><Link className="text-primary underline text-sm" href={`/ventas/${f.id}`}>Ver</Link></TD></TR>)}</TBody></Table>
    </CardContent></Card></div>;
}
