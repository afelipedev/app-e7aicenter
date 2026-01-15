import React from "react";
import {
  FileText,
  Scale,
  Search,
  Edit,
  Target,
  BookOpen,
  MessageSquare,
  Gavel,
  TrendingUp,
  FileCheck,
  Briefcase,
} from "lucide-react";

export type AgentTheme =
  | "criacao-pecas-juridicas"
  | "revisao-pecas-juridicas"
  | "extracao-dados"
  | "revisao-melhoria-textos"
  | "estrategia-caso"
  | "jurisprudencia"
  | "atendimento-comunicacao-cliente"
  | "audiencia-julgamento"
  | "marketing-juridico-vendas"
  | "contratos"
  | "areas-direito";

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  theme: AgentTheme;
  webhookUrl: string;
  icon?: string;
}

export interface ThemeInfo {
  id: AgentTheme;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const AGENT_THEMES: Record<AgentTheme, ThemeInfo> = {
  "criacao-pecas-juridicas": {
    id: "criacao-pecas-juridicas",
    name: "Criação de Peças Jurídicas",
    icon: FileText,
  },
  "revisao-pecas-juridicas": {
    id: "revisao-pecas-juridicas",
    name: "Revisão de Peças Jurídicas",
    icon: Edit,
  },
  "extracao-dados": {
    id: "extracao-dados",
    name: "Extração de Dados",
    icon: Search,
  },
  "revisao-melhoria-textos": {
    id: "revisao-melhoria-textos",
    name: "Revisão e Melhoria de Textos e Documentos",
    icon: Edit,
  },
  "estrategia-caso": {
    id: "estrategia-caso",
    name: "Estratégia do Caso",
    icon: Target,
  },
  "jurisprudencia": {
    id: "jurisprudencia",
    name: "Jurisprudência",
    icon: BookOpen,
  },
  "atendimento-comunicacao-cliente": {
    id: "atendimento-comunicacao-cliente",
    name: "Atendimento e Comunicação com o Cliente",
    icon: MessageSquare,
  },
  "audiencia-julgamento": {
    id: "audiencia-julgamento",
    name: "Audiência e Julgamento",
    icon: Gavel,
  },
  "marketing-juridico-vendas": {
    id: "marketing-juridico-vendas",
    name: "Marketing Jurídico e Vendas",
    icon: TrendingUp,
  },
  contratos: {
    id: "contratos",
    name: "Contratos",
    icon: FileCheck,
  },
  "areas-direito": {
    id: "areas-direito",
    name: "Áreas do Direito",
    icon: Briefcase,
  },
};

const N8N_BASE_URL = "https://n8n-lab-n8n.bjivvx.easypanel.host/webhook";

export const AI_AGENTS: AIAgent[] = [
  // Tema: Criação de Peças Jurídicas
  {
    id: "minuta-peticao-inicial",
    name: "Minuta de uma petição inicial",
    description:
      "Quando inserir os dados necessários, o assistente irá propor uma minuta de petição inicial",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/minuta-peticao-inicial`,
  },
  {
    id: "assistente-peticionamento",
    name: "Assistente de peticionamento",
    description:
      "Quando inserir texto ou arquivo de um documento que contenha os fatos do caso e a tese de defesa propostos, receberá uma contestação sugerida pelo assistente",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/assistente-peticionamento`,
  },
  {
    id: "peticao-inicial-neurociencia-persuasao",
    name: "Petição inicial com neurociência da persuasão",
    description:
      "Construir uma petição avançada com técnicas de neurociência da persuasão",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/peticao-inicial-neurociencia-persuasao`,
  },
  {
    id: "apelacao",
    name: "Apelação",
    description:
      "Após inserir informações relevantes o assistente irá propor uma minuta de apelação",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/apelacao`,
  },
  {
    id: "contestacao-persuasiva",
    name: "Contestação persuasiva",
    description:
      "Construir uma contestação analítica, persuasiva e otimizada para assegurar a atenção de magistrados, juízes e assessores",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/contestacao-persuasiva`,
  },
  {
    id: "fundamentacao-juridica",
    name: "Fundamentação Jurídica",
    description:
      "Informe o tipo da petição, os detalhes do caso e o objetivo da ação. O assistente irá propor a minuta da fundamentação jurídica, com as legislações relacionadas, os princípios da lei, as doutrinas, e os artigos relacionados.",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/fundamentacao-juridica`,
  },
  {
    id: "elaborar-notificacao-extrajudicial",
    name: "Elaborar uma Notificação Extrajudicial",
    description:
      "Ao colar ou anexar o texto com os detalhes dos fatos e pedidos, o assistente irá criar uma notificação detalhada e organizada.",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/elaborar-notificacao-extrajudicial`,
  },
  {
    id: "criacao-recurso-juridico",
    name: "Criação de um recurso jurídico",
    description: "O assistente irá criar a minuta de um recurso jurídico robusto",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/criacao-recurso-juridico`,
  },
  {
    id: "replica",
    name: "Réplica",
    description:
      "Impugnação a contestação, ao inserir documentos ou descrever o resumo dos fatos do processo, o resumo dos argumentos da contestação, os pedidos da Petição Inicial e alguma outra informação que juntar importante",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/replica`,
  },
  {
    id: "elaboracao-contranotificacao",
    name: "Elaboração de Contranotificação",
    description:
      "Ao anexar ou colar notificação original, o assistente criará uma contranotificação extrajudicial robusta, detalhada e organizada.",
    theme: "criacao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/elaboracao-contranotificacao`,
  },

  // Tema: Revisão de Peças Jurídicas
  {
    id: "sugestao-melhorias-pecas-processuais",
    name: "Sugestão de melhorias de peças processuais",
    description:
      "Ao inserir a peça processual, o assistente irá revisar e sugerir melhorias relacionadas a aspectos formais, substanciais, estratégia jurídica adotada, a clareza argumentativa, aderência a normas processuais.",
    theme: "revisao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/sugestao-melhorias-pecas-processuais`,
  },
  {
    id: "revisar-sugerir-melhorias-peticao",
    name: "Revisar e sugerir melhorias na petição",
    description:
      "Ao inserir a petição, o assistente irá analisar e fornecer sugestões de melhoria tanto ortográficas quanto jurídicas, com foco em identificar contradições, lacunas, interpretações equivocadas e erros gramaticais ou de concordância",
    theme: "revisao-pecas-juridicas",
    webhookUrl: `${N8N_BASE_URL}/revisar-sugerir-melhorias-peticao`,
  },

  // Tema: Extração de Dados
  {
    id: "extracao-dados-resumo-processo-juridico",
    name: "Extração de dados e resumo de processo jurídico",
    description:
      "Ao anexar o documento do processo, o assistente irá extrair dados e gerar um resumo do processo com detalhes críticos, incluindo número do processo, partes envolvidas, valores financeiros, decisões preliminares, argumentos de defesa, veredito, bases legais e penalidades",
    theme: "extracao-dados",
    webhookUrl: `${N8N_BASE_URL}/extracao-dados-resumo-processo-juridico`,
  },
  {
    id: "descobrir-emocoes-padroes-ocultos-texto",
    name: "Descobrir emoções e padrões ocultos no texto",
    description:
      "Ao inserir o texto, o assistente irá fornecer uma análise detalhada, emocional, listando preconceitos latentes e padrões ocultos do autor e sugerir implicações legais relacionadas.",
    theme: "extracao-dados",
    webhookUrl: `${N8N_BASE_URL}/descobrir-emocoes-padroes-ocultos-texto`,
  },

  // Tema: Revisão e Melhoria de Textos e Documentos
  {
    id: "legal-design",
    name: "Legal Design",
    description:
      "Ao escrever, colar ou anexar um texto, o assistente irá gerar uma minuta reestruturada, aplicando os princípios de Legal Design e Visual Law.",
    theme: "revisao-melhoria-textos",
    webhookUrl: `${N8N_BASE_URL}/legal-design`,
  },
  {
    id: "revisor-assistente-escrita-juridica",
    name: "Revisor e Assistente de escrita jurídica",
    description:
      "O assistente fará revisão e melhoria da escrita jurídica, focando em pontuação, precisão semântica, coerência e fluência do texto",
    theme: "revisao-melhoria-textos",
    webhookUrl: `${N8N_BASE_URL}/revisor-assistente-escrita-juridica`,
  },
  {
    id: "aprimoramento-retorico",
    name: "Aprimoramento Retórico",
    description:
      "O assistente irá melhorar o apelo persuasivo do seu texto, refinando sua retórica e argumentação legal",
    theme: "revisao-melhoria-textos",
    webhookUrl: `${N8N_BASE_URL}/aprimoramento-retorico`,
  },
  {
    id: "reescrever-clausula-juridica",
    name: "Reescrever cláusula jurídica",
    description:
      "Irá reescrevê-la para torná-la mais robusta e clara do ponto de vista jurídico",
    theme: "revisao-melhoria-textos",
    webhookUrl: `${N8N_BASE_URL}/reescrever-clausula-juridica`,
  },
  {
    id: "simplificar-o-juridiques",
    name: "Simplificar o Juridiquês",
    description:
      "O assistente irá explicar e traduzir para não advogados de uma forma clara e simples",
    theme: "revisao-melhoria-textos",
    webhookUrl: `${N8N_BASE_URL}/simplificar-o-juridiques`,
  },

  // Tema: Estratégia do Caso
  {
    id: "pesquisa-doutrinas-legislacao-codigos",
    name: "Pesquisa de Doutrinas, legislação, códigos",
    description:
      "O assistente irá sugerir doutrinas, legislação, códigos jurídicos, jurisprudência e outras referências relevantes relacionadas",
    theme: "estrategia-caso",
    webhookUrl: `${N8N_BASE_URL}/pesquisa-doutrinas-legislacao-codigos`,
  },
  {
    id: "analisar-estrategias-riscos-resultados",
    name: "Analisar estratégias, riscos e resultados",
    description:
      "Analisar estratégia proposta, as provas e narrativa dos fatos quando informados e com base nas informações, identificar os riscos dessa estratégia e os possíveis resultados",
    theme: "estrategia-caso",
    webhookUrl: `${N8N_BASE_URL}/analisar-estrategias-riscos-resultados`,
  },
  {
    id: "refutar-ou-confirmar-tese",
    name: "Refutar ou confirmar tese",
    description:
      "Realizar um estudo aprofundado do texto fornecido e gerar insights relevantes que possam refutar ou confirmar a tese apresentada",
    theme: "estrategia-caso",
    webhookUrl: `${N8N_BASE_URL}/refutar-ou-confirmar-tese`,
  },
  {
    id: "parecer-juridico",
    name: "Parecer Jurídico",
    description:
      "Sugerir as obrigações e direitos, legislação aplicável, e fornecer uma sugestão sobre as possíveis ações a serem tomadas pelas partes.",
    theme: "estrategia-caso",
    webhookUrl: `${N8N_BASE_URL}/parecer-juridico`,
  },
  {
    id: "gerar-3-estrategias-caso",
    name: "Gerar 3 estratégias para o caso",
    description:
      "Com base na narrativa dos fatos e as provas, o assistente irá propor 3 possíveis estratégias para o caso",
    theme: "estrategia-caso",
    webhookUrl: `${N8N_BASE_URL}/gerar-3-estrategias-caso`,
  },
  {
    id: "identificar-subsidios-outros-documentos",
    name: "Identificar subsídios e outros documentos",
    description:
      "Irá sugerir os subsídios, documentos e provas relevantes",
    theme: "estrategia-caso",
    webhookUrl: `${N8N_BASE_URL}/identificar-subsidios-outros-documentos`,
  },

  // Tema: Jurisprudência
  {
    id: "jurisprudencia",
    name: "Jurisprudência",
    description:
      "Ao inserir o tema da jurisprudência, o assistente irá procurar ementas e artigos nos principais sites de tribunais e outras bases de jurisprudência, diretamente nos sites oficiais do STJ, STF, LexML, Jusbrasil, Dizer o Direito, Migalhas e ConJur, e trará as ementas mais recentes com os links oficiais",
    theme: "jurisprudencia",
    webhookUrl: `${N8N_BASE_URL}/jurisprudencia`,
  },

  // Tema: Atendimento e Comunicação com o Cliente
  {
    id: "perguntas-crie-perguntas-cliente",
    name: "Perguntas, Crie perguntas ao cliente",
    description:
      "O assistente sugerirá perguntas a serem feitas ao seu cliente com base nas informações inseridas ou anexadas",
    theme: "atendimento-comunicacao-cliente",
    webhookUrl: `${N8N_BASE_URL}/perguntas-crie-perguntas-cliente`,
  },
  {
    id: "elaborar-roteiro-consulta",
    name: "Elaborar um roteiro para a consulta",
    description:
      "O assistente irá criar um roteiro contextual para uma consulta inicial com o cliente de forma organizada e eficiente",
    theme: "atendimento-comunicacao-cliente",
    webhookUrl: `${N8N_BASE_URL}/elaborar-roteiro-consulta`,
  },

  // Tema: Audiência e Julgamento
  {
    id: "elaboracao-quesitos-pericia-judicial",
    name: "Elaboração de quesitos para perícia judicial",
    description:
      "Irá gerar uma lista de quesitos, principais pontos a serem esclarecidos, indicação de qual perito seria o mais aplicável e os objetivos inferidos da perícia",
    theme: "audiencia-julgamento",
    webhookUrl: `${N8N_BASE_URL}/elaboracao-quesitos-pericia-judicial`,
  },
  {
    id: "elaboracao-roteiro-sustentacao-oral",
    name: "Elaboração de roteiro para sustentação oral",
    description:
      "O assistente fará um roteiro estruturado da sua sustentação oral, incluindo perguntas que potencialmente podem ser feitas e suas respostas sugeridas, com base nos fatos, evidências e leis aplicáveis e precedentes informados.",
    theme: "audiencia-julgamento",
    webhookUrl: `${N8N_BASE_URL}/elaboracao-roteiro-sustentacao-oral`,
  },
  {
    id: "criador-perguntas-audiencia",
    name: "Criador de perguntas para audiência",
    description:
      "Irá gerar perguntas estratégicas para a audiência, visando tanto a parte reclamante quanto a reclamada",
    theme: "audiencia-julgamento",
    webhookUrl: `${N8N_BASE_URL}/criador-perguntas-audiencia`,
  },
  {
    id: "roteiro-estrategia-audiencia",
    name: "Roteiro e estratégia para audiência",
    description:
      "O assistente fará sugestões da estratégia e roteiro detalhado após receber informações do ramo do direito da audiência em questão, para qual audiência será feito o roteiro",
    theme: "audiencia-julgamento",
    webhookUrl: `${N8N_BASE_URL}/roteiro-estrategia-audiencia`,
  },
  {
    id: "analisador-contradicoes-depoimentos",
    name: "Analisador de contradições em depoimentos",
    description:
      "Assistente especializado em analisar profundamente as contradições em depoimentos de testemunhas em processos judiciais e criminais. Para ser utilizado por advogados e profissionais do Direito.",
    theme: "audiencia-julgamento",
    webhookUrl: `${N8N_BASE_URL}/analisador-contradicoes-depoimentos`,
  },

  // Tema: Marketing Jurídico e Vendas
  {
    id: "criador-imagens-juridicas",
    name: "Criador de imagens jurídicas",
    description:
      "Cria imagens realistas e detalhadas para redes sociais, com opções de edição executáveis em um único comando",
    theme: "marketing-juridico-vendas",
    webhookUrl: `${N8N_BASE_URL}/criador-imagens-juridicas`,
  },
  {
    id: "calendario-conteudo-marketing-juridico",
    name: "Calendário de conteúdo marketing jurídico",
    description:
      "Ao escrever o tema e a rede social, o assistente criará um calendário de conteúdo de 7 dias personalizado para suas redes sociais.",
    theme: "marketing-juridico-vendas",
    webhookUrl: `${N8N_BASE_URL}/calendario-conteudo-marketing-juridico`,
  },
  {
    id: "criador-texto-redes-sociais",
    name: "Criador de texto para redes sociais",
    description:
      "Ao escrever o tema e o tipo de texto desejado (blog, Instagram, LinkedIn), o assistente criará um conteúdo personalizado, utilizando técnicas de marketing jurídico.",
    theme: "marketing-juridico-vendas",
    webhookUrl: `${N8N_BASE_URL}/criador-texto-redes-sociais`,
  },
  {
    id: "orador-criador-discurso-palestra",
    name: "Orador - Criador de discurso ou palestra",
    description:
      "O assistente criará o texto de um discurso ou palestra com base nas melhores práticas de oratória",
    theme: "marketing-juridico-vendas",
    webhookUrl: `${N8N_BASE_URL}/orador-criador-discurso-palestra`,
  },
  {
    id: "proposta-comercial-servicos-juridicos",
    name: "Proposta comercial de serviços jurídicos",
    description:
      "Com base no contexto, o assistente irá criar uma proposta comercial para seu cliente com um copywriting persuasivo, elegante, quebrando possíveis objeções",
    theme: "marketing-juridico-vendas",
    webhookUrl: `${N8N_BASE_URL}/proposta-comercial-servicos-juridicos`,
  },

  // Tema: Contratos
  {
    id: "contrato-avaliacao-riscos-clausulas",
    name: "Contrato - Avaliação de riscos e cláusulas",
    description:
      "Irá sumarizar o contrato, avaliar e identificar riscos e analisar as cláusulas",
    theme: "contratos",
    webhookUrl: `${N8N_BASE_URL}/contrato-avaliacao-riscos-clausulas`,
  },
  {
    id: "criacao-minuta-contrato",
    name: "Criação de minuta de contrato",
    description:
      "O assistente irá propor uma minuta de contrato com base no que foi inserido ou anexado, através das informações mínimas necessárias para a minuta, como partes envolvidas, objeto do contrato, termos e condições e cláusulas específicas.",
    theme: "contratos",
    webhookUrl: `${N8N_BASE_URL}/criacao-minuta-contrato`,
  },
  {
    id: "elaboracao-manual-contrato",
    name: "Elaboração de manual de contrato",
    description:
      "O assistente irá criar manual do contrato explicando as cláusulas em linguagem de fácil entendimento",
    theme: "contratos",
    webhookUrl: `${N8N_BASE_URL}/elaboracao-manual-contrato`,
  },
  {
    id: "analise-contratual-parecer",
    name: "Análise contratual com parecer",
    description:
      "O assistente identificará as cláusulas controversas e arriscadas do ponto de vista da parte já identificada e cria um resumo e relatório detalhado",
    theme: "contratos",
    webhookUrl: `${N8N_BASE_URL}/analise-contratual-parecer`,
  },

  // Tema: Áreas do Direito
  {
    id: "tributario",
    name: "Tributário",
    description: "Especialista em impostos, ICMS, IR, etc.",
    theme: "areas-direito",
    webhookUrl: `${N8N_BASE_URL}/tributario`,
  },
  {
    id: "civil",
    name: "Cível",
    description: "Especialista em contratos, família, sucessões",
    theme: "areas-direito",
    webhookUrl: `${N8N_BASE_URL}/civil`,
  },
  {
    id: "financeiro",
    name: "Financeiro",
    description: "Especialista em NF, SPED, PIS, COFINS",
    theme: "areas-direito",
    webhookUrl: `${N8N_BASE_URL}/financeiro`,
  },
  {
    id: "contabil",
    name: "Contábil",
    description: "Especialista em holerites, folha, eSocial",
    theme: "areas-direito",
    webhookUrl: `${N8N_BASE_URL}/contabil`,
  },
  {
    id: "direito-digital-matriz-risco-privacidade",
    name: "Direito Digital - Elaboração de matriz de risco de privacidade e proteção de dados",
    description:
      "O assistente irá analisar o material coletado em auditoria e cria a matriz de risco identificando a probabilidade e impacto.",
    theme: "areas-direito",
    webhookUrl: `${N8N_BASE_URL}/direito-digital-matriz-risco-privacidade`,
  },
  {
    id: "direito-digital-politica-privacidade-dados",
    name: "Direito Digital - Criação da política de privacidade de dados",
    description:
      "Irá criar uma política de privacidade completa, com linguagem clara para que os usuários compreendam facilmente",
    theme: "areas-direito",
    webhookUrl: `${N8N_BASE_URL}/direito-digital-politica-privacidade-dados`,
  },
  {
    id: "direito-digital-termo-confidencialidade",
    name: "Direito Digital - Criação de termo de confidencialidade",
    description:
      "Irá criar um termo de confidencialidade robusto e que se ampare na lei de proteção de dados pessoais do Brasil (LGPD), no código civil e no código de processo civil.",
    theme: "areas-direito",
    webhookUrl: `${N8N_BASE_URL}/direito-digital-termo-confidencialidade`,
  },
  {
    id: "compliance-elaboracao-codigo-conduta",
    name: "Compliance - Elaboração do código de conduta",
    description:
      "Irá sugerir uma minuta de um código de conduta organizado, robusto e com uma linguagem consultiva, didática e de fácil entendimento.",
    theme: "areas-direito",
    webhookUrl: `${N8N_BASE_URL}/compliance-elaboracao-codigo-conduta`,
  },
];

/**
 * Obtém todos os agentes de um tema específico
 */
export function getAgentsByTheme(theme: AgentTheme): AIAgent[] {
  return AI_AGENTS.filter((agent) => agent.theme === theme);
}

/**
 * Obtém um agente por ID
 */
export function getAgentById(agentId: string): AIAgent | undefined {
  return AI_AGENTS.find((agent) => agent.id === agentId);
}

/**
 * Obtém informações de um tema
 */
export function getThemeInfo(theme: AgentTheme): ThemeInfo {
  return AGENT_THEMES[theme];
}

/**
 * Obtém a contagem de agentes por tema
 */
export function getAgentCountByTheme(theme: AgentTheme): number {
  return getAgentsByTheme(theme).length;
}
