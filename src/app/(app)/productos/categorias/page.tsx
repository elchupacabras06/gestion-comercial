"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

type Cat = { id: number; nombre: string; activa: boolean };
export default function CategoriasPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [nombre, setNombre] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function load() { const r = await fetch("/api/categorias?activas=todas"); if (r.ok) setCats(await r.json()); }
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);
  async function create(e: React.FormEvent) { e.preventDefault(); setMsg(null); const r = await fetch("/api/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) }); const j = await r.json().catch(()=>null); if(!r.ok){setMsg(j?.error?.message||"Error");return;} setNombre(""); load(); }
  async function toggle(c: Cat) { if(!confirm(`${c.activa?"Desactivar":"Activar"} categoría?`)) return; const r=await fetch(`/api/categorias/${c.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({activa:!c.activa})}); const j=await r.json().catch(()=>null); if(!r.ok) alert(j?.error?.message||"Error"); load(); }
  return <div className="space-y-4"><PageHeader title="Categorías" />
    <Card><CardContent className="pt-5"><form onSubmit={create} className="flex gap-2 items-end"><div><Label>Nombre</Label><Input value={nombre} onChange={e=>setNombre(e.target.value)} required /></div><Button type="submit">Crear</Button>{msg&&<span className="text-sm text-danger">{msg}</span>}</form></CardContent></Card>
    <Card><CardContent className="pt-5"><Table><THead><TR><TH>Nombre</TH><TH>Activa</TH><TH></TH></TR></THead><TBody>{cats.map(c=><TR key={c.id}><TD>{c.nombre}</TD><TD>{c.activa?"Sí":"No"}</TD><TD><Button size="sm" variant="outline" onClick={()=>toggle(c)}>{c.activa?"Desactivar":"Activar"}</Button></TD></TR>)}</TBody></Table></CardContent></Card>
  </div>;
}
