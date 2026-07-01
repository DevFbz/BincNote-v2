from django.urls import path

from . import views

urlpatterns = [
    path("workspace/", views.WorkspaceDetailOrCreateView.as_view(), name="workspace"),
    path("pages/", views.PageListView.as_view(), name="page-list"),
    path("pages/buscar/", views.PageSearchView.as_view(), name="page-search"),
    path("pages/<int:pk>/", views.PageDetailView.as_view(), name="page-detail"),
    path("pages/<int:pk>/restaurar/", views.PageRestoreView.as_view(), name="page-restore"),
    path("pages/<int:pk>/conteudo/", views.PageBlocksView.as_view(), name="page-blocks"),
]