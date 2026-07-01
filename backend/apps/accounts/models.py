from django.db import models


class AppSetting(models.Model):
    """Configurações globais do BincNote (singleton lógico)."""

    tema = models.CharField(
        max_length=10,
        choices=[("light", "Claro"), ("dark", "Escuro"), ("system", "Sistema")],
        default="system",
        verbose_name="Tema",
    )
    idioma = models.CharField(max_length=10, default="pt-br")

    class Meta:
        verbose_name = "Preferência"
        verbose_name_plural = "Preferências"

    def __str__(self) -> str:
        return f"Preferências ({self.idioma}, {self.tema})"