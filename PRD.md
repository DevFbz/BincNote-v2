# BincNote — Correção do Bloco de Notas (Caret + Seleção Multi-Bloco) e Análise Geral do App

> Documento para ser consumido por uma CLI de codificação. Contém (1) prompt refinado, (2) PRD técnico com diagnóstico de causa raiz, comparação de bibliotecas e plano de execução.

---

## 1. Prompt Refinado

```
Contexto:
O BincNote tem um "bloco de notas inteligente" dentro da aba lateral de
cada card. Esse bloco separa o conteúdo em blocos (provavelmente um <p>
ou elemento contentEditable por linha) sempre que o usuário aperta Enter,
no estilo Notion.

Bug 1 — Caret (cursor de inserção) volta para o início ao parar de digitar:
Sempre que paro de digitar, o cursor pula automaticamente para o início do
texto do bloco. Se eu continuar digitando depois disso, o texto novo entra
no lugar errado (no início), fazendo o conteúdo final ficar invertido/fora
de ordem.

Hipótese de causa raiz (validar no código, não assumir): esse é um padrão
clássico de contentEditable/input controlado em React — o componente está
re-renderizando o conteúdo (via re-set de innerHTML, ou re-render do
elemento controlado pelo estado) a cada atualização de estado (ex: a cada
keystroke, ou pelo debounce do auto-save), e ao re-renderizar o DOM,
a posição do cursor (Range/Selection) não é preservada nem restaurada
manualmente — então o navegador reseta a seleção para o início do elemento.

Bug 2 — Não é possível selecionar texto de múltiplas linhas:
Ao arrastar o mouse para selecionar texto que ocupa várias linhas, ou ao
usar Ctrl+A, só é possível selecionar o conteúdo de uma linha por vez.
Isso indica que cada linha é um elemento contentEditable independente
(áreas editáveis separadas), e não um único documento editável com blocos
internos — por isso a seleção nativa do navegador não consegue atravessar
os elementos.

Isso precisa ser corrigido para que:
- Arrastar o mouse selecione texto continuamente através de múltiplos
  blocos/linhas, com destaque visual correto.
- Ctrl+A selecione todo o conteúdo do bloco de notas (todas as linhas/blocos).
- Copiar (Ctrl+C) uma seleção multi-bloco e colar em outro lugar deve
  preservar o texto corretamente (na pior hipótese, como texto puro
  quebrado por linha).

O que preciso que você faça:

1. Diagnosticar a causa raiz de ambos os bugs no código atual do bloco de
   notas (como o componente é estruturado, como o estado é gerenciado,
   como o DOM é atualizado a cada edição).

2. Pesquisar e avaliar bibliotecas de editor de blocos (block-based rich
   text editor) mantidas ativamente e compatíveis com a stack do projeto,
   como possíveis substitutas de uma implementação manual com múltiplos
   contentEditable — considerando que esse tipo de bug (caret pulando,
   seleção presa em um bloco) é exatamente o tipo de problema que editores
   maduros como BlockNote, Lexical, TipTap/ProseMirror ou Plate.js já
   resolveram internamente com um modelo de documento único e um sistema
   de seleção próprio que funciona através de múltiplos blocos.

3. Decidir e justificar tecnicamente uma entre duas abordagens:
   (a) Corrigir a implementação atual manualmente (preservando/restaurando
       o Range da seleção corretamente a cada re-render, e unificando os
       blocos sob uma única área de seleção/gerenciamento de foco); ou
   (b) Migrar o bloco de notas para uma biblioteca madura de editor de
       blocos, mantendo a experiência visual atual (separação por blocos
       ao apertar Enter).
   A decisão deve levar em conta: esforço de migração, compatibilidade
   com o formato de dados já salvo no JSON de persistência do projeto,
   tamanho de bundle, manutenção ativa da biblioteca, e se ela resolve
   os dois bugs de forma nativa.

4. Implementar a solução escolhida, garantindo que:
   - o cursor nunca "pule" de posição durante a digitação normal,
   - seleção de texto funcione de forma contínua entre múltiplos blocos,
   - o conteúdo continue sendo salvo corretamente no JSON de persistência
     (não regredir a correção de auto-save feita anteriormente),
   - a divisão em blocos ao apertar Enter continue funcionando como hoje.

5. Validar os seguintes cenários após a correção:
   - Digitar um texto longo continuamente sem pausas → cursor nunca sai
     do lugar certo.
   - Digitar, parar, digitar de novo várias vezes → texto permanece na
     ordem certa, cursor sempre no ponto onde parou.
   - Criar 5+ blocos (linhas) de texto → arrastar o mouse do início do
     primeiro bloco até o fim do último → toda a seleção deve ficar
     destacada.
   - Ctrl+A dentro do bloco de notas → tudo selecionado.
   - Copiar seleção multi-bloco e colar em outro editor de texto (ex:
     bloco de notas do sistema) → conteúdo textual preservado, em ordem.
   - Fechar e reabrir a aba do card → conteúdo permanece salvo e correto
     (sem regressão do bug de persistência já corrigido).

6. Depois de concluir a correção, analisar o restante do código-fonte do
   BincNote (além do bloco de notas) e me dar uma lista de sugestões de
   melhoria priorizadas — de performance, UX, arquitetura, robustez de
   dados, ou qualquer risco/dívida técnica identificado durante a análise.

Bug/Regressão adicional — Toolbar flutuante de seleção de texto:
Anteriormente, ao selecionar qualquer palavra ou trecho de texto dentro do
bloco de notas, aparecia uma janela/barra flutuante com opções rápidas de
formatação (ex: negrito, itálico, etc.) próxima à seleção. Essa toolbar foi
removida em algum momento e precisa voltar — mas com melhorias no
funcionamento, não apenas restaurada como estava.

Referência visual: anexei um print do Notion mostrando o comportamento
esperado de seleção — nele, o texto selecionado atravessa vários blocos
diferentes (múltiplos itens de lista com marcadores e um título de etapa
em negrito), e mesmo assim a seleção fica destacada de forma contínua por
todos os blocos, sem quebrar em cada bloco individual. Esse é o mesmo
comportamento exigido no Bug 2 acima (seleção multi-bloco) — a toolbar
flutuante deve funcionar corretamente também nesse cenário de seleção que
atravessa múltiplos blocos, aparecendo uma única vez para a seleção
inteira (não uma vez por bloco, não duplicada, não quebrada).

O que preciso que você faça sobre a toolbar:
1. Investigar no histórico do código (git log/blame no componente do bloco
   de notas) por que e quando essa toolbar foi removida, para entender se
   havia um motivo técnico (bug, conflito com outra funcionalidade) antes
   de simplesmente trazer o mesmo código de volta.
2. Reimplementar a toolbar flutuante, corrigindo os problemas que
   provavelmente existiam antes (ou que vão aparecer com a correção do
   Bug 2), garantindo:
   - Aparecer somente quando existe uma seleção real de texto (range com
     conteúdo), nunca ao simplesmente posicionar o cursor sem selecionar.
   - Posicionar-se corretamente próxima à seleção (acima, centralizada em
     relação à área selecionada), inclusive quando a seleção começa em um
     bloco e termina em outro.
   - Continuar funcionando (reposicionar ou fechar corretamente) durante
     scroll, resize da janela, ou se a seleção for alterada com o mouse
     ainda pressionado.
   - Fechar automaticamente ao clicar fora, apertar Esc, ou perder a
     seleção.
   - Não duplicar/piscar quando a seleção atravessa múltiplos blocos.
   - Aplicar a formatação escolhida corretamente em toda a extensão da
     seleção, mesmo quando ela cobre múltiplos blocos.
3. Validar o comportamento com os seguintes cenários:
   - Selecionar uma palavra dentro de um único bloco → toolbar aparece
     corretamente posicionada.
   - Selecionar texto que atravessa 2+ blocos → toolbar aparece uma única
     vez, na posição correta, e a formatação aplicada afeta toda a seleção.
   - Clicar fora da seleção → toolbar desaparece.
   - Rolar a página com a seleção ativa → toolbar acompanha ou desaparece
     de forma limpa (sem ficar "flutuando" em posição errada).
   - Refazer a seleção repetidamente (selecionar, desselecionar, selecionar
     de novo) → toolbar nunca duplica nem trava na tela.

Restrições:
- Não perder nenhum dado já salvo dos usuários ao migrar formato, se a
  opção de migração de biblioteca for escolhida (escrever um passo de
  migração/conversão dos dados existentes, se necessário).
- Antes de implementar, apresente um diagnóstico curto da causa raiz de
  cada bug e a decisão justificada entre corrigir manualmente ou migrar
  de biblioteca, para eu validar antes de você codificar.
```

