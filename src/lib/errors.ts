export type ApiErrorCode =
  | "JSON_INVALIDO"
  | "NO_AUTENTICADO"
  | "CREDENCIALES_INVALIDAS"
  | "SIN_PERMISO"
  | "NO_ENCONTRADO"
  | "CODIGO_DUPLICADO"
  | "DOCUMENTO_DUPLICADO"
  | "EMAIL_DUPLICADO"
  | "NOMBRE_DUPLICADO"
  | "CATEGORIA_EN_USO"
  | "STOCK_INSUFICIENTE"
  | "FACTURA_ANULADA"
  | "VALIDACION"
  | "PRODUCTO_INACTIVO"
  | "CUENTA_CORRIENTE_NO_HABILITADA"
  | "LIMITE_CREDITO_EXCEDIDO"
  | "MONTO_INSUFICIENTE"
  | "PAGO_SUPERA_DEUDA"
  | "SALDO_PENDIENTE"
  | "CONTRASENA_ACTUAL_INCORRECTA"
  | "OPERACION_SOBRE_SI_MISMO"
  | "ERROR_INTERNO";

export type ApiErrorDetail = {
  campo?: string;
  mensaje?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: ApiErrorDetail[];

  constructor(status: number, code: ApiErrorCode, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  console.error(error);
  return Response.json(
    { error: { code: "ERROR_INTERNO", message: "Ocurrió un error inesperado." } },
    { status: 500 },
  );
}
