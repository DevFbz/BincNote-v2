from django.db import models


class Workspace(models.Model):
    """Espaço de trabalho raiz (singleton lógico)."""
    nome = models.CharField(max_length=200, default="Meu Espaço")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Espaço de Trabalho"
        verbose_name_plural = "Espaços de Trabalho"

    def __str__(self) -> str:
        return self.nome


class Page(models.Model):
    KINDS = [
        ("document", "Documento"),
        ("database", "Banco de Dados"),
    ]

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="pages"
    )
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    titulo = models.CharField(max_length=500, blank=True, default="Sem título")
    icone = models.CharField(max_length=32, blank=True, default="")
    capa = models.CharField(max_length=500, blank=True, default="")
    kind = models.CharField(max_length=20, choices=KINDS, default="document")
    ordem = models.PositiveIntegerField(default=0)
    conteudo = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    excluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Página"
        verbose_name_plural = "Páginas"
        ordering = ["ordem", "id"]

    def __str__(self) -> str:
        return self.titulo or "Sem título"

    @property
    def na_lixeira(self) -> bool:
        return self.excluido_em is not None