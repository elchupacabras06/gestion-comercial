import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, movimientosCuenta, pagos } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { parseOrThrow } from "./validation";
import { pagoCreateSchema } from "@/lib/schemas";
import type { SessionUser } from "@/lib/auth";
import { getSaldoClienteTx } from "./clientes-service";
import { formatReciboNumero } from "@/lib/format";
import { env } from "@/lib/env";

export async function createPago(actor: SessionUser, clienteId: number, input: unknown, opts?: { fecha?: Date }) {
  // RF-C5 / Regla 8: registrar pago, no supera deuda, transacción.
  const data = parseOrThrow(pagoCreateSchema, input);
  return db.transaction(async (tx) => {
    const cliente = await tx.query.clientes.findFirst({ where: eq(clientes.id, clienteId) });
    if (!cliente) throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
    if (!cliente.cuentaCorriente) throw new ApiError(422, "CUENTA_CORRIENTE_NO_HABILITADA", "El cliente no tiene cuenta corriente habilitada.");

    const saldoActual = await getSaldoClienteTx(tx, clienteId);
    if (data.importe > saldoActual) throw new ApiError(422, "PAGO_SUPERA_DEUDA", "El pago no puede superar la deuda.");

    const puntoVenta = Number(env.PUNTO_VENTA);
    const rows = await tx.query.pagos.findMany({ where: eq(pagos.puntoVenta, puntoVenta), orderBy: (p, { desc }) => [desc(p.numero)], limit: 1 });
    const numero = (rows[0]?.numero ?? 0) + 1;

    const fecha = opts?.fecha ?? new Date();
    const [pago] = await tx.insert(pagos).values({
      puntoVenta, numero, fecha, clienteId, usuarioId: actor.id,
      importe: data.importe, medio: data.medio, observacion: data.observacion ?? null,
    }).returning();

    await tx.insert(movimientosCuenta).values({
      clienteId, pagoId: pago.id, tipo: "credito", importe: data.importe,
      descripcion: `Recibo ${formatReciboNumero(puntoVenta, numero)}`, fecha: pago.fecha,
    });

    const saldoCliente = saldoActual - data.importe;
    return {
      id: pago.id,
      numeroRecibo: formatReciboNumero(puntoVenta, numero),
      fecha: pago.fecha,
      cliente: { id: cliente.id, nombre: cliente.nombre },
      importe: pago.importe,
      medio: pago.medio,
      usuario: { id: actor.id, nombre: actor.nombre },
      saldoCliente,
    };
  });
}

export async function getPago(id: number) {
  const pago = await db.query.pagos.findFirst({ where: eq(pagos.id, id), with: { cliente: true, usuario: true } });
  if (!pago) throw new ApiError(404, "NO_ENCONTRADO", "Pago no encontrado.");
  const saldoCliente = await getSaldoClienteTx(db, pago.clienteId);
  return {
    id: pago.id,
    numeroRecibo: formatReciboNumero(pago.puntoVenta, pago.numero),
    fecha: pago.fecha,
    cliente: { id: pago.cliente.id, nombre: pago.cliente.nombre },
    importe: pago.importe,
    medio: pago.medio,
    observacion: pago.observacion,
    usuario: { id: pago.usuario.id, nombre: pago.usuario.nombre },
    saldoCliente,
  };
}
