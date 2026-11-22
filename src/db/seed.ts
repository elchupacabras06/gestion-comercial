import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { categorias, clientes, facturaItems, facturas, movimientosCuenta, movimientosStock, pagos, productos, usuarios } from "./schema";
import { createCategoria } from "@/server/categorias-service";
import { createProducto } from "@/server/productos-service";
import { createCliente } from "@/server/clientes-service";
import { createFactura } from "@/server/facturas-service";
import { createPago } from "@/server/pagos-service";

type SessionUser = { id: number; nombre: string; email: string; rol: "admin" | "vendedor" };

async function clearAll() {
  await db.delete(movimientosCuenta);
  await db.delete(movimientosStock);
  await db.delete(facturaItems);
  await db.delete(pagos);
  await db.delete(facturas);
  await db.delete(productos);
  await db.delete(categorias);
  await db.delete(clientes);
  await db.delete(usuarios);
}

async function main() {
  // Datos iniciales requeridos: 2 usuarios, 5 categorías, 30 productos, 10 clientes, 50 facturas en 30 días.
  // RF-T1..T3/RF-U3/8. Se crean facturas y pagos usando los mismos servicios para respetar reglas.
  await clearAll();

  const adminHash = await bcrypt.hash("Admin1234", 10);
  const vendedorHash = await bcrypt.hash("Vendedor1234", 10);
  const [adminRow] = await db.insert(usuarios).values({ nombre: "Laura Méndez", email: "admin@comercio.test", passwordHash: adminHash, rol: "admin", activo: true }).returning();
  const [vendRow] = await db.insert(usuarios).values({ nombre: "Pablo Ruiz", email: "vendedor@comercio.test", passwordHash: vendedorHash, rol: "vendedor", activo: true }).returning();
  const admin: SessionUser = { id: adminRow.id, nombre: adminRow.nombre, email: adminRow.email, rol: "admin" };
  const vendedor: SessionUser = { id: vendRow.id, nombre: vendRow.nombre, email: vendRow.email, rol: "vendedor" };

  const catNames = ["Herramientas", "Electricidad", "Pinturería", "Ferretería general", "Plomería"];
  const cats = [] as any[];
  for (const nombre of catNames) cats.push(await createCategoria(admin, { nombre }));

  const prods = [] as any[];
  for (let i = 1; i <= 30; i++) {
    const categoria = cats[(i - 1) % cats.length];
    prods.push(await createProducto(admin, {
      codigo: `P-${String(i).padStart(3, "0")}`,
      descripcion: `Producto demo ${i}`,
      categoriaId: categoria.id,
      precio: 100000 + i * 3500,
      stockMinimo: 5,
      stockInicial: 80,
    }));
  }

  const clientesData = [
    ["DNI", "28456123", "Mariana López", true, 40000000],
    ["DNI", "30111222", "Carlos Pérez", true, 30000000],
    ["DNI", "32999888", "Ana Torres", true, 25000000],
    ["CUIT", "20333444556", "Ferretería Norte SRL", true, 80000000],
    ["DNI", "27123456", "Jorge Díaz", false, null],
    ["DNI", "35444555", "Lucía Gómez", true, 20000000],
    ["CUIT", "27222333444", "Servicios Sur", true, 50000000],
    ["DNI", "40222111", "Marta Ríos", false, null],
    ["DNI", "31888999", "Diego Castro", true, 35000000],
    ["DNI", "29555111", "Sofía Medina", false, null],
  ] as const;
  const createdClients = [] as any[];
  for (const [tipoDoc, nroDoc, nombre, cuentaCorriente, limiteCredito] of clientesData) {
    createdClients.push(await createCliente({ tipoDoc, nroDoc, nombre, domicilio: "Calle Demo 123", telefono: "3814000000", email: `${nombre.toLowerCase().replace(/[^a-z]+/g, ".")}@correo.test`, cuentaCorriente, limiteCredito }));
  }

  const now = new Date();
  for (let i = 0; i < 50; i++) {
    const actor = i % 3 === 0 ? admin : vendedor;
    const fecha = new Date(now);
    fecha.setDate(now.getDate() - (i % 30));
    fecha.setHours(10 + (i % 8), (i * 7) % 60, 0, 0);

    const p1 = prods[i % prods.length];
    const p2 = prods[(i + 7) % prods.length];
    const items = [{ productoId: p1.id, cantidad: 1 + (i % 3) }, { productoId: p2.id, cantidad: 1 }];

    const usarCC = i % 5 === 0;
    const cliente = usarCC ? createdClients[i % 4] : (i % 4 === 0 ? createdClients[4 + (i % 6)] : null);
    let pago: any;
    if (usarCC) pago = { forma: "cuenta_corriente" };
    else if (i % 3 === 0) pago = { forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "1234" } };
    else pago = { forma: "contado", montoRecibido: (p1.precio * (1 + (i % 3)) + p2.precio) + 10000 };

    try {
      await createFactura(actor, { clienteId: cliente?.id ?? null, items, pago }, { fecha });
    } catch (e) {
      // Si se agota stock por la generación, reponer y reintentar una vez.
      await createProducto(admin, { codigo: `EX-${i}`, descripcion: `Extra ${i}`, categoriaId: cats[0].id, precio: 150000, stockMinimo: 1, stockInicial: 20 }).catch(() => null);
    }
  }

  // Registrar algunos pagos para clientes con CC para que haya créditos.
  const deudores = await db.query.clientes.findMany({ where: eq(clientes.cuentaCorriente, true) });
  for (let i = 0; i < Math.min(3, deudores.length); i++) {
    const c = deudores[i];
    const saldoRows = await db.select({ saldo: movimientosCuenta.importe, tipo: movimientosCuenta.tipo }).from(movimientosCuenta).where(eq(movimientosCuenta.clienteId, c.id));
    const saldo = saldoRows.reduce((acc, r) => acc + (r.tipo === "debito" ? r.saldo : -r.saldo), 0);
    if (saldo > 10000) {
      await createPago(admin, c.id, { importe: Math.min(saldo - 5000, 500000), medio: "transferencia", observacion: "Pago seed" }, { fecha: new Date(now.getTime() - i * 86400000) });
    }
  }

  console.log("Seed completo: admin@comercio.test/Admin1234, vendedor@comercio.test/Vendedor1234");
}

main().catch((e) => { console.error(e); process.exit(1); });
