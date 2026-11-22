"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";

type Cat = { id: number; nombre: string; activa: boolean };
type Prod = { id: number; codigo: string; descripcion: string; categoria: { id: number; nombre: string }; precio: number; existencia: number; stockMinimo: number; bajoMinimo: boolean; activo: boolean };

export default function ProductosPage() {
  const [data, setData] = useState<Prod[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ codigo: "", descripcion: "", categoriaId: "", precio: "", stockMinimo: "0", stockInicial: "0" });

  async function load() {
    const [pr, cr] = await Promise.all([fetch(`/api/productos?q=${encodeURIComponent(q)}&activo=todos`), fetch("/api/categorias?activas=todas")]);
    const pj = await pr.json(); const cj = await cr.json();
    if (pr.ok) setData(pj.data); if (cr.ok) setCats(cj);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const body = { ...form, categoriaId: Number(form.categoriaId), precio: Math.round(Number(form.precio) * 100), stockMinimo: Number(form.stockMinimo), stockInicial: Number(form.stockInicial) };
    const r = await fetch("/api/productos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { setMsg(j?.error?.message || "Error"); return; }
    setForm({ codigo: "", descripcion: "", categoriaId: "", precio: "", stockMinimo: "0", stockInicial: "0" }); setMsg("Producto creado."); load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Productos" description="Catálogo y existencias." actions={<Link href="/productos/categorias"><Button variant="outline">Categorías</Button></Link>} />
      <Card><CardContent className="pt-5">
        <form onSubmit={create} className="grid gap-3 md:grid-cols-6">
          <div><Label>Código</Label><Input value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})} required /></div>
          <div className="md:col-span-2"><Label>Descripción</Label><Input value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} required /></div>
          <div><Label>Categoría</Label><select className="h-10 w-full rounded-md border px-3 text-sm" value={form.categoriaId} onChange={e=>setForm({...form,categoriaId:e.target.value})} required><option value="">Seleccionar</option>{cats.filter(c=>c.activa).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div><Label>Precio ($)</Label><Input type="number" step="0.01" min="0" value={form.precio} onChange={e=>setForm({...form,precio:e.target.value})} required /></div>
          <div><Label>Stock mín.</Label><Input type="number" min="0" value={form.stockMinimo} onChange={e=>setForm({...form,stockMinimo:e.target.value})} /></div>
          <div><Label>Stock inicial</Label><Input type="number" min="0" value={form.stockInicial} onChange={e=>setForm({...form,stockInicial:e.target.value})} /></div>
          <div className="md:col-span-6 flex gap-2"><Button type="submit">Crear producto</Button>{msg && <span className="text-sm text-muted-foreground self-center">{msg}</span>}</div>
        </form>
      </CardContent></Card>
      <Card><CardContent className="pt-5 space-y-3">
        <div className="flex gap-2"><Input placeholder="Buscar por código o descripción" value={q} onChange={e=>setQ(e.target.value)} /><Button variant="outline" onClick={load}>Buscar</Button></div>
        <Table><THead><TR><TH>Código</TH><TH>Descripción</TH><TH>Categoría</TH><TH>Precio</TH><TH>Existencia</TH><TH>Estado</TH><TH></TH></TR></THead>
          <TBody>{data.map(p=>(
            <TR key={p.id}><TD>{p.codigo}</TD><TD>{p.descripcion}</TD><TD>{p.categoria?.nombre}</TD><TD>{formatMoney(p.precio)}</TD><TD>{p.existencia}{p.bajoMinimo && <Badge variant="danger" className="ml-2">Bajo mínimo</Badge>}</TD><TD><Badge variant={p.activo?"success":"muted"}>{p.activo?"Activo":"Inactivo"}</Badge></TD><TD><Link href={`/productos/${p.id}`} className="text-primary underline text-sm">Ver</Link></TD></TR>
          ))}</TBody></Table>
      </CardContent></Card>
    </div>
  );
}
