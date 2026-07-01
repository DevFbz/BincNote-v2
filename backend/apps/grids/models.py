from django.db import models

from apps.documents.models import Page


class Database(models.Model):
    """Banco de dados tabular vinculado a uma página do tipo 'database'."""
    pagina = models.OneToOneField(
        Page, on_delete=models.CASCADE, related_name="database"
    )
    nome = models.CharField(max_length=200, default="Novo banco")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Banco de Dados"
        verbose_name_plural = "Bancos de Dados"

    def __str__(self) -> str:
        return self.nome


class Field(models.Model):
    KINDS = [
        ("text", "Texto"),
        ("number", "Número"),
        ("date", "Data"),
        ("select", "Seleção Simples"),
        ("multiselect", "Seleção Múltipla"),
        ("checkbox", "Caixa de Seleção"),
        ("url", "URL"),
        ("email", "E-mail"),
        ("formula", "Fórmula"),
        ("relation", "Relação"),
        ("rollup", "Rollup"),
    ]

    database = models.ForeignKey(Database, on_delete=models.CASCADE, related_name="fields")
    nome = models.CharField(max_length=200)
    kind = models.CharField(max_length=20, choices=KINDS, default="text")
    config = models.JSONField(default=dict, blank=True)
    ordem = models.PositiveIntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Campo"
        verbose_name_plural = "Campos"
        ordering = ["ordem", "id"]

    def __str__(self) -> str:
        return f"{self.nome} ({self.kind})"


class Record(models.Model):
    database = models.ForeignKey(Database, on_delete=models.CASCADE, related_name="records")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    ordem = models.PositiveIntegerField(default=0)
    excluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Registro"
        verbose_name_plural = "Registros"
        ordering = ["ordem", "id"]

    def __str__(self) -> str:
        return f"Registro #{self.id}"


class CellValue(models.Model):
    record = models.ForeignKey(Record, on_delete=models.CASCADE, related_name="cells")
    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name="cells")
    valor = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Valor de Célula"
        verbose_name_plural = "Valores de Célula"
        unique_together = ("record", "field")

    def __str__(self) -> str:
        return f"{self.record_id}/{self.field_id}"


class View(models.Model):
    KINDS = [
        ("grid", "Grade"),
        ("board", "Quadro"),
        ("calendar", "Calendário"),
    ]

    database = models.ForeignKey(Database, on_delete=models.CASCADE, related_name="views")
    nome = models.CharField(max_length=200, default="Visualização")
    kind = models.CharField(max_length=20, choices=KINDS, default="grid")
    config = models.JSONField(default=dict, blank=True)
    ordem = models.PositiveIntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Visualização"
        verbose_name_plural = "Visualizações"
        ordering = ["ordem", "id"]

    def __str__(self) -> str:
        return f"{self.nome} ({self.kind})"