from django.urls import path

from . import views

urlpatterns = [
    path("", views.CalendarListView.as_view(), name="calendar-list"),
]