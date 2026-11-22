"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Usuario = { id: number; nombre: string; email: string; rol: "admin" | "vendedor"; activo: boolean };

export default function UsuariosPage() {
  const [data, setData] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", email: "", rol: "vendedor", password: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/usuarios");
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || "Error");
      setData(j.data);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const r = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { setMsg(j?.error?.message || "Error"); return; }
    setForm({ nombre: "", email: "", rol: "vendedor", password: "" }); setMsg("Usuario creado."); load();
  }

  async function toggle(u: Usuario) {
    if (!confirm(`${u.activo ? "Desactivar" : "Activar"} usuario ${u.nombre}?`)) return;
    await fetch(`/api/usuarios/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !u.activo }) });
    load();
  }

  async function reset(u: Usuario) {
    if (!confirm(`Restablecer contraseña de ${u.nombre}?`)) return;
    const r = await fetch(`/api/usuarios/${u.id}/reset-password`, { method: "POST" });
    const j = await r.json();
    if (r.ok) alert(`Contraseña temporal: ${j.passwordTemporal}`);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Usuarios" description="Gestión de usuarios y roles (solo admin)." />
      <Card><CardContent className="pt-5">
        <form onSubmit={create} className="grid gap-3 md:grid-cols-5">
          <div><Label>Nombre</Label><Input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /></div>
          <div><Label>Rol</Label><select className="h-10 w-full rounded-md border px-3 text-sm" value={form.rol} onChange={e=>setForm({...form,rol:e.target.value})}><option value="vendedor">Vendedor</option><option value="admin">Admin</option></select></div>
          <div><Label>Contraseña temporal</Label><Input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={8} /></div>
          <div className="flex items-end"><Button type="submit" className="w-full">Crear</Button></div>
        </form>
        {msg ? <p className="mt-2 text-sm text-muted-foreground">{msg}</p> : null}
      </CardContent></Card>
      <Card><CardContent className="pt-5">
        {loading ? <p>Cargando...</p> : error ? <p className="text-danger">{error}</p> : (
          <Table><THead><TR><TH>Nombre</TH><TH>Email</TH><TH>Rol</TH><TH>Estado</TH><TH></TH></TR></THead>
            <TBody>{data.map(u=>(
              <TR key={u.id}><TD>{u.nombre}</TD><TD>{u.email}</TD><TD>{u.rol}</TD><TD><Badge variant={u.activo?"success":"muted"}>{u.activo?"Activo":"Inactivo"}</Badge></TD>
              <TD className="space-x-2"><Button size="sm" variant="outline" onClick={()=>reset(u)}>Reset pass</Button><Button size="sm" variant="ghost" onClick={()=>toggle(u)}>{u.activo?"Desactivar":"Activar"}</Button></TD></TR>
            ))}</TBody></Table>
        )}
      </CardContent></Card>
    </div>
  );
}
