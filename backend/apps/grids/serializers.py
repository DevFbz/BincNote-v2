from rest_framework import serializers

from .models import CellValue, Database, Field, Record, View


class FieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = Field
        fields = ["id", "database", "nome", "kind", "config", "ordem", "criado_em"]


class CellValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CellValue
        fields = ["id", "record", "field", "valor"]


class RecordSerializer(serializers.ModelSerializer):
    cells = CellValueSerializer(many=True, read_only=True)

    class Meta:
        model = Record
        fields = ["id", "database", "ordem", "excluido_em", "criado_em", "atualizado_em", "cells"]


class ListViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = View
        fields = ["id", "database", "nome", "kind", "config", "ordem", "criado_em"]


class DatabaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Database
        fields = ["id", "pagina", "nome", "criado_em"]


class DatabaseDetailSerializer(DatabaseSerializer):
    fields = FieldSerializer(many=True, read_only=True)
    views = ListViewSerializer(many=True, read_only=True)

    class Meta(DatabaseSerializer.Meta):
        fields = DatabaseSerializer.Meta.fields + ["fields", "views"]