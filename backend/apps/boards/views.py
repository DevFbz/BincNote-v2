from rest_framework import generics

from apps.grids.models import View
from apps.grids.serializers import ListViewSerializer


class BoardListView(generics.ListAPIView):
    """Lista apenas visualizações do tipo board."""
    serializer_class = ListViewSerializer

    def get_queryset(self):
        return View.objects.filter(kind="board")