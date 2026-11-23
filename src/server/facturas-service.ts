import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientes, facturaItems, facturas, movimientosCuenta, productos, usuarios } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { paginationSchema, paged, parseOrThrow } from "./validation";
import { anulacionSchema, facturaCreateSchema } from "@/lib/schemas";
import type { SessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatFacturaNumero } from "@/lib/format";
import { registrarMovimientoStock } from "./stock-service";
import { getSaldoClienteTx } from "./clientes-service";

function assertAdmin(user: SessionUser) {
  if (user.rol !== "admin") throw new ApiError(403, "SIN_PERMISO", "Solo un administrador puede anular facturas.");
}

function mapFactura(f: any, items?: any[]) {
  const base: any = {
    id: f.id,
    puntoVenta: f.puntoVenta,
    numero: f.numero,
    numeroFormateado: formatFacturaNumero(f.puntoVenta, f.numero),
    fecha: f.fecha,
    estado: f.estado,
    cliente: f.cliente ? { id: f.cliente.id, nombre: f.cliente.nombre, tipoDoc: f.cliente.tipoDoc, nroDoc: f.cliente.nroDoc, domicilio: f.cliente.domicilio } : null,
    vendedor: f.usuario ? { id: f.usuario.id, nombre: f.usuario.nombre } : undefined,
    total: f.total,
    pago: f.formaPago === "contado"
      ? { forma: "contado", montoRecibido: f.montoRecibido, vuelto: Math.max((f.montoRecibido ?? f.total) - f.total, 0) }
      : f.formaPago === "tarjeta"
        ? { forma: "tarjeta", tarjeta: { tipo: f.tarjetaTipo, marca: f.tarjetaMarca, ultimos4: f.tarjetaUltimos4 } }
        : { forma: "cuenta_corriente" },
  };
  if (items) base.items = items.map((it) => ({
    productoId: it.productoId, codigo: it.producto?.codigo, descripcion: it.descripcion,
    cantidad: it.cantidad, precioUnitario: it.precioUnitario, subtotal: it.subtotal,
  }));
  if (f.estado === "anulada") base.anulacion = { fecha: f.anuladaAt, usuario: f.anuladaPor ? { id: f.anuladaPor.id, nombre: f.anuladaPor.nombre } : null, motivo: f.motivoAnulacion };
  return base;
}

export async function listFacturas(searchParams: URLSearchParams) {
  // RF-V8: listado con filtros.
  const { page, pageSize } = parseOrThrow(paginationSchema, Object.fromEntries(searchParams));
  const q = searchParams.get("q")?.trim();
  const estado = searchParams.get("estado");
  const forma = searchParams.get("forma");
  const clienteId = searchParams.get("clienteId");
  const vendedorId = searchParams.get("vendedorId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const where = and(
    q ? or(sql`printf('%04d-%08d', ${facturas.puntoVenta}, ${facturas.numero}) like ${`%${q}%`}`, sql`exists(select 1 from clientes c where c.id=${facturas.clienteId} and c.nombre like ${`%${q}%`})`) : undefined,
    estado ? eq(facturas.estado, estado as any) : undefined,
    forma ? eq(facturas.formaPago, forma as any) : undefined,
    clienteId ? eq(facturas.clienteId, Number(clienteId)) : undefined,
    vendedorId ? eq(facturas.usuarioId, Number(vendedorId)) : undefined,
    desde ? sql`date(${facturas.fecha} / 1000, 'unixepoch', '-3 hours') >= ${desde}` : undefined,
    hasta ? sql`date(${facturas.fecha} / 1000, 'unixepoch', '-3 hours') <= ${hasta}` : undefined,
  );
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(facturas).where(where);
  const [tot] = await db.select({ totalEmitido: sql<number>`coalesce(sum(${facturas.total}),0)` }).from(facturas).where(and(where, eq(facturas.estado, "emitida")));
  const rows = await db.query.facturas.findMany({ where, with: { cliente: true, usuario: true }, limit: pageSize, offset: (page - 1) * pageSize, orderBy: [desc(facturas.fecha), desc(facturas.id)] });
  return { ...paged(rows.map((f) => mapFactura(f)), page, pageSize, Number(count)), totalEmitido: Number(tot?.totalEmitido ?? 0) };
}

