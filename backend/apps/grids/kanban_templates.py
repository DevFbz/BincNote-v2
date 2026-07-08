"""Templates de quadros Kanban prontos para uso.

Cada template define:
- nome, descricao, icone, capa (apresentação no frontend)
- colunas: lista de {id, label, color} -> viram opções do campo "Status"
- cartoes: lista de {titulo, status, extras} -> viram records com células

Extras são pares (nome_campo, valor) adicionais a criar além de Título/Status.
"""

from dataclasses import dataclass, field
from typing import Any

# ---------- Cores padrão (mesma paleta do design system) ----------
COR_FAZER = "#e2e5ea"
COR_ANDAMENTO = "#7c6df5"
COR_CONCLUIDO = "#1fb675"
COR_REVISAO = "#f59e0b"
COR_BLOQUEADO = "#e03e3e"


@dataclass
class ColunaKanban:
    id: str
    label: str
    color: str


@dataclass
class CartaoKanban:
    titulo: str
    status: str  # id da coluna
    extras: dict[str, Any] = field(default_factory=dict)


@dataclass
class TemplateKanban:
    id: str
    nome: str
    descricao: str
    icone: str
    capa: str
    colunas: list[ColunaKanban]
    cartoes: list[CartaoKanban]
    campos_extras: list[dict[str, Any]] = field(default_factory=list)
    # campos_extras: [{nome, kind, config?}] -> criados além de Título/Status


