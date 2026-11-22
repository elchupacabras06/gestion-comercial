"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";

export default function ClientesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ tipoDoc: "DNI", nroDoc: "", nombre: "", domicilio: "", telefono: "", email: "", cuentaCorriente: false, limiteCredito: "" });
  async function load() { const r = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`); const j = await r.json(); if (r.ok) setRows(j.data); }
  useEffect(() => { load(); }, []); // eslint-disable-line
  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const body = { ...form, limiteCredito: form.limiteCredito ? Math.round(Number(form.limiteCredito) * 100) : null, email: form.email || null };
    const r = await fetch("/api/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => null); if (!r.ok) { setMsg(j?.error?.message || "Error"); return; }
    setForm({ tipoDoc: "DNI", nroDoc: "", nombre: "", domicilio: "", telefono: "", email: "", cuentaCorriente: false, limiteCredito: "" }); load();
  }
  return <div className="space-y-4">
    <PageHeader title="Clientes" actions={<Link href="/clientes/saldos"><Button variant="outline">Saldos</Button></Link>} />
    <Card><CardContent className="pt-5"><form onSubmit={create} className="grid gap-3 md:grid-cols-4">
      <div><Label>Tipo doc</Label><select className="h-10 w-full rounded-md border px-3 text-sm" value={form.tipoDoc} onChange={e=>setForm({...form,tipoDoc:e.target.value})}><option>DNI</option><option>CUIT</option></select></div>
      <div><Label>Nro doc</Label><Input value={form.nroDoc} onChange={e=>setForm({...form,nroDoc:e.target.value})} required /></div>
      <div className="md:col-span-2"><Label>Nombre / Razón social</Label><Input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required /></div>
      <div><Label>Teléfono</Label><Input value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} /></div>
      <div><Label>Email</Label><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
      <div><Label>Límite crédito ($)</Label><Input type="number" step="0.01" value={form.limiteCredito} onChange={e=>setForm({...form,limiteCredito:e.target.value})} /></div>
      <div className="flex items-end gap-2"><label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.cuentaCorriente} onChange={e=>setForm({...form,cuentaCorriente:e.target.checked})} /> Cuenta corriente</label></div>
      <div className="md:col-span-4"><Button type="submit">Crear cliente</Button> {msg && <span className="text-sm text-danger ml-2">{msg}</span>}</div>
    </form></CardContent></Card>
    <Card><CardContent className="pt-5 space-y-3"><div className="flex gap-2"><Input placeholder="Buscar por nombre o documento" value={q} onChange={e=>setQ(e.target.value)} /><Button variant="outline" onClick={load}>Buscar</Button></div>
      <Table><THead><TR><TH>Documento</TH><TH>Nombre</TH><TH>Teléfono</TH><TH>CC</TH><TH>Saldo</TH><TH></TH></TR></THead><TBody>{rows.map(c=><TR key={c.id}><TD>{c.tipoDoc} {c.nroDoc}</TD><TD>{c.nombre}</TD><TD>{c.telefono||"-"}</TD><TD>{c.cuentaCorriente?"Sí":"No"}</TD><TD>{formatMoney(c.saldo)}</TD><TD><Link className="text-primary underline text-sm" href={`/clientes/${c.id}`}>Ver</Link></TD></TR>)}</TBody></Table>
    </CardContent></Card>
  </div>;
}
