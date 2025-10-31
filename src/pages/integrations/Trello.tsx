import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trello as TrelloIcon, Plus, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const boards = [
  {
    name: "Processos Jurídicos",
    cards: 12,
    lists: ["A Fazer", "Em Andamento", "Concluído"],
  },
  {
    name: "Demandas Financeiras",
    cards: 8,
    lists: ["Backlog", "Em Análise", "Aprovado"],
  },
  {
    name: "Tarefas Administrativas",
    cards: 15,
    lists: ["Pendente", "Em Progresso", "Finalizado"],
  },
];

export default function Trello() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Integração Trello</h1>
          <p className="text-muted-foreground">
            Gestão de tarefas e boards
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Card
          </Button>
          <Button className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Abrir Trello
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-blue flex items-center justify-center">
            <TrelloIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Status da Conexão</h3>
            <p className="text-sm text-muted-foreground">Conectado e sincronizado</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-ai-green animate-pulse"></div>
        </div>
      </Card>

      {/* Boards */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Boards Sincronizados</h2>
        <div className="space-y-4">
          {boards.map((board, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{board.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {board.cards} cards ativos
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Ver Board
                </Button>
              </div>
              <div className="flex gap-2">
                {board.lists.map((list, idx) => (
                  <Badge key={idx} variant="secondary">
                    {list}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 cursor-pointer hover:shadow-lg transition-all">
            <h3 className="font-semibold text-foreground mb-2">Criar Card de Processo</h3>
            <p className="text-sm text-muted-foreground">
              Adicionar novo card no board de processos jurídicos
            </p>
          </Card>
          <Card className="p-6 cursor-pointer hover:shadow-lg transition-all">
            <h3 className="font-semibold text-foreground mb-2">Atualizar Status</h3>
            <p className="text-sm text-muted-foreground">
              Mover cards entre listas automaticamente
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
