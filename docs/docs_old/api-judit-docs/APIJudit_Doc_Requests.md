## DOCUMENTAÇAO PARA REQUESTS - API JUDIT

# BUSCA PROCESSUAL
Busca Processual (Assíncrona)
Aprenda a realizar buscas processuais nos tribunais em tempo real, acompanhar o status da extração e obter os resultados completos com ou sem inteligência artificial (E7 Agente Processual)

🤖 A rota de busca processual opera de forma assíncrona. A aplicação cliente deve fazer um POST /requests para iniciar a busca, aguardar o processamento (via Webhook ou consultando via GET /requests/{id}) e, quando o status for completed, capturar os dados via GET /responses.
​
Entendendo o Fluxo Assíncrono
Como a extração de dados diretamente dos tribunais pode levar alguns segundos ou minutos (dependendo da instabilidade do tribunal), a Judit API utiliza um padrão assíncrono de requisições.
O fluxo consiste em 3 passos simples:
Criar a requisição: Você envia o número do processo.
Acompanhar o status: Você verifica se o robô terminou a extração.
Capturar o resultado: Você consome o JSON com os dados do processo.
​
Passo 1: Criando a Requisição de Busca
Para iniciar uma busca processual, faça uma requisição POST para a rota base de requisições enviando os parâmetros desejados no corpo (body) da chamada.
​
Parâmetros do Payload (Body)
Consulte a tabela abaixo para configurar sua busca, habilitar anexos.

Passo 1: Criando a Requisição de Busca
Para iniciar uma busca processual, faça uma requisição POST para a rota base de requisições enviando os parâmetros desejados no corpo (body) da chamada.
​
Parâmetros do Payload (Body)
Consulte a tabela abaixo para configurar sua busca, habilitar anexos ou acionar a Judit IA:
Parâmetro	Tipo	Obrigatório	Descrição
search.search_type	string	Sim	Define a entidade buscada. Para processos, use sempre "lawsuit_cnj".
search.search_key	string	Sim	O número do processo no padrão CNJ (ex: "0009999-99.9999.8.26.9999").
cache_ttl_in_days	integer	Não	Otimiza a busca retornando dados cacheados caso o processo já tenha sido consultado nos últimos X dias.
with_attachments	boolean	Não	Se true, a Judit fará o download dos arquivos do processo.
judit_ia	array	Não	Lista de features de IA aplicadas ao resultado. Envie ["summary"] para receber um resumo humanizado da capa e andamentos.
search_params.lawsuit_instance	integer	Não	Força a busca em uma instância específica (ex: 1 ou 2).

Exemplo de Requisição (POST)
cURL (Sem Anexos)
curl --location 'https://requests.prod.judit.io/requests/' \
--header 'Content-Type: application/json' \
--header 'api-key: <api-key>' \
--data '{
    "search": {
        "search_type": "lawsuit_cnj",
        "search_key": "0009999-99.9999.8.26.9999"
    },
    "with_attachments": false
}'

cURL (Com Anexos)
curl --location 'https://requests.prod.judit.io/requests/' \
--header 'Content-Type: application/json' \
--header 'api-key: <api-key>' \
--data '{
    "search": {
        "search_type": "lawsuit_cnj",
        "search_key": "0009999-99.9999.8.26.9999"
    },
    "with_attachments": true
}'

cURL (Com Anexos e IA)
curl --location 'https://requests.prod.judit.io/requests/' \
--header 'Content-Type: application/json' \
--header 'api-key: <api-key>' \
--data '{
    "search": {
        "search_type": "lawsuit_cnj",
        "search_key": "0009999-99.9999.8.26.9999"
    },
    "with_attachments": true,
    "judit_ia": ["summary"]
}'

Exemplo de resposta (status 201)
{
    "request_id": "84b4d8f5-50f8-4c14-818f-912c722a6908",
    "search": {
        "search_type": "lawsuit_cnj",
        "search_key": "0009999-99.9999.8.26.9999",
        "response_type": "lawsuit"
    },
    "with_attachments": true,
    "status": "processing",
    "created_at": "2024-06-18T22:03:35.560Z"
}

Guarde o valor de request_id, pois você precisará dele para os próximos passos.

Passo 2: Consultar o Status da Requisição
Esta etapa é crucial caso você não esteja utilizando Webhooks. As respostas são inseridas no banco de dados de forma incremental à medida que os robôs interagem com o tribunal.
Para saber se a extração finalizou, consulte o endpoint de histórico de requisições passando o ID gerado no Passo 1:

cURL
curl --location 'https://requests.prod.judit.io/requests/<request_id>' \
--header 'api-key: <api-key>' \
--header 'Content-Type: application/json' \
--data ''

Exemplo de resposta (200 OK)
{
  "request_id": "05ee9825-b2b4-480b-b29e-f071ca7d9c72",
  "search": {
      "search_type": "lawsuit",
      "search_key": "9999999-99.9999.9.99.9999",
      "response_type": "lawsuit",
      "search_params": {
        "filter": {},
        "pagination": {}
      }
  },
  "origin": "api",
  "origin_id": "46fac09a-b34f-4dfd-a24f-b358bf04dfd4",
  "user_id": "82082593-c664-4d7b-b174-2f0dc4791daf",
  "status": "completed",
  "created_at": "2024-02-21T17:33:22.876Z",
  "updated_at": "2024-02-21T17:33:26.316Z",
  "tags": {
      "dashboard_id": null
  }
}

Aguarde até que a propriedade status mude para "completed".

Passo 3: Capturar o Resultado (O Processo)
Assim que o status estiver completed, você pode resgatar os dados completos do processo judicial (e o resumo da IA, se solicitado).

cURL
curl --location 'https://requests.prod.judit.io/responses?page_size=100&request_id=%3Crequest_id%3E' \
--header 'api-key: <api-key>' \
--header 'Content-Type: application/json' \
--data ''

