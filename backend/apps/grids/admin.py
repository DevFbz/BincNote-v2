from django.contrib import admin

from .models import CellValue, Database, Field, Record, View

for model in (Database, Field, Record, CellValue, View):
    admin.site.register(model)