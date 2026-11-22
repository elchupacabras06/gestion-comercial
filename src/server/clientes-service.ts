import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientes, facturas, movimientosCuenta } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { paginationSchema, paged, parseOrThrow } from "./validation";
import { clienteCreateSchema, clienteUpdateSchema } from "@/lib/schemas";
import { normalizeDocumento, formatFacturaNumero } from "@/lib/format";

async function saldoCliente(tx: any, clienteId: number) {
  const [row] = await tx.select({
    saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
  }).from(movimientosCuenta).where(eq(movimientosCuenta.clienteId, clienteId));
  return Number(row?.saldo ?? 0);
}

function mapCliente(c: any, saldo: number) {
  const disponible = c.limiteCredito == null ? null : Math.max(c.limiteCredito - saldo, 0);
  return {
    id: c.id, tipoDoc: c.tipoDoc, nroDoc: c.nroDoc, nombre: c.nombre,
    domicilio: c.domicilio, telefono: c.telefono, email: c.email,
    cuentaCorriente: c.cuentaCorriente, limiteCredito: c.limiteCredito,
    saldo, disponible, activo: c.activo,
  };
}

export async function listClientes(searchParams: URLSearchParams) {
  // RF-C1/RF-C6: listado y saldos.
  const { page, pageSize } = parseOrThrow(paginationSchema, Object.fromEntries(searchParams));
  const q = searchParams.get("q")?.trim();
  const conDeuda = searchParams.get("conDeuda") === "true";
  const orden = searchParams.get("orden") === "saldo" ? "saldo" : "nombre";

  const qNorm = q ? normalizeDocumento(q) : "";
  const where = and(
    q ? or(like(clientes.nombre, `%${q}%`), sql`replace(replace(replace(${clientes.nroDoc}, '.', ''), '-', ''), ' ', '') like ${`%${qNorm}%`}`) : undefined,
    conDeuda ? sql`exists (select 1 from movimientos_cuenta mc where mc.cliente_id = ${clientes.id} group by mc.cliente_id having coalesce(sum(case when mc.tipo='debito' then mc.importe else -mc.importe end),0) > 0)` : undefined,
  );

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(clientes).where(where);
  const rows = await db.query.clientes.findMany({
    where, limit: pageSize, offset: (page - 1) * pageSize,
    orderBy: (c, { asc }) => [asc(c.nombre)],
  });
  const saldos = await Promise.all(rows.map(async (c) => saldoCliente(db, c.id)));
  let data = rows.map((c, i) => mapCliente(c, saldos[i]));
  if (orden === "saldo") data = data.sort((a, b) => b.saldo - a.saldo);
  const result: any = paged(data, page, pageSize, Number(count));
  if (conDeuda) result.totalAdeudado = data.reduce((acc, c) => acc + Math.max(c.saldo, 0), 0);
  return result;
}

export async function getCliente(id: number) {
  // RF-C3: ficha cliente.
  const c = await db.query.clientes.findFirst({ where: eq(clientes.id, id) });
  if (!c) throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  const saldo = await saldoCliente(db, id);
  const ultimas = await db.query.facturas.findMany({
    where: eq(facturas.clienteId, id),
    orderBy: [desc(facturas.fecha)], limit: 6,
  });
  return {
    ...mapCliente(c, saldo),
    ultimasFacturas: ultimas.map((f) => ({
      id: f.id, numero: formatFacturaNumero(f.puntoVenta, f.numero), fecha: f.fecha, total: f.total, estado: f.estado,
    })),
  };
}

export async function createCliente(input: unknown) {
  // RF-C2/RF-V2: alta de cliente.
  const data = parseOrThrow(clienteCreateSchema, input);
  const nroDoc = normalizeDocumento(data.nroDoc);
  const dup = await db.query.clientes.findFirst({ where: and(eq(clientes.tipoDoc, data.tipoDoc), eq(clientes.nroDoc, nroDoc)) });
  if (dup) throw new ApiError(409, "DOCUMENTO_DUPLICADO", "Ya existe un cliente con ese documento.");
  const [created] = await db.insert(clientes).values({
    ...data, nroDoc, email: data.email || null, domicilio: data.domicilio || null, telefono: data.telefono || null,
    limiteCredito: data.limiteCredito ?? null,
  }).returning();
  return mapCliente(created, 0);
}

export async function updateCliente(id: number, input: unknown) {
  // RF-C2/RF-C7: edición/baja lógica.
  const data = parseOrThrow(clienteUpdateSchema, input);
  const existing = await db.query.clientes.findFirst({ where: eq(clientes.id, id) });
  if (!existing) throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  const nroDoc = data.nroDoc ? normalizeDocumento(data.nroDoc) : existing.nroDoc;
  const tipoDoc = data.tipoDoc ?? existing.tipoDoc;
  const dup = await db.query.clientes.findFirst({ where: and(eq(clientes.tipoDoc, tipoDoc), eq(clientes.nroDoc, nroDoc)) });
  if (dup && dup.id !== id) throw new ApiError(409, "DOCUMENTO_DUPLICADO", "Ya existe un cliente con ese documento.");
  const saldo = await saldoCliente(db, id);
  if ((data.activo === false || data.cuentaCorriente === false) && saldo !== 0) {
    throw new ApiError(422, "SALDO_PENDIENTE", "No se puede desactivar o quitar cuenta corriente con saldo pendiente.");
  }
  const [updated] = await db.update(clientes).set({ ...data, tipoDoc, nroDoc, email: data.email === "" ? null : data.email, updatedAt: new Date() } as any).where(eq(clientes.id, id)).returning();
  return mapCliente(updated, saldo);
}

export async function getCuentaCorriente(clienteId: number, searchParams: URLSearchParams) {
  // RF-C4: cuenta corriente con saldo acumulado.
  const c = await db.query.clientes.findFirst({ where: eq(clientes.id, clienteId) });
  if (!c) throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const rows = await db.query.movimientosCuenta.findMany({
    where: eq(movimientosCuenta.clienteId, clienteId),
    orderBy: (m, { asc }) => [asc(m.fecha), asc(m.id)],
  });
  let saldo = 0;
  let saldoAnterior = 0;
  const movimientos: any[] = [];
  for (const m of rows) {
    const delta = m.tipo === "debito" ? m.importe : -m.importe;
    saldo += delta;
    // Filtros por día en hora Argentina (-03:00)
    const fechaAr = new Date(m.fecha.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (desde && fechaAr < desde) { saldoAnterior = saldo; continue; }
    if (hasta && fechaAr > hasta) continue;
    movimientos.push({
      fecha: m.fecha, tipo: m.tipo, importe: m.importe, descripcion: m.descripcion,
      facturaId: m.facturaId, pagoId: m.pagoId, saldo,
    });
  }
  return { cliente: { id: c.id, nombre: c.nombre }, saldoAnterior, movimientos, saldo };
}

export async function getSaldoClienteTx(tx: any, clienteId: number) {
  return saldoCliente(tx, clienteId);
}
