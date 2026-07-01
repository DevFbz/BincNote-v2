from rest_framework import generics

from apps.grids.models import View
from apps.grids.serializers import ListViewSerializer


class CalendarListView(generics.ListCreateAPIView):
    """Lista visualizações do tipo calendar."""
    serializer_class = ListViewSerializer

    def get_queryset(self):
        return View.objects.filter(kind="calendar")