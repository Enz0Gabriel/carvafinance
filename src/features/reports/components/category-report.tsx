import { formatPercentChange } from "@/domain/balance";
import { Money } from "@/shared/components/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { CategoryReportRow } from "../types";

export function CategoryReport({ rows }: { rows: CategoryReportRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoria</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">%</TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            Período anterior
          </TableHead>
          <TableHead className="text-right">Variação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.categoryId}>
            <TableCell>
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
                {row.parentName ? `${row.parentName} › ` : ""}
                {row.name}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <Money cents={row.totalCents} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.share.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%
            </TableCell>
            <TableCell className="hidden text-right sm:table-cell">
              <Money cents={row.previousCents} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercentChange(row.changePct)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
