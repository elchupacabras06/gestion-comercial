import { z } from "zod";

export const rolSchema = z.enum(["admin", "vendedor"]);
export const tipoDocSchema = z.enum(["DNI", "CUIT"]);
export const formaPagoSchema = z.enum(["contado", "tarjeta", "cuenta_corriente"]);
export const medioPagoSchema = z.enum(["efectivo", "transferencia", "tarjeta_debito"]);

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const passwordChangeSchema = z.object({
  actual: z.string().min(1, "Contraseña actual requerida"),
  nueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const usuarioCreateSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  rol: rolSchema,
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const usuarioUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  rol: rolSchema.optional(),
  activo: z.boolean().optional(),
}).strict();

export const categoriaCreateSchema = z.object({ nombre: z.string().min(1, "Nombre requerido") });
export const categoriaUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  activa: z.boolean().optional(),
}).strict();

export const productoCreateSchema = z.object({
  codigo: z.string().min(1, "Código requerido"),
  descripcion: z.string().min(1, "Descripción requerida"),
  categoriaId: z.coerce.number().int().positive(),
  precio: z.coerce.number().int().positive("Precio debe ser mayor a 0"),
  stockMinimo: z.coerce.number().int().min(0).default(0),
  stockInicial: z.coerce.number().int().min(0).optional(),
}).strict();

export const productoUpdateSchema = z.object({
  codigo: z.string().min(1).optional(),
  descripcion: z.string().min(1).optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  precio: z.coerce.number().int().positive().optional(),
  stockMinimo: z.coerce.number().int().min(0).optional(),
  activo: z.boolean().optional(),
}).strict();

export const movimientoStockSchema = z.object({
  tipo: z.enum(["ingreso", "egreso"]),
  cantidad: z.coerce.number().int().positive("Cantidad debe ser mayor a 0"),
  motivo: z.string().min(1, "Motivo requerido"),
  observacion: z.string().optional(),
}).strict();

export const clienteCreateSchema = z.object({
  tipoDoc: tipoDocSchema,
  nroDoc: z.string().min(1, "Documento requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  domicilio: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  cuentaCorriente: z.boolean().default(false),
  limiteCredito: z.coerce.number().int().positive().optional().nullable(),
}).strict();

export const clienteUpdateSchema = clienteCreateSchema.partial().extend({
  activo: z.boolean().optional(),
}).strict();

export const pagoCreateSchema = z.object({
  importe: z.coerce.number().int().positive("Importe debe ser mayor a 0"),
  medio: medioPagoSchema,
  observacion: z.string().optional().nullable(),
}).strict();

export const facturaItemSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().positive(),
}).strict();

export const facturaCreateSchema = z.object({
  clienteId: z.coerce.number().int().positive().nullable(),
  items: z.array(facturaItemSchema).min(1, "Debe agregar al menos un producto"),
  pago: z.discriminatedUnion("forma", [
    z.object({ forma: z.literal("contado"), montoRecibido: z.coerce.number().int().positive().optional() }).strict(),
    z.object({
      forma: z.literal("tarjeta"),
      tarjeta: z.object({
        tipo: z.enum(["debito", "credito"]),
        marca: z.string().min(1),
        ultimos4: z.string().regex(/^\d{4}$/, "Deben ser 4 dígitos"),
      }).strict(),
    }).strict(),
    z.object({ forma: z.literal("cuenta_corriente") }).strict(),
  ]),
}).strict().superRefine((val, ctx) => {
  const ids = val.items.map((i) => i.productoId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "No se pueden repetir productos; sume la cantidad.", path: ["items"] });
  }
});

export const anulacionSchema = z.object({ motivo: z.string().min(1, "Motivo obligatorio") }).strict();