---

## 2. PRD — Correção do Bloco de Notas + Recomendações Gerais

### 2.1 Visão Geral

**Componente afetado:** Bloco de notas inteligente da aba lateral do card (editor com separação em blocos ao apertar Enter).

**Problema:** Dois bugs críticos de edição de texto tornam o bloco de notas praticamente inutilizável para textos com mais de uma linha:
1. O cursor de digitação salta para o início do texto sempre que o usuário para de digitar, fazendo com que o próximo texto digitado seja inserido na posição errada.
2. A seleção de texto (arrastar mouse ou Ctrl+A) fica restrita a um único bloco/linha, impedindo copiar, apagar ou formatar múltiplas linhas de uma vez.

**Severidade:** Alta — afeta a usabilidade básica de uma funcionalidade central do produto.

---

### 2.2 Diagnóstico Técnico (hipóteses a validar no código real)

#### Bug 1 — Caret retornando ao início

Causa mais provável em editores baseados em `contentEditable` controlados por estado React (ou equivalente):
- A cada atualização do texto (keystroke, debounce de auto-save, etc.), o componente re-renderiza o conteúdo do elemento editável a partir do estado (ex: `element.innerText = state.text` ou re-render de um componente controlado).
- O navegador não sabe automaticamente "onde" o cursor deveria voltar depois dessa atualização do DOM — sem uma restauração manual do `Range`/`Selection`, ele volta para o início do elemento (comportamento padrão do DOM ao reescrever conteúdo).
- Esse é um problema conhecido e extremamente comum em implementações caseiras de `contentEditable` com React, e é uma das principais razões pelas quais bibliotecas de editor maduras existem — elas gerenciam a seleção internamente em vez de depender do comportamento padrão do navegador.

