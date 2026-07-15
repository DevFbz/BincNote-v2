

## INÍCIO DO PROMPT

Quero implementar a seleção de conteúdo da página exatamente como funciona no Notion: **a área interativa de seleção cobre a largura inteira da página (do container principal), não só a coluna de texto centralizada** — mas o destaque visual da coluna de texto é mais forte que o resto, porque usa duas camadas empilhadas da mesma cor.

### 1. Estrutura de layout

- O conteúdo (blocos de texto) fica numa coluna central com largura máxima fixa (ex: `700–740px`), alinhada ao centro horizontal da página — isso já deve estar implementado.
- Só que a **área que responde a clique+arrastar para selecionar** deve ser a largura inteira do container da página (praticamente de uma borda a outra, com só uma pequena margem de respiro nas laterais, tipo `40px`), e não ficar restrita à coluna central de texto.
- Isso significa: se o usuário clicar num espaço vazio bem à esquerda ou à direita da tela (fora da coluna de texto) e arrastar o mouse para baixo, isso **deve iniciar e continuar uma seleção** dos blocos que estiverem na faixa vertical percorrida pelo mouse — do mesmo jeito que clicar em cima do próprio texto.

### 2. As DUAS camadas de destaque (o ponto principal deste prompt)

Ao selecionar uma ou mais linhas/blocos (por clique+arraste ou `Ctrl+A`), renderizar **2 elementos de destaque sobrepostos por bloco selecionado**, ambos na mesma cor:

- **Camada 1 — "faixa da linha" (full width):** um retângulo que cobre a largura inteira da área de conteúdo da página (a mesma largura da área clicável descrita no item 1), na altura daquele bloco. Cor: `rgba(35, 131, 226, 0.13)` (azul `#2383E2` a ~13% de opacidade) sobre o fundo escuro da página.
- **Camada 2 — "coluna de texto":** um segundo retângulo, **exatamente na largura da coluna central onde o texto vive** (a mesma `max-width` do conteúdo), na mesma altura, usando a **mesma cor e opacidade** da Camada 1, posicionado por cima da Camada 1.
- Resultado: como as duas camadas se sobrepõem exatamente na área da coluna de texto, essa região fica visualmente mais escura/saturada (~26% de opacidade efetiva) do que o resto da faixa (~13%), sem precisar calcular uma cor diferente — é só a mesma cor empilhada duas vezes.

**Implementação sugerida (CSS/JS):**
```css
:root {
  --selection-tint: rgba(35, 131, 226, 0.13);
}

/* Camada 1: aplicada no wrapper full-width de cada bloco selecionado */
.block-row.selected {
  background-color: var(--selection-tint);
}

/* Camada 2: aplicada só no elemento interno que tem a largura da coluna de texto */
.block-row.selected .block-content {
  background-color: var(--selection-tint); /* empilha por cima da camada 1 */
  border-radius: 3px;
}
```
- Estruturalmente, cada bloco já deveria ter um wrapper externo full-width (onde hoje só ficam os controles de hover `+`/`⋮⋮`) e um elemento interno com a largura limitada da coluna de texto. Aplique a classe de seleção nos dois níveis ao mesmo tempo.

### 3. Lógica de captura da seleção (full-width)

- O `mousedown` que inicia a seleção deve ser ouvido no **container da página inteira** (não só dentro da coluna de texto), incluindo as áreas vazias das laterais.
- Durante o `mousemove` com o botão pressionado, calcular — pela posição vertical (`clientY`) do cursor — quais blocos estão dentro do intervalo `[y inicial, y atual]`, independente da posição horizontal (`clientX`) do cursor (ou seja, a posição X do mouse não importa para decidir QUAIS blocos entram na seleção — só a posição Y).
- Marcar todos os blocos dentro desse intervalo com a classe `.selected` (aplicando as duas camadas descritas acima), inclusive blocos vazios no meio do intervalo (mesmo comportamento já especificado no prompt anterior).
- Ao soltar o botão do mouse (`mouseup`), manter a seleção; ela só é removida ao clicar fora ou apertar uma tecla de navegação/edição.
- Se o clique começar **dentro** do texto de um único bloco e o arraste não sair da linha, usar a seleção nativa de texto (parcial, só nas palavras/caracteres), como já especificado no prompt anterior — o modo "full-width" descrito aqui é para quando a seleção abrange múltiplos blocos/linhas inteiras.

### 4. Checklist final

- [ ] Clicar e arrastar a partir de qualquer ponto da largura da página (inclusive fora da coluna de texto) inicia a seleção.
- [ ] Cada bloco selecionado mostra duas camadas de destaque empilhadas: uma cobrindo a largura toda da página, outra cobrindo só a coluna de texto — ambas na mesma cor `rgba(35,131,226,0.13)`.
- [ ] A coluna de texto fica visivelmente mais escura/saturada que o resto da faixa, só pelo empilhamento das camadas (sem precisar de uma segunda cor).
- [ ] Blocos vazios dentro do intervalo selecionado também recebem as duas camadas.
- [ ] A seleção calcula os blocos incluídos com base só na posição vertical do mouse, ignorando a posição horizontal.
- [ ] Seleção parcial de texto dentro de um único bloco continua usando o destaque simples (`::selection`), sem a camada full-width.


