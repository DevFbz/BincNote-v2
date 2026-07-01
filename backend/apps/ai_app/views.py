import json
from django.conf import settings
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

import requests

from apps.documents.models import Page
from .models import AIConversation, AIMessage
from .serializers import AIConversationSerializer, AIMessageSerializer


class AIConversationListView(generics.ListCreateAPIView):
    queryset = AIConversation.objects.all()
    serializer_class = AIConversationSerializer


class AIConversationDetailView(generics.RetrieveDestroyAPIView):
    queryset = AIConversation.objects.all()
    serializer_class = AIConversationSerializer


class AIMessageListView(generics.ListCreateAPIView):
    serializer_class = AIMessageSerializer

    def get_queryset(self):
        return AIMessage.objects.filter(conversa_id=self.kwargs.get("conversa_pk"))


def _chamar_modelo(mensagens: list[dict[str, str]]) -> str:
    if settings.AI_API_KEY:
        try:
            resp = requests.post(
                f"{settings.AI_API_BASE.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.AI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.AI_MODEL,
                    "messages": mensagens,
                    "temperature": 0.7,
                },
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as exc:
            return f"[erro ao chamar a IA: {exc}]"
    return _simular(mensagens)


def _simular(mensagens: list[dict[str, str]]) -> str:
    ult = mensagens[-1]["content"] if mensagens else ""
    return (
        "Modo simulação: configure AI_API_KEY no .env para usar a IA real. "
        f"Recebido: {ult[:140]}"
    )


class AIChatView(APIView):
    def post(self, request, conversa_pk):
        conversa = AIConversation.objects.filter(pk=conversa_pk).first()
        if not conversa:
            return Response(
                {"detail": "Conversa não encontrada."}, status=status.HTTP_404_NOT_FOUND
            )
        pergunta = request.data.get("conteudo", "").strip()
        pagina_id = request.data.get("pagina_id")
        if not pergunta:
            return Response(
                {"detail": "Conteúdo vazio."}, status=status.HTTP_400_BAD_REQUEST
            )
        AIMessage.objects.create(conversa=conversa, role="user", conteudo=pergunta)

        historico = [
            {"role": m.role, "content": m.conteudo}
            for m in conversa.messages.all()
        ]

        # Build system prompt with page context if available
        system_prompt = "Você é um assistente em português do Brasil, útil e conciso."
        if pagina_id:
            try:
                pagina = Page.objects.get(pk=pagina_id)
                titulo = pagina.titulo or "Sem título"
                conteudo_str = (
                    json.dumps(pagina.conteudo, ensure_ascii=False)
                    if isinstance(pagina.conteudo, dict)
                    else str(pagina.conteudo or "")
                )
                system_prompt = (
                    f"Você é um assistente integrado ao BincNote, um editor de notas. "
                    f"O usuário está editando a página chamada '{titulo}'. "
                    f"Abaixo está o conteúdo atual da página em formato JSON do TipTap (editor rich-text):\n\n"
                    f"{conteudo_str[:2000]}\n\n"
                    f"Sempre que o usuário pedir para formatar, reestruturar ou modificar o texto da página, "
                    f"responda com o conteúdo formatado em markdown. "
                    f"Se for apenas uma pergunta, responda normalmente. "
                    f"Seja útil e responda em português do Brasil."
                )
            except Page.DoesNotExist:
                pass

        historico.insert(0, {"role": "system", "content": system_prompt})
        resposta = _chamar_modelo(historico)
        msg_ia = AIMessage.objects.create(conversa=conversa, role="assistant", conteudo=resposta)

        if conversa.titulo == "Nova conversa":
            conversa.titulo = pergunta[:60]
            conversa.save(update_fields=["titulo"])

        return Response(AIMessageSerializer(msg_ia).data, status=status.HTTP_201_CREATED)


class AIActionView(APIView):
    """Ações de IA aplicadas a um trecho de texto (sem persistir conversa)."""

    ACOES = {
        "resumir": "Resuma o texto a seguir em português do Brasil, em tópicos curtos.",
        "traduzir": "Traduza o texto a seguir para o português do Brasil.",
        "reformular": "Reescreva o texto a seguir de forma mais clara, em português do Brasil.",
        "continuar": "Continue o texto a seguir mantendo o estilo e o idioma português do Brasil.",
        "corrigir": "Corrija gramática, ortografia e pontuação do texto em português do Brasil.",
    }

    def post(self, request):
        acao = request.data.get("acao")
        trecho = request.data.get("trecho", "")
        if acao not in self.ACOES or not trecho.strip():
            return Response(
                {"detail": "Ação inválida ou trecho vazio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mensagens = [
            {"role": "system", "content": "Você é um escritor em português do Brasil."},
            {"role": "user", "content": f"{self.ACOES[acao]}\n\n{trecho}"},
        ]
        return Response({"resultado": _chamar_modelo(mensagens)})