export async function getFactura(id: number, tx: any = db) {
  // RF-V7: detalle/comprobante.
  const f = await tx.query.facturas.findFirst({ where: eq(facturas.id, id), with: { cliente: true, usuario: true, anuladaPor: true } });
  if (!f) throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
  const items = await tx.query.facturaItems.findMany({ where: eq(facturaItems.facturaId, id), with: { producto: true } });
  return mapFactura(f, items);
}

export async function anularFactura(actor: SessionUser, id: number, input: unknown) {
  // RF-V9, Regla 5: anulación por admin, revierte stock y CC en transacción.
  assertAdmin(actor);
  const data = parseOrThrow(anulacionSchema, input);
  return db.transaction(async (tx) => {
    const f = await tx.query.facturas.findFirst({ where: eq(facturas.id, id), with: { items: true } });
    if (!f) throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
    if (f.estado === "anulada") throw new ApiError(409, "FACTURA_ANULADA", "La factura ya está anulada.");

    const now = new Date();
    await tx.update(facturas).set({ estado: "anulada", motivoAnulacion: data.motivo, anuladaAt: now, anuladaPorId: actor.id, updatedAt: now }).where(eq(facturas.id, id));
    const items = await tx.query.facturaItems.findMany({ where: eq(facturaItems.facturaId, id) });
    for (const it of items) {
      await registrarMovimientoStock(tx, {
        productoId: it.productoId, usuarioId: actor.id, tipo: "anulacion", cantidad: it.cantidad,
        motivo: "Anulación de factura", facturaId: id, fecha: now,
      });
    }
    if (f.formaPago === "cuenta_corriente" && f.clienteId) {
      const saldo = await getSaldoClienteTx(tx, f.clienteId);
      const credito = Math.min(f.total, Math.max(saldo, 0));
      if (credito > 0) {
        await tx.insert(movimientosCuenta).values({
          clienteId: f.clienteId, facturaId: id, tipo: "credito", importe: credito,
          descripcion: `Anulación factura ${formatFacturaNumero(f.puntoVenta, f.numero)}`, fecha: now,
        });
      }
    }
    return getFactura(id, tx);
  });
}

export async function getProximoNumero() {
  // RF-V1: número informativo.
  const puntoVenta = Number(env.PUNTO_VENTA);
  const row = await db.query.facturas.findFirst({ where: eq(facturas.puntoVenta, puntoVenta), orderBy: [desc(facturas.numero)] });
  const next = (row?.numero ?? 0) + 1;
  return { numeroFormateado: formatFacturaNumero(puntoVenta, next) };
}

