import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

interface AdminPaginationProps {
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  onPageChange?: (page: number) => void;
}

export const AdminPagination = ({ pagination, onPageChange }: AdminPaginationProps) => {
  const { theme } = useTheme();

  if (!pagination) return null;

  const startItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground mt-6 px-4 py-6 border-t border-border">
      <div className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
        Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{pagination.totalItems}</span> records
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => onPageChange?.(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
          className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </Button>

        <div className="flex items-center justify-center min-w-[2.5rem]">
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            {pagination.page}
          </span>
        </div>

        <Button
          onClick={() => onPageChange?.(Math.min(pagination.totalPages, pagination.page + 1))}
          disabled={pagination.page >= pagination.totalPages}
          className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
