import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, ExternalLink, Clock } from "lucide-react";

const upcomingEvents = [
  {
    title: "Audiência - Processo #12345",
    date: "25/01/2025",
    time: "14:00",
    type: "Jurídico",
  },
  {
    title: "Reunião de Planejamento Financeiro",
    date: "26/01/2025",
    time: "10:00",
    type: "Financeiro",
  },
  {
    title: "Prazo: Entrega de Relatório",
    date: "28/01/2025",
    time: "17:00",
    type: "Administrativo",
  },
];

export default function CalendarIntegration() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Integração Agenda</h1>
          <p className="text-muted-foreground">
            Sincronização com Outlook Calendar
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Evento
          </Button>
          <Button className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Abrir Outlook
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-purple flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Status da Conexão</h3>
            <p className="text-sm text-muted-foreground">Sincronizado com Outlook</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-ai-green animate-pulse"></div>
        </div>
      </Card>

      {/* Calendar View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Calendário</h2>
          <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Visualização do calendário será carregada aqui
              </p>
            </div>
          </div>
        </Card>

        {/* Upcoming Events */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Próximos Eventos</h2>
          <div className="space-y-4">
            {upcomingEvents.map((event, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-muted border border-border"
              >
                <h4 className="font-medium text-foreground mb-2">{event.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Clock className="w-4 h-4" />
                  <span>{event.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 cursor-pointer hover:shadow-lg transition-all">
            <h3 className="font-semibold text-foreground mb-2">Agendar Audiência</h3>
            <p className="text-sm text-muted-foreground">
              Criar evento vinculado a processo
            </p>
          </Card>
          <Card className="p-6 cursor-pointer hover:shadow-lg transition-all">
            <h3 className="font-semibold text-foreground mb-2">Marcar Reunião</h3>
            <p className="text-sm text-muted-foreground">
              Agendar reunião com cliente
            </p>
          </Card>
          <Card className="p-6 cursor-pointer hover:shadow-lg transition-all">
            <h3 className="font-semibold text-foreground mb-2">Definir Prazo</h3>
            <p className="text-sm text-muted-foreground">
              Criar lembrete de deadline
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
