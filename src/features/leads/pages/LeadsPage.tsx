import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import LeadForm from "../components/LeadForm";
import LeadsTable from "../components/LeadsTable";
import LeadMessagePanel from "../components/LeadMessagePanel";
import E7AgentChat from "../components/E7AgentChat";
import type { LeadType } from "../types";

export default function LeadsPage() {
  const isMobile = useIsMobile();
  const [leadType, setLeadType] = useState<Exclude<LeadType, null>>("cliente");
  const [tab, setTab] = useState<"cadastro" | "lista">("cadastro");
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  const headerSubtitle = useMemo(() => {
    return leadType === "cliente" ? "Clientes" : "Fornecedores";
  }, [leadType]);

  const handleEditLead = (leadId: string) => {
    setEditingLeadId(leadId);
    setTab("cadastro");
  };

  const handleLeadSaved = () => {
    setEditingLeadId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro, mensagens e templates • {headerSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={leadType === "cliente" ? "default" : "outline"}
            onClick={() => setLeadType("cliente")}
          >
            Clientes
          </Button>
          <Button
            variant={leadType === "fornecedor" ? "default" : "outline"}
            onClick={() => setLeadType("fornecedor")}
          >
            Fornecedores
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="cadastro">Formulário</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro">
          <div className={isMobile ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
            <Card className="p-4">
              <LeadForm leadType={leadType} leadId={editingLeadId} onSaved={handleLeadSaved} />
            </Card>

            <div className="space-y-4">
              <Card className="p-4">
                <LeadMessagePanel leadType={leadType} />
              </Card>
              <Separator />
              <Card className="p-4">
                <E7AgentChat />
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lista">
          <Card className="p-4">
            <LeadsTable leadType={leadType} onEditLead={handleEditLead} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

