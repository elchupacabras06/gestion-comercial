"use client";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";

type Prod = { id:number; codigo:string; descripcion:string; precio:number; existencia:number; activo:boolean };
type Item = { productoId:number; codigo:string; descripcion:string; precio:number; cantidad:number; existencia:number };

export default function NuevaVentaPage() {
  const [productos, setProductos] = useState<Prod[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [qProd, setQProd] = useState("");
  const [qCli, setQCli] = useState("");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [forma, setForma] = useState<"contado"|"tarjeta"|"cuenta_corriente">("contado");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [tarjeta, setTarjeta] = useState({ tipo: "debito", marca: "Visa", ultimos4: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProductos() { const r = await fetch(`/api/productos?q=${encodeURIComponent(qProd)}&pageSize=20`); const j = await r.json(); if (r.ok) setProductos(j.data); }
  async function loadClientes() { const r = await fetch(`/api/clientes?q=${encodeURIComponent(qCli)}&pageSize=20`); const j = await r.json(); if (r.ok) setClientes(j.data); }
  useEffect(() => { loadProductos(); }, []); // eslint-disable-line
  useEffect(() => { loadClientes(); }, []); // eslint-disable-line

  function addProd(p: Prod) {
    setItems((prev) => {
      const ex = prev.find((i) => i.productoId === p.id);
      if (ex) return prev.map((i) => i.productoId === p.id ? { ...i, cantidad: Math.min(i.cantidad + 1, p.existencia) } : i);
      if (p.existencia <= 0) return prev;
      return [...prev, { productoId: p.id, codigo: p.codigo, descripcion: p.descripcion, precio: p.precio, cantidad: 1, existencia: p.existencia }];
    });
  }
  function setCantidad(id: number, cantidad: number) { setItems((prev)=>prev.map(i=>i.productoId===id?{...i,cantidad:Math.max(1,Math.min(cantidad,i.existencia))}:i)); }
  function removeItem(id: number) { setItems((prev)=>prev.filter(i=>i.productoId!==id)); }
  const total = useMemo(()=>items.reduce((a,i)=>a+i.precio*i.cantidad,0),[items]);
  const vuelto = Math.max((Number(montoRecibido||0)*100) - total, 0);

  async function confirmar() {
    setMsg(null); setLoading(true);
    try {
      const pago = forma === "contado" ? { forma, montoRecibido: Math.round(Number(montoRecibido||0)*100) || total } : forma === "tarjeta" ? { forma, tarjeta } : { forma };
      const body = { clienteId, items: items.map(i=>({ productoId: i.productoId, cantidad: i.cantidad })), pago };
      const r = await fetch("/api/facturas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(()=>null);
      if (!r.ok) { setMsg(j?.error?.message || "Error al confirmar venta"); return; }
      setMsg(`Factura ${j.numeroFormateado} emitida.`);
      setItems([]); setMontoRecibido(""); setClienteId(null);
    } finally { setLoading(false); }
  }

  return <div className="space-y-4">
    <PageHeader title="Nueva venta" description="Comprador, ítems y forma de pago." />
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <Card><CardHeader><CardTitle>Productos</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex gap-2"><Input placeholder="Buscar código o descripción" value={qProd} onChange={e=>setQProd(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();loadProductos();}}} /><Button variant="outline" onClick={loadProductos}>Buscar</Button></div>
        <Table><THead><TR><TH>Código</TH><TH>Descripción</TH><TH>Precio</TH><TH>Stock</TH><TH></TH></TR></THead><TBody>
          {productos.map(p=><TR key={p.id}><TD>{p.codigo}</TD><TD>{p.descripcion}</TD><TD>{formatMoney(p.precio)}</TD><TD>{p.existencia}</TD><TD><Button size="sm" onClick={()=>addProd(p)} disabled={p.existencia<=0 || !p.activo}>Agregar</Button></TD></TR>)}
        </TBody></Table>
      </CardContent></Card>

      <div className="space-y-4">
        <Card><CardHeader><CardTitle>Comprador</CardTitle></CardHeader><CardContent className="space-y-2">
          <div className="flex gap-2"><Input placeholder="Buscar cliente" value={qCli} onChange={e=>setQCli(e.target.value)} /><Button variant="outline" onClick={loadClientes}>Buscar</Button></div>
          <select className="h-10 w-full rounded-md border px-3 text-sm" value={clienteId ?? ""} onChange={e=>setClienteId(e.target.value?Number(e.target.value):null)}>
            <option value="">Consumidor final</option>
            {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre} - {c.tipoDoc} {c.nroDoc}</option>)}
          </select>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Ítems</CardTitle></CardHeader><CardContent>
          <Table><THead><TR><TH>Producto</TH><TH>Cant.</TH><TH>Subtotal</TH><TH></TH></TR></THead><TBody>
            {items.map(i=><TR key={i.productoId}><TD>{i.descripcion}<div className="text-xs text-muted-foreground">Disp: {i.existencia}</div></TD><TD><Input type="number" min={1} max={i.existencia} value={i.cantidad} onChange={e=>setCantidad(i.productoId, Number(e.target.value))} className="w-20" /></TD><TD>{formatMoney(i.precio*i.cantidad)}</TD><TD><Button size="sm" variant="ghost" onClick={()=>removeItem(i.productoId)}>Quitar</Button></TD></TR>)}
          </TBody></Table>
          <div className="mt-3 text-right text-lg font-semibold">Total: {formatMoney(total)}</div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Pago</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><Label>Forma</Label><select className="h-10 w-full rounded-md border px-3 text-sm" value={forma} onChange={e=>setForma(e.target.value as any)}><option value="contado">Contado</option><option value="tarjeta">Tarjeta</option><option value="cuenta_corriente">Cuenta corriente</option></select></div>
          {forma==="contado" && <div className="grid grid-cols-2 gap-2"><div><Label>Monto recibido ($)</Label><Input type="number" step="0.01" value={montoRecibido} onChange={e=>setMontoRecibido(e.target.value)} /></div><div><Label>Vuelto</Label><div className="h-10 flex items-center px-3 border rounded-md bg-muted/30">{formatMoney(vuelto)}</div></div></div>}
          {forma==="tarjeta" && <div className="grid grid-cols-3 gap-2"><div><Label>Tipo</Label><select className="h-10 w-full rounded-md border px-3 text-sm" value={tarjeta.tipo} onChange={e=>setTarjeta({...tarjeta,tipo:e.target.value})}><option value="debito">Débito</option><option value="credito">Crédito</option></select></div><div><Label>Marca</Label><Input value={tarjeta.marca} onChange={e=>setTarjeta({...tarjeta,marca:e.target.value})} /></div><div><Label>Últimos 4</Label><Input value={tarjeta.ultimos4} maxLength={4} onChange={e=>setTarjeta({...tarjeta,ultimos4:e.target.value.replace(/\D/g,"")})} /></div></div>}
          {forma==="cuenta_corriente" && <p className="text-sm text-muted-foreground">Solo para clientes registrados y habilitados.</p>}
          <Button onClick={confirmar} disabled={loading || items.length===0} className="w-full">{loading?"Confirmando...":"Confirmar venta"}</Button>
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent></Card>
      </div>
    </div>
  </div>;
}
