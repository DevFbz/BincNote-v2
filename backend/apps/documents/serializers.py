from rest_framework import serializers

from .models import Page, Workspace


class PageTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = [
            "id", "titulo", "icone", "capa", "kind", "ordem",
            "parent", "criado_em", "atualizado_em", "children",
        ]

    def get_children(self, obj):
        qs = obj.children.filter(excluido_em__isnull=True).order_by("ordem", "id")
        return PageTreeSerializer(qs, many=True).data


class PageSerializer(serializers.ModelSerializer):
    topo = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Page
        fields = [
            "id", "titulo", "icone", "capa", "kind", "ordem",
            "parent", "conteudo", "excluido_em",
            "criado_em", "atualizado_em", "topo",
        ]

    def create(self, validated_data):
        top = validated_data.pop("topo", False)
        if not validated_data.get("workspace_id"):
            ws, _ = Workspace.objects.get_or_create(pk=1, defaults={"nome": "Meu Espaço"})
            validated_data["workspace"] = ws
        if top and not validated_data.get("parent"):
            validated_data["ordem"] = 0
        return super().create(validated_data)


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "nome", "criado_em"]