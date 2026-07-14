import json
from django.conf import settings
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

import requests
from datetime import datetime

from apps.documents.models import Page
from apps.grids.models import Record, Field, CellValue, Database
from .models import AIConversation, AIMessage
from .serializers import AIConversationSerializer, AIMessageSerializer


class AIConversationListView(generics.ListCreateAPIView):
    queryset = AIConversation.objects.all()
    serializer_class = AIConversationSerializer


class AIConversationDetailView(generics.RetrieveDestroyAPIView):
    queryset = AIConversation.objects.all()
    serializer_class = AIConversationSerializer


class AIMessageListView(generics.ListCreateAPIView):
    serializer_class = AIMessageSerializer

    def get_queryset(self):
        return AIMessage.objects.filter(conversa_id=self.kwargs.get("conversa_pk"))


def _chamar_modelo(mensagens: list[dict[str, str]]) -> str:
    if settings.AI_API_KEY:
        try:
            resp = requests.post(
                f"{settings.AI_API_BASE.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.AI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.AI_MODEL,
                    "messages": mensagens,
                    "temperature": 0.7,
                },
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as exc:
            return f"[erro ao chamar a IA: {exc}]"
    return _simular(mensagens)


def _simular(mensagens: list[dict[str, str]]) -> str:
    ult = mensagens[-1]["content"] if mensagens else ""
    return (
        "Modo simulação: configure AI_API_KEY no .env para usar a IA real. "
        f"Recebido: {ult[:140]}"
    )


class AIChatView(APIView):
    def post(self, request, conversa_pk):
        conversa = AIConversation.objects.filter(pk=conversa_pk).first()
        if not conversa:
            return Response(
                {"detail": "Conversa não encontrada."}, status=status.HTTP_404_NOT_FOUND
            )
        pergunta = request.data.get("conteudo", "").strip()
        pagina_id = request.data.get("pagina_id")
        card_id = request.data.get("card_id")
        if not pergunta:
            return Response(
                {"detail": "Conteúdo vazio."}, status=status.HTTP_400_BAD_REQUEST
            )
        AIMessage.objects.create(conversa=conversa, role="user", conteudo=pergunta)

        historico = [
            {"role": m.role, "content": m.conteudo}
            for m in conversa.messages.all()
        ]

        # Build system prompt with page context if available
        system_prompt = "Você é um assistente em português do Brasil, útil e conciso."
        page_context = ""
        if pagina_id:
            try:
                pagina = Page.objects.get(pk=pagina_id)
                page_context = f"Página atual: '{pagina.titulo or 'Sem título'}'"
                if pagina.kind == "database":
                    page_context += " (banco de dados / Kanban)"
                titulo = pagina.titulo or "Sem título"
                conteudo_str = (
                    json.dumps(pagina.conteudo, ensure_ascii=False)
                    if isinstance(pagina.conteudo, dict)
                    else str(pagina.conteudo or "")
                )
                system_prompt = (
                    f"Você é um assistente integrado ao BincNote, um editor de notas. "
                    f"O usuário está editando a página chamada '{titulo}'. "
                    f"Abaixo está o conteúdo atual da página em formato JSON do TipTap (editor rich-text):\n\n"
                    f"{conteudo_str[:2000]}\n\n"
                    f"Sempre que o usuário pedir para formatar, reestruturar ou modificar o texto da página, "
                    f"responda com o conteúdo formatado em markdown. "
                    f"Se for apenas uma pergunta, responda normalmente. "
                    f"Seja útil e responda em português do Brasil."
                )
            except Page.DoesNotExist:
                pass

        # Add card context if a card is active
        if card_id:
            try:
                record = Record.objects.prefetch_related("cells__field").get(pk=card_id)
                fields = Field.objects.filter(database=record.database)
                field_map = {f.id: f for f in fields}
                card_lines = []
                for cell in record.cells.all():
                    field = field_map.get(cell.field_id)
                    if field:
                        val = cell.valor
                        if isinstance(val, dict):
                            val_str = val.get("text") or val.get("label") or val.get("title") or json.dumps(val, ensure_ascii=False)
                        else:
                            val_str = str(val)
                        card_lines.append(f"  {field.nome}: {val_str}")
                card_context = "\n".join(card_lines)
                system_prompt += (
                    f"\n\nO usuário está visualizando o card '{record.id}' no Kanban. "
                    f"Campos do card:\n{card_context}"
                )
            except Record.DoesNotExist:
                pass

        historico.insert(0, {"role": "system", "content": system_prompt})
        resposta = _chamar_modelo(historico)
        msg_ia = AIMessage.objects.create(conversa=conversa, role="assistant", conteudo=resposta)

        if conversa.titulo == "Nova conversa":
            conversa.titulo = pergunta[:60]
            conversa.save(update_fields=["titulo"])

        return Response(AIMessageSerializer(msg_ia).data, status=status.HTTP_201_CREATED)