**O que a CLI deve confirmar no código:**
- Onde o valor do bloco é atualizado (on `input`/`keyup`) e se há alguma escrita de volta no DOM (`innerHTML`/`innerText`/re-render de um valor controlado) nesse fluxo.
- Se existe qualquer lógica de salvar/restaurar `window.getSelection()` / `Range` ao redor dessas atualizações (provavelmente não existe — daí o bug).

#### Bug 2 — Seleção presa em um único bloco

Causa mais provável:
- Cada "linha" criada ao apertar Enter é implementada como um elemento `contentEditable` **independente** (múltiplas áreas editáveis separadas no DOM), em vez de um único container editável contendo múltiplos blocos internos.
- Seleção nativa do navegador (`Selection`/`Range`) não atravessa limites entre elementos com `contentEditable` habilitado separadamente da forma esperada — o foco/seleção fica contido dentro do elemento focado.

**O que a CLI deve confirmar no código:**
- Se existem múltiplos elementos com `contentEditable="true"` (um por linha/bloco) ou um único elemento pai editável com blocos internos.
- Como o Enter é tratado hoje (criação de um novo elemento independente vs. inserção de um novo nó-bloco dentro do mesmo editor).

---

### 2.3 Pesquisa de Mercado — Bibliotecas de Editor de Blocos (2026)

Pesquisa feita para embasar a decisão entre corrigir manualmente ou migrar para uma solução madura.

| Biblioteca | Base técnica | Pontos fortes | Pontos de atenção |
|---|---|---|---|
| **BlockNote** | Construída sobre ProseMirror e Tiptap<cite index="3-1">Built on top of Prosemirror and Tiptap</cite> | <cite index="2-1">Editor de rich text em blocos open-source, feito especificamente para React, com experiência de edição estilo Notion, organizando conteúdo em blocos distintos (parágrafos, títulos, listas, código) que podem ser manipulados individualmente</cite>. <cite index="2-1">Suporta colaboração em tempo real via Yjs e já vem com API declarativa integrada ao modelo de componentes do React</cite> | Opinativo (menos flexível que frameworks headless puros); adotar a UI padrão pode exigir customização visual para casar com a identidade do BincNote |
| **Lexical** (Meta) | Framework próprio, headless | Descrito como rápido, flexível e "React-first", pensado para construir editores customizados<cite index="7-1">Meta's editor. Blazing fast, React-first, made for custom apps, se comporta como blocos de montar que permitem construir qualquer estrutura</cite> | <cite index="7-1">Configuração inicial considerada mais trabalhosa e documentação apontada como fraca por parte da comunidade</cite> |
| **TipTap / ProseMirror** | ProseMirror como núcleo | <cite index="1-1">ProseMirror tem um core sem schema fixo, com modelo de documento aninhado similar ao DOM, dando controle total sobre cada nó, operação e decisão de renderização, com arquitetura de plugins sem restrições</cite>. Forte em colaboração em tempo real (estilo Google Docs) | <cite index="7-1">Tende a ter add-ons pagos, bundle mais pesado e suporte a TypeScript considerado mais fraco por parte da comunidade</cite> |
| **Plate.js** | Baseado em Slate | <cite index="2-1">Framework headless e open-source para editores de rich text em React, construído para ajudar desenvolvedores a criar editores altamente customizáveis, com arquitetura modular e orientada a plugins</cite> | Curva de aprendizado semelhante à do Slate |
| **Editor.js** | Modelo próprio em blocos | Foco em edição em blocos com saída em JSON limpo, adequado para aplicações que precisam de dados estruturados<cite index="5-1">Editor.js se destaca por sua edição em estilo de blocos e saída limpa em JSON, tornando-o adequado para aplicações que precisam de dados estruturados e fácil extensibilidade</cite> | Ecossistema React menos nativo que os anteriores |

