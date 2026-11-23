import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { facturaItems, facturas, movimientosCuenta, productos } from "@/db/schema";

function startOfDayAR(date = new Date()) {
  // Approximate AR offset -3 for dashboard grouping; good enough for MVP.
  const ar = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  ar.setUTCHours(0, 0, 0, 0);
  return new Date(ar.getTime() + 3 * 60 * 60 * 1000);
}

export async function getTablero() {
  // RF-T1..T3: indicadores, gráficos y más vendidos.
  const now = new Date();
  const hoyStart = startOfDayAR(now);
  const mesStart = new Date(hoyStart);
  mesStart.setUTCDate(1);

  const emitidas = eq(facturas.estado, "emitida");

  const [hoyRow] = await db.select({ cantidad: sql<number>`count(*)`, importe: sql<number>`coalesce(sum(${facturas.total}),0)` })
    .from(facturas).where(and(emitidas, gte(facturas.fecha, hoyStart)));
  const [mesRow] = await db.select({ cantidad: sql<number>`count(*)`, importe: sql<number>`coalesce(sum(${facturas.total}),0)` })
    .from(facturas).where(and(emitidas, gte(facturas.fecha, mesStart)));

  const [ccRow] = await db.select({
    totalAdeudado: sql<number>`coalesce(sum(saldo),0)`,
    clientesConSaldo: sql<number>`count(*)`,
  }).from(sql`(select cliente_id, sum(case when tipo='debito' then importe else -importe end) as saldo from movimientos_cuenta group by cliente_id having saldo > 0)` as any);

  const [bmRow] = await db.select({ cantidad: sql<number>`count(*)` }).from(productos)
    .where(and(eq(productos.activo, true), sql`${productos.existencia} < ${productos.stockMinimo}`));

  const desde30 = new Date(hoyStart);
  desde30.setUTCDate(desde30.getUTCDate() - 29);
  const ventasPorDia = await db
    .select({
      fecha: sql<string>`date(datetime(${facturas.fecha}, 'unixepoch', '-3 hours'))`,
      importe: sql<number>`coalesce(sum(${facturas.total}),0)`,
    })
    .from(facturas)
    .where(and(emitidas, gte(facturas.fecha, desde30)))
    .groupBy(sql`date(datetime(${facturas.fecha}, 'unixepoch', '-3 hours'))`);
  const porDia = new Map(ventasPorDia.map((r) => [r.fecha, Number(r.importe ?? 0)]));
  const dias: { fecha: string; importe: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoyStart);
    d.setUTCDate(d.getUTCDate() - i);
    const fecha = d.toISOString().slice(0, 10);
    dias.push({ fecha, importe: porDia.get(fecha) ?? 0 });
  }

  const formas = await db.select({ forma: facturas.formaPago, importe: sql<number>`coalesce(sum(${facturas.total}),0)` })
    .from(facturas).where(and(emitidas, gte(facturas.fecha, mesStart))).groupBy(facturas.formaPago);

  const top = await db.select({
    productoId: facturaItems.productoId,
    codigo: productos.codigo,
    descripcion: productos.descripcion,
    unidades: sql<number>`sum(${facturaItems.cantidad})`,
    importe: sql<number>`sum(${facturaItems.subtotal})`,
  }).from(facturaItems)
    .innerJoin(facturas, eq(facturaItems.facturaId, facturas.id))
    .innerJoin(productos, eq(facturaItems.productoId, productos.id))
    .where(and(emitidas, gte(facturas.fecha, mesStart)))
    .groupBy(facturaItems.productoId, productos.codigo, productos.descripcion)
    .orderBy(desc(sql`sum(${facturaItems.cantidad})`))
    .limit(5);

  const cantidadMes = Number(mesRow?.cantidad ?? 0);
  const importeMes = Number(mesRow?.importe ?? 0);
  return {
    hoy: { cantidad: Number(hoyRow?.cantidad ?? 0), importe: Number(hoyRow?.importe ?? 0) },
    mes: { cantidad: cantidadMes, importe: importeMes, ticketPromedio: cantidadMes ? Math.round(importeMes / cantidadMes) : 0 },
    cuentasCorrientes: { totalAdeudado: Number(ccRow?.totalAdeudado ?? 0), clientesConSaldo: Number(ccRow?.clientesConSaldo ?? 0) },
    bajoMinimo: { cantidad: Number(bmRow?.cantidad ?? 0) },
    ventasDiarias: dias,
    porFormaDePago: ["contado", "tarjeta", "cuenta_corriente"].map((f) => ({ forma: f, importe: Number(formas.find((x) => x.forma === f)?.importe ?? 0) })),
    masVendidos: top.map((t) => ({ ...t, unidades: Number(t.unidades), importe: Number(t.importe) })),
  };
}