class AIActionView(APIView):
    """Ações de IA aplicadas a um trecho de texto (sem persistir conversa)."""

    ACOES = {
        "resumir": "Resuma o texto a seguir em português do Brasil, em tópicos curtos.",
        "traduzir": "Traduza o texto a seguir para o português do Brasil.",
        "reformular": "Reescreva o texto a seguir de forma mais clara, em português do Brasil.",
        "continuar": "Continue o texto a seguir mantendo o estilo e o idioma português do Brasil.",
        "corrigir": "Corrija gramática, ortografia e pontuação do texto em português do Brasil.",
        "melhorar": "Melhore a escrita do texto a seguir, tornando-o mais profissional e claro, em português do Brasil.",
        "explicar": "Explique o texto a seguir de forma didática e simples, em português do Brasil.",
        "reformatar": "Reformate o texto a seguir usando markdown (cabeçalhos, listas, negrito, itálico) para melhor estrutura e legibilidade, em português do Brasil. Mantenha todo o conteúdo original.",
        "criar_prd": "Crie um PRD (Product Requirements Document) profissional completo em português do Brasil. Use markdown com os seguintes tópicos obrigatórios:\n\n# PRD - [Nome do Projeto]\n\n## 1. Objetivo\n## 2. Escopo\n## 3. Requisitos Funcionais\n## 4. Requisitos Não Funcionais\n## 5. Sprint Backlog\n\nDentro de cada sprint, use listas de tarefas com checkboxes (- [ ] tarefa). Crie ao menos 3 sprints com 4-6 tarefas cada. Use subtópicos numerados dentro dos requisitos. O PRD deve ser detalhado e profissional, como se fosse para um produto real.\n\nGere APENAS o conteúdo do PRD, sem introdução ou comentários extras.",
    }

    def post(self, request):
        acao = request.data.get("acao")
        trecho = request.data.get("trecho", "")
        if acao not in self.ACOES:
            return Response(
                {"detail": "Ação inválida."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if acao != "criar_prd" and not trecho.strip():
            return Response(
                {"detail": "Trecho vazio não é permitido para esta ação."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mensagens = [
            {"role": "system", "content": "Você é um escritor em português do Brasil."},
        ]
        if trecho.strip():
            mensagens.append(
                {"role": "user", "content": f"{self.ACOES[acao]}\n\n{trecho}"}
            )
        else:
            mensagens.append(
                {"role": "user", "content": self.ACOES[acao]}
            )
        return Response({"resultado": _chamar_modelo(mensagens)})


class SLAReportView(APIView):
    """Gera relatório SLA a partir dos cards de um banco de dados (Kanban)."""

    def post(self, request):
        pagina_id = request.data.get("pagina_id")
        if not pagina_id:
            return Response(
                {"detail": "pagina_id é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            page = Page.objects.get(pk=pagina_id, kind="database")
            db = page.database
        except (Page.DoesNotExist, Database.DoesNotExist):
            return Response(
                {"detail": "Página não encontrada ou não é um banco de dados."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ── Ensure date fields exist ─────────────────────────────────────
        campos_data = [
            {"nome": "Data Abertura", "kind": "date"},
            {"nome": "Data Inicio", "kind": "date"},
            {"nome": "Data Término", "kind": "date"},
        ]
        existing_fields = {f.nome: f for f in Field.objects.filter(database=db)}
        fields_created = []
        for cd in campos_data:
            if cd["nome"] not in existing_fields:
                ordem = Field.objects.filter(database=db).count()
                f = Field.objects.create(
                    database=db, nome=cd["nome"], kind=cd["kind"],
                    config={"format": "date"}, ordem=ordem,
                )
                existing_fields[cd["nome"]] = f
                fields_created.append({"id": f.id, "nome": f.nome, "kind": f.kind})

        # ── Title & status fields ────────────────────────────────────────
        title_field = next(
            (f for f in existing_fields.values() if f.kind in ("title", "text")),
            None,
        )
        status_field = next(
            (f for f in existing_fields.values() if f.kind == "select"),
            None,
        )
        date_field_ids = {}
        for nome in ("Data Abertura", "Data Inicio", "Data Término"):
            f = existing_fields.get(nome)
            if f:
                date_field_ids[nome] = f.id

        # ── Helper ───────────────────────────────────────────────────────
        def _parse_date(s: str):
            if not s:
                return None
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S",
                        "%Y-%m-%d %H:%M:%S", "%d-%m-%Y"):
                try:
                    return datetime.strptime(s.strip(), fmt)
                except (ValueError, AttributeError):
                    pass
            return None

        def _cell_text(cell_map, field_id):
            if not field_id or field_id not in cell_map:
                return ""
            val = cell_map[field_id].valor
            if isinstance(val, dict):
                return val.get("text") or val.get("label") or val.get("date") or ""
            return str(val or "")

        # ── Fetch records ────────────────────────────────────────────────
        records = Record.objects.filter(
            database=db, excluido_em__isnull=True
        ).prefetch_related("cells__field")

        results = []
        for record in records:
            cell_map = {c.field_id: c for c in record.cells.all()}

            data_abertura = _cell_text(cell_map, date_field_ids.get("Data Abertura"))
            data_inicio = _cell_text(cell_map, date_field_ids.get("Data Inicio"))
            data_termino = _cell_text(cell_map, date_field_ids.get("Data Término"))
            titulo = _cell_text(cell_map, title_field.id if title_field else None) or f"Card #{record.id}"

            d_abertura = _parse_date(data_abertura)
            d_inicio = _parse_date(data_inicio)
            d_termino = _parse_date(data_termino)

            # Classify card
            if d_abertura and d_inicio and d_termino:
                status_sla = "concluido"
                espera = (d_inicio - d_abertura).days
                atendimento = (d_termino - d_inicio).days
                total = (d_termino - d_abertura).days
            elif d_abertura and d_inicio and not d_termino:
                status_sla = "em_andamento"
                espera = (d_inicio - d_abertura).days
                atendimento = None
                total = None
            elif d_abertura and not d_inicio:
                status_sla = "inconsistente"
                espera = None
                atendimento = None
                total = None
                data_inicio = "⚠️ ausente"
            elif not d_abertura and d_inicio:
                status_sla = "inconsistente"
                espera = None
                atendimento = None
                total = None
                data_abertura = "⚠️ ausente"
            else:
                status_sla = "inconsistente"
                espera = None
                atendimento = None
                total = None

            # Kanban column status
            kanban_status = ""
            if status_field:
                cell = cell_map.get(status_field.id)
                if cell and isinstance(cell.valor, dict):
                    kanban_status = cell.valor.get("label", "")

            results.append({
                "id": record.id,
                "titulo": titulo,
                "status_kanban": kanban_status,
                "status_sla": status_sla,
                "data_abertura": data_abertura,
                "data_inicio": data_inicio,
                "data_termino": data_termino,
                "espera_dias": espera,
                "atendimento_dias": atendimento,
                "total_dias": total,
            })

        # ── Aggregated metrics ───────────────────────────────────────────
        validos = [r for r in results if r["status_sla"] == "concluido"]
        em_andamento = [r for r in results if r["status_sla"] == "em_andamento"]
        inconsistentes = [r for r in results if r["status_sla"] == "inconsistente"]

        def _avg(key, items):
            vals = [r[key] for r in items if r.get(key) is not None]
            return round(sum(vals) / len(vals), 1) if vals else 0

        metrics = {
            "total_cards": len(results),
            "validos": len(validos),
            "em_andamento": len(em_andamento),
            "inconsistentes": len(inconsistentes),
            "media_espera_dias": _avg("espera_dias", validos),
            "media_atendimento_dias": _avg("atendimento_dias", validos),
            "media_total_dias": _avg("total_dias", validos),
            "max_espera_dias": max((r["espera_dias"] for r in validos if r["espera_dias"] is not None), default=0),
            "max_total_dias": max((r["total_dias"] for r in validos if r["total_dias"] is not None), default=0),
        }

        # Ranking
        ranking = sorted(
            results,
            key=lambda r: (
                r["total_dias"] if r["total_dias"] is not None
                else r["espera_dias"] if r["espera_dias"] is not None
                else 0
            ),
            reverse=True,
        )[:15]

        # Chart: distribution by Kanban status
        distribuicao_status: dict[str, int] = {}
        status_sla_counts: dict[str, int] = {"concluido": 0, "em_andamento": 0, "inconsistente": 0}
        for r in results:
            s = r["status_kanban"] or "Sem status"
            distribuicao_status[s] = distribuicao_status.get(s, 0) + 1
            if r["status_sla"] in status_sla_counts:
                status_sla_counts[r["status_sla"]] += 1

        # ── AI executive summary ─────────────────────────────────────────
        data_summary = (
            f"Total de cards: {metrics['total_cards']}\n"
            f"Válidos (concluídos): {metrics['validos']}\n"
            f"Em andamento: {metrics['em_andamento']}\n"
            f"Inconsistentes: {metrics['inconsistentes']}\n"
            f"Média espera: {metrics['media_espera_dias']} dias\n"
            f"Média atendimento: {metrics['media_atendimento_dias']} dias\n"
            f"Média total: {metrics['media_total_dias']} dias\n"
        )
        if ranking:
            top = ranking[0]
            data_summary += f"Card mais lento: '{top['titulo']}' ({top['total_dias'] or top['espera_dias']} dias)\n"

        ai_response = _chamar_modelo([
            {
                "role": "system",
                "content": (
                    "Você é um analista de SLA especializado em português do Brasil. "
                    "Com base nos dados fornecidos, gere UM resumo executivo (máx. 3 parágrafos) com:\n"
                    "1. Análise geral do desempenho do time\n"
                    "2. Cards críticos (maior tempo)\n"
                    "3. Sugestões de melhoria\n"
                    "Seja direto e use português do Brasil."
                ),
            },
            {"role": "user", "content": f"Dados de SLA:\n{data_summary}"},
        ])

        return Response({
            "metricas": metrics,
            "ranking": ranking,
            "cards": results,
            "graficos": {
                "distribuicao_status": distribuicao_status,
                "status_sla_counts": status_sla_counts,
            },
            "resumo_ia": ai_response,
            "fields_created": fields_created,
            "campos_data": ["Data Abertura", "Data Inicio", "Data Término"],
        })