**Recomendação preliminar (a confirmar pela CLI após ver o código real):**
Para o caso do BincNote — um app "estilo Notion" que já tem o conceito de blocos por linha e persistência em JSON — **BlockNote** é a opção mais alinhada: já resolve nativamente os dois bugs relatados (seleção multi-bloco e gerenciamento de cursor são responsabilidade do editor, não do app), tem API pensada para React, e sua base em ProseMirror é comprovadamente estável para esse tipo de uso. A ressalva é o esforço de migração dos dados já salvos (formato JSON atual do bloco de notas → formato de documento do BlockNote) e de estilização para manter a identidade visual do BincNote.

Se a CLI, ao investigar o código, encontrar que o restante do BincNote (páginas, outros blocos) **já usa** alguma dessas bibliotecas (ex: Tiptap ou Lexical) em outro lugar, a prioridade deve ser **reaproveitar a mesma biblioteca já em uso**, em vez de introduzir uma terceira dependência — isso deve sobrepor a recomendação acima.

---

### 2.4 Decisão de Arquitetura (a ser confirmada pela CLI antes de codar)

A CLI deve, na fase de diagnóstico, escolher entre:

**Opção A — Correção manual (patch cirúrgico)**
- Prós: menor risco de regressão em outras partes, sem migração de dados, entrega mais rápida.
- Contras: exige implementar manualmente o gerenciamento de seleção (salvar/restaurar `Range` a cada render) e transformar múltiplos `contentEditable` isolados em um único container de edição — essencialmente reimplementando parte do que uma lib madura já resolve. Risco de reaparecer bugs parecidos no futuro.

**Opção B — Migração para biblioteca madura (ex: BlockNote)**
- Prós: resolve os dois bugs na raiz, ganha funcionalidades prontas (formatação rica, possível colaboração futura, drag-and-drop de blocos), reduz manutenção futura.
- Contras: exige escrever um conversor do formato atual de dados para o novo formato de documento, ajustar estilos para manter a identidade visual, e validar que a performance/bundle size continuam aceitáveis.

**Critério de decisão:** se o esforço de migração (Opção B) for razoável frente ao tamanho do projeto e não colocar em risco dados existentes, a Opção B é preferível a médio prazo. Caso contrário, aplicar Opção A como correção urgente e registrar a migração como débito técnico para uma fase futura.

---

### 2.4b Feature Adicional — Toolbar Flutuante de Seleção de Texto

**Contexto:** o bloco de notas já teve uma toolbar flutuante de formatação, exibida ao selecionar texto, que foi removida em algum momento. Precisa ser restaurada — com melhorias, não uma simples reversão.

**Evidência de referência:** print do Notion (anexado pelo usuário) mostra o comportamento esperado de seleção: texto selecionado atravessando múltiplos blocos (vários itens de lista com marcadores + um título de etapa em negrito), com destaque contínuo por todos os blocos, sem quebrar a seleção em cada bloco individualmente. Isso reforça o requisito RF3 (seção 2.5) e é pré-requisito técnico para a toolbar funcionar corretamente em seleções multi-bloco.

**Dependência importante:** esta feature depende da correção do Bug 2 (seleção multi-bloco). Implementar a toolbar antes de corrigir a seleção resultaria em uma toolbar que só funciona parcialmente (um bloco por vez), reproduzindo a limitação atual.

