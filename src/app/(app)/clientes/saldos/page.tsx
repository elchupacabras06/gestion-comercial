import { listClientes } from "@/server/clientes-service";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";

export default async function SaldosPage() {
  const res = await listClientes(new URLSearchParams("conDeuda=true&orden=saldo&pageSize=100"));
  return <div className="space-y-4"><PageHeader title="Saldos" description="Clientes con deuda, ordenados de mayor a menor." />
    <Card><CardContent className="pt-5"><p className="mb-3 text-sm text-muted-foreground">Total adeudado: {formatMoney(res.totalAdeudado || 0)}</p>
      <Table><THead><TR><TH>Cliente</TH><TH>Documento</TH><TH>Saldo</TH></TR></THead><TBody>{res.data.map((c:any)=><TR key={c.id}><TD>{c.nombre}</TD><TD>{c.tipoDoc} {c.nroDoc}</TD><TD>{formatMoney(c.saldo)}</TD></TR>)}</TBody></Table>
    </CardContent></Card></div>;
}
