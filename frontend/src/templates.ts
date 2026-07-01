import type { PresetTemplate } from "./templates.types";

// Re-export type so consumers can import from here
export type { PresetTemplate };

const p = (content: any[]) => ({ type: "doc", content });

// ── helpers ────────────────────────────────────────────────────────────
const hoje = () => new Date().toLocaleDateString("pt-BR");
const txt = (text: string) => [{ type: "text", text }];
const h = (level: 1|2|3, text: string) => ({ type: "heading", attrs: { level }, content: txt(text) });
const par = (text?: string) => ({ type: "paragraph", content: text ? txt(text) : [] });
const bullet = (...items: string[]) => ({
  type: "bulletList",
  content: items.map((t) => ({ type: "listItem", content: [par(t)] })),
});
const task = (items: { text: string; done: boolean }[]) => ({
  type: "taskList",
  content: items.map((i) => ({
    type: "taskItem",
    attrs: { checked: i.done },
    content: [par(i.text)],
  })),
});
const hr = () => ({ type: "horizontalRule" });

// ── Template definitions ───────────────────────────────────────────────

export interface TemplateEntry {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  capa: string;
  /** true → page will be created as `kind: "database"` and BoardView shown */
  isBoard?: boolean;
  /** backend template id for board creation */
  boardTemplateId?: string;
  /** content generator for document templates */
  gerarConteudo?: () => object;
}

const CAPA_BLUE    = "linear-gradient(135deg,#667eea 0%,#764ba2 100%)";
const CAPA_GREEN   = "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)";
const CAPA_ORANGE  = "linear-gradient(135deg,#fa709a 0%,#fee140 100%)";
const CAPA_CYAN    = "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)";
const CAPA_PURPLE  = "linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)";
const CAPA_PEACH   = "linear-gradient(135deg,#fccb90 0%,#e58c88 100%)";
const CAPA_TEAL    = "linear-gradient(135deg,#81eda1 0%,#52c5a8 100%)";
const CAPA_ROSE    = "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)";
const CAPA_SKY     = "linear-gradient(135deg,#89f7fe 0%,#66a6ff 100%)";

