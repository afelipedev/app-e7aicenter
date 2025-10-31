import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Download, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const payrollData = [
  { id: 1, company: "Empresa ABC", month: "01/2025", files: 45, status: "Processado", date: "15/01/2025" },
  { id: 2, company: "Empresa XYZ", month: "01/2025", files: 32, status: "Processado", date: "15/01/2025" },
  { id: 3, company: "Empresa DEF", month: "12/2024", files: 38, status: "Processado", date: "10/01/2025" },
  { id: 4, company: "Empresa GHI", month: "12/2024", files: 28, status: "Em Análise", date: "08/01/2025" },
];

export default function Payroll() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestão de Holerites</h1>
          <p className="text-muted-foreground">
            Upload e processamento de folhas de pagamento
          </p>
        </div>
        <Button className="gap-2">
          <Upload className="w-4 h-4" />
          Novo Upload
        </Button>
      </div>

      {/* Upload Section */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Competência (MM/AAAA)</label>
            <Input type="text" placeholder="01/2025" className="max-w-xs" />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Empresa</label>
            <Input type="text" placeholder="Selecione a empresa" className="max-w-xs" />
          </div>
        </div>
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-foreground font-medium mb-1">
            Clique para fazer upload ou arraste os arquivos
          </p>
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: PDF (serão convertidos para XLSX)
          </p>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Holerites</p>
              <p className="text-2xl font-bold text-foreground">143</p>
            </div>
            <FileText className="w-8 h-8 text-ai-green" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Processados Este Mês</p>
              <p className="text-2xl font-bold text-foreground">77</p>
            </div>
            <Download className="w-8 h-8 text-ai-blue" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Em Análise</p>
              <p className="text-2xl font-bold text-foreground">28</p>
            </div>
            <Filter className="w-8 h-8 text-ai-orange" />
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Importações Recentes</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead>Arquivos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.company}</TableCell>
                <TableCell>{item.month}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.files}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === "Processado" ? "default" : "secondary"}
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>{item.date}</TableCell>
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
