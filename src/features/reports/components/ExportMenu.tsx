import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportXlsx, type XlsxSheet } from "../services/xlsxExport";
import { toast } from "sonner";

interface ExportMenuProps {
  /** Nome base do arquivo (sem extensão; a data é anexada). */
  filename: string;
  /** Função que monta as abas a partir dos dados atuais. */
  buildSheets: () => XlsxSheet[];
  disabled?: boolean;
}

/** Botão de exportação .xlsx que respeita os filtros/dados já carregados. */
export function ExportMenu({ filename, buildSheets, disabled }: ExportMenuProps) {
  const handleExport = () => {
    try {
      const sheets = buildSheets();
      if (sheets.every((s) => s.rows.length === 0)) {
        toast.warning("Não há dados para exportar no período selecionado.");
        return;
      }
      exportXlsx(filename, sheets);
      toast.success("Relatório exportado em Excel.");
    } catch (err) {
      console.error("Erro ao exportar relatório:", err);
      toast.error("Falha ao exportar o relatório.");
    }
  };

  return (
    <Button onClick={handleExport} disabled={disabled} className="gap-2">
      <Download className="w-4 h-4" />
      Exportar Excel
    </Button>
  );
}