export async function createFactura(actor: SessionUser, input: unknown, opts?: { fecha?: Date }) {
  // RF-V1..V6, reglas 1-7,9,10,11: confirmar venta en transacción.
  const data = parseOrThrow(facturaCreateSchema, input);
  const puntoVenta = Number(env.PUNTO_VENTA);

  return db.transaction(async (tx) => {
    const ids = data.items.map((i) => i.productoId);
    const prods = await Promise.all(ids.map((id) => tx.query.productos.findFirst({ where: eq(productos.id, id) })));
    const byId = new Map<number, any>();
    for (let i = 0; i < ids.length; i++) {
      const p = prods[i];
      if (!p) throw new ApiError(404, "NO_ENCONTRADO", `Producto ${ids[i]} no encontrado.`);
      if (!p.activo) throw new ApiError(422, "PRODUCTO_INACTIVO", `El producto ${p.codigo} está inactivo.`);
      byId.set(p.id, p);
    }

    let cliente: any = null;
    if (data.clienteId) {
      cliente = await tx.query.clientes.findFirst({ where: eq(clientes.id, data.clienteId) });
      if (!cliente || !cliente.activo) throw new ApiError(422, "VALIDACION", "Cliente inválido o inactivo.", [{ campo: "clienteId", mensaje: "Cliente no encontrado o inactivo." }]);
    }

    if (data.pago.forma === "cuenta_corriente") {
      if (!cliente || !cliente.cuentaCorriente) throw new ApiError(422, "CUENTA_CORRIENTE_NO_HABILITADA", "El cliente no tiene cuenta corriente habilitada.");
    }

    // Validar stock antes de confirmar (RF-V4)
    const insuficientes: any[] = [];
    for (const item of data.items) {
      const p = byId.get(item.productoId);
      if (p.existencia < item.cantidad) insuficientes.push({ productoId: p.id, solicitado: item.cantidad, disponible: p.existencia });
    }
    if (insuficientes.length) throw new ApiError(409, "STOCK_INSUFICIENTE", "Stock insuficiente.", insuficientes);

    const itemsCalc = data.items.map((item) => {
      const p = byId.get(item.productoId);
      const subtotal = p.precio * item.cantidad;
      return { productoId: p.id, codigo: p.codigo, descripcion: p.descripcion, cantidad: item.cantidad, precioUnitario: p.precio, subtotal };
    });
    const total = itemsCalc.reduce((a, it) => a + it.subtotal, 0);

    if (data.pago.forma === "contado") {
      const recibido = data.pago.montoRecibido ?? total;
      if (recibido < total) throw new ApiError(422, "MONTO_INSUFICIENTE", "El monto recibido no cubre el total.");
    }

    if (data.pago.forma === "cuenta_corriente" && cliente) {
      const saldoActual = await getSaldoClienteTx(tx, cliente.id);
      const saldoNuevo = saldoActual + total;
      if (cliente.limiteCredito != null && saldoNuevo > cliente.limiteCredito) {
        throw new ApiError(422, "LIMITE_CREDITO_EXCEDIDO", "La venta supera el límite de crédito.", [{ saldoActual, limite: cliente.limiteCredito, excedente: saldoNuevo - cliente.limiteCredito }]);
      }
    }

    const last = await tx.query.facturas.findFirst({ where: eq(facturas.puntoVenta, puntoVenta), orderBy: [desc(facturas.numero)] });
    const numero = (last?.numero ?? 0) + 1;
    const fecha = opts?.fecha ?? new Date();

    const [factura] = await tx.insert(facturas).values({
      puntoVenta, numero, fecha, clienteId: cliente?.id ?? null, usuarioId: actor.id, total,
      formaPago: data.pago.forma,
      tarjetaTipo: data.pago.forma === "tarjeta" ? data.pago.tarjeta.tipo : null,
      tarjetaMarca: data.pago.forma === "tarjeta" ? data.pago.tarjeta.marca : null,
      tarjetaUltimos4: data.pago.forma === "tarjeta" ? data.pago.tarjeta.ultimos4 : null,
      montoRecibido: data.pago.forma === "contado" ? (data.pago.montoRecibido ?? total) : null,
      estado: "emitida",
    }).returning();

    for (const it of itemsCalc) {
      await tx.insert(facturaItems).values({
        facturaId: factura.id, productoId: it.productoId, descripcion: it.descripcion,
        cantidad: it.cantidad, precioUnitario: it.precioUnitario, subtotal: it.subtotal,
      });
      // Regla 1,2: descuento atómico + movimiento en misma transacción
      await registrarMovimientoStock(tx, {
        productoId: it.productoId, usuarioId: actor.id, tipo: "venta", cantidad: it.cantidad,
        motivo: "Venta", facturaId: factura.id, fecha,
      });
    }

    let saldoCliente: number | undefined;
    if (data.pago.forma === "cuenta_corriente" && cliente) {
      await tx.insert(movimientosCuenta).values({
        clienteId: cliente.id, facturaId: factura.id, tipo: "debito", importe: total,
        descripcion: `Factura ${formatFacturaNumero(puntoVenta, numero)}`, fecha,
      });
      saldoCliente = await getSaldoClienteTx(tx, cliente.id);
    }

    const full = await tx.query.facturas.findFirst({ where: eq(facturas.id, factura.id), with: { cliente: true, usuario: true } });
    const its = await tx.query.facturaItems.findMany({ where: eq(facturaItems.facturaId, factura.id), with: { producto: true } });
    const out = mapFactura(full, its);
    if (saldoCliente !== undefined) out.saldoCliente = saldoCliente;
    return out;
  });
}
