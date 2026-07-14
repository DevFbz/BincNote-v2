# BincNote — Relatório de SLA no ChatIA + Correção do Sistema de Tag Ambiente

> Documento gerado para ser consumido por uma CLI de codificação (ex: Claude Code). Contém (1) um prompt refinado, resumido e direto, e (2) um PRD técnico detalhado com escopo, modelo de dados, critérios de aceite e plano de execução em fases.

---

## 1. Prompt Refinado

```
Contexto:
Estou trabalhando no BincNote, um app de produtividade estilo Notion (páginas,
blocos, databases, templates). Um dos templates de página é o "Kanban", usado
para gestão de chamados/tarefas. Cada card do Kanban representa um chamado e
possui (ou deve possuir) os seguintes campos de data:
- Data Abertura: quando o solicitante abriu o chamado
- Data Início: quando o analista começou a atender o chamado
- Data Término: quando o chamado foi concluído

O BincNote já tem um ChatIA integrado, com um sistema de "tag ambiente" que
identifica o contexto em que o chat foi aberto (página ou card específico) e
exibe essa tag na interface do chat. A IA de geração de texto/relatórios já
está implementada e integrada ao ChatIA.

Tarefa 1 — Sugestão contextual no ChatIA:
Quando o ChatIA for aberto em qualquer página cujo template seja "Kanban",
uma sugestão de ação rápida "Gerar Relatório SLA" deve aparecer entre as
sugestões padrão do chat. Essa sugestão NÃO deve aparecer em páginas de
outros templates (documento em branco, tabela genérica, calendário etc.),
nem dentro do contexto de um card individual.

Tarefa 2 — Geração do Relatório SLA:
Ao clicar em "Gerar Relatório SLA", o ChatIA deve:
1. Coletar todos os cards da página Kanban atual com os campos Data Abertura,
   Data Início e Data Término preenchidos (tratar cards com campos ausentes
   ou inconsistentes como casos especiais, sem quebrar o relatório).
2. Calcular métricas de SLA por card: tempo de espera (Início - Abertura),
   tempo de atendimento (Término - Início) e tempo total (Término - Abertura).
3. Gerar um relatório interativo contendo:
   - Gráficos (distribuição de tempos, tendência ao longo do tempo, SLA
     dentro/fora do prazo se houver meta configurada)
   - Ranking dos chamados do mais rápido ao mais demorado (tempo total)
   - Sugestões de melhoria geradas pela IA com base nos padrões encontrados
     (gargalos, horários/dias com mais atraso, cards outliers etc.)
4. O relatório deve ser renderizado dentro do próprio ChatIA (ou como anexo/
   artefato navegável), não apenas como texto corrido.

Tarefa 3 — Auditoria e correção do sistema de tag ambiente:
O ChatIA exibe uma "tag ambiente" indicando o contexto atual: tag da página
quando aberto a partir de uma página, tag do card quando aberto a partir de
um card. Preciso que você:
1. Audite a implementação atual desse sistema no código-fonte do BincNote.
2. Identifique falhas e cenários que quebram o comportamento esperado
   (troca de contexto sem fechar o chat, múltiplos cards/modais abertos,
   navegação rápida entre páginas, cards dentro de sub-páginas, card
   deletado com chat ainda aberto, chat aberto sem contexto nenhum, etc.)
3. Proponha e implemente uma correção robusta, com uma fonte única de
   verdade para o "contexto ativo" do chat, que atualize a tag de forma
   confiável em todos esses cenários, sem regressões.

Restrições:
- Não alterar a IA de geração de conteúdo em si (motor de IA já existe);
  meu foco é a orquestração (dados enviados a ela, prompt de geração do
  relatório) e a UI/UX.
- Manter compatibilidade com páginas Kanban já existentes, mesmo que
  tenham cards sem os três campos de data preenchidos.
- Priorizar não quebrar nada do ChatIA que já funciona hoje.

Antes de codificar, investigue a estrutura atual do projeto (como páginas,
templates, cards e o ChatIA estão modelados) e me apresente um plano curto
antes de implementar.
```

---

## 2. PRD — Relatório de SLA no ChatIA + Sistema de Tag Ambiente

### 2.1 Visão Geral

**Produto:** BincNote
**Módulo:** ChatIA (assistente de IA integrado às páginas/cards)
**Iniciativa:** (A) Relatório de SLA gerado por IA para páginas com template Kanban. (B) Correção e robustecimento do sistema de "tag ambiente" do ChatIA.

