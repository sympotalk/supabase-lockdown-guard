// [71-UI.STANDARD.D-FINAL] SympoHub unified table component
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SympoTableColumn<T = any> {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  sticky?: boolean;
  stickyLeft?: string;
  render?: (value: any, row: T, index: number) => ReactNode;
  className?: string;
}

interface SympoTableProps<T = any> {
  columns: SympoTableColumn<T>[];
  data: T[];
  minWidth?: string;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
  emptyMessage?: string;
}

export function SympoTable<T extends Record<string, any>>({
  columns,
  data,
  minWidth = "1200px",
  onRowClick,
  rowClassName,
  emptyMessage = "데이터가 없습니다",
}: SympoTableProps<T>) {
  return (
    <div className="rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 bg-white dark:bg-[#1e293b] overflow-x-auto">
      <table
        className={cn(
          "w-full border-collapse text-sm text-left",
          `min-w-[${minWidth}]`
        )}
        style={{ minWidth }}
      >
        <thead className="sticky top-0 bg-gray-50 dark:bg-[#27314a] z-10">
          <tr className="border-b border-gray-100 dark:border-gray-700">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700",
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                  column.sticky && "sticky z-20 bg-gray-50 dark:bg-[#27314a]",
                  column.className
                )}
                style={
                  column.sticky && column.stickyLeft
                    ? { left: column.stickyLeft }
                    : column.sticky
                    ? { left: 0 }
                    : undefined
                }
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#1e293b]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-16 text-center text-gray-500 dark:text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={cn(
                  "border-b border-gray-100 dark:border-gray-700 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-sympoblue-50/20 dark:hover:bg-gray-700/30",
                  rowIndex === data.length - 1 && "last:rounded-b-2xl",
                  rowClassName?.(row, rowIndex)
                )}
                onClick={() => onRowClick?.(row, rowIndex)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "py-2.5 px-4 text-sm text-gray-700 dark:text-gray-200",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                      column.sticky && "sticky z-10 bg-white dark:bg-[#1e293b]",
                      column.className
                    )}
                    style={
                      column.sticky && column.stickyLeft
                        ? { left: column.stickyLeft }
                        : column.sticky
                        ? { left: 0 }
                        : undefined
                    }
                  >
                    {column.render
                      ? column.render(row[column.key], row, rowIndex)
                      : row[column.key] || "-"}
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

// Export CSS classes for sticky columns
export const sympoTableStyles = {
  stickyColumn: "sticky z-10 bg-white dark:bg-[#1e293b]",
  stickyHeader: "sticky top-0 bg-gray-50 dark:bg-[#27314a] z-20",
  truncate: "truncate whitespace-nowrap overflow-hidden text-ellipsis",
  hoverRow: "hover:bg-sympoblue-50/20 dark:hover:bg-gray-700/30",
};