Exemplo de resposta simples (200 OK)
{
        "request_status": "completed",
        "page": 1,
        "page_count": 1,
        "all_pages_count": 1,
        "all_count": 1,
        "page_data": [
            {
                "request_id": "03abbf28-822e-45a0-a22c-098fbe157aa4",
                "response_id": "061c60b2-7fa9-4d20-87bb-1bedd31d5572",
                "origin": "api",
                "origin_id": "03abbf28-822e-45a0-a22c-098fbe157aa4",
                "response_type": "lawsuit",
                "response_data": {
                    "code": "9999999-99.9999.9.99.9999",
                    "justice": "8",
                    "tribunal": "26",
                    "instance": 1,
                    "distribution_date": "2019-02-15T16:00:00.000Z",
                    "judge": "Usuário teste",
                    "tribunal_acronym": "TJSP",
                    "secrecy_level": 0,
                    "tags": {
                        "crawl_id": "a9b6820a-6c84-4db5-b4f4-2f1909aa3805",
                        "dictionary_updated_at": "2025-08-13T18:43:48.143Z"
                    },
                    "subjects": [
                        {
                            "code": "",
                            "name": "PAGAMENTO"
                        }
                    ],
                    "classifications": [
                        {
                            "code": "7",
                            "name": "PROCEDIMENTO COMUM CÍVEL"
                        }
                    ],
                    "courts": [
                        {
                            "name": "1ª Vara Cível"
                        }
                    ],
                    "parties": [
                        {
                            "main_document": "99999999999",
                            "name": "Usuário 2",
                            "side": "Passive",
                            "person_type": "Desconhecido",
                            "documents": [
                                {
                                    "document": "99999999999",
                                    "document_type": "cpf"
                                }
                            ],
                            "lawyers": [
                                {
                                    "name": "Usuário 3",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "main_document": "99999999999",
                            "name": "Usuário 4",
                            "side": "Active",
                            "person_type": "Desconhecido",
                            "documents": [
                                {
                                    "document": "99999999999",
                                    "document_type": "cnpj"
                                }
                            ],
                            "lawyers": [
                                {
                                    "name": "Usuário 5",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "name": "Usuário 4",
                            "side": "Active",
                            "person_type": "Desconhecido",
                            "documents": [],
                            "lawyers": [
                                {
                                    "name": "Usuário 5",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "name": "Usuário 2",
                            "side": "Passive",
                            "person_type": "Desconhecido",
                            "documents": [],
                            "lawyers": [
                                {
                                    "name": "Usuário 3",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "name": "Usuário 5",
                            "side": "Active",
                            "person_type": "Advogado",
                            "documents": []
                        },
                        {
                            "name": "Usuário 3",
                            "side": "Passive",
                            "person_type": "Advogado",
                            "documents": []
                        }
                    ],
                    "steps": [
                        {
                            "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                            "lawsuit_instance": 1,
                            "step_date": "2019-07-16T00:00:00.000Z",
                            "private": false,
                            "tags": {
                                "crawl_id": "36fc0ffd-98fa-4990-bd6f-6a82e5565119"
                            },
                            "step_id": "56174b2e",
                            "content": "Início da Execução Juntado\n0003695-16.2019.8.26.0189 - Cumprimento de sentença",
                            "steps_count": 32,
                            "created_at": "2025-07-09T13:48:33.114Z",
                            "updated_at": "2025-08-11T18:57:39.041Z"
                        },
                        {
                            "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                            "lawsuit_instance": 1,
                            "step_date": "2019-06-06T00:00:00.000Z",
                            "private": false,
                            "tags": {
                                "crawl_id": "36fc0ffd-98fa-4990-bd6f-6a82e5565119"
                            },
                            "step_id": "939794b9",
                            "content": "Arquivado Definitivamente",
                            "created_at": "2025-07-09T13:48:33.114Z",
                            "updated_at": "2025-08-11T18:57:39.041Z"
                        },
                        {
                            "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                            "lawsuit_instance": 1,
                            "step_date": "2019-06-06T00:00:00.000Z",
                            "private": false,
                            "tags": {
                                "crawl_id": "36fc0ffd-98fa-4990-bd6f-6a82e5565119"
                            },
                            "step_id": "423978eb",
                            "content": "Trânsito em Julgado às partes\nCertidão de trânsito em julgado e remessa ao arquivo geral",
                            "created_at": "2025-07-09T13:48:33.114Z",
                            "updated_at": "2025-08-11T18:57:39.041Z"
                        }
                    ],
                    "attachments": [
                        {
                            "attachment_id": "60153051-1-1",
                            "attachment_date": "2019-02-15T16:00:41.000Z",
                            "attachment_name": "Petição (Outras)",
                            "extension": "pdf",
                            "status": "pending",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        },
                        {
                            "attachment_id": "60153057-5-1",
                            "attachment_date": "2019-02-15T16:00:42.000Z",
                            "attachment_name": "Instrumento de Procuração",
                            "extension": "pdf",
                            "status": "pending",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        },
                        {
                            "attachment_id": "60153061-6-1",
                            "attachment_date": "2019-02-15T16:00:43.000Z",
                            "attachment_name": "Guia",
                            "extension": "pdf",
                            "status": "pending",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        },
                        {
                            "attachment_id": "60153064-7-1",
                            "attachment_date": "2019-02-15T16:00:44.000Z",
                            "attachment_name": "Guia",
                            "extension": "pdf",
                            "status": "pending",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        }
                    ],
                    "related_lawsuits": [],
                    "crawler": {
                        "source_name": "JSaj - TJ - SP - Lawsuit - Auth - 1 instance",
                        "crawl_id": "a9b6820a-6c84-4db5-b4f4-2f1909aa3805",
                        "weight": 10,
                        "updated_at": "2025-08-13T18:43:47.770Z"
                    },
                    "metadata": {},
                    "county": "VARA JUIZADO ESP. CIVEL CRIM. DE FERNANDOPOLIS",
                    "amount": 5798,
                    "state": "SP",
                    "city": "FERNANDOPOLIS",
                    "justice_description": "JUSTIÇA ESTADUAL",
                    "last_step": {
                        "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                        "lawsuit_instance": 1,
                        "step_date": "2019-07-16T00:00:00.000Z",
                        "private": false,
                        "tags": {
                            "crawl_id": "a9b6820a-6c84-4db5-b4f4-2f1909aa3805"
                        },
                        "step_id": "56174b2e",
                        "content": "Início da Execução Juntado\n0003695-16.2019.8.26.0189 - Cumprimento de sentença",
                        "steps_count": 32
                    },
                    "phase": "Execução ou cumprimento",
                    "status": "Ativo",
                    "name": "Usuário 4 X Usuário 2",
                    "created_at": "2025-08-13T18:43:51.016Z",
                    "updated_at": "2025-08-13T18:43:51.016Z",
                    "free_justice": false
                },
                "user_id": "7f8065a3-4891-428d-9456-dedfc12ff850",
                "created_at": "2025-08-13T18:40:54.982Z",
                "request_created_at": "2025-08-13T18:40:54.037Z",
                "tags": {
                    "debug": true,
                    "dashboard_id": null,
                    "cached_response": false,
                    "cached": false
                }
            }
        ]
    }

Exemplo de resposta com anexo (200 OK)
{
        "request_status": "completed",
        "page": 1,
        "page_count": 1,
        "all_pages_count": 1,
        "all_count": 1,
        "page_data": [
            {
                "request_id": "03abbf28-822e-45a0-a22c-098fbe157aa4",
                "response_id": "061c60b2-7fa9-4d20-87bb-1bedd31d5572",
                "origin": "api",
                "origin_id": "03abbf28-822e-45a0-a22c-098fbe157aa4",
                "response_type": "lawsuit",
                "response_data": {
                    "code": "9999999-99.9999.9.99.9999",
                    "justice": "8",
                    "tribunal": "26",
                    "instance": 1,
                    "distribution_date": "2019-02-15T16:00:00.000Z",
                    "judge": "Usuário teste",
                    "tribunal_acronym": "TJSP",
                    "secrecy_level": 0,
                    "tags": {
                        "crawl_id": "a9b6820a-6c84-4db5-b4f4-2f1909aa3805",
                        "dictionary_updated_at": "2025-08-13T18:43:48.143Z"
                    },
                    "subjects": [
                        {
                            "code": "",
                            "name": "PAGAMENTO"
                        }
                    ],
                    "classifications": [
                        {
                            "code": "7",
                            "name": "PROCEDIMENTO COMUM CÍVEL"
                        }
                    ],
                    "courts": [
                        {
                            "name": "1ª Vara Cível"
                        }
                    ],
                    "parties": [
                        {
                            "main_document": "99999999999",
                            "name": "Usuário 2",
                            "side": "Passive",
                            "person_type": "Desconhecido",
                            "documents": [
                                {
                                    "document": "99999999999",
                                    "document_type": "cpf"
                                }
                            ],
                            "lawyers": [
                                {
                                    "name": "Usuário 3",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "main_document": "99999999999",
                            "name": "Usuário 4",
                            "side": "Active",
                            "person_type": "Desconhecido",
                            "documents": [
                                {
                                    "document": "99999999999",
                                    "document_type": "cnpj"
                                }
                            ],
                            "lawyers": [
                                {
                                    "name": "Usuário 5",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "name": "Usuário 4",
                            "side": "Active",
                            "person_type": "Desconhecido",
                            "documents": [],
                            "lawyers": [
                                {
                                    "name": "Usuário 5",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "name": "Usuário 2",
                            "side": "Passive",
                            "person_type": "Desconhecido",
                            "documents": [],
                            "lawyers": [
                                {
                                    "name": "Usuário 3",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "name": "Usuário 5",
                            "side": "Active",
                            "person_type": "Advogado",
                            "documents": []
                        },
                        {
                            "name": "Usuário 3",
                            "side": "Passive",
                            "person_type": "Advogado",
                            "documents": []
                        }
                    ],
                    "steps": [
                        {
                            "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                            "lawsuit_instance": 1,
                            "step_date": "2019-07-16T00:00:00.000Z",
                            "private": false,
                            "tags": {
                                "crawl_id": "36fc0ffd-98fa-4990-bd6f-6a82e5565119"
                            },
                            "step_id": "56174b2e",
                            "content": "Início da Execução Juntado\n0003695-16.2019.8.26.0189 - Cumprimento de sentença",
                            "steps_count": 32,
                            "created_at": "2025-07-09T13:48:33.114Z",
                            "updated_at": "2025-08-11T18:57:39.041Z"
                        },
                        {
                            "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                            "lawsuit_instance": 1,
                            "step_date": "2019-06-06T00:00:00.000Z",
                            "private": false,
                            "tags": {
                                "crawl_id": "36fc0ffd-98fa-4990-bd6f-6a82e5565119"
                            },
                            "step_id": "939794b9",
                            "content": "Arquivado Definitivamente",
                            "created_at": "2025-07-09T13:48:33.114Z",
                            "updated_at": "2025-08-11T18:57:39.041Z"
                        },
                        {
                            "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                            "lawsuit_instance": 1,
                            "step_date": "2019-06-06T00:00:00.000Z",
                            "private": false,
                            "tags": {
                                "crawl_id": "36fc0ffd-98fa-4990-bd6f-6a82e5565119"
                            },
                            "step_id": "423978eb",
                            "content": "Trânsito em Julgado às partes\nCertidão de trânsito em julgado e remessa ao arquivo geral",
                            "created_at": "2025-07-09T13:48:33.114Z",
                            "updated_at": "2025-08-11T18:57:39.041Z"
                        }
                    ],
                    "attachments": [
                        {
                            "attachment_id": "60153051-1-1",
                            "attachment_date": "2019-02-15T16:00:41.000Z",
                            "attachment_name": "Petição (Outras)",
                            "extension": "pdf",
                            "status": "done",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        },
                        {
                            "attachment_id": "60153057-5-1",
                            "attachment_date": "2019-02-15T16:00:42.000Z",
                            "attachment_name": "Instrumento de Procuração",
                            "extension": "pdf",
                            "status": "done",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        },
                        {
                            "attachment_id": "60153061-6-1",
                            "attachment_date": "2019-02-15T16:00:43.000Z",
                            "attachment_name": "Guia",
                            "extension": "pdf",
                            "status": "done",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        },
                        {
                            "attachment_id": "60153064-7-1",
                            "attachment_date": "2019-02-15T16:00:44.000Z",
                            "attachment_name": "Guia",
                            "extension": "pdf",
                            "status": "done",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        }
                    ],
                    "related_lawsuits": [],
                    "crawler": {
                        "source_name": "JSaj - TJ - SP - Lawsuit - Auth - 1 instance",
                        "crawl_id": "a9b6820a-6c84-4db5-b4f4-2f1909aa3805",
                        "weight": 10,
                        "updated_at": "2025-08-13T18:43:47.770Z"
                    },
                    "metadata": {},
                    "county": "VARA JUIZADO ESP. CIVEL CRIM. DE FERNANDOPOLIS",
                    "amount": 5798,
                    "state": "SP",
                    "city": "FERNANDOPOLIS",
                    "justice_description": "JUSTIÇA ESTADUAL",
                    "last_step": {
                        "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                        "lawsuit_instance": 1,
                        "step_date": "2019-07-16T00:00:00.000Z",
                        "private": false,
                        "tags": {
                            "crawl_id": "a9b6820a-6c84-4db5-b4f4-2f1909aa3805"
                        },
                        "step_id": "56174b2e",
                        "content": "Início da Execução Juntado\n0003695-16.2019.8.26.0189 - Cumprimento de sentença",
                        "steps_count": 32
                    },
                    "phase": "Execução ou cumprimento",
                    "status": "Ativo",
                    "name": "Usuário 4 X Usuário 2",
                    "created_at": "2025-08-13T18:43:51.016Z",
                    "updated_at": "2025-08-13T18:43:51.016Z",
                    "free_justice": false
                },
                "user_id": "7f8065a3-4891-428d-9456-dedfc12ff850",
                "created_at": "2025-08-13T18:40:54.982Z",
                "request_created_at": "2025-08-13T18:40:54.037Z",
                "tags": {
                    "debug": true,
                    "dashboard_id": null,
                    "cached_response": false,
                    "cached": false
                }
            }
        ]
    }

Exemplo de resposta com IA (200 OK)
     {
        "request_status": "completed",
        "page": 1,
        "page_count": 1,
        "all_pages_count": 1,
        "all_count": 1,
        "page_data": [
            {
                "request_id": "03abbf28-822e-45a0-a22c-098fbe157aa4",
                "response_id": "061c60b2-7fa9-4d20-87bb-1bedd31d5572",
                "origin": "api",
                "origin_id": "03abbf28-822e-45a0-a22c-098fbe157aa4",
                "response_type": "lawsuit",
                "response_data": {
                    "code": "9999999-99.9999.9.99.9999",
                    "justice": "8",
                    "tribunal": "26",
                    "instance": 1,
                    "distribution_date": "2019-02-15T16:00:00.000Z",
                    "judge": "Usuário teste",
                    "tribunal_acronym": "TJSP",
                    "secrecy_level": 0,
                    "tags": {
                        "crawl_id": "a9b6820a-6c84-4db5-b4f4-2f1909aa3805",
                        "dictionary_updated_at": "2025-08-13T18:43:48.143Z"
                    },
                    "subjects": [
                        {
                            "code": "",
                            "name": "PAGAMENTO"
                        }
                    ],
                    "classifications": [
                        {
                            "code": "7",
                            "name": "PROCEDIMENTO COMUM CÍVEL"
                        }
                    ],
                    "courts": [
                        {
                            "name": "1ª Vara Cível"
                        }
                    ],
                    "parties": [
                        {
                            "main_document": "99999999999",
                            "name": "Usuário 2",
                            "side": "Passive",
                            "person_type": "Desconhecido",
                            "documents": [
                                {
                                    "document": "99999999999",
                                    "document_type": "cpf"
                                }
                            ],
                            "lawyers": [
                                {
                                    "name": "Usuário 3",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "main_document": "99999999999",
                            "name": "Usuário 4",
                            "side": "Active",
                            "person_type": "Desconhecido",
                            "documents": [
                                {
                                    "document": "99999999999",
                                    "document_type": "cnpj"
                                }
                            ],
                            "lawyers": [
                                {
                                    "name": "Usuário 5",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "name": "Usuário 4",
                            "side": "Active",
                            "person_type": "Desconhecido",
                            "documents": [],
                            "lawyers": [
                                {
                                    "name": "Usuário 5",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "name": "Usuário 2",
                            "side": "Passive",
                            "person_type": "Desconhecido",
                            "documents": [],
                            "lawyers": [
                                {
                                    "name": "Usuário 3",
                                    "documents": []
                                }
                            ]
                        },
                        {
                            "name": "Usuário 5",
                            "side": "Active",
                            "person_type": "Advogado",
                            "documents": []
                        },
                        {
                            "name": "Usuário 3",
                            "side": "Passive",
                            "person_type": "Advogado",
                            "documents": []
                        }
                    ],
                    "steps": [
                        {
                            "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                            "lawsuit_instance": 1,
                            "step_date": "2019-07-16T00:00:00.000Z",
                            "private": false,
                            "tags": {
                                "crawl_id": "36fc0ffd-98fa-4990-bd6f-6a82e5565119"
                            },
                            "step_id": "56174b2e",
                            "content": "Início da Execução Juntado\n0003695-16.2019.8.26.0189 - Cumprimento de sentença",
                            "steps_count": 32,
                            "created_at": "2025-07-09T13:48:33.114Z",
                            "updated_at": "2025-08-11T18:57:39.041Z"
                        },
                        {
                            "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                            "lawsuit_instance": 1,
                            "step_date": "2019-06-06T00:00:00.000Z",
                            "private": false,
                            "tags": {
                                "crawl_id": "36fc0ffd-98fa-4990-bd6f-6a82e5565119"
                            },
                            "step_id": "939794b9",
                            "content": "Arquivado Definitivamente",
                            "created_at": "2025-07-09T13:48:33.114Z",
                            "updated_at": "2025-08-11T18:57:39.041Z"
                        },
                        {
                            "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                            "lawsuit_instance": 1,
                            "step_date": "2019-06-06T00:00:00.000Z",
                            "private": false,
                            "tags": {
                                "crawl_id": "36fc0ffd-98fa-4990-bd6f-6a82e5565119"
                            },
                            "step_id": "423978eb",
                            "content": "Trânsito em Julgado às partes\nCertidão de trânsito em julgado e remessa ao arquivo geral",
                            "created_at": "2025-07-09T13:48:33.114Z",
                            "updated_at": "2025-08-11T18:57:39.041Z"
                        }
                    ],
                    "attachments": [
                        {
                            "attachment_id": "60153051-1-1",
                            "attachment_date": "2019-02-15T16:00:41.000Z",
                            "attachment_name": "Petição (Outras)",
                            "extension": "pdf",
                            "status": "pending",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        },
                        {
                            "attachment_id": "60153057-5-1",
                            "attachment_date": "2019-02-15T16:00:42.000Z",
                            "attachment_name": "Instrumento de Procuração",
                            "extension": "pdf",
                            "status": "pending",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        },
                        {
                            "attachment_id": "60153061-6-1",
                            "attachment_date": "2019-02-15T16:00:43.000Z",
                            "attachment_name": "Guia",
                            "extension": "pdf",
                            "status": "pending",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        },
                        {
                            "attachment_id": "60153064-7-1",
                            "attachment_date": "2019-02-15T16:00:44.000Z",
                            "attachment_name": "Guia",
                            "extension": "pdf",
                            "status": "pending",
                            "tags": {
                                "crawl_id": "424cd251-3d1f-407e-9d17-cb61219545aa"
                            },
                            "user_data": null
                        }
                    ],
                    "related_lawsuits": [],
                    "crawler": {
                        "source_name": "JSaj - TJ - SP - Lawsuit - Auth - 1 instance",
                        "crawl_id": "a9b6820a-6c84-4db5-b4f4-2f1909aa3805",
                        "weight": 10,
                        "updated_at": "2025-08-13T18:43:47.770Z"
                    },
                    "metadata": {},
                    "county": "VARA JUIZADO ESP. CIVEL CRIM. DE FERNANDOPOLIS",
                    "amount": 5798,
                    "state": "SP",
                    "city": "FERNANDOPOLIS",
                    "justice_description": "JUSTIÇA ESTADUAL",
                    "last_step": {
                        "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                        "lawsuit_instance": 1,
                        "step_date": "2019-07-16T00:00:00.000Z",
                        "private": false,
                        "tags": {
                            "crawl_id": "a9b6820a-6c84-4db5-b4f4-2f1909aa3805"
                        },
                        "step_id": "56174b2e",
                        "content": "Início da Execução Juntado\n0003695-16.2019.8.26.0189 - Cumprimento de sentença",
                        "steps_count": 32
                    },
                    "phase": "Execução ou cumprimento",
                    "status": "Ativo",
                    "name": "Usuário 4 X Usuário 2",
                    "created_at": "2025-08-13T18:43:51.016Z",
                    "updated_at": "2025-08-13T18:43:51.016Z",
                    "free_justice": false
                },
                "user_id": "7f8065a3-4891-428d-9456-dedfc12ff850",
                "created_at": "2025-08-13T18:40:54.982Z",
                "request_created_at": "2025-08-13T18:40:54.037Z",
                "tags": {
                    "debug": true,
                    "dashboard_id": null,
                    "cached_response": false,
                    "cached": false
                }
            }
        ]
    },
    {
            "request_id": "3c6614e3-25f1-4df4-9675-694c3ea01499",
            "response_id": "2dc884c1-e57b-47be-ba6c-568b3f066799",
            "origin": "api",
            "origin_id": "3c6614e3-25f1-4df4-9675-694c3ea014d9",
            "response_type": "summary",
            "response_data": {
                "data": [
                    "## Resumo\n\nO processo de número <strong className=\"text-primary\">0000000-00.0000.0.00.0000</strong> trata-se de uma disputa judicial envolvendo direitos autorais, 
                    onde o requerente, Usuário 1, alega ter seus direitos violados pelo requerido, Usuário 2. A distribuição do processo ocorreu no dia 7 de agosto de 2015 e, após trâmites 
                    legais e recursos, o processo foi arquivado definitivamente em 22 de novembro de 2024. Durante todo esse tempo, houve várias movimentações, incluindo cumprimento e execução 
                    de sentença.\n\n## Partes\n\n<ul>\n  <li>\n    <p>\n      <strong className=\"text-foreground text-base leading-5 font-semibold\">Usuário 1</strong>\n      
                    <span className=\"text-muted-foreground text-sm\">CPF: 000.000.000-00</span>\n      <br />\n      <p className=\"text-foreground/70 text-md font-normal\">\n        Requerente 
                    da ação, buscando a proteção de seus direitos autorais que alega terem sido violados.\n      </p>\n      <br className=\"last-of-type:hidden\"/>\n    </p>\n  </li>\n  <li>\n    
                    <p>\n      <strong className=\"text-foreground text-base leading-5 font-semibold\">Usuário 2</strong>\n      <span className=\"text-muted-foreground text-sm\">
                    CNPJ: 00.000.000/0000-00</span>\n      <br />\n      <p className=\"text-foreground/70 text-md font-normal\">\n        Requerido na ação, acusado de violar direitos autorais do 
                    requerente.\n      </p>\n      <br className=\"last-of-type:hidden\"/>\n    </p>\n  </li>\n</ul>\n\n## Classe\n\n<ul>\n  <li>\n    <p>\n      <strong className=\"text-foreground 
                    text-base leading-5 font-semibold\">Procedimento Comum Cível</strong>\n      <br />\n      <p className=\"text-foreground/70 text-md font-normal\">\n        É uma classe 
                    processual genérica para ações que vão a julgamento com base no direito civil, não enquadrando-se em procedimentos especiais.\n      </p>\n    </p>\n  </li>\n</ul>\n\n## 
                    Assuntos\n\n<ul>\n  <li>\n    <p>\n      <strong className=\"text-foreground text-base leading-5 font-semibold\">Direito Autoral</strong>\n      <br />\n      
                    <p className=\"text-foreground/70 text-md font-normal\">\n        O assunto do processo envolve disputas relacionadas à proteção da exclusividade de uso, gozo e disposição de uma 
                    obra intelectual criada.\n      </p>\n      <br />\n    </p>\n  </li>\n</ul>\n\n## Movimentações\n\nEm termos gerais, o processo foi marcado por uma longa tramitação. Inicialmente, 
                    o <span className=\"font-bold\">requerente</span> Usuário 1 buscou judicialmente a defesa de seus direitos autorais, alegando violações por parte do <span className=\"font-bold\">requerido</span>, 
                    Usuário 2. Durante o caso, houve apelação (tentativa de modificar uma decisão desfavorável) pelo requerente, além de embargos de declaração (pedidos de esclarecimento sobre a decisão), ambos não 
                    acolhidos, mantendo-se inalterada a decisão contestada. Em <span className=\"text-primary\">23 de julho de 2023</span>, houve o recebimento dos autos do Tribunal de Justiça com trânsito 
                    em julgado (quando não há mais possibilidade de recurso) da decisão que negou provimento ao recurso do requerente. Seguiu-se a execução da sentença, na qual se busca o cumprimento do 
                    que foi determinado pela Justiça, e finalmente, o <span className=\"text-primary\">processo foi arquivado definitivamente em 22 de novembro de 2024</span>, sinalizando a conclusão do litígio."
                ],
                "origin_id": "0f5baa30-f681-47cd-a381-01d489f4d079",
                "origin": "response"
            },
            "user_id": "7f8065a3-4891-9999-9456-dedfc12ff899",
            "created_at": "2026-03-18T17:18:18.156Z",
            "request_created_at": "2026-03-18T17:16:15.810Z"
        }

 O que você recebe de volta?
O retorno é paginado e contém o Objeto Lawsuit dentro do array page_data. Se você solicitou a IA, o resumo virá como um objeto adicional dentro dessa mesma lista.          

Acessando Anexos Capturados (Documentos em PDF/HTML)
Se você enviou "with_attachments": true no Passo 1 da requisição, a Judit fará o download dos arquivos públicos diretamente do tribunal. Assim que a requisição principal for concluída, estes arquivos já estarão capturados e armazenados de forma segura nos buckets da Judit.
Os metadados desses arquivos estarão listados dentro do array attachments no JSON do processo.

Fidelidade de Formato: A Judit API não converte os arquivos. O anexo será retornado para você no exato mesmo formato original em que foi capturado e disponibilizado pelo tribunal. Prepare sua aplicação para receber documentos (PDF, HTML, DOCX), imagens (JPG, PNG) e até mídias de audiências (MP3, MP4).

cURL
curl --location 'https://lawsuits.prod.judit.io/lawsuits/<Número do processo>/<instância>/attachments/<attachment_id>' \
--header 'api-key: <api-key>' \
--header 'Content-Type: application/json' \
--data ''


Propriedades do Anexo
status: Indica o estado do arquivo no nosso banco. done significa que está pronto para download.
private: Se true, significa que o documento está em segredo de justiça no tribunal.
extension: Formato do arquivo extraído (ex: pdf, html, jpg).

Objeto Lawsuit (Processo Judicial)
O objeto lawsuit é a estrutura de dados central que representa um processo judicial completo na Judit API. Ele contém desde a capa do processo até andamentos e anexos.

🤖 O objeto lawsuit é retornado no formato JSON. A propriedade raiz que contém os metadados do processo chama-se response_data. O histórico é retornado no array steps e os envolvidos no array parties. Lembre-se que a autenticação para consultar este objeto é feita via header api-key, e não Bearer Token.

⚠️ Atenção: Consulta por Documento (Consulta Histórica)
Se você obteve este objeto através do endpoint de Consulta Histórica (Busca por Documento), as propriedades phase (Fase) e status da Capa não serão preenchidas. Além disso, os arrays steps (Movimentações) e attachments (Anexos) não são retornados.

Estrutura Geral
O JSON do processo judicial é organizado em 5 blocos principais:
Capa (response_data): Metadados, juiz, comarca, valor da causa e status.
Partes (parties): Array contendo os pólos (ativo/passivo), documentos e advogados.
Andamentos (steps): Array com o histórico cronológico de movimentações.
Anexos (attachments): Array de documentos (PDFs, HTML) vinculados aos andamentos.
Relacionados (related_lawsuits): Array de processos apensos ou vinculados.

Dicionário de Dados
​
1. Capa Processual (response_data)
Propriedade	Tipo	Descrição
code	string	Número único do processo no padrão CNJ.
name	string	Descrição/Nome do processo (ex: “PARTE ATIVA X PARTE PASSIVA”).
area	string	Área do direito (ex: “DIREITO CIVIL”, “DIREITO ADMINISTRATIVO”).
subject / subjects	array	Assuntos da causa, baseados na tabela unificada do CNJ.
classifications	array	Classes processuais (ex: “PROCEDIMENTO COMUM”), baseadas no CNJ.
distribution_date	string	Data em que o processo foi distribuído/iniciado no tribunal.
instance	string	Grau de jurisdição (ex: “1ª INSTÂNCIA”, “2ª INSTÂNCIA”).
judge	string	Nome do magistrado ou relator responsável.
justice_description	string	Tipo do órgão (ex: “JUSTIÇA ESTADUAL”, “JUSTIÇA FEDERAL”, “STJ”).
tribunal_acronym	string	Sigla oficial do tribunal de origem (ex: “TJSP”, “TRF4”).
county	string	Comarca onde a ação está correndo.
city / state	string	Cidade e UF (Unidade Federativa) da comarca.
amount	number	Valor atribuído à causa.
phase	string	Fase processual (ex: “CONHECIMENTO”).
(Não retornado na Consulta por Documento)
status	string	Macro-status do processo (“ATIVO” ou “FINALIZADO”).
(Não retornado na Consulta por Documento)
situation	string	Status granular capturado direto no sistema do tribunal.
secrecy_level	integer	Nível de sigilo (0 = Público. Níveis 1 a 5 indicam graus de restrição).
​
2. Envolvidos (parties)
Array de objetos representando as partes.
Propriedade	Tipo	Descrição
name	string	Nome completo ou Razão Social da parte.
main_document	string	CPF ou CNPJ principal vinculado à parte.
side	string	Pólo no processo: ACTIVE (Autor), PASSIVE (Réu), INTERESTED ou UNKNOWN.
person_type	string	Papel processual (ex: “AUTOR”, “RÉU”, “TESTEMUNHA”, “TERCEIRO”).
documents	array	Lista de objetos com document_type (ex: “CPF”, “CNPJ”) e document (o número).
lawyers	array	Lista de advogados associados à parte (contém name e oab).

Atenção aos Advogados: Se o tribunal não especificar claramente a qual parte o advogado pertence, o objeto do advogado será listado diretamente no array principal de parties, com um papel/side genérico.

3. Histórico de Movimentações (steps)
(Array ausente nas respostas de Consulta por Documento)
Propriedade	Tipo	Descrição
step_id	string	Identificador único interno do andamento.
step_date	string	Data da movimentação processual.
step_type	string	Código/Tipo do andamento mapeado na tabela do CNJ.
content	string	Texto descritivo integral do andamento (ex: “Ato ordinatório praticado…”).
private	boolean	Indica true se este andamento específico corre sob sigilo.

4. Documentos Anexos (attachments)
(Array ausente nas respostas de Consulta por Documento)
Propriedade	Tipo	Descrição
step_id	string	ID do andamento (step) que gerou este anexo.
attachment_date	string	Data da inserção do documento.
attachment_name	string	Título ou nome do arquivo (ex: “Petição Inicial”, “Contestação”).
extension	string	Formato do arquivo extraído (ex: “PDF”, “HTML”).

Exemplo Completo do JSON (Consulta Padrão)
Abaixo está a representação estrutural típica retornada pela Judit API ao consultar um processo judicial completo:

{
  "response_data": {
    "code": "9999999-99.9999.9.99.9999",
    "name": "Ação de Cobrança Cível",
    "area": "DIREITO CIVIL",
    "distribution_date": "2024-01-15",
    "instance": "1ª INSTÂNCIA",
    "courts": "1ª VARA CÍVEL",
    "secrecy_level": 0,
    "subjects": ["COBRANÇA"],
    "classifications": ["PROCEDIMENTO COMUM CÍVEL"],
    "judge": "João Silva Santos",
    "justice_description": "JUSTIÇA ESTADUAL",
    "county": "SÃO PAULO",
    "tribunal_acronym": "TJSP",
    "city": "SÃO PAULO",
    "state": "SP",
    "situation": "ATIVA",
    "phase": "CONHECIMENTO",
    "status": "ATIVO",
    "amount": 50000.00
  },
  "parties": [
    {
      "name": "EMPRESA XYZ LTDA",
      "main_document": "12345678000190",
      "side": "ACTIVE",
      "person_type": "AUTOR",
      "documents": [
        { "document_type": "CNPJ", "document": "12345678000190" }
      ],
      "lawyers": [
        { "name": "Maria Advogada", "oab": "OAB/SP 123456" }
      ]
    }
  ],
  "steps": [
    {
      "step_id": "step_001_abc",
      "step_date": "2024-01-15",
      "step_type": "DISTRIBUIÇÃO",
      "content": "Processo distribuído por sorteio para a 1ª Vara Cível",
      "private": false
    }
  ],
  "attachments": [
    {
      "step_id": "step_001_abc",
      "attachment_date": "2024-01-15",
      "attachment_name": "Petição Inicial Cópia Autenticada",
      "extension": "PDF"
    }
  ],
  "related_lawsuits": []
}

Exemplos de Integração (Buscando um Processo)
Importante: Nos exemplos abaixo, estamos utilizando a URL Base de Consultas Síncronas do nosso Datalake para recuperar o objeto lawsuit instantaneamente. Lembre-se de passar o header api-key.

cURL
# Buscar processo específico por CNJ
export JUDIT_API_KEY="sua_chave_aqui"

curl -X GET "[https://lawsuits.production.judit.io/lawsuits/9999999-99.9999.9.99.9999](https://lawsuits.production.judit.io/lawsuits/9999999-99.9999.9.99.9999)" \
  -H "api-key: $JUDIT_API_KEY" \
  -H "Content-Type: application/json"



# CONSULTA POR DOCUMENTO
Consulta por Documento
Essa página tem como objetivo mostrar o fluxo de Consulta por Documento.

A criação de request corresponde a uma consulta realizada por meio de um documento (CPF, CNPJ ou OAB), retornando a capa processual dos processos vinculados ao documento consultado.
​
🔍Diferença entre os tipos de consultas
​
🧠Consulta datalake sincrona
Os dados são recuperados diretamente de nossa base de dados. Essa opção oferece respostas mais rápidas, pois não depende de uma nova consulta ao tribunal. 
​
🌐Consulta assincrona
Além da captura em nossa base de dados, buscamos também em fontes externas fornecendo maior completude dos dados na resposta.
​
⚡Consulta On Demand
A consulta é feita diretamente no tribunal no momento da solicitação. Para utilizar esta opção, o parâmetro on_demand deve ser incluído no payload da solicitação com o valor true. Esta abordagem garante acesso aos dados mais atualizados, realizando comunicação direto com o tribunal.
As consultas On-Demand podem ter valores diferentes em relação às consultas realizadas na base de dados. Consulte nossa tabela de preços ou entre em contato com o suporte para mais detalhes.
​
📦Payload da Solicitação
Uma requisição POST deve ser enviada para o endpoint https://requests.prod.judit.io/requests/, utilizando o seguinte payload:
search_type: Este campo define o tipo de entidade que será buscada. Os valores possíveis para consulta histórica são: cpf, cnpj, oab, name.
search_key: O CPF, CNPJ, OAB ou Name que você deseja buscar;
cache_ttl_in_days (opcional): Número inteiro que define até quantos dias o resultado da busca pode considerar um cache válido;
search_params: Um objeto que contém alguns parâmetros da busca como:
lawsuit_instance (opcional): Este parâmetro permite definir a instância em que deseja buscar o processo;
customer_key (opcional): Permite passar a chave do usuário cadastrada no cofre de credenciais. Caso não seja informada, a API tentará encontrar uma credencial cadastrada para uma customer_key vazia.
Filtros poderão ser adicionados à requisição, permitindo um retorno mais assertivo com base nos valores desejados. Para isso, o parâmetro filter deve ser incluído dentro de search_params, com os seguintes filtros disponíveis:
filter (opcional): Um objeto que contém os filtros para a busca, como:
side (opcional): Permite buscar por tipos de participantes do processo, podendo ser:
Passive
Active
Interested
Unknown;
amount_gte (opcional): Filtra processos com valor da causa maior ou igual ao especificado em amount_gte;
amount_lte (opcional): Filtra processos com valor da causa menor ou igual ao especificado em amount_lte;
tribunals (opcional): Um objeto que contém os filtros de tribunais:
keys (opcional): Lista de códigos de tribunais disponíveis na lista de tribunais. Este filtro permite restringir a busca a processos que tenham ou não esses códigos específicos;
not_equal (opcional): Valor booleano que define se o filtro incluirá ou excluirá os valores especificados em keys.
subject_codes (opcional): Um objeto que contém os filtros de assuntos:
contains (opcional): Lista de códigos de assuntos. Restringe a busca a processos que incluam os códigos especificados.
not_contains (opcional): Lista de códigos de assuntos. Exclui processos que contenham os códigos especificados.
classification_codes (opcional): Um objeto que contém os filtros de classes processuais:
keys (opcional): Lista de códigos de classes processuais. Este filtro permite restringir a busca a processos que tenham ou não esses códigos específicos;
not_equal (opcional): Valor booleano que define se o filtro incluirá ou excluirá os valores especificados em keys.
distribution_date_gte (opcional): Permite especificar uma data mínima de distribuição. Este filtro localiza processos distribuídos após a data informada.
last_step_date_gte (opcional): Restringe a busca a processos cuja data da última movimentação seja maior que à data fornecida.
last_step_date_lte (opcional): Restringe a busca a processos cuja data da última movimentação seja menor que à data fornecida.
party_names (opcional): Lista de nomes que restringe a busca a processos que os contenham em alguma das partes.
Obs Ao utilizar esse filtro em conjunto com o filtro de Side, o filtro de Side não será considerado para a restrição dessas partes, já que o filtro de Side é utilizado para filtrar processos onde a parte principal buscada esteja no lado especificado.
party_documents (opcional): Lista de documentos que restringe a busca a processos que os contenham em alguma das partes.
Obs Ao utilizar esse filtro em conjunto com o filtro de Side, o filtro de Side não será considerado para a restrição desses documentos, já que o filtro de Side é utilizado para filtrar processos onde a parte principal buscada esteja no lado especificado.

🧩Exemplos de como criar uma requisição
​
🛠️Exemplo da criação da request por documento datalake com fontes externas
curl --request POST
    --url 'https://requests.prod.judit.io/requests'
    --header 'Content-Type: application/json'
    --header 'api-key: SUA-API-KEY'
    --data '{
    "search": {
        "search_type": "cpf",
        "search_key": "999.999.999-99"
        }
    }
    '

📡Exemplo de criação da request por documento diretamente no tribunal, adicionando o parâmetro on_demand
curl --request POST
    --url 'https://requests.prod.judit.io/requests'
    --header 'Content-Type: application/json'
    --header 'api-key: <API-KEY>'
    --data '{
        "search": {
            "search_type": "cpf",
            "search_key": "999.999.999-99",
            "on_demand": true
        }
    }
    '

Em consultas diretamento no tribunal é adicionado a propriedade on-demand com o booleano true.
🎯Exemplo da criação da request com filtros

curl --location 'https://requests.prod.judit.io/requests' \
    --header 'api-key: <API-KEY>' \
    --header 'Content-Type: application/json' \
    --data '{
        "search": {
            "search_type": "cnpj",
            "search_key": "99.999.999/0009-99",
            "search_params": {
                "filter": {
                    "side": "Passive",
                    "tribunals": {
                        "keys": ["TJBA"],
                        "not_equal": false
                    },
                    "subject_codes": {
                        "contains": ["10433"],
                        "not_contains": ["1120"]
                    },
                    "classification_codes": {
                        "keys": ["985"],
                        "not_equal": false
                    },
                    "last_step_date_gte": "2024-10-10T00:00:00.000Z",
                    "party_names": ["USUÁRIO TESTE"],
                    "party_documents": ["999.999.999.-99"]
                }
            }
        }    
    }
    '

A resposta dessa requisição será um objeto JSON com os dados de criação da Request.
​🗂️Abaixo, apresentamos um exemplo de resposta para a requisição POST de uma busca realizada em nossa base de dados sem filtros aplicados:

{
"request_id": "05ee9825-b2b4-480b-b29e-f071ca7d9c72",
"search": {
    "search_type": "cpf",
    "search_key": "99999999999",
    "response_type": "lawsuit",
    "search_params": {
    "filter": {},
    "pagination": {}
    }
},
"origin": "api",
"origin_id": "8c8bc14b-9f46-4e52-bc05-25a8af855690",
"user_id": "6dc91e78-400e-489c-b30c-61789e323d7c",
"status": "pending",
"created_at": "2024-02-16T13:14:09.645Z",
"updated_at": "2024-02-16T13:14:09.645Z",
"tags": {}
}

Na consulta por documento o search_type pode ser “oab”, “cpf” e “cnpj”.
⏱️Consultar o status da request
O status que indica que a resposta está completa é representado pelo valor completed.
O status que indica que a resposta ainda está em processamento é representado pelo valor pending.

valor pending.
Esta é uma etapa importante para saber quando a consulta terminou, já que as respostas serão adicionadas de forma incremental por tribunal.
​
🔄Status para consulta datalake assincrona
Para consultas assíncronas, existem duas formas de verificar o status:
Primeira forma: permite consultar não apenas o status, mas também todos os parâmetros utilizados na requisição, exibindo detalhes completos da chamada.

curl --request GET
    --url 'https://requests.prod.judit.io/requests/<REQUEST_ID>'
    --header 'api-key: SUA-API-KEY'
    --header 'Content-Type: application/json'

 {
        "request_id": "05ee9825-b2b4-480b-b29e-f071ca7d9c72",
        "search": {
        "search_type": "cpf",
        "search_key": "99999999999",
        "response_type": "lawsuit",
        "search_params": {
            "filter": {},
            "pagination": {}
        }
        },
        "origin": "api",
        "origin_id": "46fac09a-b34f-4dfd-a24f-b358bf04dfd4",
        "user_id": "82082593-c664-4d7b-b174-2f0dc4791daf",
        "status": "completed",
        "created_at": "2024-02-21T17:33:22.876Z",
        "updated_at": "2024-02-21T17:33:26.316Z",
        "tags": {
        "dashboard_id": null
        }
    }

Segunda forma: consiste em verificar o status diretamente na resposta da requisição, utilizando a rota de responses com o método GET: https://requests.prod.judit.io/responses?request_id=<REQUEST_ID>
  {
        "request_status": "completed",
        "page": 1,
        "page_count": 4,
        "all_pages_count": 1,
        "all_count": 4,
        "page_data": [
            // Resposta da requisição
        ]
    }  

🏛️Status para consulta histórica on-demand
Como a consulta histórica On-Demand realiza buscas em tempo real em todos os tribunais cobertos, é retornada uma listagem de status, sendo um status por sistema acessado.
Construção da requisição:
curl --location 'https://crawler.prod.judit.io/crawls/request/<REQUEST_ID>?page=1&page_size=10' \
    --header 'api-key: API-KEY'

Retorno da requisição:
É possível consultar até 100 status por página.
page: Indica o número da página atual.
page_size: Define quantos itens serão exibidos por página.

Exemplo de retorno dos status na consulta histórica on-demand:
{
    "page": 1,
    "page_data": [
            {
                "execution_id": "d7b3db91-2144-4c46-9669-13ee90942b11",
                "source_name": "JPje - RO - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJRO",
                "status": "done",
                "created_at": "2025-10-28T00:04:37.522Z",
                "updated_at": "2025-10-28T00:04:40.651Z",
                "request": {}
            },
            {
                "execution_id": "11702b2b-a314-4b1c-b986-74da1b0485e4",
                "source_name": "JPje - CE - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJCE",
                "status": "done",
                "created_at": "2025-10-28T00:04:39.371Z",
                "updated_at": "2025-10-28T00:04:41.295Z",
                "request": {}
            },
            {
                "execution_id": "c901ee8b-bb42-48a9-a431-b2883463fac9",
                "source_name": "JPje - MA - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJMA",
                "status": "done",
                "created_at": "2025-10-28T00:04:40.010Z",
                "updated_at": "2025-10-28T00:04:44.188Z",
                "request": {}
            },
            {
                "execution_id": "b4f88e07-62ed-4d14-a5ad-49e9f2f69544",
                "source_name": "JPje - PA - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJPA",
                "status": "done",
                "created_at": "2025-10-28T00:04:40.700Z",
                "updated_at": "2025-10-28T00:05:02.905Z",
                "request": {}
            },
            {
                "execution_id": "fcb19e86-f3a4-41f3-a8ea-394bc4916c64",
                "source_name": "JPje - RN - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJRN",
                "status": "done",
                "created_at": "2025-10-28T00:04:41.284Z",
                "updated_at": "2025-10-28T00:04:52.163Z",
                "request": {}
            },
            {
                "execution_id": "907fd930-cf72-461c-9a4b-694df2ee5c31",
                "source_name": "JPje - PE - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJPE",
                "status": "done",
                "created_at": "2025-10-28T00:04:42.738Z",
                "updated_at": "2025-10-28T00:04:46.512Z",
                "request": {}
            },
            {
                "execution_id": "55ca33db-51b4-4601-b69e-59e9da9af2f4",
                "source_name": "JPje - TRF3 - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF3",
                "status": "done",
                "created_at": "2025-10-28T00:04:43.861Z",
                "updated_at": "2025-10-28T00:04:46.790Z",
                "request": {}
            },
            {
                "execution_id": "ff024efe-f036-4a76-a6c1-14c448761068",
                "source_name": "JPje - MT - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJMT",
                "status": "done",
                "created_at": "2025-10-28T00:04:44.117Z",
                "updated_at": "2025-10-28T00:04:51.160Z",
                "request": {}
            },
            {
                "execution_id": "fff6d88c-f257-4e16-9140-d53bbc6b6521",
                "source_name": "JPje - PB - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJPB",
                "status": "done",
                "created_at": "2025-10-28T00:04:44.790Z",
                "updated_at": "2025-10-28T00:04:48.496Z",
                "request": {}
            },
            {
                "execution_id": "30d7592b-5da1-4787-8499-6ef0c7c0c178",
                "source_name": "JPje - TRF3 - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TRF3",
                "status": "done",
                "created_at": "2025-10-28T00:04:45.270Z",
                "updated_at": "2025-10-28T00:04:49.646Z",
                "request": {}
            },
            {
                "execution_id": "19c2a1f1-f8e0-46e1-9215-d5b76be02062",
                "source_name": "JPje - PE - Lawsuit - Auth - 1 instance - Legacy",
                "tribunal_acronym": "TJPE",
                "status": "done",
                "created_at": "2025-10-28T00:04:46.287Z",
                "updated_at": "2025-10-28T00:04:49.052Z",
                "request": {}
            },
            {
                "execution_id": "ce092c01-cdf8-4dae-91cc-ee6c5f550be4",
                "source_name": "JPje - MT - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJMT",
                "status": "done",
                "created_at": "2025-10-28T00:04:46.832Z",
                "updated_at": "2025-10-28T00:04:50.193Z",
                "request": {}
            },
            {
                "execution_id": "6a4951b7-fed8-4c9c-86cb-dc42858a07a9",
                "source_name": "JPje - RN - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJRN",
                "status": "done",
                "created_at": "2025-10-28T00:04:47.092Z",
                "updated_at": "2025-10-28T00:04:49.118Z",
                "request": {}
            },
            {
                "execution_id": "4a16b6ac-fe24-4b1d-9953-1be04b300d48",
                "source_name": "JPje - PB - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJPB",
                "status": "done",
                "created_at": "2025-10-28T00:04:47.579Z",
                "updated_at": "2025-10-28T00:04:49.205Z",
                "request": {}
            },
            {
                "execution_id": "12a8211c-2e6e-4e37-a97d-7569be77cfdc",
                "source_name": "JPje - RJ - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJRJ",
                "status": "done",
                "created_at": "2025-10-28T00:04:47.841Z",
                "updated_at": "2025-10-28T00:04:54.152Z",
                "request": {}
            },
            {
                "execution_id": "c3429e8f-ab0e-432d-9278-1e4ac6b611e2",
                "source_name": "JPje - MG - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJMG",
                "status": "done",
                "created_at": "2025-10-28T00:04:48.349Z",
                "updated_at": "2025-10-28T00:04:49.611Z",
                "request": {}
            },
            {
                "execution_id": "7499adc5-9d5e-476d-8df0-34e70c873089",
                "source_name": "JPje - MG - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJMG",
                "status": "done",
                "created_at": "2025-10-28T00:04:48.598Z",
                "updated_at": "2025-10-28T00:07:27.093Z",
                "request": {}
            },
            {
                "execution_id": "59bfd654-5a60-4f7d-9549-7a1fc388fc10",
                "source_name": "JPje - TRF1 - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TRF1",
                "status": "done",
                "created_at": "2025-10-28T00:04:49.075Z",
                "updated_at": "2025-10-28T00:04:53.231Z",
                "request": {}
            },
            {
                "execution_id": "ea4c6ce9-b6e0-42e9-bd9f-ed47ecd9f14d",
                "source_name": "JPje - DFT - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJDF",
                "status": "done",
                "created_at": "2025-10-28T00:04:49.327Z",
                "updated_at": "2025-10-28T00:04:50.790Z",
                "request": {}
            },
            {
                "execution_id": "1db2d466-ea0d-4f84-805d-91e540577e3c",
                "source_name": "JPje - RO - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJRO",
                "status": "done",
                "created_at": "2025-10-28T00:04:49.576Z",
                "updated_at": "2025-10-28T00:04:51.197Z",
                "request": {}
            },
            {
                "execution_id": "eba2ede5-6e41-4025-9126-851972c8629a",
                "source_name": "JPje - TRF1 - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF1",
                "status": "done",
                "created_at": "2025-10-28T00:04:49.827Z",
                "updated_at": "2025-10-28T00:04:56.243Z",
                "request": {}
            },
            {
                "execution_id": "0b563a44-8eba-4246-a82d-2ab51bf6ae9e",
                "source_name": "JPje - MA - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJMA",
                "status": "done",
                "created_at": "2025-10-28T00:04:50.191Z",
                "updated_at": "2025-10-28T00:06:10.061Z",
                "request": {}
            },
            {
                "execution_id": "77dc544c-8842-4596-afe0-6b6c411892e1",
                "source_name": "JPje - AP - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJAP",
                "status": "done",
                "created_at": "2025-10-28T00:04:50.669Z",
                "updated_at": "2025-10-28T00:04:54.765Z",
                "request": {}
            },
            {
                "execution_id": "fc0601d0-198a-4172-81d3-97fe41b6548f",
                "source_name": "JPje - AP - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJAP",
                "status": "done",
                "created_at": "2025-10-28T00:04:51.149Z",
                "updated_at": "2025-10-28T00:04:57.823Z",
                "request": {}
            },
            {
                "execution_id": "d30c0a96-c66b-4ed4-a394-6d6046b5d050",
                "source_name": "JPje - PI - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJPI",
                "status": "done",
                "created_at": "2025-10-28T00:04:51.401Z",
                "updated_at": "2025-10-28T00:04:52.902Z",
                "request": {}
            },
            {
                "execution_id": "05f806a5-032e-496a-9da1-a516fe91fc07",
                "source_name": "JPje - CE - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJCE",
                "status": "done",
                "created_at": "2025-10-28T00:04:51.653Z",
                "updated_at": "2025-10-28T00:04:53.005Z",
                "request": {}
            },
            {
                "execution_id": "455fcf60-d850-4b4e-90b9-c222152ea143",
                "source_name": "JPje - PA - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJPA",
                "status": "done",
                "created_at": "2025-10-28T00:04:51.911Z",
                "updated_at": "2025-10-28T00:04:56.870Z",
                "request": {}
            },
            {
                "execution_id": "491d1eb6-3fc2-42da-937e-26a3acc7761d",
                "source_name": "JPje - PI - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJPI",
                "status": "done",
                "created_at": "2025-10-28T00:04:52.279Z",
                "updated_at": "2025-10-28T00:04:56.765Z",
                "request": {}
            },
            {
                "execution_id": "5d64b158-777d-4901-b2ba-47641aeae190",
                "source_name": "JSaj - TJ - CE - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJCE",
                "status": "done",
                "created_at": "2025-10-28T00:04:52.534Z",
                "updated_at": "2025-10-28T00:05:13.315Z",
                "request": {}
            },
            {
                "execution_id": "944d4c46-7e49-40b9-8aae-d91087e611c9",
                "source_name": "JSaj - TJ - AC - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJAC",
                "status": "done",
                "created_at": "2025-10-28T00:04:52.898Z",
                "updated_at": "2025-10-28T00:04:55.698Z",
                "request": {}
            },
            {
                "execution_id": "1d0fa587-e8b7-470b-9348-1773f322372e",
                "source_name": "JTJRJ - RJ - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJRJ",
                "status": "pending",
                "created_at": "2025-10-28T00:04:53.157Z",
                "updated_at": "2025-10-28T00:04:53.157Z",
                "request": {}
            },
            {
                "execution_id": "02a5acdb-d183-4631-b75e-47cf38a7eeac",
                "source_name": "JSaj - TJ - AM - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJAM",
                "status": "done",
                "created_at": "2025-10-28T00:04:53.410Z",
                "updated_at": "2025-10-28T00:04:56.191Z",
                "request": {}
            },
            {
                "execution_id": "94a2ceda-3b11-4795-8f50-498e0f5ffde7",
                "source_name": "JTJRJ - RJ - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJRJ",
                "status": "pending",
                "created_at": "2025-10-28T00:04:53.666Z",
                "updated_at": "2025-10-28T00:04:53.666Z",
                "request": {}
            },
            {
                "execution_id": "87510ff5-6440-49af-8c85-ca03bae65c60",
                "source_name": "JSaj - TJ - AL - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJAL",
                "status": "done",
                "created_at": "2025-10-28T00:04:53.916Z",
                "updated_at": "2025-10-28T00:04:56.640Z",
                "request": {}
            },
            {
                "execution_id": "ffc3267b-3c8f-4f96-9c70-37f97c1e65ff",
                "source_name": "JSaj - TJ - MS - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJMS",
                "status": "done",
                "created_at": "2025-10-28T00:04:54.171Z",
                "updated_at": "2025-10-28T00:04:55.654Z",
                "request": {}
            },
            {
                "execution_id": "00aa3de1-df03-49c7-94d4-2ffb8131ce96",
                "source_name": "JSaj - TJ - CE - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJCE",
                "status": "done",
                "created_at": "2025-10-28T00:04:54.534Z",
                "updated_at": "2025-10-28T00:04:58.457Z",
                "request": {}
            },
            {
                "execution_id": "d3506604-ae95-4da0-9232-2dda88d08fb7",
                "source_name": "JSaj - TJ - AL - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJAL",
                "status": "done",
                "created_at": "2025-10-28T00:04:54.898Z",
                "updated_at": "2025-10-28T00:04:57.183Z",
                "request": {}
            },
            {
                "execution_id": "4a9a6f19-4622-4059-989a-4a8ec3320f36",
                "source_name": "JSaj - TJ - AM - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJAM",
                "status": "pending",
                "created_at": "2025-10-28T00:04:55.150Z",
                "updated_at": "2025-10-28T00:04:55.934Z",
                "request": {}
            },
            {
                "execution_id": "aa15b360-44bc-4649-9209-9f94619a97ac",
                "source_name": "JSaj - TJ - MS - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJMS",
                "status": "done",
                "created_at": "2025-10-28T00:04:55.414Z",
                "updated_at": "2025-10-28T00:04:56.871Z",
                "request": {}
            },
            {
                "execution_id": "907e3c89-b699-4446-a3fb-cde976ef90ae",
                "source_name": "JSaj - TJ - AC - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJAC",
                "status": "done",
                "created_at": "2025-10-28T00:04:55.665Z",
                "updated_at": "2025-10-28T00:04:58.028Z",
                "request": {}
            },
            {
                "execution_id": "171ad008-54a3-45e6-a105-da5ccd040362",
                "source_name": "JSaj - TJ - SP - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJSP",
                "status": "done",
                "created_at": "2025-10-28T00:04:55.916Z",
                "updated_at": "2025-10-28T00:05:00.105Z",
                "request": {}
            },
            {
                "execution_id": "0a112d2d-1674-4e65-b80c-fa25b26e9b49",
                "source_name": "JPje - DFT - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJDF",
                "status": "done",
                "created_at": "2025-10-28T00:04:56.251Z",
                "updated_at": "2025-10-28T00:05:00.905Z",
                "request": {}
            },
            {
                "execution_id": "547d4ab2-3f0c-4715-a0ec-c2b383ce0b65",
                "source_name": "JProjudiGreen - TJPR - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJPR",
                "status": "done",
                "created_at": "2025-10-28T00:04:56.616Z",
                "updated_at": "2025-10-28T00:05:05.384Z",
                "request": {}
            },
            {
                "execution_id": "d04f650e-62bf-4197-bd65-a544a9801392",
                "source_name": "JSaj - TJ - SP - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJSP",
                "status": "done",
                "created_at": "2025-10-28T00:04:56.899Z",
                "updated_at": "2025-10-28T00:05:00.555Z",
                "request": {}
            },
            {
                "execution_id": "17b0660d-2534-482e-8bcb-23511165fa90",
                "source_name": "JProjudiGreen - TJRR - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJRR",
                "status": "done",
                "created_at": "2025-10-28T00:04:57.151Z",
                "updated_at": "2025-10-28T00:04:59.474Z",
                "request": {}
            },
            {
                "execution_id": "2f670d82-4f45-419c-947c-376d352d1826",
                "source_name": "JProjudiGreen - TJAM - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJAM",
                "status": "done",
                "created_at": "2025-10-28T00:04:57.401Z",
                "updated_at": "2025-10-28T00:04:59.972Z",
                "request": {}
            },
            {
                "execution_id": "79eb2234-c88c-49c6-b242-d881a1629ae7",
                "source_name": "JProjudiGreen - TJRR - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJRR",
                "status": "done",
                "created_at": "2025-10-28T00:04:57.651Z",
                "updated_at": "2025-10-28T00:05:00.091Z",
                "request": {}
            },
            {
                "execution_id": "acfba77c-d3d6-4ce3-9bcd-a42b761945a8",
                "source_name": "JPje - ES - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJES",
                "status": "done",
                "created_at": "2025-10-28T00:04:57.901Z",
                "updated_at": "2025-10-28T00:05:02.938Z",
                "request": {}
            },
            {
                "execution_id": "5c95cdd4-50c5-4cfd-bd47-229e7b9e8556",
                "source_name": "JTJ - BR - Document / Lawsuit - Auth",
                "status": "done",
                "created_at": "2025-10-28T00:04:58.475Z",
                "updated_at": "2025-10-28T00:04:59.373Z",
                "request": {}
            },
            {
                "execution_id": "b436b1d2-7352-461f-aef2-fdb15eb57c82",
                "source_name": "JEproc - JFES - ES - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF2",
                "status": "done",
                "created_at": "2025-10-28T00:04:58.726Z",
                "updated_at": "2025-10-28T00:05:01.471Z",
                "request": {}
            },
            {
                "execution_id": "c8adfb20-1e84-49f4-b226-53d38bf06a33",
                "source_name": "JEproc - JFRJ - RJ - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF2",
                "status": "done",
                "created_at": "2025-10-28T00:04:59.149Z",
                "updated_at": "2025-10-28T00:06:01.897Z",
                "request": {}
            },
            {
                "execution_id": "dc07a964-d614-46fc-97ec-e5a22dcdce00",
                "source_name": "JEproc - JFSC - SC - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF4",
                "status": "done",
                "created_at": "2025-10-28T00:04:59.627Z",
                "updated_at": "2025-10-28T00:05:01.585Z",
                "request": {}
            },
            {
                "execution_id": "e6c8f0fe-5000-4d30-aed7-2a7dacbed968",
                "source_name": "JEproc - TJRS - RS - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJRS",
                "status": "done",
                "created_at": "2025-10-28T00:04:59.880Z",
                "updated_at": "2025-10-28T00:05:02.200Z",
                "request": {}
            },
            {
                "execution_id": "043b5ddf-db3c-4a56-8eb8-d481a0104c44",
                "source_name": "JEproc - TJSC - SC - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJSC",
                "status": "done",
                "created_at": "2025-10-28T00:05:00.134Z",
                "updated_at": "2025-10-28T00:05:03.123Z",
                "request": {}
            },
            {
                "execution_id": "986a1214-5618-4ab0-8814-33f10ce1c4d7",
                "source_name": "JEproc - TJSC - SC - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJSC",
                "status": "done",
                "created_at": "2025-10-28T00:05:00.393Z",
                "updated_at": "2025-10-28T00:05:02.898Z",
                "request": {}
            },
            {
                "execution_id": "8536307d-cb10-4bf7-aabe-3c25f973b0fa",
                "source_name": "JEproc - TJMMG - MG - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJMMG",
                "status": "done",
                "created_at": "2025-10-28T00:05:00.653Z",
                "updated_at": "2025-10-28T00:05:33.724Z",
                "request": {}
            },
            {
                "execution_id": "c917a3f7-1746-4f7f-9020-def43c1595d3",
                "source_name": "JEproc - TJTO - TO - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJTO",
                "status": "done",
                "created_at": "2025-10-28T00:05:00.947Z",
                "updated_at": "2025-10-28T00:05:05.222Z",
                "request": {}
            },
            {
                "execution_id": "d5a7dc94-c515-4dfc-9009-e1b288389445",
                "source_name": "JEproc - TJMMG - MG - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJMMG",
                "status": "done",
                "created_at": "2025-10-28T00:05:01.197Z",
                "updated_at": "2025-10-28T00:05:02.908Z",
                "request": {}
            },
            {
                "execution_id": "d613e4cb-2f88-4da4-bf96-dc91bf60b173",
                "source_name": "JEproc - TJTO - TO - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJTO",
                "status": "done",
                "created_at": "2025-10-28T00:05:01.446Z",
                "updated_at": "2025-10-28T00:05:03.371Z",
                "request": {}
            },
            {
                "execution_id": "e6399f91-40c5-4581-86bf-55fc477e319a",
                "source_name": "JEproc - JFRS - RS - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF4",
                "status": "done",
                "created_at": "2025-10-28T00:05:01.699Z",
                "updated_at": "2025-10-28T00:05:03.810Z",
                "request": {}
            },
            {
                "execution_id": "f1136af4-93aa-4d5b-ad96-874b17d12034",
                "source_name": "JEproc - JFPR - PR - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF4",
                "status": "done",
                "created_at": "2025-10-28T00:05:01.948Z",
                "updated_at": "2025-10-28T00:05:05.024Z",
                "request": {}
            },
            {
                "execution_id": "81a95f49-d191-405c-adae-78663f8edc9b",
                "source_name": "JEproc - TJRS - RS - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJRS",
                "status": "done",
                "created_at": "2025-10-28T00:05:02.429Z",
                "updated_at": "2025-10-28T00:05:35.842Z",
                "request": {}
            },
            {
                "execution_id": "b43de149-e8a8-437b-a594-ed2d3348069b",
                "source_name": "JPje - BA - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJBA",
                "status": "done",
                "created_at": "2025-10-28T00:05:02.682Z",
                "updated_at": "2025-10-28T00:05:20.713Z",
                "request": {}
            },
            {
                "execution_id": "d58ea40a-c45c-4525-ad56-fa7ab208d306",
                "source_name": "JPje - BA - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJBA",
                "status": "done",
                "created_at": "2025-10-28T00:05:02.931Z",
                "updated_at": "2025-10-28T00:06:26.809Z",
                "request": {}
            },
            {
                "execution_id": "e324cb34-cc71-46fc-8091-68ce393e449b",
                "source_name": "JProjudi - TJ - BA - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJBA",
                "status": "done",
                "created_at": "2025-10-28T00:05:03.181Z",
                "updated_at": "2025-10-28T00:05:04.560Z",
                "request": {}
            },
            {
                "execution_id": "9573fe01-8f0b-4d7c-8a5e-9218e60be728",
                "source_name": "JPje - TRF6 - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF6",
                "status": "done",
                "created_at": "2025-10-28T00:05:03.430Z",
                "updated_at": "2025-10-28T00:05:06.810Z",
                "request": {}
            },
            {
                "execution_id": "8a3164ec-f643-437a-bf46-84a640ec5c0a",
                "source_name": "JPje - TRF6 - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TRF6",
                "status": "done",
                "created_at": "2025-10-28T00:05:03.681Z",
                "updated_at": "2025-10-28T00:05:28.497Z",
                "request": {}
            },
            {
                "execution_id": "4e981a9f-cae7-4122-8f3b-ff48636db7df",
                "source_name": "JSeeu - BR - Lawsuit - Auth - 1 instance",
                "status": "done",
                "created_at": "2025-10-28T00:05:03.936Z",
                "updated_at": "2025-10-28T00:05:04.956Z",
                "request": {}
            },
            {
                "execution_id": "a4308788-db75-455f-bbc6-232f0625fbc4",
                "source_name": "JEproc - TJMG - MG - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJMG",
                "status": "done",
                "created_at": "2025-10-28T00:05:04.221Z",
                "updated_at": "2025-10-28T00:05:06.069Z",
                "request": {}
            },
            {
                "execution_id": "2a4d0757-fbdb-4372-ac7a-37c551f27bd5",
                "source_name": "JEproc - TJMG - MG - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJMG",
                "status": "done",
                "created_at": "2025-10-28T00:05:04.473Z",
                "updated_at": "2025-10-28T00:05:06.511Z",
                "request": {}
            },
            {
                "execution_id": "df29f55e-627f-4593-8c06-842ce949e018",
                "source_name": "JProjudiGreen - TJAM - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJAM",
                "status": "done",
                "created_at": "2025-10-28T00:05:04.720Z",
                "updated_at": "2025-10-28T00:05:07.475Z",
                "request": {}
            },
            {
                "execution_id": "88505271-ab4f-4a8d-af09-11587ac7b9d1",
                "source_name": "JProjudiGreen - TJPR - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TJPR",
                "status": "done",
                "created_at": "2025-10-28T00:05:05.081Z",
                "updated_at": "2025-10-28T00:05:13.971Z",
                "request": {}
            },
            {
                "execution_id": "596fa196-a7a5-4787-ae77-f75f79ab0e4c",
                "source_name": "JEproc - TJRJ - RJ - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJRJ",
                "status": "pending",
                "created_at": "2025-10-28T00:05:05.552Z",
                "updated_at": "2025-10-28T00:05:06.090Z",
                "request": {}
            },
            {
                "execution_id": "283cc36b-4f2f-41fb-894d-7927b798eb95",
                "source_name": "JPje - TRF5 - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF5",
                "status": "done",
                "created_at": "2025-10-28T00:05:05.799Z",
                "updated_at": "2025-10-28T00:05:09.123Z",
                "request": {}
            },
            {
                "execution_id": "50cbb8c1-ad2d-41c4-995b-43d77a63360a",
                "source_name": "JEproc - TRF6 - MG - Lawsuit - Auth - 2 instance",
                "tribunal_acronym": "TRF6",
                "status": "done",
                "created_at": "2025-10-28T00:05:06.066Z",
                "updated_at": "2025-10-28T00:05:07.971Z",
                "request": {}
            },
            {
                "execution_id": "b86c162d-6acb-48e1-b301-753091c48f69",
                "source_name": "JEproc - TRF6 - MG - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRF6",
                "status": "done",
                "created_at": "2025-10-28T00:05:06.312Z",
                "updated_at": "2025-10-28T00:05:08.272Z",
                "request": {}
            },
            {
                "execution_id": "87a9ff59-dd6c-4d77-88f4-107dfec0f243",
                "source_name": "CNJ - 1º grau - No Auth",
                "status": "done",
                "created_at": "2025-10-28T00:05:06.566Z",
                "updated_at": "2025-10-28T00:05:07.359Z",
                "request": {}
            },
            {
                "execution_id": "b4005be0-5a04-44cc-bc64-0cae621676d3",
                "source_name": "JPE - TJMG - 2º grau - Auth",
                "tribunal_acronym": "TJMG",
                "status": "done",
                "created_at": "2025-10-28T00:05:06.813Z",
                "updated_at": "2025-10-28T00:05:19.177Z",
                "request": {}
            },
            {
                "execution_id": "e5d83050-902b-4061-a082-17a5c6953839",
                "source_name": "JTJSE - SE - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TJSE",
                "status": "done",
                "created_at": "2025-10-28T00:05:07.057Z",
                "updated_at": "2025-10-28T00:05:50.393Z",
                "request": {}
            },
            {
                "execution_id": "4c4d6117-cf9a-4d47-ae69-3505d74f4c78",
                "source_name": "PJE - TRT - RJ - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT1",
                "status": "done",
                "created_at": "2025-10-28T00:05:07.310Z",
                "updated_at": "2025-10-28T00:05:33.847Z",
                "request": {}
            },
            {
                "execution_id": "6f082ce1-2be0-4930-a75b-69382f298eb3",
                "source_name": "PJE - TRT - MG - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT3",
                "status": "done",
                "created_at": "2025-10-28T00:05:07.554Z",
                "updated_at": "2025-10-28T00:05:11.172Z",
                "request": {}
            },
            {
                "execution_id": "7ddd959a-6f78-4f44-83cb-2259a532b823",
                "source_name": "PJE - TRT - RS - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT4",
                "status": "done",
                "created_at": "2025-10-28T00:05:07.861Z",
                "updated_at": "2025-10-28T00:05:13.874Z",
                "request": {}
            },
            {
                "execution_id": "ee399076-03a7-494e-93b2-aef271d16279",
                "source_name": "PJE - TRT - BA - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT5",
                "status": "done",
                "created_at": "2025-10-28T00:05:08.108Z",
                "updated_at": "2025-10-28T00:05:19.628Z",
                "request": {}
            },
            {
                "execution_id": "1f1c5e34-eca2-4960-b8fb-49fc0e264fc7",
                "source_name": "PJE - TRT - SP;1 - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT2",
                "status": "done",
                "created_at": "2025-10-28T00:05:08.358Z",
                "updated_at": "2025-10-28T00:05:20.420Z",
                "request": {}
            },
            {
                "execution_id": "7a77914a-9a25-43bf-9b8e-0ad4e89e992e",
                "source_name": "PJE - TRT - CE - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT7",
                "status": "done",
                "created_at": "2025-10-28T00:05:08.605Z",
                "updated_at": "2025-10-28T00:05:18.595Z",
                "request": {}
            },
            {
                "execution_id": "f4fb6f88-cdde-459c-9b54-8e1c19cb2064",
                "source_name": "PJE - TRT - PA;AP - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT8",
                "status": "done",
                "created_at": "2025-10-28T00:05:08.853Z",
                "updated_at": "2025-10-28T00:05:32.171Z",
                "request": {}
            },
            {
                "execution_id": "56a17eba-d3e5-45e7-8da9-35d990778b49",
                "source_name": "PJE - TRT - MA - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT16",
                "status": "done",
                "created_at": "2025-10-28T00:05:09.100Z",
                "updated_at": "2025-10-28T00:05:31.277Z",
                "request": {}
            },
            {
                "execution_id": "812f2f89-e7de-485e-975e-68a1b7f8090e",
                "source_name": "PJE - TRT - DF - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT10",
                "status": "done",
                "created_at": "2025-10-28T00:05:09.347Z",
                "updated_at": "2025-10-28T00:05:19.386Z",
                "request": {}
            },
            {
                "execution_id": "faa2f818-6db2-41ee-ae08-76e91eb03d59",
                "source_name": "PJE - TRT - AM;RR - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT11",
                "status": "done",
                "created_at": "2025-10-28T00:05:09.594Z",
                "updated_at": "2025-10-28T00:05:21.784Z",
                "request": {}
            },
            {
                "execution_id": "b07ed24c-8ae1-4e62-9da4-31c0d58cd4cc",
                "source_name": "PJE - TRT - PR - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT9",
                "status": "done",
                "created_at": "2025-10-28T00:05:09.841Z",
                "updated_at": "2025-10-28T00:05:14.648Z",
                "request": {}
            },
            {
                "execution_id": "d7750327-b08e-4ec5-b52a-8f04ab2ed323",
                "source_name": "PJE - TRT - SC - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT12",
                "status": "done",
                "created_at": "2025-10-28T00:05:10.091Z",
                "updated_at": "2025-10-28T00:05:15.030Z",
                "request": {}
            },
            {
                "execution_id": "27381191-992b-4b29-a5f7-479c3e0475be",
                "source_name": "PJE - TRT - SP;2 - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT15",
                "status": "done",
                "created_at": "2025-10-28T00:05:10.336Z",
                "updated_at": "2025-10-28T00:05:21.787Z",
                "request": {}
            },
            {
                "execution_id": "08b50bac-0db1-4ec5-97ed-7caa8e4e1fc7",
                "source_name": "PJE - TRT - RO;AC - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT14",
                "status": "done",
                "created_at": "2025-10-28T00:05:10.582Z",
                "updated_at": "2025-10-28T00:05:34.965Z",
                "request": {}
            },
            {
                "execution_id": "200f0023-70f5-4665-a8f7-972abbd47dda",
                "source_name": "PJE - TRT - RN - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT21",
                "status": "done",
                "created_at": "2025-10-28T00:05:10.848Z",
                "updated_at": "2025-10-28T00:05:21.595Z",
                "request": {}
            },
            {
                "execution_id": "2a923bb7-eb37-432c-97cb-236af43855d1",
                "source_name": "PJE - TRT - GO - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT18",
                "status": "done",
                "created_at": "2025-10-28T00:05:11.095Z",
                "updated_at": "2025-10-28T00:05:20.489Z",
                "request": {}
            },
            {
                "execution_id": "02707c4b-6e15-4442-9ba2-4bf396d347c6",
                "source_name": "PJE - TRT - MS - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT24",
                "status": "done",
                "created_at": "2025-10-28T00:05:11.340Z",
                "updated_at": "2025-10-28T00:05:17.824Z",
                "request": {}
            },
            {
                "execution_id": "7195d32d-e91b-4da2-ad49-237ff2d8148a",
                "source_name": "PJE - TRT - ES - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT17",
                "status": "done",
                "created_at": "2025-10-28T00:05:11.589Z",
                "updated_at": "2025-10-28T00:05:20.661Z",
                "request": {}
            },
            {
                "execution_id": "ed98c16a-ee56-4d93-a7de-938beb0db127",
                "source_name": "PJE - TRT - MT - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT23",
                "status": "done",
                "created_at": "2025-10-28T00:05:11.834Z",
                "updated_at": "2025-10-28T00:05:18.057Z",
                "request": {}
            },
            {
                "execution_id": "99f6a2b7-5fdd-4e93-9fe2-d961e66c0968",
                "source_name": "PJE - TRT - AL - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT19",
                "status": "done",
                "created_at": "2025-10-28T00:05:12.085Z",
                "updated_at": "2025-10-28T00:05:19.408Z",
                "request": {}
            },
            {
                "execution_id": "a418c314-faf4-42a7-b535-a4bd6c4e3acd",
                "source_name": "PJE - TRT - SE - Lawsuit - Auth - 1 instance",
                "tribunal_acronym": "TRT20",
                "status": "done",
                "created_at": "2025-10-28T00:05:12.333Z",
                "updated_at": "2025-10-28T00:05:34.490Z",
                "request": {}
            }
        ],
        "page_count": 100,
        "all_count": 206,
        "all_pages_count": 3
}

📨Consultar o conteúdo da resposta
Na URL vai o request_id retornado na primeira requisição.
curl --request GET \
  --url 'https://requests.prod.judit.io/responses/?request_id=cb97f8ba-7736-43c7-a961-436b151cd65c&page=1&page_size=10'
  --header 'api-key: SUA-API-KEY'
  --header 'Content-Type: application/json'

🧾Processo encontrado
Dentro de page_data é retornado um array onde cada processo é disposto como um objeto individual.
Caso uma mesma numeração seja encontrada em mais de uma instância, cada instância será retornada em um objeto separado.
Exemplo de retorno quando foram encontrados processos atrelados ao documento consultado:
{
 "page": 1,
 "page_data": [
     {
         "request_id": "05ee9825-b2b4-480b-b29e-f071ca7d9c72",
         "response_id": "e49d2e2c-92ed-4dad-8701-c53a569d675b",
         "response_type": "lawsuit",
         "response_data": {
             "code": "9999999-99.2023.8.19.9999",
             "justice": "8",
             "tribunal": "19",
             "tribunal_acronym": "TJRJ",
             "secrecy_level": 0,
             "tags": {
                 "is_fallback_source": true,
                 "crawl_id": "bd5ca800-9351-4d6e-a238-4690face8a5e"
             },
             "instance": 1,
             "crawler": {
                 "source_name": "JTJ - BR - Document / Lawsuit - Auth",
                 "crawl_id": "bd5ca800-9351-4d6e-a238-4690face8a5e",
                 "weight": 10,
                 "updated_at": "2024-02-21T17:33:24.063Z"
             },
             "classifications": [
                 {
                     "code": "436",
                     "name": "PROCEDIMENTO DO JUIZADO ESPECIAL CÍVEL"
                 }
             ],
             "subjects": [
                 {
                     "code": "7769",
                     "name": "ABATIMENTO PROPORCIONAL DO PREÇO"
                 },
                 {
                     "code": "7748",
                     "name": "ACIDENTE AÉREO"
                 },
                 {
                     "code": "10435",
                     "name": "ACIDENTE DE TRÂNSITO"
                 }
             ],
             "courts": [
                 {
                     "code": "13805",
                     "name": "BARRA DA TIJUCA REGIONAL II JUI ESP CIV"
                 }
             ],
             "amount": 28790,
             "parties": [
                 {
                     "name": "USUÁRIO TESTE ATIVO",
                     "side": "Active",
                     "person_type": "Autor",
                     "document": "99999999999",
                     "document_type": "CPF",
                     "lawyers": []
                 },
                 {
                     "name": "USUÁRIO TESTE PASSIVO",
                     "side": "Active",
                     "person_type": "Autor",
                     "document": "99999999999",
                     "document_type": "CPF",
                     "lawyers": []
                 },
                 {
                     "name": "USUÁRIO TESTE AUTOR",
                     "side": "Active",
                     "person_type": "Autor",
                     "document": "18250433700",
                     "document_type": "CPF",
                     "lawyers": []
                 },
                 {
                     "name": "LEONARDO MENDES LIMA",
                     "side": "Active",
                     "person_type": "Autor",
                     "document": "99999999999",
                     "document_type": "CPF",
                     "lawyers": []
                 },
                 {
                     "name": "USUÁRIO TESTE 03",
                     "side": "Active",
                     "person_type": "Autor",
                     "document": "99999999999",
                     "document_type": "CPF",
                     "lawyers": []
                 },
                 {
                     "name": "USUÁRIO TESTE 04",
                     "side": "Active",
                     "person_type": "Autor",
                     "document": "13482560790",
                     "document_type": "CPF",
                     "lawyers": []
                 }
             ],
             "attachments": [],
             "steps": [],
             "related_lawsuits": [],
             "last_step": {
                 "lawsuit_cnj": "9999999-99.2023.8.19.9999",
                 "lawsuit_instance": 1,
                 "step_id": "nU9IcVb9NLoHrJeUXt+Hay139dqHAVbfxk7f0D77aRQ=",
                 "step_date": "2024-02-21T17:33:24.064Z",
                 "private": false,
                 "steps_count": 1
             },
             "name": "USUÁRIO TESTE 01 X USUÁRIO TESTE 02",
             "distribution_date": "2023-06-06T17:35:50.000Z",
             "phase": "Inicial",
             "status": "Ativo"
         },
         "user_id": "82082593-c664-4d7b-b174-2f0dc4791daf",
         "created_at": "2024-02-21T17:33:24.490Z",
         "request_status": "completed",
         "tags": {
             "dashboard_id": null
         }
     },
     {
         "request_id": "05ee9825-b2b4-480b-b29e-f071ca7d9c72",
         "response_id": "66da2fca-6f5d-4664-9e46-0d34f80746c2",
         "response_type": "lawsuit",
         "response_data": {
             "code": "9999999-99.2022.5.01.9999",
             "justice": "5",
             "tribunal": "01",
             "tribunal_acronym": "TRT1",
             "secrecy_level": 0,
             "tags": {
                 "is_fallback_source": true,
                 "crawl_id": "bd5ca800-9351-4d6e-a238-4690face8a5e"
             },
             "instance": 1,
             "crawler": {
                 "source_name": "JTJ - BR - Document / Lawsuit - Auth",
                 "crawl_id": "bd5ca800-9351-4d6e-a238-4690face8a5e",
                 "weight": 10,
                 "updated_at": "2024-02-21T17:33:24.063Z"
             },
             "classifications": [
                 {
                     "code": "985",
                     "name": "AÇÃO TRABALHISTA - RITO ORDINÁRIO"
                 }
             ],
             "subjects": [
                 {
                     "code": "13656",
                     "name": "DOMÉSTICOS"
                 }
             ],
             "courts": [
                 {
                     "code": "33782",
                     "name": "RIO DE JANEIRO - 37ª VARA DO TRABALHO"
                 }
             ],
             "amount": 7685.82,
             "parties": [
                 {
                     "name": "USUÁRIO TESTE",
                     "side": "Active",
                     "person_type": "Autor",
                     "document": "99999999999",
                     "document_type": "CPF",
                     "lawyers": [
                         {
                             "name": "ADVOGADO TESTE",
                             "side": "Active",
                             "person_type": "Advogado"
                         }
                     ]
                 },
                 {
                     "name": "USUÁRIO TESTE 02",
                     "side": "Passive",
                     "person_type": "Réu",
                     "document": "99999999999",
                     "document_type": "CPF",
                     "lawyers": [
                         {
                             "name": "ADVOGADO TESTE 02",
                             "side": "Passive",
                             "person_type": "Advogado"
                         }
                     ]
                 },
                 {
                     "person_type": "Advogado",
                     "side": "Active",
                     "name": "ADVOGADO TESTE03"
                 }
             ],
             "attachments": [],
             "steps": [],
             "related_lawsuits": [],
             "last_step": {
                 "lawsuit_cnj": "9999999-99.2022.5.01.9999",
                 "lawsuit_instance": 1,
                 "step_id": "u2r/3iZieAWrkFjxBZC/r4bMlFAvRO1IWvaOD8xdGl8=",
                 "step_date": "2024-02-21T17:33:24.063Z",
                 "private": false,
                 "steps_count": 1
             },
             "name": "USUÁRIO TESTE 01 X USUÁRIO TESTE 02",
             "distribution_date": "2022-03-30T16:41:24.000Z",
             "phase": "Inicial",
             "status": "Ativo"
         },
         "user_id": "9999999-c664-4d7b-b174-2f0dc4791daf",
         "created_at": "2024-02-21T17:33:24.490Z",
         "request_status": "completed",
         "tags": {
             "dashboard_id": null
         }
     },
     {
         "request_id": "05ee9825-b2b4-480b-b29e-f071ca7d9c72",
         "response_id": "5f83741e-97f4-4c3b-84fb-6c49e4cfe494",
         "response_type": "lawsuit",
         "response_data": {
             "code": "9999999-99.2023.8.19.9999",
             "justice": "8",
             "tribunal": "19",
             "tribunal_acronym": "TJRJ",
             "secrecy_level": 0,
             "tags": {
                 "is_fallback_source": true,
                 "crawl_id": "bd5ca800-9351-4d6e-a238-4690face8a5e"
             },
             "instance": 1,
             "crawler": {
                 "source_name": "JTJ - BR - Document / Lawsuit - Auth",
                 "crawl_id": "bd5ca800-9351-4d6e-a238-4690face8a5e",
                 "weight": 10,
                 "updated_at": "2024-02-21T17:33:24.063Z"
             },
             "classifications": [
                 {
                     "code": "436",
                     "name": "PROCEDIMENTO DO JUIZADO ESPECIAL CÍVEL"
                 }
             ],
             "subjects": [
                 {
                     "code": "7780",
                     "name": "INDENIZAÇÃO POR DANO MATERIAL"
                 },
                 {
                     "code": "7779",
                     "name": "INDENIZAÇÃO POR DANO MORAL"
                 }
             ],
             "courts": [
                 {
                     "code": "7869",
                     "name": "BANGU REGIONAL XVII JUI ESP CIV"
                 }
             ],
             "amount": 46831,
             "parties": [
                 {
                     "name": "USUÁRIO TESTE 01",
                     "side": "Active",
                     "person_type": "Autor",
                     "document": "99999999999",
                     "document_type": "CPF",
                     "lawyers": []
                 },
                 {
                     "name": "USUÁRIO TESTE 02",
                     "side": "Active",
                     "person_type": "Autor",
                     "document": "99999999999",
                     "document_type": "CPF",
                     "lawyers": []
                 }
             ],
             "attachments": [],
             "steps": [],
             "related_lawsuits": [],
             "last_step": {
                 "lawsuit_cnj": "9999999-99.9999.8.19.9999",
                 "lawsuit_instance": 1,
                 "step_id": "YpIR5rAfSprFSseqRe9oVUPtkKcgQI0Na8RIv1djKZI=",
                 "step_date": "2024-02-21T17:33:24.063Z",
                 "private": false,
                 "steps_count": 1
             },
             "name": "USUÁRIO TESTE 01 X USUÁRIO TESTE 02",
             "phase": "Inicial",
             "status": "Ativo"
         },
         "user_id": "82082593-c664-4d7b-b174-2f0dc4791daf",
         "created_at": "2024-02-21T17:33:24.490Z",
         "request_status": "completed",
         "tags": {
             "dashboard_id": null
         }
     }
 ],
 "page_count": 3,
 "all_count": 3,
 "all_pages_count": 1
}

📄 Processo não encontrado
Exemplo de retorno quando o processo não foi encontrado em nossa base de dados ou tribunal:
{
    "request_status": "completed",
    "page": 1,
    "page_count": 0,
    "all_pages_count": 0,
    "all_count": 0,
    "page_data": []
}

Verifique o parâmetro request_status para garantir que a resposta foi processada com sucesso. O valor deve ser completed. Caso contrário, a solicitação ainda está em processamento.
Os parâmetro page e page_size são opcionais, porém necessários para percorrer as páginas com os processos, caso venham mais de uma, o que é comum no caso de consulta por documento.

As propriedades de paginação:

​
request_status
string
Define o status da resposta.
​
page
integer
Define a página atual da busca.
​
page_count
integer
Total de processos na página.
​
all_count
integer
Total de processos encontrados
​
all_pages_count
integer
Quantidade de páginas de processos
​
page_data
array
Array com as respostas e dentro da propriedade response_data o conteúdo do processo.


# Busca por Dados Cadastrais
Esta página tem como objetivo mostrar o fluxo de Consulta por dados cadastrais.

1. Criação de Request

Para consultar dados cadastrais via CPF, CNPJ ou Nome, a requisição deve ser realizada através do endpoint /requests/create da API de lawsuits. A consulta por dados cadastrais pode ser realizada diretamente em nosso datalake ou em tempo real na receita federal, para que sejam consultados os dados em tempo real, basta adicionar o parâmentro on-demand com o valor true no payload da requisção.
Nota: Na consulta por dados cadastrais, o search_type deve ser ‘cpf’, ‘cnpj’ ou ‘name’, já o campo response_type deverá sempre ser ‘entity’.

Exemplo de Consulta por CPF:
curl --location 'https://lawsuits.prod.judit.io/requests/create' \
 --header 'Content-Type: application/json' \
 --header 'api-key: <API-KEY>' \
 --data '{
     "search": {
         "search_type": "cpf",
         "search_key": "999.999.999-99",
         "response_type": "entity"
     }
 }'

Exemplo de Consulta por CNPJ:
curl --location 'https://lawsuits.prod.judit.io/requests/create' \
--header 'Content-Type: application/json' \
--header 'api-key: <API-KEY>' \
--data '{
    "search": {
        "search_type": "cnpj",
        "search_key": "99.999.999/9999-99",
        "response_type": "entity"
    }
}'

Exemplo de Consulta por Nome:
Ao realizar consultas por nome na busca de dados cadastrais, é possível que existam homônimos (pessoas ou empresas com o mesmo nome). Recomendamos que, sempre que possível, utilize identificadores únicos, como CPF ou CNPJ, para garantir maior precisão nos resultados.

curl --location 'https://lawsuits.prod.judit.io/requests/create' \
 --header 'Content-Type: application/json' \
 --header 'api-key: <API-KEY>' \
 --data '{
     "search": {
         "search_type": "name",
         "search_key": "Nome teste",
         "response_type": "entity"
     }
 }'

 Ao realizar uma consulta por CNPJ, é possível obter informações detalhadas, incluindo dados não mascarados dos sócios associados ao CNPJ consultado. Para acessar essas informações, basta incluir a propriedade reveal_partners_documents e definir seu valor como true.


Resposta por CPF
{
   "has_lawsuits": false,
   "request_id": "5c618521-2ecc-4176-a573-431d2e0edeb2",
   "response_data": [
       {
           "entity_id": "",
           "entity_type": "person",
           "main_document": "999.999.999-99",
           "name": "JOÃO TESTE",
           "addresses": [
               {
                   "street": "RUA RAMOS DE CARVALHO",
                   "number": "999",
                   "complement": "",
                   "neighborhood": "CENTRO",
                   "city": "RIO DE JANEIRO",
                   "state": "RJ",
                   "country": "Brasil",
                   "zip_code": "99999999",
                   "ibge_code": 9999999
               }
           ],
           "aka_names": [],
           "contacts": [
               {
                   "description": "21999999999",
                   "contact_type": "phone"
               }
           ],
           "documents": [],
           "parents": [
               {
                   "name": "JANAINA DA SILVA",
                   "kinship": "mother"
               }
           ],
           "partners": [],
           "associated_people": [],
           "tags": {
               "revenue_update_date": "2022-05-30T00:00:00.000Z"
           },
           "created_at": "2024-10-12T13:28:59.051Z",
           "updated_at": "2024-10-12T13:28:59.051Z",
           "nationality": "BRASILEIRA",
           "birth_date": "1981-08-07T00:00:00.000Z",
           "gender": "male",
           "revenue_service_active": true
       }
   ]
}

Resposta por CNPJ
{
   "has_lawsuits": false,
   "request_id": "6e5a24f7-f874-4234-8acc-419142e2b066",
   "response_data": [
       {
           "entity_id": "",
           "entity_type": "company",
           "main_document": "99.999.999/0009-99",
           "name": "FINGI - EM RECUPERACAO JUDICIAL",
           "social_name": "FING",
           "addresses": [
               {
                   "street": "RUA DO JOÃO CIRILO",
                   "number": "99",
                   "complement": "ANDAR 9",
                   "neighborhood": "CENTRO",
                   "city": "RIO DE JANEIRO",
                   "state": "RJ",
                   "country": "BRASIL",
                   "zip_code": "99999999",
                   "ibge_code": 999999
               }
           ],
           "aka_names": [],
           "contacts": [
               {
                   "description": "999999999",
                   "contact_type": "phone"
               },
               {
                   "description": "999999999",
                   "contact_type": "phone"
               },
               {
                   "description": "ouvidoria@fing.com.br",
                   "contact_type": "email"
               }
           ],
           "documents": [],
           "parents": [],
           "partners": [
               {
                   "entity_id": "",
                   "entity_type": "company",
                   "main_document": "***999999**",
                   "name": "JOÃO DE OLIVEIRA SOUZA",
                   "position": "CONSELHEIRO DE ADMINISTRAÇÃO",
                   "addresses": [],
                   "aka_names": [],
                   "contacts": [],
                   "documents": [],
                   "parents": [],
                   "partners": [],
                   "branch_activities": [],
                   "associated_people": [],
                   "tags": {
                       "age_group": "Entre 61 a 70 anos",
                       "start_date": "2018-09-25T00:00:00.000Z"
                   },
                   "created_at": "2024-10-12T13:32:25.135Z",
                   "updated_at": "2024-10-12T13:32:25.135Z"
               }
           ],
           "branch_activities": [
               {
                   "code": "9999999",
                   "name": "SERVIÇOS DE ATENDIMENTO AO CLIENTE - SAC",
                   "active": true,
                   "main_activity": true,
                   "tree_history": ""
               },
               {
                   "code": "9999999",
                   "name": "CONSTRUÇÃO DE ESTAÇÕES E REDES",
                   "active": true,
                   "main_activity": false,
                   "tree_history": ""
               }
           ],
           "associated_people": [],
           "tags": {
               "revenue_update_date": "2005-11-03T00:00:00.000Z"
           },
           "created_at": "2024-10-12T13:32:25.134Z",
           "updated_at": "2024-10-12T13:32:25.134Z",
           "nationality": "BRASILEIRA",
           "birth_date": "1966-09-26T00:00:00.000Z",
           "size": "DEMAIS",
           "legal_nature": {
               "code": "2046",
               "name": "SOCIEDADE ANÔNIMA ABERTA",
               "active": true
           },
           "head_office": true,
           "revenue_service_active": true,
           "special_status": "RECUPERACAO JUDICIAL",
           "special_status_date": "2016-06-29T00:00:00.000Z",
           "share_capital": 99999999999
       }
   ]
}

Resposta por Nome
{
   "request_id": "223458ec-f3a1-4851-8d2b-19672066565c",
   "response_data": [
       {
           "entity_id": "999.999.999-99",
           "entity_type": "person",
           "main_document": "999.999.999-99",
           "name": "Usuário Teste",
           "addresses": [],
           "aka_names": [],
           "contacts": [],
           "documents": [],
           "parents": [
               {
                   "name": "Usuário teste 1",
                   "kinship": "mother"
               }
           ],
           "partners": [],
           "associated_people": [],
           "tags": {},
           "created_at": "2025-04-19T00:14:56.561Z",
           "updated_at": "2025-04-19T00:14:56.561Z",
           "nationality": "BRASILEIRA",
           "birth_date": "1989-12-25T00:00:00.000Z",
           "gender": "male"
       }
   ]
}

Ao realizar uma consulta por CNPJ, é possível obter informações detalhadas, incluindo dados não mascarados dos sócios associados ao CNPJ consultado. Para acessar essas informações, basta incluir a propriedade reveal_partners_documents e definir seu valor como true.


