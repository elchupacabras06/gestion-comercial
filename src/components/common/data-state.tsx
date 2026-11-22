export function EmptyState({ message = "No hay datos para mostrar." }: { message?: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{message}</div>;
}
export function ErrorState({ message = "Ocurrió un error." }: { message?: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>;
}
export function LoadingState({ message = "Cargando..." }: { message?: string }) {
  return <div className="rounded-lg border p-4 text-sm text-muted-foreground">{message}</div>;
}