export const ALL_TEMPLATES: TemplateEntry[] = [
  // ───── Gestão de Projetos ────────────────────────────────────────────
  {
    id: "kanban-simples",
    nome: "Kanban simples",
    descricao: "A fazer / Fazendo / Feito",
    icone: "📋",
    capa: CAPA_BLUE,
    isBoard: true,
    boardTemplateId: "kanban-tarefas",
  },
  {
    id: "kanban-lecom",
    nome: "Kanban Lecom",
    descricao: "Fluxo: A fazer → Em andamento → Aguardando Testes → Concluído",
    icone: "📋",
    capa: CAPA_PURPLE,
    isBoard: true,
    boardTemplateId: "kanban-projetos",
  },
  {
    id: "sprint-planning",
    nome: "Sprint Planning",
    descricao: "Backlog / Sprint / Em teste / Concluído",
    icone: "🎯",
    capa: CAPA_ORANGE,
    isBoard: true,
    boardTemplateId: "kanban-sprint",
  },
  {
    id: "roadmap",
    nome: "Roadmap de produto",
    descricao: "Visão estratégica do produto",
    icone: "🗺️",
    capa: CAPA_CYAN,
    gerarConteudo: () => p([
      h(1, "Roadmap de produto"),
      par(`Versão: __versao__ · Atualizado em ${hoje()}`),
      hr(),
      h(2, "🎯 Visão do trimestre"),
      par("Objetivo estratégico para os próximos 3 meses…"),
      bullet(
        "Iniciativa 1 — Q1 2026",
        "Iniciativa 2 — Q2 2026",
        "Iniciativa 3 — Q3 2026"
      ),
      hr(),
      h(2, "📅 Timeline"),
      par("Meta Q1 (Jan–Mar)"),
      bullet(
        "MVP da feature X — entregue até Fev",
        "Testes internos — Março",
        "Lançamento para beta — Final de Março"
      ),
      par("Meta Q2 (Abr–Jun)"),
      bullet(
        "Iteração baseada em feedback",
        "Expansão de capacidade",
        "Documentação e onboarding"
      ),
      hr(),
      h(2, "📊 OKRs do trimestre"),
      bullet(
        "KR1: 95% de uptime",
        "KR2: NPS > 40",
        "KR3: 100 novos usuários ativos"
      ),
    ]),
  },
  {
    id: "adr",
    nome: "Registro de decisões (ADR)",
    descricao: "Architecture Decision Records",
    icone: "📝",
    capa: CAPA_TEAL,
    gerarConteudo: () => p([
      h(1, "ADR-001: [Título da decisão]"),
      par(`Data: ${hoje()}`),
      par("Status: 📝 Proposto | ✅ Aceito | ❌ Rejeitado | 🔄 Substituído"),
      hr(),
      h(2, "Contexto"),
      par("Descreva o problema ou oportunidade que motivou esta decisão…"),
      h(2, "Decisão"),
      par("Qual foi a decisão tomada e por quê…"),
      h(2, "Consequências"),
      bullet(
        "Impacto positivo: ...",
        "Impacto negativo: ...",
        "Riscos mitigados: ..."
      ),
      h(2, "Alternativas consideradas"),
      bullet("Alternativa A — prós / contras"),
      bullet("Alternativa B — prós / contras"),
      hr(),
      h(3, "Referências"),
      bullet("Link para documento relacionado"),
      bullet("PR / Issue relacionado"),
    ]),
  },

  // ───── Produtividade Pessoal ────────────────────────────────────────
  {
    id: "checklist-diario",
    nome: "Checklist de tarefas diárias",
    descricao: "Tarefas do dia a dia",
    icone: "☑️",
    capa: CAPA_GREEN,
    gerarConteudo: () => p([
      h(1, `Checklist — ${hoje()}`),
      par("🔥 Prioridades do dia:"),
      task([
        { text: "Tarefa mais importante", done: false },
        { text: "Segunda prioridade", done: false },
        { text: "Terceira prioridade", done: false },
      ]),
      hr(),
      h(2, "📞 Reuniões e calls"),
      task([
        { text: "Daily standup", done: false },
        { text: "Review com equipe", done: false },
      ]),
      hr(),
      h(2, "💻 Tarefas de trabalho"),
      task([
        { text: "Responder e-mails pendentes", done: false },
        { text: "Revisar PRs", done: false },
        { text: "Atualizar documentação", done: false },
      ]),
      hr(),
      h(2, "🏠 Pessoal"),
      task([
        { text: "Exercício", done: false },
        { text: "Leitura (30 min)", done: false },
        { text: "Planejar amanhã", done: false },
      ]),
    ]),
  },
  {
    id: "planner-semanal",
    nome: "Planner semanal",
    descricao: "Organização da semana",
    icone: "📅",
    capa: CAPA_CYAN,
    gerarConteudo: () => p([
      h(1, `Planner Semanal — ${hoje()}`),
      par("🎯 Foco da semana:"),
      par(""),
      h(2, "Segunda-feira"),
      bullet("Manhã: ", "Tarde: ", "Noite: "),
      hr(),
      h(2, "Terça-feira"),
      bullet("Manhã: ", "Tarde: ", "Noite: "),
      hr(),
      h(2, "Quarta-feira"),
      bullet("Manhã: ", "Tarde: ", "Noite: "),
      hr(),
      h(2, "Quinta-feira"),
      bullet("Manhã: ", "Tarde: ", "Noite: "),
      hr(),
      h(2, "Sexta-feira"),
      bullet("Manhã: ", "Tarde: ", "Noite: "),
      hr(),
      h(2, "📌 Metas da semana"),
      task([
        { text: "Meta 1", done: false },
        { text: "Meta 2", done: false },
        { text: "Meta 3", done: false },
      ]),
    ]),
  },
  {
    id: "weekly-review",
    nome: "Revisão semanal",
    descricao: "Weekly Review",
    icone: "🔄",
    capa: CAPA_TEAL,
    gerarConteudo: () => p([
      h(1, `Revisão Semanal — ${hoje()}`),
      hr(),
      h(2, "✅ Realizações da semana"),
      bullet(
        "O que foi concluído?",
        "O que avançou significativamente?",
        "O que saiu melhor que o esperado?"
      ),
      hr(),
      h(2, "⚠️ Desafios e obstáculos"),
      bullet(
        "O que não saiu como planejado?",
        "O que pode ser melhorado?",
        "Bloqueios encontrados"
      ),
      hr(),
      h(2, "🎯 Planejamento da próxima semana"),
      bullet(
        "Prioridade 1:",
        "Prioridade 2:",
        "Prioridade 3:"
      ),
      hr(),
      h(2, "📝 Notas e observações"),
      par(""),
    ]),
  },
  {
    id: "metas-mensais",
    nome: "Metas mensais / OKRs",
    descricao: "Objetivos e resultados-chave",
    icone: "🎯",
    capa: CAPA_ORANGE,
    gerarConteudo: () => p([
      h(1, "Metas Mensais — OKRs"),
      par(`Mês de referência: ${hoje()}`),
      hr(),
      h(2, "🎯 Objetivo 1: [Título]"),
      par("Resultados-chave:"),
      task([
        { text: "KR1: [métrica] — progresso: ▰▰▰▰▰ 50%", done: false },
        { text: "KR2: [métrica] — progresso: ▰▰▰▰▰ 30%", done: false },
        { text: "KR3: [métrica] — progresso: ▰▰▰▰▰ 0%", done: false },
      ]),
      hr(),
      h(2, "🎯 Objetivo 2: [Título]"),
      par("Resultados-chave:"),
      task([
        { text: "KR1: [métrica]", done: false },
        { text: "KR2: [métrica]", done: false },
      ]),
      hr(),
      h(2, "📈 Confiança"),
      bullet(
        "Probabilidade de atingir todos OKRs: ___%",
        "Maior risco identificado:",
        "Plano de mitigação:"
      ),
    ]),
  },

  // ───── Corporativo / Equipes ─────────────────────────────────────────
  {
    id: "ata-reuniao",
    nome: "Ata de reunião",
    descricao: "Registro de discussões e decisões",
    icone: "📄",
    capa: CAPA_BLUE,
    gerarConteudo: () => p([
      h(1, "Ata de Reunião"),
      par(`Data: ${hoje()} · Duração: __h__h__min`),
      hr(),
      h(2, "📋 Informações"),
      bullet(
        "Projeto:",
        "Participantes:",
        "Ausentes:",
        "Local / Link:"
      ),
      hr(),
      h(2, "📌 Pauta"),
      bullet("1. ", "2. ", "3. "),
      h(2, "💬 Discussão"),
      par("Ponto 1: ..."),
      par("Ponto 2: ..."),
      h(2, "✅ Decisões"),
      task([
        { text: "Decisão 1", done: true },
        { text: "Decisão 2", done: true },
      ]),
      hr(),
      h(2, "📋 Ações"),
      task([
        { text: "[Responsável] — Fazer X até [data]", done: false },
        { text: "[Responsável] — Fazer Y até [data]", done: false },
      ]),
    ]),
  },
  {
    id: "pauta-reuniao",
    nome: "Pauta de reunião",
    descricao: "Pauta e atas",
    icone: "🗓️",
    capa: CAPA_PEACH,
    gerarConteudo: () => p([
      h(1, "Pauta de Reunião"),
      par(`Data: ${hoje()}`),
      hr(),
      h(2, "📋 Info"),
      bullet(
        "Projeto:",
        "Participantes esperados:",
        "Duração prevista:"
      ),
      h(2, "🎯 Objetivo"),
      par("..."),
      h(2, "📋 Pauta"),
      task([
        { text: "1. [Tópico] — __min", done: false },
        { text: "2. [Tópico] — __min", done: false },
        { text: "3. [Tópico] — __min", done: false },
      ]),
      h(2, "🧠 Preparação"),
      bullet(
        "Links / docs para ler antes:",
        "Dados para trazer:"
      ),
    ]),
  },
  {
    id: "prd",
    nome: "Documento de requisitos (PRD)",
    descricao: "Product Requirements Document",
    icone: "📋",
    capa: CAPA_CYAN,
    gerarConteudo: () => p([
      h(1, "PRD — [Nome do produto/feature]"),
      par(`Versão: 1.0 · ${hoje()}`),
      hr(),
      h(2, "1. Problema"),
      par("Descreva o problema que estamos resolvendo…"),
      h(2, "2. Público-alvo"),
      bullet("Persona primária:", "Persona secundária:"),
      h(2, "3. Visão geral da solução"),
      par("..."),
      h(2, "4. Requisitos funcionais"),
      task([
        { text: "RF1: [descrição]", done: false },
        { text: "RF2: [descrição]", done: false },
        { text: "RF3: [descrição]", done: false },
      ]),
      h(2, "5. Critérios de sucesso"),
      bullet("Métrica 1:", "Métrica 2:"),
      h(2, "6. Fora de escopo"),
      bullet("O que NÃO será feito nesta versão"),
    ]),
  },
  {
    id: "onboarding",
    nome: "Onboarding de novo colaborador",
    descricao: "Boas-vindas e integração",
    icone: "👋",
    capa: CAPA_GREEN,
    gerarConteudo: () => p([
      h(1, `🎉 Onboarding — [Nome]`),
      par(`Data de início: ${hoje()} · Cargo:`),
      hr(),
      h(2, "📋 Antes do primeiro dia"),
      task([
        { text: "Setup de máquina / e-mail / acesso", done: false },
        { text: "Enviar kit de boas-vindas", done: false },
        { text: "Atribuir mentor/buddy", done: false },
      ]),
      h(2, "📅 Semana 1"),
      bullet(
        "Apresentação para o time",
        "Tour pelo escritório / ferramentas",
        "Leitura de documentos de onboarding",
        "Setup de ambiente de desenvolvimento",
        "Primeira 1:1 com gestor"
      ),
      h(2, "📅 Semana 2–4"),
      bullet(
        "Primeira tarefa real (guidado)",
        "Treinamentos necessários",
        "Conhecer stakeholders",
        "Revisão de 30 dias"
      ),
      h(2, "✅ Checklist de onboarding"),
      task([
        { text: "Acesso ao e-mail configurado", done: false },
        { text: "Acesso ao GitHub/Bitbucket", done: false },
        { text: "Ferramentas de comunicação", done: false },
        { text: "Documentos de política lidos", done: false },
        { text: "Review de 30 dias agendada", done: false },
      ]),
    ]),
  },
  {
    id: "5w2h",
    nome: "Plano de ação (5W2H)",
    descricao: "What, Why, Where, When, Who, How",
    icone: "📌",
    capa: CAPA_BLUE,
    gerarConteudo: () => p([
      h(1, "Plano de Ação — 5W2H"),
      par(`Criado em: ${hoje()}`),
      hr(),
      h(2, "📋 5W2H"),
      par("What — O que será feito?"),
      par(""),
      par("Why — Por que será feito?"),
      par(""),
      par("Where — Onde será feito?"),
      par(""),
      par("When — Quando será feito?"),
      par(""),
      par("Who — Quem fará?"),
      par(""),
      par("How — Como será feito?"),
      par(""),
      hr(),
      h(2, "💰 Quanto custa? (How much)"),
      par("Orçamento estimado: R$ ..."),
      hr(),
      h(2, "✅ Ações"),
      task([
        { text: "Ação 1 — Responsável / Prazo", done: false },
        { text: "Ação 2 — Responsável / Prazo", done: false },
        { text: "Ação 3 — Responsável / Prazo", done: false },
      ]),
    ]),
  },
  {
    id: "status-report",
    nome: "Relatório de status do projeto",
    descricao: "Acompanhamento de projeto",
    icone: "📊",
    capa: CAPA_PURPLE,
    gerarConteudo: () => p([
      h(1, "Relatório de Status"),
      par(`Projeto: · ${hoje()} · Semana __`),
      hr(),
      h(2, "🟢 Status geral"),
      par("🟢 No prazo | 🟡 Em risco | 🔴 Critico"),
      h(2, "✅ Concluído esta semana"),
      bullet("", "", ""),
      h(2, "🔄 Em andamento"),
      bullet("", "", ""),
      h(2, "⏳ Próximos passos"),
      bullet("", "", ""),
      h(2, "🚧 Bloqueios"),
      bullet("", "", ""),
      hr(),
      h(2, "📊 Métricas"),
      par("Burndown: ▰▰▰▰▰▰▰▰▰▰ __%"),
      par("Riscos ativos: __"),
      par("PRs abertos: __"),
      hr(),
      h(2, "📝 Notas"),
      par(""),
    ]),
  },
  {
    id: "raci",
    nome: "Matriz RACI",
    descricao: "Responsabilidades da equipe",
    icone: "📑",
    capa: CAPA_PEACH,
    gerarConteudo: () => p([
      h(1, "Matriz RACI"),
      par(`Projeto: · ${hoje()}`),
      hr(),
      h(2, "Legenda"),
      bullet("R — Responsible (executa)", "A — Accountable (responde)", "C — Consulted (consulta)", "I — Informed (informado)"),
      hr(),
      h(2, "Matriz de Responsabilidades"),
      par("(Use tabela ou tópicos)"),
      h(3, "Atividade 1 — [Nome]"),
      bullet("Fulano: R", "Gerente: A", "Time: C", "Stakeholder: I"),
      h(3, "Atividade 2 — [Nome]"),
      bullet("Fulano: R/A", "Time: C", "Diretoria: I"),
      h(3, "Atividade 3 — [Nome]"),
      bullet("Beltrano: R", "Fulano: A", "Cliente: I"),
      hr(),
      h(2, "Observações"),
      par(""),
    ]),
  },

  // ───── Brainstorm & Estratégia ───────────────────────────────────────
  {
    id: "swot",
    nome: "Análise SWOT",
    descricao: "Forças, Fraquezas, Oportunidades, Ameaças",
    icone: "⚡",
    capa: CAPA_ORANGE,
    gerarConteudo: () => p([
      h(1, "Análise SWOT"),
      par(`Projeto / Produto: · ${hoje()}`),
      hr(),
      h(2, "✅ S — Strengths (Forças)"),
      bullet("", "", ""),
      h(2, "⚠️ W — Weaknesses (Fraquezas)"),
      bullet("", "", ""),
      h(2, "🌱 O — Opportunities (Oportunidades)"),
      bullet("", "", ""),
      h(2, "🚨 T — Threats (Ameaças)"),
      bullet("", "", ""),
      hr(),
      h(2, "📋 Estratégias derivadas"),
      bullet("S+O (Ataque): ", "W+O (Melhoria): ", "S+T (Defesa): ", "W+T (Mitigação): "),
    ]),
  },
  {
    id: "mapa-mental",
    nome: "Mapa mental",
    descricao: "Estrutura de tópicos",
    icone: "🧠",
    capa: CAPA_PURPLE,
    gerarConteudo: () => p([
      h(1, "[Tópico central]"),
      hr(),
      h(2, "🔹 Ramo 1 — [Subtópico]"),
      bullet("Ponto 1", "Ponto 2", "Ponto 3"),
      h(2, "🔹 Ramo 2 — [Subtópico]"),
      bullet("Ponto 1", "Ponto 2"),
      h(3, "Detalhamento"),
      bullet("Subponto A", "Subponto B"),
      h(2, "🔹 Ramo 3 — [Subtópico]"),
      bullet("Ponto 1", "Ponto 2", "Ponto 3"),
    ]),
  },
  {
    id: "visao-produto",
    nome: "Documento de visão do produto",
    descricao: "Product Vision",
    icone: "🎯",
    capa: CAPA_CYAN,
    gerarConteudo: () => p([
      h(1, "Product Vision Document"),
      par(`Produto: · ${hoje()}`),
      hr(),
      h(2, "🎯 Visão"),
      par("Uma frase poderosa que descreve o produto ideal…"),
      h(2, "👤 Público-alvo"),
      bullet("Segmento 1:", "Segmento 2:", "Personas:"),
      h(2, "💡 Problema que resolve"),
      par("Qual dor ou necessidade endereçamos…"),
      h(2, "✨ Diferenciais"),
      bullet("Diferencial 1", "Diferencial 2", "Diferencial 3"),
      h(2, "📏 Escopo"),
      bullet("Inclui:", "Não inclui:"),
      h(2, "📊 Métricas de sucesso"),
      bullet("Métrica 1:", "Métrica 2:"),
    ]),
  },
  {
    id: "ideias",
    nome: "Registro de ideias e hipóteses",
    descricao: "Capture e organize inspirações",
    icone: "💡",
    capa: CAPA_ORANGE,
    gerarConteudo: () => p([
      h(1, "💡 Banco de Ideias"),
      par(`Última atualização: ${hoje()}`),
      hr(),
      h(2, "Ideia 1 — [Título]"),
      par("Descrição:"),
      par("Impacto: 🟢 Médio · Esforço: 🟡 Médio · Status: 💤 Esperando"),
      bullet("Próximo passo:"),
      hr(),
      h(2, "Ideia 2 — [Título]"),
      par("Descrição:"),
      par("Impacto: 🔴 Alto · Esforço: 🔴 Alto · Status: 🔬 Analisando"),
      bullet("Próximo passo:"),
      hr(),
      h(2, "📋 Hipóteses a validar"),
      task([
        { text: "Hipótese 1: [se X então Y]", done: false },
        { text: "Hipótese 2: [se X então Y]", done: false },
      ]),
    ]),
  },

  // ───── Dados & Acompanhamento ────────────────────────────────────────
  {
    id: "metas-table",
    nome: "Tabela de acompanhamento de metas",
    descricao: "Metas e indicadores",
    icone: "📈",
    capa: CAPA_GREEN,
    gerarConteudo: () => p([
      h(1, "Acompanhamento de Metas"),
      par(`${hoje()}`),
      hr(),
      h(2, "📊 Indicadores mensais"),
      par("Meta | Indicador | Meta | Atual | Status"),
      bullet("Meta 1:  ___ / ___  🟢🚩",
            "Meta 2:  ___ / ___  🟢🚩",
            "Meta 3:  ___ / ___  🟢🚩"),
      hr(),
      h(2, "✅ OKRs"),
      task([
        { text: "Objetivo 1 — KR1: __% concluído", done: false },
        { text: "Objetivo 1 — KR2: __% concluído", done: false },
        { text: "Objetivo 2 — KR1: __% concluído", done: false },
      ]),
      hr(),
      h(2, "📝 Análise"),
      par("O que funcionou:"),
      par("O que precisa melhorar:"),
    ]),
  },
  {
    id: "bug-log",
    nome: "Log de bugs / erros",
    descricao: "Registro de incidentes",
    icone: "🐛",
    capa: CAPA_ROSE,
    gerarConteudo: () => p([
      h(1, "🐛 Log de Bugs"),
      par(`Última atualização: ${hoje()}`),
      hr(),
      h(2, "BUG-001 — [Título do bug]"),
      bullet("Severidade: 🔴 Crítico / 🟡 Alto / 🟢 Médio / 🔵 Baixo"),
      bullet("Status: 🔎 Aberto / 🔧 Em análise / ✅ Resolvido"),
      bullet("Ambiente: Produção / Homologação / Dev"),
      bullet("Reportado por: @pessoa"),
      bullet("Passos para reproduzir:"),
      par("Descrição:"),
      hr(),
      h(2, "BUG-002 — [Título do bug]"),
      bullet("Severidade: 🟡 Alto"),
      bullet("Status: 🔧 Em análise"),
      par("Descrição:"),
      hr(),
      h(2, "📊 Resumo"),
      bullet("Total: __ bugs"),
      bullet("Abertos: __ | Em análise: __ | Resolvidos: __"),
    ]),
  },
  {
    id: "inventario",
    nome: "Inventário de recursos",
    descricao: "Recursos e ativos",
    icone: "📦",
    capa: CAPA_TEAL,
    gerarConteudo: () => p([
      h(1, "📦 Inventário de Recursos"),
      par(`Atualizado em: ${hoje()}`),
      hr(),
      h(2, "💻 Equipamentos"),
      bullet("Item 1 — Quantidade: __ — Local:"),
      bullet("Item 2 — Quantidade: __ — Local:"),
      h(2, "🔑 Licenças e acessos"),
      bullet("Serviço 1 — Vencimento: __ — Responsável:"),
      bullet("Serviço 2 — Vencimento: __ — Responsável:"),
      h(2, "📚 Documentação"),
      bullet("Documento 1 — Link:"),
      bullet("Documento 2 — Link:"),
      hr(),
      h(2, "✅ Checklists"),
      task([
        { text: "Revisão mensal agendada", done: false },
        { text: "Backups verificados", done: false },
        { text: "Licenças renovadas", done: false },
      ]),
    ]),
  },
  {
    id: "pipeline-vendas",
    nome: "Pipeline de vendas simples",
    descricao: "Funil de vendas",
    icone: "💰",
    capa: CAPA_GREEN,
    isBoard: true,
    boardTemplateId: "kanban-projetos",
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────

const templateMap = new Map(ALL_TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): TemplateEntry | undefined {
  // lecom-kanban alias → kanban-lecom
  if (id === "kanban" || id === "kanban-lecom") return templateMap.get("kanban-lecom");
  return templateMap.get(id);
}

export function isBoardTemplate(id: string): boolean {
  return templateMap.get(id)?.isBoard ?? false;
}

export function gerarConteudoTemplate(id: string): object | null {
  const tpl = templateMap.get(id);
  if (!tpl?.gerarConteudo) return null;
  return tpl.gerarConteudo();
}

// ── PresetTemplate list for "Comece com um template" grid ──────────────
// Document-level templates shown in the new-page template picker
export const TEMPLATES: PresetTemplate[] = ALL_TEMPLATES
  .filter((t) => t.gerarConteudo)
  .map((t) => ({
    id: t.id,
    nome: t.nome,
    descricao: t.descricao,
    icone: t.icone,
    capa: t.capa,
    conteudo: t.gerarConteudo!(),
  }));

export function preencherTemplate(template: PresetTemplate): object {
  const json = JSON.stringify(template.conteudo).replace(/__data__/g, hoje());
  return JSON.parse(json);
}
