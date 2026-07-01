from django.db.models import Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Page, Workspace
from .serializers import PageSerializer, PageTreeSerializer, WorkspaceSerializer


class WorkspaceDetailOrCreateView(APIView):
    def get(self, request):
        ws, _ = Workspace.objects.get_or_create(
            pk=1, defaults={"nome": "Meu Espaço"}
        )
        return Response(WorkspaceSerializer(ws).data)


class PageListView(generics.ListCreateAPIView):
    serializer_class = PageSerializer

    def get_queryset(self):
        qs = Page.objects.filter(excluido_em__isnull=True)
        parent_id = self.request.query_params.get("parent")
        if parent_id in (None, ""):
            qs = qs.filter(parent__isnull=True)
        elif parent_id == "lixeira":
            qs = Page.objects.filter(excluido_em__isnull=False)
        else:
            qs = qs.filter(parent_id=parent_id)
        return qs.order_by("ordem", "id")

    def list(self, request, *args, **kwargs):
        if request.query_params.get("arvore") == "1":
            qs = Page.objects.filter(
                parent__isnull=True, excluido_em__isnull=True
            ).order_by("ordem", "id")
            return Response(PageTreeSerializer(qs, many=True).data)
        return super().list(request, *args, **kwargs)


class PageDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    http_method_names = ["get", "patch", "delete"]

    def perform_destroy(self, instance):
        from django.utils import timezone
        instance.excluido_em = timezone.now()
        instance.save(update_fields=["excluido_em"])


class PageRestoreView(APIView):
    def post(self, request, pk):
        page = generics.get_object_or_404(Page, pk=pk)
        page.excluido_em = None
        page.save(update_fields=["excluido_em"])
        return Response(PageSerializer(page).data)


class PageBlocksView(APIView):
    def patch(self, request, pk):
        page = generics.get_object_or_404(Page, pk=pk)
        page.conteudo = request.data.get("conteudo", page.conteudo)
        page.save(update_fields=["conteudo", "atualizado_em"])
        return Response(PageSerializer(page).data, status=status.HTTP_200_OK)


class PageSearchView(APIView):
    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response([])
        qs = Page.objects.filter(
            Q(titulo__icontains=q), excluido_em__isnull=True
        )[:50]
        return Response(PageSerializer(qs, many=True).data)