**Problema a resolver:**
Usuários que usam o Kanban do BincNote para gestão de chamados não têm hoje uma forma rápida de analisar performance de atendimento (SLA) diretamente no contexto da página. Além disso, o sistema que identifica "onde" o ChatIA foi aberto (página vs. card) apresenta comportamento não confiável em determinados cenários, o que compromete a confiança do usuário na ferramenta.

**Objetivo:**
1. Permitir gerar, com um clique, um relatório de SLA completo (visual, com ranking e recomendações) a partir de qualquer página Kanban.
2. Garantir que a tag de ambiente do ChatIA reflita sempre e corretamente o contexto ativo (página ou card), em qualquer cenário de navegação.

---

### 2.2 Personas e Casos de Uso

- **Analista/Gestor de suporte**: quer entender rapidamente quais chamados demoraram mais e por quê, sem exportar dados manualmente.
- **Usuário comum do BincNote**: espera que o ChatIA "saiba onde está" (na página X, no card Y) sem precisar reexplicar o contexto a cada pergunta.

---

### 2.3 Escopo Funcional

#### Feature A — Sugestão "Gerar Relatório SLA" no ChatIA

**Regra de exibição:**
- A sugestão só aparece quando o ChatIA é aberto com contexto = **página**, e o `template` dessa página é `Kanban`.
- Não aparece quando o contexto é um **card** individual (mesmo que o card pertença a uma página Kanban) — a ação faz sentido no nível da página/quadro, não do card.
- Não aparece em páginas com outros templates.
- Deve reavaliar essa condição sempre que o contexto do chat mudar (ver Feature C), sem precisar reabrir o ChatIA manualmente.

**Critérios de aceite:**
- [ ] Abrir o ChatIA em uma página Kanban → sugestão visível.
- [ ] Abrir o ChatIA em uma página de outro template → sugestão ausente.
- [ ] Abrir um card dentro do Kanban e então abrir o ChatIA → sugestão ausente (contexto é o card).
- [ ] Fechar o card, voltar para a página Kanban com o ChatIA ainda aberto → sugestão reaparece automaticamente.

#### Feature B — Geração do Relatório SLA

**Modelo de dados esperado por card (campos obrigatórios para o relatório):**

| Campo | Descrição | Origem |
|---|---|---|
| `data_abertura` | Data/hora em que o solicitante abriu o chamado | Preenchido pelo solicitante |
| `data_inicio` | Data/hora em que o analista começou o atendimento | Preenchido pelo analista |
| `data_termino` | Data/hora em que o chamado foi concluído | Preenchido pelo analista |

**Métricas derivadas (calculadas, não armazenadas manualmente):**
- `tempo_espera` = `data_inicio - data_abertura` (tempo até o atendimento começar)
- `tempo_atendimento` = `data_termino - data_inicio` (tempo de execução)
- `tempo_total` = `data_termino - data_abertura` (SLA total do chamado)

**Tratamento de dados incompletos:**
- Card sem `data_termino` → considerado "em aberto", excluído dos cálculos de tempo, mas contabilizado em uma seção separada ("chamados em andamento").
- Card sem `data_inicio` → `tempo_espera` e `tempo_atendimento` não calculáveis; card entra apenas no `tempo_total` se houver `data_termino`, com uma observação no relatório.
- Card com datas inconsistentes (ex: término antes do início) → excluído do ranking e listado em uma seção de "inconsistências encontradas", nunca deve quebrar a geração do relatório.

**Conteúdo do relatório:**
1. **Resumo executivo** (texto gerado por IA): visão geral do período analisado, quantidade de chamados, SLA médio, principais achados.
2. **Gráficos interativos:**
   - Distribuição de `tempo_total` (histograma).
   - Tendência de SLA ao longo do tempo (linha, por semana/mês conforme volume de dados).
   - Comparativo `tempo_espera` vs `tempo_atendimento` (para identificar se o gargalo é fila ou execução).
   - Se existir meta de SLA configurada na página/workspace: % dentro vs fora do prazo.
3. **Ranking de chamados**: lista ordenável do mais rápido ao mais demorado (por `tempo_total`), com nome do card, responsável (se houver campo), e as três datas.
4. **Sugestões de melhoria** (geradas pela IA já existente, a partir dos dados agregados): ex. horários/dias com mais atraso, responsáveis com maior tempo médio, presença de gargalo na fila vs execução, outliers.
5. **Seções auxiliares**: chamados em andamento (sem término) e inconsistências encontradas.

