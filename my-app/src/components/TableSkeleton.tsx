export function TableSkeleton({ rows = 8, cols = 10 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-700">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="py-2 px-2">
                <div className="h-3 bg-gray-700 rounded animate-pulse w-8" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b border-gray-700">
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="py-2 px-2">
                  <div
                    className="h-4 bg-gray-700/60 rounded animate-pulse"
                    style={{ width: colIdx === 0 ? 24 : colIdx === 1 ? 80 : 32 }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-700 bg-gray-800/80 p-4 animate-pulse"
        >
          <div className="h-5 bg-gray-700 rounded w-12 mb-3" />
          <div className="h-6 bg-gray-700 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}
