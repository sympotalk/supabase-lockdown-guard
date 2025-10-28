// [71-UI.STANDARD.E-FINAL] SympoHub unified table component with DashStack colors
import React from "react";
import clsx from "clsx";

interface Column {
  header: string;
  accessor: string;
  maxWidth?: string;
  align?: "left" | "center" | "right";
}

interface SympoTableProps {
  columns: Column[];
  data: any[];
  darkMode?: boolean;
  onRowClick?: (row: any, index: number) => void;
  minWidth?: string;
}

export default function SympoTable({
  columns,
  data,
  darkMode = false,
  onRowClick,
  minWidth = "1200px",
}: SympoTableProps) {
  return (
    <div className="rounded-2xl shadow-sm border border-border bg-card overflow-x-auto transition-all duration-150">
      <table
        className="w-full border-collapse text-sm text-left"
        style={{ minWidth }}
      >
        <thead className="sticky top-0 z-10 bg-muted transition-colors duration-150">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={clsx(
                  "py-3 px-4 text-xs font-semibold uppercase tracking-wide border-b border-border text-muted-foreground transition-colors duration-150",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-16 text-center text-muted-foreground"
              >
                데이터가 없습니다
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={clsx(
                  "border-b border-border transition-all duration-150",
                  onRowClick && "cursor-pointer hover:bg-accent"
                )}
                onClick={() => onRowClick?.(row, i)}
              >
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className={clsx(
                      "py-2.5 px-4 font-medium truncate whitespace-nowrap text-card-foreground transition-colors duration-150",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right"
                    )}
                    style={{ maxWidth: col.maxWidth || "160px" }}
                  >
                    {row[col.accessor] ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
