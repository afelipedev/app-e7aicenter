import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLeads, useSetLeadActive } from "../hooks/useLeads";
import { LeadsService } from "../services/leadsService";
import type { LeadType } from "../types";
import { toast } from "sonner";
import { useImportLeadsCsv, exportLeadsToCsvFile } from "../hooks/useLeadImportExport";
import { Upload, Download } from "lucide-react";

export default function LeadsTable({ leadType }: { leadType: Exclude<LeadType, null> }) {
  const [search, setSearch] = useState("");
  const { data: leads = [], isLoading, refetch } = useLeads({ leadType, search });
  const { mutateAsync: setActive, isPending: changingStatus } = useSetLeadActive({
    leadType,
    search,
  });
  const { mutateAsync: importCsv, isPending: importing } = useImportLeadsCsv();

  const rows = useMemo(() => {
    return leads.map((l) => {
      const primaryPhone = LeadsService.getPrimaryPhone(l);
      const primaryEmail = LeadsService.getPrimaryEmail(l);
      return {
        id: l.id,
        name: l.company_name || "—",
        cnpj: l.cnpj || "—",
        phone: primaryPhone?.phone || "—",
        email: primaryEmail?.email || "—",
        active: l.is_active,
        createdAt: l.created_at,
      };
    });
  }, [leads]);

  const handleToggleActive = async (id: string, next: boolean) => {
    try {
      await setActive({ id, isActive: next });
      toast.success(next ? "Lead ativado" : "Lead desativado");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status");
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    try {
      const result = await importCsv({ file, leadType });
      toast.success(`Importação concluída: ${result.imported} lead(s)`);
      if (result.errors.length > 0) {
        toast.error(`Algumas linhas falharam (${result.errors.length}). Veja o console.`);
        console.error("Erros de importação CSV:", result.errors);
      }
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar CSV");
    }
  };

  const handleExport = async () => {
    try {
      // exporta o que está na lista atual (já filtrada)
      const filename = `leads_${leadType}_${new Date().toISOString().slice(0, 10)}.csv`;
      exportLeadsToCsvFile({ leads, filename });
      toast.success("Exportação iniciada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao exportar CSV");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Leads cadastrados</h2>
          <p className="text-sm text-muted-foreground">
            Busque por nome ou CNPJ. Telefones/emails principais aparecem aqui.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  // reset para permitir reimportar o mesmo arquivo
                  e.currentTarget.value = "";
                  handleImport(f);
                }}
              />
              <Button variant="outline" size="sm" disabled={importing}>
                <Upload className="w-4 h-4 mr-2" />
                {importing ? "Importando..." : "Importar Cadastro"}
              </Button>
            </label>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={leads.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Cadastro
            </Button>
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="w-full sm:w-72"
          />
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            Atualizar
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.cnpj}</TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell className="truncate max-w-[220px]">{r.email}</TableCell>
                <TableCell>
                  {r.active ? (
                    <Badge>Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(r.id, !r.active)}
                      disabled={changingStatus}
                    >
                      {r.active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            )}

            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

