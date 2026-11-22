"use client";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function PerfilPage() {
  const [form, setForm] = useState({ actual: "", nueva: "" });
  const [msg, setMsg] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const r = await fetch("/api/auth/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { setMsg(j?.error?.message || "Error"); return; }
    setMsg("Contraseña actualizada."); setForm({ actual: "", nueva: "" });
  }
  return <div className="space-y-4"><PageHeader title="Perfil" description="Cambiar contraseña." />
    <Card><CardContent className="pt-5"><form onSubmit={submit} className="max-w-md space-y-3">
      <div><Label>Contraseña actual</Label><Input type="password" value={form.actual} onChange={e=>setForm({...form,actual:e.target.value})} required /></div>
      <div><Label>Nueva contraseña</Label><Input type="password" minLength={8} value={form.nueva} onChange={e=>setForm({...form,nueva:e.target.value})} required /></div>
      <Button type="submit">Guardar</Button>{msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </form></CardContent></Card></div>;
}
