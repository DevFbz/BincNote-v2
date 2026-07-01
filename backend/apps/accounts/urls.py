from django.urls import path

from .views import PreferenciasView

urlpatterns = [
    path("preferencias/", PreferenciasView.as_view(), name="preferencias"),
]