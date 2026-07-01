from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.documents.models import Page, Workspace

from .kanban_templates import obter_template, listar_metadados
from .models import CellValue, Database, Field, Record, View


class TemplateKanbanListView(APIView):
    """Lista os metadados dos templates Kanban disponíveis."""

    def get(self, request):
        return Response(listar_metadados())


class TemplateKanbanCriarView(APIView):
    """Cria um quadro Kanban completo a partir de um template.

    Body: { "template_id": "...", "nome"?: "..." }
    """

    @transaction.atomic
    def post(self, request):
        template_id = request.data.get("template_id")
        nome = request.data.get("nome")
        tpl = obter_template(template_id) if template_id else None
        if not tpl:
            return Response(
                {"detail": "Template não encontrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ws, _ = Workspace.objects.get_or_create(pk=1, defaults={"nome": "Meu Espaço"})
        titulo_final = nome or tpl.nome

        # 1) Página tipo database
        pagina = Page.objects.create(
            workspace=ws,
            parent=None,
            titulo=titulo_final,
            icone=tpl.icone,
            capa=tpl.capa,
            kind="database",
            ordem=0,
            conteudo={},
        )

        # 2) Database
        db = Database.objects.create(pagina=pagina, nome=titulo_final)

        # 3) Campos: Título (text), Status (select com opções) + extras
        campo_titulo = Field.objects.create(
            database=db, nome="Título", kind="text", ordem=0,
        )
        opcoes_status = [
            {"id": c.id, "label": c.label, "color": c.color}
            for c in tpl.colunas
        ]
        campo_status = Field.objects.create(
            database=db, nome="Status", kind="select",
            config={"options": opcoes_status}, ordem=1,
        )

        campos_extras_ids: dict[str, int] = {}
        for i, extra in enumerate(tpl.campos_extras, start=2):
            f = Field.objects.create(
                database=db,
                nome=extra["nome"],
                kind=extra["kind"],
                config=extra.get("config", {}),
                ordem=i,
            )
            campos_extras_ids[extra["nome"]] = f.id

        # 4) Records + CellValues
        for ordem, cartao in enumerate(tpl.cartoes):
            record = Record.objects.create(database=db, ordem=ordem)
            # Título
            CellValue.objects.create(
                record=record, field=campo_titulo, valor={"text": cartao.titulo}
            )
            # Status (já em id da coluna)
            col = next((c for c in tpl.colunas if c.id == cartao.status), None)
            valor_status = {"id": col.id, "label": col.label, "color": col.color} if col else {}
            CellValue.objects.create(
                record=record, field=campo_status, valor=valor_status
            )
            # Extras
            for nome_campo, valor in cartao.extras.items():
                fid = campos_extras_ids.get(nome_campo)
                if fid is None:
                    # Cria dinamicamente como texto se não estava pré-definido
                    f = Field.objects.create(
                        database=db, nome=nome_campo, kind="text",
                        ordem=Field.objects.filter(database=db).count(),
                    )
                    campos_extras_ids[nome_campo] = f.id
                    fid = f.id
                CellValue.objects.create(record=record, field_id=fid, valor={"value": valor})

        # 5) Views: Board (padrão) + Grade
        view_board = View.objects.create(
            database=db, nome="Quadro", kind="board",
            config={
                "campo_grupo_id": campo_status.id,
                "campo_grupo_nome": "Status",
                "campo_titulo_id": campo_titulo.id,
            },
            ordem=0,
        )
        View.objects.create(
            database=db, nome="Grade", kind="grid", config={}, ordem=1,
        )

        return Response(
            {
                "pagina_id": pagina.id,
                "database_id": db.id,
                "view_id": view_board.id,
            },
            status=status.HTTP_201_CREATED,
        )