**Fluxo técnico proposto (alto nível):**
1. Front-end do ChatIA dispara ação "Gerar Relatório SLA" → back-end busca todos os cards da página Kanban atual via API/DB.
2. Camada de agregação calcula as métricas acima em código determinístico (não delegar cálculo de datas à IA — isso deve ser exato).
3. Os dados agregados (não os dados brutos irrelevantes) são enviados como contexto estruturado para a IA já existente, com um prompt de geração específico para produzir o resumo executivo e as sugestões de melhoria.
4. O front-end monta o relatório final combinando: gráficos renderizados a partir dos dados agregados (client-side) + ranking (client-side) + texto gerado pela IA (resumo e sugestões).
5. Relatório é exibido dentro do ChatIA como um bloco/artefato interativo, idealmente também salvável/exportável na página (a definir com o time de produto se faz parte deste escopo ou de uma fase futura).

**Critérios de aceite:**
- [ ] Relatório gerado reflete corretamente os cálculos de tempo para uma página com pelo menos 10 cards de teste com datas variadas.
- [ ] Cards com dados incompletos não quebram a geração e aparecem nas seções apropriadas.
- [ ] Ranking está ordenado corretamente do mais rápido ao mais demorado.
- [ ] Gráficos são interativos (tooltip, zoom ou filtro mínimo por período).
- [ ] Sugestões de melhoria são coerentes com os dados apresentados (não genéricas/desconectadas dos números).
- [ ] Geração funciona com 0 cards válidos (estado vazio tratado, sem erro).

---

#### Feature C — Auditoria e Correção do Sistema de Tag Ambiente

**Comportamento esperado:**
- ChatIA aberto a partir de uma **página** → tag exibida = nome/identificador da página.
- ChatIA aberto a partir de um **card** → tag exibida = identificador do card (e idealmente também indicação da página/quadro pai).
- A tag deve ser a **fonte de verdade do contexto** que a IA usa para responder — ou seja, não é só cosmético: define que dados a IA considera ao responder.

**Passo 1 — Auditoria obrigatória antes de codificar:**
A CLI deve primeiro localizar e documentar:
- Onde o "contexto ativo" do ChatIA é armazenado hoje (estado global, prop, contexto de página, URL, etc.).
- Como a tag é atualizada hoje (listener de navegação, evento de abertura de modal, etc.).
- Se existe uma única fonte de verdade ou se há múltiplos pontos que podem divergir.

**Passo 2 — Cenários de risco a validar e corrigir:**

| # | Cenário | Comportamento esperado |
|---|---|---|
| 1 | Abrir página A → abrir ChatIA → navegar para página B sem fechar o chat | Tag deve atualizar para página B |
| 2 | Abrir card dentro de uma página → ChatIA | Tag deve mostrar o card, não a página |
| 3 | Fechar o card (voltar à página) com ChatIA aberto | Tag deve voltar a refletir a página |
| 4 | Abrir card A → abrir card B (sem fechar A) a partir de outro link/modal | Tag deve refletir o card realmente visível/ativo (B), sem ficar "presa" em A |
| 5 | Abrir ChatIA em um card que pertence a uma sub-página dentro de outra página | Tag deve identificar o card corretamente, sem ambiguidade com a página pai |
| 6 | Card é excluído enquanto o ChatIA (com esse contexto) permanece aberto | Tag deve indicar que o contexto não existe mais / fazer fallback para a página pai, sem travar ou exibir dado obsoleto |
| 7 | Abrir o ChatIA fora de qualquer página/card (ex: tela inicial, se existir) | Tag deve indicar "ambiente geral" ou estado equivalente, nunca ficar vazia/quebrada |
| 8 | Navegação muito rápida entre páginas (troca de contexto antes da resposta anterior da UI terminar) | Tag final deve corresponder ao último contexto real, sem condição de corrida deixando tag desatualizada |
| 9 | Múltiplas abas/instâncias do BincNote abertas simultaneamente em contextos diferentes | Cada instância deve manter sua própria tag de forma independente |
| 10 | Reabrir o ChatIA já minimizado/fechado, em contexto diferente do que ele tinha ao fechar | Tag deve refletir o novo contexto no momento da reabertura, não o antigo |

