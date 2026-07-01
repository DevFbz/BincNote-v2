from django.conf import settings
from django.db import models


class AIConversation(models.Model):
    titulo = models.CharField(max_length=200, default="Nova conversa")
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Conversa de IA"
        verbose_name_plural = "Conversas de IA"
        ordering = ["-criada_em"]

    def __str__(self) -> str:
        return self.titulo


class AIMessage(models.Model):
    ROLES = [
        ("system", "Sistema"),
        ("user", "Eu"),
        ("assistant", "Assistente"),
    ]

    conversa = models.ForeignKey(
        AIConversation, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=20, choices=ROLES)
    conteudo = models.TextField()
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Mensagem de IA"
        verbose_name_plural = "Mensagens de IA"
        ordering = ["criada_em"]

    def __str__(self) -> str:
        return f"{self.role}: {self.conteudo[:40]}"


def default_endpoint():
    return {
        "api_base": settings.AI_API_BASE,
        "model": settings.AI_MODEL,
        "tem_chave": bool(settings.AI_API_KEY),
    }