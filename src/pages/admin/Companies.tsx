import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const companies = [
  {
    name: "Empresa ABC Ltda",
    cnpj: "12.345.678/0001-90",
    payslips: 127,
    status: "Ativa",
    lastUpdate: "20/01/2025",
  },
  {
    name: "XYZ Comércio S.A.",
    cnpj: "98.765.432/0001-10",
    payslips: 89,
    status: "Ativa",
    lastUpdate: "18/01/2025",
  },
  {
    name: "DEF Serviços Ltda",
    cnpj: "11.222.333/0001-44",
    payslips: 76,
    status: "Ativa",
    lastUpdate: "15/01/2025",
  },
  {
    name: "GHI Industrias",
    cnpj: "55.666.777/0001-88",
    payslips: 203,
    status: "Pendente",
    lastUpdate: "10/01/2025",
  },
];

export default function Companies() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Empresas</h1>
          <p className="text-muted-foreground">
            Gerenciar empresas clientes
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nova Empresa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">12</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total de Empresas</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-ai-green mb-1">10</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Ativas</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-ai-orange mb-1">2</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Pendentes</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-ai-blue mb-1">495</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Holerites</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            className="pl-10"
          />
        </div>
      </Card>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Lista de Empresas</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Holerites</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última Atualização</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell className="font-mono text-sm">{company.cnpj}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{company.payslips}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={company.status === "Ativa" ? "default" : "outline"}>
                    {company.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {company.lastUpdate}
                </TableCell>
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

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        <div className="px-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Lista de Empresas</h2>
        </div>
        {companies.map((company, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{company.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono mt-1">{company.cnpj}</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-2">
                  Ver Detalhes
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Holerites:</span>
                  <Badge variant="secondary" className="text-xs">{company.payslips}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <Badge 
                    variant={company.status === "Ativa" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {company.status}
                  </Badge>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <span>Última atualização: {company.lastUpdate}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
