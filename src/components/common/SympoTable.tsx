// [71-UI.STANDARD.D-FINAL] SympoHub unified table component
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
    <div
      className={clsx(
        "rounded-2xl shadow-sm border overflow-x-auto",
        darkMode
          ? "bg-[#1e293b] border-gray-700"
          : "bg-white border-gray-100"
      )}
    >
      <table
        className="w-full border-collapse text-sm text-left"
        style={{ minWidth }}
      >
        <thead
          className={clsx(
            "sticky top-0 z-10",
            darkMode ? "bg-[#27314a]" : "bg-gray-50"
          )}
        >
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={clsx(
                  "py-3 px-4 text-xs font-semibold uppercase tracking-wide border-b",
                  darkMode
                    ? "text-gray-400 border-gray-700"
                    : "text-gray-500 border-gray-100",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody
          className={clsx(
            "divide-y",
            darkMode ? "divide-gray-700" : "divide-gray-100"
          )}
        >
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={clsx(
                  "py-16 text-center",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                데이터가 없습니다
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={clsx(
                  "transition",
                  onRowClick && "cursor-pointer",
                  darkMode
                    ? "hover:bg-gray-700/30"
                    : "hover:bg-sympoblue-50/20"
                )}
                onClick={() => onRowClick?.(row, i)}
              >
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className={clsx(
                      "py-2.5 px-4 font-medium truncate whitespace-nowrap",
                      darkMode ? "text-gray-200" : "text-gray-700",
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