**Solução técnica proposta (a validar contra o código real):**
- Centralizar o contexto ativo em um único estado (`activeContext`) com forma explícita, por exemplo:
  `{ type: 'page' | 'card', id: string, parentPageId?: string, label: string }`
- Toda mudança de navegação/abertura de card deve passar por um único setter desse estado (evitar múltiplos pontos de mutação direta).
- A tag exibida no ChatIA deve ser puramente derivada desse estado (nunca ter estado próprio duplicado).
- Ao detectar que o `id` referenciado não existe mais (card deletado), aplicar fallback definido (página pai ou "ambiente geral") de forma determinística.
- Adicionar tratamento de debouncing/último-vence para lidar com navegação rápida (cenário 8).

**Critérios de aceite:**
- [ ] Todos os 10 cenários da tabela acima testados manualmente (ou com teste automatizado, se a stack permitir) e aprovados.
- [ ] Nenhuma regressão nas funcionalidades atuais do ChatIA que dependem do contexto (ex: respostas da IA usando dados do card/página certos).
- [ ] Código do contexto ativo centralizado em um único local, documentado.

---

### 2.4 Requisitos Não Funcionais

- **Performance:** geração do relatório SLA não deve travar a UI; para páginas com muitos cards, considerar processamento assíncrono com indicador de carregamento.
- **Resiliência:** nenhuma das duas features deve derrubar o ChatIA em caso de dado ausente/malformado — sempre degradar graciosamente (mostrar aviso, não travar).
- **Consistência de UX:** a tag ambiente deve seguir o padrão visual já existente no ChatIA; a sugestão "Gerar Relatório SLA" deve seguir o padrão das demais sugestões contextuais.
- **Extensibilidade:** o cálculo de métricas de SLA deve ser escrito de forma que outras métricas (ex: SLA por prioridade, por responsável) possam ser adicionadas depois sem refatoração grande.

---

### 2.5 Fora de Escopo (nesta fase)

- Configuração de metas de SLA por workspace (assumir que, se não configurada, o relatório simplesmente não exibe a seção de % dentro/fora do prazo).
- Exportação do relatório em PDF/Excel (pode ser sugerido como próxima fase, não implementar agora).
- Alterações no motor de IA em si (prompt de geração do relatório é escopo, o modelo/infra de IA não é).

---

### 2.6 Plano de Execução Sugerido para a CLI

**Fase 0 — Descoberta (obrigatória antes de qualquer código):**
1. Mapear como templates de página (incluindo "Kanban") são identificados no código.
2. Mapear o modelo de dados de card e confirmar se os campos `data_abertura`, `data_inicio`, `data_termino` já existem ou precisam ser criados.
3. Mapear a implementação atual do ChatIA e do sistema de tag ambiente.
4. Reportar um plano curto antes de iniciar a implementação.

**Fase 1 — Sistema de tag ambiente (Feature C):**
1. Corrigir a fonte única de verdade do contexto ativo.
2. Validar os 10 cenários da tabela.

**Fase 2 — Sugestão contextual (Feature A):**
1. Implementar a condição de exibição da sugestão "Gerar Relatório SLA" baseada no `activeContext` corrigido na Fase 1.

**Fase 3 — Geração do relatório (Feature B):**
1. Implementar coleta e agregação determinística dos dados (backend/lógica de negócio).
2. Implementar renderização dos gráficos e ranking.
3. Integrar com a IA existente para resumo executivo e sugestões de melhoria.
4. Tratar estados vazios/incompletos.

**Fase 4 — Testes e validação final:**
1. Testar os critérios de aceite de todas as features.
2. Testar regressão no ChatIA como um todo.

---

### 2.7 Perguntas em Aberto (a confirmar com o time antes ou durante a implementação)

- Os campos `data_abertura`, `data_inicio` e `data_termino` já existem no modelo de card do BincNote hoje, ou precisam ser criados como propriedades padrão do template Kanban?
- Existe algum conceito de "meta de SLA" configurável hoje no produto, ou isso precisa ser criado do zero (mesmo que fora de escopo, impacta se a seção de % dentro/fora do prazo aparece ou não)?
- O relatório deve poder ser salvo/anexado à página, ou existe apenas dentro da conversa do ChatIA (efêmero)?
- Cards podem ter um campo "responsável"? Isso afeta se o ranking/sugestões podem segmentar por analista.