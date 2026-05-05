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

  if (!pagination || pagination.totalPages <= 1) return null;

  const startItem = Math.max(1, (pagination.page - 1) * pagination.pageSize + 1);
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className={`flex items-center justify-between py-3 px-4 border-t ${theme === 'dark' ? 'border-border' : 'border-gray-100'} mt-4`}>
      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{pagination.totalItems}</span> records
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
        >
          Previous
        </Button>
        <div className={`flex items-center px-2 text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
          Page {pagination.page} of {pagination.totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(Math.min(pagination.totalPages, pagination.page + 1))}
          disabled={pagination.page >= pagination.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
