from django.urls import include, path

urlpatterns = [
    path("accounts/", include("apps.accounts.urls")),
    path("documents/", include("apps.documents.urls")),
    path("grids/", include("apps.grids.urls")),
    path("boards/", include("apps.boards.urls")),
    path("calendar/", include("apps.calendar_app.urls")),
    path("ai/", include("apps.ai_app.urls")),
    path("", include("apps.documents.urls")),
]