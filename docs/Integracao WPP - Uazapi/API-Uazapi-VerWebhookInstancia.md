GET
/webhook
Ver Webhook da Instância
Retorna a configuração atual do webhook da instância, incluindo:

URL configurada
Eventos ativos
Filtros aplicados
Configurações adicionais
Exemplo de resposta:

[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "enabled": true,
    "url": "https://example.com/webhook",
    "events": ["messages", "messages_update"],
    "excludeMessages": ["wasSentByApi", "isGroupNo"],
    "addUrlEvents": true,
    "addUrlTypesMessages": true
  },
  {
    "id": "987fcdeb-51k3-09j8-x543-864297539100",
    "enabled": true,
    "url": "https://outro-endpoint.com/webhook",
    "events": ["connection", "presence"],
    "excludeMessages": [],
    "addUrlEvents": false,
    "addUrlTypesMessages": false
  }
]

A resposta é sempre um array, mesmo quando há apenas um webhook configurado.

# Exemplo de cURL

GET https://free.uazapi.com/webhook
curl --request GET \
  --url https://free.uazapi.com/webhook \
  --header 'Accept: application/json'

# RESPONSES

200 - SUCESSO
[
  {
    "id": "wh_9a8b7c6d5e",
    "enabled": true,
    "url": "https://webhook.cool/example",
    "events": [
      "messages",
      "newsletter_messages",
      "connection"
    ],
    "addUrlTypesMessages": false,
    "addUrlEvents": false,
    "excludeMessages": []
  }
]

401 - TOKEN INVALIDO OU NAO FORNECIDO
{
  "error": "missing token"
}

500 - ERRO INTERNO
{
  "error": "Failed to process webhook data"
}