import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UsersPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

export function UsersPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: UsersPaginationProps) {
  // Calcular range de páginas a mostrar
  const getPageNumbers = () => {
    const delta = 2; // Número de páginas antes e depois da atual
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = totalPages > 1 ? getPageNumbers() : [];

  // Calcular range de itens sendo exibidos
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Informações de range */}
      <div className="text-sm text-muted-foreground">
        Mostrando {startItem}-{endItem} de {totalItems} usuários
      </div>

      {/* Controles de navegação */}
      <div className="flex items-center gap-2">
        {/* Botão Anterior */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="gap-1"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        {/* Números das páginas */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNumber, index) => {
            if (pageNumber === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-muted-foreground"
                  aria-hidden="true"
                >
                  ...
                </span>
              );
            }

            const page = pageNumber as number;
            const isCurrentPage = page === currentPage;

            return (
              <Button
                key={page}
                variant={isCurrentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                className={`min-w-[2.5rem] ${
                  isCurrentPage 
                    ? "bg-ai-blue text-white hover:bg-ai-blue/90" 
                    : "hover:bg-muted"
                }`}
                aria-label={`Ir para página ${page}`}
                aria-current={isCurrentPage ? "page" : undefined}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Botão Próximo */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="gap-1"
          aria-label="Próxima página"
        >
          <span className="hidden sm:inline">Próximo</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}