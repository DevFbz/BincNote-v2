import os, sys
sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bincnote.settings")
import django
django.setup()
from apps.ai_app.views import SLAReportView
print("SLA_IMPORT_OK")
from apps.ai_app.urls import urlpatterns
names = [p.name for p in urlpatterns if hasattr(p, "name")]
assert "ai-relatorio-sla" in names, f"Missing in {names}"
print("SLA_URL_OK")
