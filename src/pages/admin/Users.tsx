import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const users = [
  {
    name: "João Silva",
    email: "joao@e7vieira.com.br",
    role: "Administrador",
    status: "Ativo",
    lastAccess: "Hoje",
  },
  {
    name: "Maria Santos",
    email: "maria@e7vieira.com.br",
    role: "Advogado",
    status: "Ativo",
    lastAccess: "Há 2 horas",
  },
  {
    name: "Pedro Oliveira",
    email: "pedro@e7vieira.com.br",
    role: "Contador",
    status: "Ativo",
    lastAccess: "Ontem",
  },
  {
    name: "Ana Costa",
    email: "ana@e7vieira.com.br",
    role: "Assistente",
    status: "Inativo",
    lastAccess: "5 dias atrás",
  },
];

export default function Users() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Usuários</h1>
          <p className="text-muted-foreground">
            Gerenciar usuários e permissões
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">18</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total de Usuários</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-ai-green mb-1">15</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Ativos</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-ai-orange mb-1">3</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Inativos</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-ai-blue mb-1">12</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Online Hoje</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou função..."
            className="pl-10"
          />
        </div>
      </Card>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Lista de Usuários</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={index}>
                <TableCell>
                  <span className="font-medium">{user.name}</span>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === "Ativo" ? "default" : "secondary"}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.lastAccess}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Editar
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
          <h2 className="text-lg font-semibold text-foreground mb-4">Lista de Usuários</h2>
        </div>
        {users.map((user, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{user.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-2">
                  Editar
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Função:</span>
                  <Badge variant="outline" className="text-xs">{user.role}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <Badge 
                    variant={user.status === "Ativo" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {user.status}
                  </Badge>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <span>Último acesso: {user.lastAccess}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
