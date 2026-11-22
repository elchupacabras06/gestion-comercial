import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol", { enum: ["admin", "vendedor"] }).notNull(),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const categorias = sqliteTable("categorias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull().unique(),
  activa: integer("activa", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const productos = sqliteTable(
  "productos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    codigo: text("codigo").notNull().unique(),
    descripcion: text("descripcion").notNull(),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categorias.id),
    precio: integer("precio").notNull(),
    existencia: integer("existencia").notNull().default(0),
    stockMinimo: integer("stock_minimo").notNull().default(0),
    activo: integer("activo", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index("productos_categoria_idx").on(t.categoriaId)],
);

export const clientes = sqliteTable(
  "clientes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tipoDoc: text("tipo_doc", { enum: ["DNI", "CUIT"] }).notNull(),
    nroDoc: text("nro_doc").notNull(),
    nombre: text("nombre").notNull(),
    domicilio: text("domicilio"),
    telefono: text("telefono"),
    email: text("email"),
    cuentaCorriente: integer("cuenta_corriente", { mode: "boolean" }).notNull().default(false),
    limiteCredito: integer("limite_credito"),
    activo: integer("activo", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("clientes_doc_uidx").on(t.tipoDoc, t.nroDoc)],
);

export const facturas = sqliteTable(
  "facturas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    puntoVenta: integer("punto_venta").notNull(),
    numero: integer("numero").notNull(),
    fecha: integer("fecha", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    clienteId: integer("cliente_id").references(() => clientes.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    total: integer("total").notNull(),
    formaPago: text("forma_pago", { enum: ["contado", "tarjeta", "cuenta_corriente"] }).notNull(),
    tarjetaTipo: text("tarjeta_tipo", { enum: ["debito", "credito"] }),
    tarjetaMarca: text("tarjeta_marca"),
    tarjetaUltimos4: text("tarjeta_ultimos4"),
    montoRecibido: integer("monto_recibido"),
    estado: text("estado", { enum: ["emitida", "anulada"] }).notNull().default("emitida"),
    motivoAnulacion: text("motivo_anulacion"),
    anuladaAt: integer("anulada_at", { mode: "timestamp_ms" }),
    anuladaPorId: integer("anulada_por_id").references(() => usuarios.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("facturas_pv_num_uidx").on(t.puntoVenta, t.numero),
    index("facturas_fecha_idx").on(t.fecha),
    index("facturas_cliente_idx").on(t.clienteId),
  ],
);

export const facturaItems = sqliteTable(
  "factura_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    facturaId: integer("factura_id")
      .notNull()
      .references(() => facturas.id),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    descripcion: text("descripcion").notNull(),
    cantidad: integer("cantidad").notNull(),
    precioUnitario: integer("precio_unitario").notNull(),
    subtotal: integer("subtotal").notNull(),
  },
  (t) => [index("factura_items_factura_idx").on(t.facturaId)],
);

export const pagos = sqliteTable(
  "pagos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    puntoVenta: integer("punto_venta").notNull(),
    numero: integer("numero").notNull(),
    fecha: integer("fecha", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    importe: integer("importe").notNull(),
    medio: text("medio", { enum: ["efectivo", "transferencia", "tarjeta_debito"] }).notNull(),
    observacion: text("observacion"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pagos_pv_num_uidx").on(t.puntoVenta, t.numero),
    index("pagos_cliente_idx").on(t.clienteId),
  ],
);

export const movimientosStock = sqliteTable(
  "movimientos_stock",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    facturaId: integer("factura_id").references(() => facturas.id),
    tipo: text("tipo", { enum: ["venta", "anulacion", "ingreso", "egreso"] }).notNull(),
    cantidad: integer("cantidad").notNull(),
    existenciaResultante: integer("existencia_resultante").notNull(),
    motivo: text("motivo").notNull(),
    observacion: text("observacion"),
    fecha: integer("fecha", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("mov_stock_producto_idx").on(t.productoId),
    index("mov_stock_fecha_idx").on(t.fecha),
  ],
);

export const movimientosCuenta = sqliteTable(
  "movimientos_cuenta",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id),
    facturaId: integer("factura_id").references(() => facturas.id),
    pagoId: integer("pago_id").references(() => pagos.id),
    tipo: text("tipo", { enum: ["debito", "credito"] }).notNull(),
    importe: integer("importe").notNull(),
    descripcion: text("descripcion").notNull(),
    fecha: integer("fecha", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("mov_cuenta_cliente_idx").on(t.clienteId), index("mov_cuenta_fecha_idx").on(t.fecha)],
);

export const usuariosRelations = relations(usuarios, ({ many }) => ({
  facturas: many(facturas),
  pagos: many(pagos),
  movimientosStock: many(movimientosStock),
}));

export const categoriasRelations = relations(categorias, ({ many }) => ({
  productos: many(productos),
}));

export const productosRelations = relations(productos, ({ one, many }) => ({
  categoria: one(categorias, { fields: [productos.categoriaId], references: [categorias.id] }),
  movimientos: many(movimientosStock),
  facturaItems: many(facturaItems),
}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  facturas: many(facturas),
  pagos: many(pagos),
  movimientosCuenta: many(movimientosCuenta),
}));

export const facturasRelations = relations(facturas, ({ one, many }) => ({
  cliente: one(clientes, { fields: [facturas.clienteId], references: [clientes.id] }),
  usuario: one(usuarios, { fields: [facturas.usuarioId], references: [usuarios.id] }),
  anuladaPor: one(usuarios, { fields: [facturas.anuladaPorId], references: [usuarios.id] }),
  items: many(facturaItems),
}));

export const facturaItemsRelations = relations(facturaItems, ({ one }) => ({
  factura: one(facturas, { fields: [facturaItems.facturaId], references: [facturas.id] }),
  producto: one(productos, { fields: [facturaItems.productoId], references: [productos.id] }),
}));

export const pagosRelations = relations(pagos, ({ one }) => ({
  cliente: one(clientes, { fields: [pagos.clienteId], references: [clientes.id] }),
  usuario: one(usuarios, { fields: [pagos.usuarioId], references: [usuarios.id] }),
}));

export const movimientosStockRelations = relations(movimientosStock, ({ one }) => ({
  producto: one(productos, { fields: [movimientosStock.productoId], references: [productos.id] }),
  usuario: one(usuarios, { fields: [movimientosStock.usuarioId], references: [usuarios.id] }),
  factura: one(facturas, { fields: [movimientosStock.facturaId], references: [facturas.id] }),
}));

export const movimientosCuentaRelations = relations(movimientosCuenta, ({ one }) => ({
  cliente: one(clientes, { fields: [movimientosCuenta.clienteId], references: [clientes.id] }),
  factura: one(facturas, { fields: [movimientosCuenta.facturaId], references: [facturas.id] }),
  pago: one(pagos, { fields: [movimientosCuenta.pagoId], references: [pagos.id] }),
}));