**Passo prévio obrigatório:** antes de reimplementar, investigar no histórico do repositório (git log/blame no componente do bloco de notas ou da toolbar) o motivo da remoção — pode ter sido um bug conhecido, conflito com outra funcionalidade, ou decisão de produto. Esse contexto deve orientar o que evitar na reimplementação.

**Requisitos funcionais da toolbar:**

| # | Requisito |
|---|---|
| RF9 | A toolbar só aparece quando há uma seleção de texto real (range não vazio); nunca ao apenas posicionar o cursor. |
| RF10 | A toolbar é posicionada próxima à área selecionada (tipicamente acima, centralizada), calculada a partir do bounding box real da seleção — inclusive quando a seleção começa em um bloco e termina em outro. |
| RF11 | Em seleções que atravessam múltiplos blocos, a toolbar aparece **uma única vez** para a seleção inteira (nunca duplicada por bloco). |
| RF12 | Ações de formatação da toolbar (negrito, itálico, etc. — confirmar conjunto de ações original no histórico do código) aplicam-se corretamente a toda a extensão da seleção, mesmo cruzando múltiplos blocos. |
| RF13 | A toolbar fecha automaticamente ao: clicar fora, apertar Esc, ou a seleção ser perdida/alterada para vazia. |
| RF14 | A toolbar se comporta corretamente durante scroll e resize da janela (reposiciona ou fecha de forma limpa, nunca fica "presa" em posição desatualizada). |
| RF15 | Repetir seleção/desseleção várias vezes em sequência não duplica nem trava a toolbar na tela. |

**Critérios de aceite:**
- [ ] Selecionar palavra única em um bloco → toolbar aparece corretamente posicionada, uma única vez.
- [ ] Selecionar texto atravessando 2+ blocos → toolbar aparece uma única vez, posicionada em relação à seleção completa.
- [ ] Aplicar formatação em seleção multi-bloco → formatação é aplicada em toda a seleção, sem deixar trechos de fora.
- [ ] Clicar fora da seleção → toolbar desaparece.
- [ ] Rolar a página com seleção ativa → sem toolbar "flutuando" em posição errada.
- [ ] Selecionar/desselecionar repetidamente → nenhuma duplicação ou travamento visual.

---

### 2.4c Perguntas em Aberto — Toolbar

- Existe registro (issue, PR, changelog) do motivo real pelo qual a toolbar foi removida? Isso deve ser verificado antes de reimplementar para não reintroduzir o mesmo problema.
- Quais ações de formatação a toolbar tinha originalmente? Se não for possível recuperar do histórico, qual conjunto mínimo é esperado agora (negrito, itálico, sublinhado, link, cor, comentário)?
- Se a decisão da seção 2.4 for migrar para uma biblioteca de editor de blocos (Opção B), a própria biblioteca provavelmente já resolve a toolbar flutuante nativamente (ex: BlockNote e Tiptap têm "bubble menu" pronto) — nesse caso, a implementação manual da toolbar deixa de ser necessária e deve ser substituída pelo componente nativo da biblioteca escolhida.

---

### 2.5 Requisitos Funcionais

| # | Requisito |
|---|---|
| RF1 | O cursor de inserção nunca deve mudar de posição por conta própria durante digitação contínua ou após pausas. |
| RF2 | Texto digitado após uma pausa deve ser inserido exatamente na posição onde o cursor estava, nunca no início do bloco. |
| RF3 | Deve ser possível selecionar texto arrastando o mouse através de múltiplos blocos/linhas, com destaque visual contínuo. |
| RF4 | Ctrl+A (ou equivalente) deve selecionar todo o conteúdo do bloco de notas, não apenas o bloco/linha focado. |
| RF5 | Copiar uma seleção multi-bloco deve preservar o texto em ordem correta ao colar em outro lugar. |
| RF6 | A separação em blocos ao apertar Enter deve continuar funcionando como hoje (comportamento visual não deve regredir). |
| RF7 | O conteúdo do bloco de notas deve continuar sendo persistido corretamente no JSON (sem regressão da correção de auto-save anterior). |
| RF8 | Se houver migração de biblioteca, os dados já existentes dos usuários devem ser convertidos automaticamente para o novo formato, sem perda de conteúdo. |

---

### 2.6 Critérios de Aceite

