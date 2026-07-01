from django.apps import AppConfig


class AiAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ai_app"
    label = "ai_app"
    verbose_name = "Assistente de IA"