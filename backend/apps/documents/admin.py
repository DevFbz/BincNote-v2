from django.contrib import admin

from .models import Page, Workspace

admin.site.register(Workspace)
admin.site.register(Page)