import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const cases = [
  { id: "12345", client: "Empresa ABC", type: "Tributário", status: "Em Andamento", lastUpdate: "20/01/2025" },
  { id: "12346", client: "Pessoa Física", type: "Cível", status: "Aguardando", lastUpdate: "18/01/2025" },
  { id: "12347", client: "Empresa XYZ", type: "Tributário", status: "Em Andamento", lastUpdate: "15/01/2025" },
  { id: "12348", client: "Empresa DEF", type: "Cível", status: "Concluído", lastUpdate: "10/01/2025" },
];

export default function Cases() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Processos Jurídicos</h1>
          <p className="text-muted-foreground">
            Acompanhamento e gestão de processos
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Processo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground mb-1">43</p>
            <p className="text-sm text-muted-foreground">Total de Processos</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-ai-green mb-1">28</p>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-ai-orange mb-1">8</p>
            <p className="text-sm text-muted-foreground">Aguardando</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-ai-blue mb-1">7</p>
            <p className="text-sm text-muted-foreground">Concluídos</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número do processo, cliente ou tipo..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">Filtros</Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Lista de Processos</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Processo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última Atualização</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((caseItem) => (
              <TableRow key={caseItem.id}>
                <TableCell className="font-mono font-medium">{caseItem.id}</TableCell>
                <TableCell>{caseItem.client}</TableCell>
                <TableCell>
                  <Badge variant="outline">{caseItem.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      caseItem.status === "Concluído"
                        ? "default"
                        : caseItem.status === "Em Andamento"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {caseItem.status}
                  </Badge>
                </TableCell>
                <TableCell>{caseItem.lastUpdate}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Ver Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
