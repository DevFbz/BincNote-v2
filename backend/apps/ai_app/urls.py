from django.urls import path

from . import views

urlpatterns = [
    path("conversas/", views.AIConversationListView.as_view(), name="ai-conversation-list"),
    path("conversas/<int:pk>/", views.AIConversationDetailView.as_view(), name="ai-conversation-detail"),
    path("conversas/<int:conversa_pk>/mensagens/", views.AIMessageListView.as_view(), name="ai-message-list"),
    path("conversas/<int:conversa_pk>/chat/", views.AIChatView.as_view(), name="ai-chat"),
    path("acao/", views.AIActionView.as_view(), name="ai-action"),
]