- [ ] Digitar um parágrafo longo sem pausas → cursor permanece sempre na posição correta.
- [ ] Digitar, pausar, digitar novamente (múltiplas vezes) → texto final sai na ordem digitada, sem inversões.
- [ ] Criar 5+ blocos e arrastar seleção do primeiro ao último → toda a faixa é destacada corretamente.
- [ ] Ctrl+A seleciona 100% do conteúdo do bloco de notas.
- [ ] Copiar seleção multi-bloco e colar externamente preserva o conteúdo e a ordem.
- [ ] Apertar Enter continua criando um novo bloco/linha como no comportamento atual.
- [ ] Fechar/reabrir a aba do card e fechar/reabrir o app preservam o conteúdo corretamente (sem regressão do bug de persistência já corrigido anteriormente).
- [ ] Se aplicável (Opção B), 100% dos dados de notas já existentes nos cards de teste são migrados sem perda de conteúdo.

---

### 2.7 Plano de Execução Sugerido

**Fase 0 — Diagnóstico:**
1. Confirmar a causa raiz de cada bug no código atual (estrutura do componente, gerenciamento de estado, tratamento de `contentEditable`).
2. Verificar se alguma biblioteca de editor já é usada em outro lugar do BincNote.
3. Apresentar diagnóstico e decisão de arquitetura (Opção A ou B) para validação antes de codar.

**Fase 1 — Implementação da correção:**
1. (Opção A) Reescrever o gerenciamento de seleção e unificar os blocos sob um único container editável; **ou** (Opção B) integrar a biblioteca escolhida, mantendo a API de dados compatível ou escrevendo um conversor.
2. Garantir que o auto-save (correção anterior) continue funcionando com a nova implementação.
3. Investigar o histórico do código para entender por que a toolbar flutuante de seleção foi removida.
4. Reimplementar a toolbar flutuante (seção 2.4b) — manualmente (Opção A) ou via componente nativo da biblioteca escolhida, como "bubble menu" (Opção B) — já validando que funciona corretamente com seleção multi-bloco.

**Fase 2 — Migração de dados (se Opção B):**
1. Escrever script/rotina de conversão do formato antigo de notas para o novo formato de documento.
2. Testar a conversão com dados reais/representativos antes de aplicar em produção.

**Fase 3 — Validação:**
1. Rodar todos os critérios de aceite da seção 2.6.
2. Testar regressão nas demais funcionalidades do card e da aba lateral.

**Fase 4 — Análise geral do código e sugestões de melhoria:**
1. Após concluir a correção, revisar o restante da base de código do BincNote.
2. Produzir uma lista priorizada de sugestões de melhoria (ver seção 2.8 para guiar o que observar).

---

### 2.8 Guia para as Sugestões de Melhoria (Fase 4)

Para que a análise de código não fique genérica, oriente a CLI a observar especificamente:

- **Persistência de dados:** robustez do JSON usado como "banco de dados" (tratamento de escrita concorrente, backup/versionamento, crescimento do arquivo em workspaces grandes, necessidade futura de migrar para um banco real).
- **Performance:** tempo de carregamento de páginas com muitos cards/blocos, re-renders desnecessários em componentes de edição (relevante direto para os bugs corrigidos aqui).
- **Consistência de padrões de edição:** se outros blocos de conteúdo do BincNote (além do bloco de notas) sofrem de problemas parecidos de `contentEditable`/seleção, para tratar de forma unificada.
- **Acessibilidade:** navegação por teclado, leitores de tela, contraste — comum ficar de lado em editores customizados.
- **Cobertura de testes:** se existem testes automatizados para os fluxos de edição/persistência (a ausência deles provavelmente contribuiu para esses bugs passarem despercebidos).
- **Tratamento de erros e estados vazios:** cards sem conteúdo, arquivos JSON corrompidos, conflitos de escrita.

---

### 2.9 Perguntas em Aberto

- O restante do BincNote (blocos de texto normais nas páginas, não só o bloco de notas do card) já usa alguma biblioteca de editor (Tiptap, Lexical, Slate, etc.)? Isso muda diretamente a recomendação da seção 2.3. Resposta: blocos de texto normais nas páginas tem que ter a biblioteca TIPTAP
- Existe expectativa de colaboração em tempo real (múltiplos usuários editando o mesmo bloco de notas simultaneamente) em uma fase futura? Isso pesa a favor de bibliotecas com suporte nativo a Yjs/CRDT, como BlockNote ou Tiptap.
- Qual o volume médio de conteúdo nos blocos de notas hoje (poucas linhas vs. documentos longos)? Isso ajuda a decidir se vale o esforço de migração de biblioteca agora ou se um patch manual resolve o suficiente por enquanto.