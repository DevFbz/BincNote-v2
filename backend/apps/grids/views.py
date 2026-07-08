from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.documents.models import Page

from .models import CellValue, Database, Field, Record, View
from .serializers import (
    CellValueSerializer,
    DatabaseDetailSerializer,
    DatabaseSerializer,
    FieldSerializer,
    ListViewSerializer,
    RecordSerializer,
)


class DatabaseListView(generics.ListCreateAPIView):
    serializer_class = DatabaseSerializer

    def get_queryset(self):
        return Database.objects.all()

    def create(self, request, *args, **kwargs):
        pagina_id = request.data.get("pagina")
        if not pagina_id:
            return Response(
                {"detail": "Informe 'pagina' para criar um banco."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pagina = Page.objects.filter(pk=pagina_id).first()
        if not pagina:
            return Response(
                {"detail": "Página não encontrada."}, status=status.HTTP_404_NOT_FOUND
            )
        pagina.kind = "database"
        pagina.save(update_fields=["kind", "atualizado_em"])
        db = Database.objects.create(
            pagina=pagina, nome=request.data.get("nome", pagina.titulo or "Novo banco")
        )
        View.objects.create(database=db, nome="Grade", kind="grid")
        return Response(DatabaseSerializer(db).data, status=status.HTTP_201_CREATED)


class DatabaseDetailView(generics.RetrieveDestroyAPIView):
    queryset = Database.objects.all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response(DatabaseDetailSerializer(instance).data)


class FieldListView(generics.ListCreateAPIView):
    queryset = Field.objects.all()
    serializer_class = FieldSerializer


class FieldDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Field.objects.all()
    serializer_class = FieldSerializer


class RecordListView(generics.ListCreateAPIView):
    serializer_class = RecordSerializer

    def get_queryset(self):
        db_id = self.kwargs.get("db_id")
        return Record.objects.filter(database_id=db_id, excluido_em__isnull=True)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data["database"] = self.kwargs.get("db_id")
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)


class RecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Record.objects.all()
    serializer_class = RecordSerializer

    def perform_destroy(self, instance):
        instance.excluido_em = timezone.now()
        instance.save(update_fields=["excluido_em"])


class CellValueView(APIView):
    def patch(self, request, record_pk, field_pk):
        try:
            cell = CellValue.objects.get(record_id=record_pk, field_id=field_pk)
        except CellValue.DoesNotExist:
            field = Field.objects.filter(pk=field_pk).first()
            if not field:
                return Response(
                    {"detail": "Campo não encontrado."}, status=status.HTTP_404_NOT_FOUND
                )
            cell = CellValue.objects.create(
                record_id=record_pk, field_id=field_pk, valor=request.data.get("valor", {})
            )
        cell.valor = request.data.get("valor", cell.valor)
        cell.save(update_fields=["valor"])
        return Response(CellValueSerializer(cell).data)


class ViewListView(generics.ListCreateAPIView):
    serializer_class = ListViewSerializer

    def get_queryset(self):
        return View.objects.filter(database_id=self.kwargs.get("db_id"))

    def perform_create(self, serializer):
        serializer.save(database_id=self.kwargs.get("db_id"))


class ViewDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = View.objects.all()
    serializer_class = ListViewSerializer


class DatabaseByPageView(APIView):
    """Retorna o database vinculado a uma página (status 404 se não existir)."""

    def get(self, request, pagina_id):
        try:
            db = Database.objects.get(pagina_id=pagina_id)
        except Database.DoesNotExist:
            return Response({"detail": "Esta página não é um banco de dados."},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({
            "id": db.id,
            "pagina": db.pagina_id,
            "nome": db.nome,
            "criado_em": db.criado_em.isoformat(),
        })


class EnsureFieldsView(APIView):
    """Garante que campos obrigatórios existam no database.
    Recebe lista de campos em body: [{"nome": "...", "kind": "...", "config": {...}}]
    Cria apenas os que ainda não existem (por nome). Idempotente.
    """

    def post(self, request, db_id):
        try:
            db = Database.objects.get(pk=db_id)
        except Database.DoesNotExist:
            return Response({"detail": "Database não encontrado."},
                            status=status.HTTP_404_NOT_FOUND)

        campos_desejados = request.data.get("fields", [])
        campos_existentes = {
            f.nome: f for f in Field.objects.filter(database=db)
        }
        criados = []

        for campo in campos_desejados:
            nome = campo.get("nome", "").strip()
            if not nome or nome in campos_existentes:
                continue
            ordem = Field.objects.filter(database=db).count()
            f = Field.objects.create(
                database=db,
                nome=nome,
                kind=campo.get("kind", "text"),
                config=campo.get("config", {}),
                ordem=ordem,
            )
            criados.append({"id": f.id, "nome": f.nome, "kind": f.kind})

        return Response({"criados": criados}, status=status.HTTP_200_OK)