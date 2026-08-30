POST
/send/text
Enviar mensagem de texto
Envia uma mensagem de texto para um contato, grupo ou canal/newsletter.

Recursos Específicos
Preview de links com suporte a personalização automática ou customizada
Formatação básica do texto
Substituição automática de placeholders dinâmicos
Envio para Newsletter
Para enviar texto para um canal, use o mesmo campo number, mas informe o JID completo do canal:

Exemplo: `120363123456789012@newsletter`

{
  "number": "120363123456789012@newsletter",
  "text": "Post publicado no canal"
}

Campos Comuns
Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar Mensagem", incluindo: `delay`, `readchat`, `readmessages`, `replyid`, `mentions`, `forward`, `track_source`, `track_id`, `placeholders` e envio para grupos.

Preview de Links
Preview Automático

{
  "number": "5511999999999",
  "text": "Confira: https://exemplo.com",
  "linkPreview": true
}

Preview Personalizado
{
  "number": "5511999999999",
  "text": "Confira nosso site! https://exemplo.com",
  "linkPreview": true,
  "linkPreviewTitle": "Título Personalizado",
  "linkPreviewDescription": "Uma descrição personalizada do link",
  "linkPreviewImage": "https://exemplo.com/imagem.jpg",
  "linkPreviewLarge": true
}

Request
Body
number
string
required
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net ou @lid) ou um ID de canal/newsletter (@newsletter).

Example: "5511999999999"

text
string
required
Texto da mensagem (aceita placeholders)

Example: "Olá {{name}}! Como posso ajudar?"

linkPreview
boolean
Ativa/desativa preview de links. Se true, procura automaticamente um link no texto para gerar preview.

Comportamento:

Se apenas linkPreview=true: gera preview automático do primeiro link encontrado no texto
Se fornecidos campos personalizados (title, description, image): usa os valores fornecidos
Se campos personalizados parciais: combina com dados automáticos do link como fallback
Example: true

linkPreviewTitle
string
Define um título personalizado para o preview do link

Example: "Título Personalizado"

linkPreviewDescription
string
Define uma descrição personalizada para o preview do link

Example: "Descrição personalizada do link"

linkPreviewImage
string
URL ou Base64 da imagem para usar no preview do link

Example: "https://exemplo.com/imagem.jpg"

linkPreviewLarge
boolean
Se true, gera um preview grande com upload da imagem. Se false, gera um preview pequeno sem upload

Example: true

replyid
string
ID da mensagem para responder

Example: "3EB0538DA65A59F6D8A251"

mentions
string
Números para mencionar (separados por vírgula)

Example: "5511999999999,5511888888888"

readchat
boolean
Marca conversa como lida após envio

Example: true

readmessages
boolean
Marca últimas mensagens recebidas como lidas

Example: true

delay
integer
Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...'

Example: 1000

forward
boolean
Marca a mensagem como encaminhada no WhatsApp

Example: true

track_source
string
Origem do rastreamento da mensagem

Example: "chatwoot"

track_id
string
ID para rastreamento da mensagem (aceita valores duplicados)

Example: "msg_123456789"

async
boolean
Se true, envia a mensagem de forma assíncrona via fila interna. Útil para alto volume de mensagens.


# exemplo de cURL
curl --request POST \
  --url https://free.uazapi.com/send/text \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "number": "5511999999999",
  "text": "Olá! Como posso ajudar?"
}'

# Responses

200 - mensagem enviada com sucesso
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "messageid": "string",
  "chatid": "string",
  "sender": "string",
  "senderName": "string",
  "isGroup": false,
  "fromMe": false,
  "messageType": "string",
  "source": "string",
  "messageTimestamp": 0,
  "status": "string",
  "text": "string",
  "quoted": "string",
  "edited": "string",
  "reaction": "string",
  "vote": "string",
  "convertOptions": "string",
  "buttonOrListid": "string",
  "owner": "string",
  "error": "string",
  "content": null,
  "wasSentByApi": false,
  "sendFunction": "string",
  "sendPayload": null,
  "fileURL": "string",
  "send_folder_id": "string",
  "track_source": "string",
  "track_id": "string",
  "ai_metadata": {
    "agent_id": "string",
    "request": {
      "messages": [
        "item"
      ],
      "tools": [
        "item"
      ],
      "options": {
        "model": "string",
        "temperature": 0,
        "maxTokens": 0,
        "topP": 0,
        "frequencyPenalty": 0,
        "presencePenalty": 0
      }
    },
    "response": {
      "choices": [
        "item"
      ],
      "toolResults": [
        "item"
      ],
      "error": "string"
    }
  },
  "sender_pn": "string",
  "sender_lid": "string",
  "response": {
    "status": "success",
    "message": "Message sent successfully"
  }
}

400 - requisicao invalida
{
  "error": "Missing number or text"
}

401 - Nao autorizado
{
  "error": "Invalid token"
}

429 - Limite de requisicao excedido
{
  "error": "Rate limit exceeded"
}

500 - erro interno
{
  "error": "Failed to send message"
}