# ---------- Definições ----------
TEMPLATES_KANBAN: list[TemplateKanban] = [
    TemplateKanban(
        id="kanban-projetos",
        nome="Quadro de projetos",
        descricao="Acompanhe seus projetos do início ao fim",
        icone="🚀",
        capa="linear-gradient(135deg,#e7f4ff,#e9e7ff)",
        colunas=[
            ColunaKanban("fazer", "A fazer", COR_FAZER),
            ColunaKanban("andamento", "Em andamento", COR_ANDAMENTO),
            ColunaKanban("revisao", "Revisão", COR_REVISAO),
            ColunaKanban("concluido", "Concluído", COR_CONCLUIDO),
        ],
        campos_extras=[
            {"nome": "Data Inicio", "kind": "date"},
            {"nome": "Data Abertura", "kind": "date"},
            {"nome": "Data Término", "kind": "date"},
            {"nome": "Prioridade", "kind": "select", "config": {
                "options": [
                    {"id": "baixa", "label": "Baixa", "color": "#9b9b9b"},
                    {"id": "media", "label": "Média", "color": "#f59e0b"},
                    {"id": "alta", "label": "Alta", "color": "#e03e3e"},
                    {"id": "urgente", "label": "Urgente", "color": "#e03e3e"},
                ]
            }},
            {"nome": "Responsável", "kind": "text"},
        ],
        cartoes=[
            CartaoKanban("Definir escopo do projeto", "concluido",
                        {"Responsável": "Eu", "Prioridade": "alta"}),
            CartaoKanban("Levantar requisitos com o cliente", "concluido",
                        {"Responsável": "Eu", "Prioridade": "alta"}),
            CartaoKanban("Criar wireframes", "andamento",
                        {"Responsável": "Eu", "Prioridade": "media"}),
            CartaoKanban("Modelar banco de dados", "andamento",
                        {"Responsável": "Eu", "Prioridade": "alta"}),
            CartaoKanban("Revisar design com a equipe", "revisao",
                        {"Responsável": "Eu", "Prioridade": "media"}),
            CartaoKanban("Configurar pipeline CI/CD", "fazer",
                        {"Responsável": "Eu", "Prioridade": "baixa"}),
            CartaoKanban("Escrever documentação técnica", "fazer",
                        {"Responsável": "Eu", "Prioridade": "media"}),
            CartaoKanban("Testes de aceitação", "fazer",
                        {"Responsável": "Eu", "Prioridade": "alta"}),
        ],
    ),
    TemplateKanban(
        id="kanban-sprint",
        nome="Sprint backlog",
        descricao="Planeje e execute iterações curtas",
        icone="⚡",
        capa="linear-gradient(135deg,#fff5e0,#fde7f3)",
        colunas=[
            ColunaKanban("backlog", "Backlog", COR_FAZER),
            ColunaKanban("sprint", "Sprint atual", COR_ANDAMENTO),
            ColunaKanban("teste", "Em teste", COR_REVISAO),
            ColunaKanban("feito", "Pronto", COR_CONCLUIDO),
        ],
        campos_extras=[
            {"nome": "Pontos", "kind": "number"},
            {"nome": "Tipo", "kind": "select", "config": {
                "options": [
                    {"id": "historia", "label": "História", "color": "#7c6df5"},
                    {"id": "bug", "label": "Bug", "color": "#e03e3e"},
                    {"id": "tarefatecnica", "label": "Tarefa técnica", "color": "#f59e0b"},
                ]
            }},
        ],
        cartoes=[
            CartaoKanban("Como usuário, quero criar uma página", "feito",
                        {"Pontos": 5, "Tipo": "historia"}),
            CartaoKanban("Como usuário, quero aninhas páginas", "feito",
                        {"Pontos": 3, "Tipo": "historia"}),
            CartaoKanban("Editor aceita markdown", "sprint",
                        {"Pontos": 8, "Tipo": "historia"}),
            CartaoKanban("Bug: tema escuro não persiste", "sprint",
                        {"Pontos": 2, "Tipo": "bug"}),
            CartaoKanban("Bug: emoji não salva", "teste",
                        {"Pontos": 1, "Tipo": "bug"}),
            CartaoKanban("Configurar backup automático", "backlog",
                        {"Pontos": 5, "Tipo": "tarefatecnica"}),
            CartaoKanban("Como usuário, quero exportar para PDF", "backlog",
                        {"Pontos": 8, "Tipo": "historia"}),
            CartaoKanban("Refatorar API de páginas", "backlog",
                        {"Pontos": 13, "Tipo": "tarefatecnica"}),
        ],
    ),
    TemplateKanban(
        id="kanban-tarefas",
        nome="Gestão de tarefas",
        descricao="Acompanhe tarefas do dia a dia",
        icone="✅",
        capa="linear-gradient(135deg,#e7f6ec,#e7f4ff)",
        colunas=[
            ColunaKanban("fazer", "A fazer", COR_FAZER),
            ColunaKanban("andamento", "Fazendo", COR_ANDAMENTO),
            ColunaKanban("concluido", "Feito", COR_CONCLUIDO),
        ],
        campos_extras=[
            {"nome": "Prazo", "kind": "date"},
        ],
        cartoes=[
            CartaoKanban("Pagar contas do mês", "fazer", {"Prazo": "2026-07-05"}),
            CartaoKanban("Comprar mantimentos", "andamento", {"Prazo": "2026-06-30"}),
            CartaoKanban("Revisar e-mails", "andamento", {"Prazo": "2026-06-29"}),
            CartaoKanban("Agendar consulta médica", "concluido", {"Prazo": "2026-06-28"}),
            CartaoKanban("Estudar 2h de inglês", "concluido", {"Prazo": "2026-06-29"}),
        ],
    ),
    TemplateKanban(
        id="kanban-ideias",
        nome="Quadro de ideias",
        descricao="Capture e organize inspirações",
        icone="💡",
        capa="linear-gradient(135deg,#fde7f3,#e9e7ff)",
        colunas=[
            ColunaKanban("ideia", "Ideias", COR_FAZER),
            ColunaKanban("explorando", "Explorando", COR_ANDAMENTO),
            ColunaKanban("validada", "Validada", COR_REVISAO),
            ColunaKanban("arquivada", "Arquivada", "#9b9b9b"),
        ],
        campos_extras=[
            {"nome": "Categoria", "kind": "select", "config": {
                "options": [
                    {"id": "produto", "label": "Produto", "color": "#7c6df5"},
                    {"id": "marketing", "label": "Marketing", "color": "#f59e0b"},
                    {"id": "pessoal", "label": "Pessoal", "color": "#1fb675"},
                ]
            }},
        ],
        cartoes=[
            CartaoKanban("App de meditação guiada", "ideia", {"Categoria": "produto"}),
            CartaoKanban("Newsletter semanal sobre xadrez", "ideia", {"Categoria": "marketing"}),
            CartaoKanban("Estudar Rust no fim de semana", "explorando", {"Categoria": "pessoal"}),
            CartaoKanban("Plugin de produtividade para Vim", "explorando", {"Categoria": "produto"}),
            CartaoKanban("Página de captura para leads", "validada", {"Categoria": "marketing"}),
            CartaoKanban("Aprender a fazer pão sourdough", "arquivada", {"Categoria": "pessoal"}),
        ],
    ),
]


def obter_template(template_id: str) -> TemplateKanban | None:
    for t in TEMPLATES_KANBAN:
        if t.id == template_id:
            return t
    return None


def listar_metadados() -> list[dict]:
    """Lista só os metadados (para o frontend montar os cards)."""
    return [
        {
            "id": t.id,
            "nome": t.nome,
            "descricao": t.descricao,
            "icone": t.icone,
            "capa": t.capa,
            "colunas": [c.label for c in t.colunas],
            "qtd_cartoes": len(t.cartoes),
        }
        for t in TEMPLATES_KANBAN
    ]