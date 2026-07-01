from django.urls import path

from . import views
from .template_views import (
    TemplateKanbanCriarView,
    TemplateKanbanListView,
)

urlpatterns = [
    path("databases/", views.DatabaseListView.as_view(), name="database-list"),
    path("databases/<int:pk>/", views.DatabaseDetailView.as_view(), name="database-detail"),
    path("databases/<int:db_id>/views/", views.ViewListView.as_view(), name="view-list"),
    path("views/<int:pk>/", views.ViewDetailView.as_view(), name="view-detail"),
    path("fields/", views.FieldListView.as_view(), name="field-list"),
    path("fields/<int:pk>/", views.FieldDetailView.as_view(), name="field-detail"),
    path("databases/<int:db_id>/records/", views.RecordListView.as_view(), name="record-list"),
    path("records/<int:pk>/", views.RecordDetailView.as_view(), name="record-detail"),
    path("cells/<int:record_pk>/<int:field_pk>/", views.CellValueView.as_view(), name="cell-update"),
    path("templates/kanban/", TemplateKanbanListView.as_view(), name="template-kanban-list"),
    path("templates/kanban/criar/", TemplateKanbanCriarView.as_view(), name="template-kanban-criar"),
    path("por-pagina/<int:pagina_id>/", views.DatabaseByPageView.as_view(), name="db-by-page"),
]