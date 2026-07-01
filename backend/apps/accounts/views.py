from rest_framework import status, views
from rest_framework.response import Response

from .models import AppSetting
from .serializers import AppSettingSerializer


class PreferenciasView(views.APIView):
    """CRUD simples das preferências locais (registro único)."""

    def get(self, request):
        pref, _ = AppSetting.objects.get_or_create(pk=1)
        return Response(AppSettingSerializer(pref).data)

    def patch(self, request):
        pref, _ = AppSetting.objects.get_or_create(pk=1)
        serializer = AppSettingSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)