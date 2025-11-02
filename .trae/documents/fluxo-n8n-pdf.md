# UTILIZE ESSE DOCUMENTO PARA IDENTIFICAR A ESTRUTURA DO WEBHOOK CRIADO NO N8N PARA PROCESSAR OS PDFs

# nome do fluxo: e7-extrator-pdf

# webhook: https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-holerite

{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "processar-holerite",
        "responseMode": "responseNode",
        "options": {
          "binaryPropertyName": "pdf",
          "rawBody": false
        }
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [
        -1040,
        112
      ],
      "id": "862b9ad4-abfa-4d0d-b565-250fc0eee85c",
      "name": "Webhook - Receber PDF",
      "webhookId": "4efbea7f-fdcc-4352-8af7-7130ea1d9144"
    },
    {
      "parameters": {
        "jsCode": "// Validar dados recebidos\nconst body = $input.all()[0].json;\nconst binary = $input.all()[0].binary;\n\n// Validar campos obrigatórios\nif (!body.competencia || !body.competencia.match(/^\\d{2}\\/\\d{4}$/)) {\n  throw new Error('Campo \"competencia\" é obrigatório no formato MM/AAAA');\n}\n\n// Verificar se foi enviado um PDF\nif (!binary || !binary.pdf) {\n  throw new Error('Arquivo PDF não encontrado. Envie o PDF no campo \"pdf\"');\n}\n\n// Extrair mês e ano da competência\nconst [mes, ano] = body.competencia.split('/');\n\n// Preparar dados para o próximo node\nreturn {\n  json: {\n    competencia: body.competencia,\n    mes: mes,\n    ano: ano,\n    nomeArquivo: body.nomeArquivo || `holerite_${mes}_${ano}.pdf`,\n    timestamp: new Date().toISOString()\n  },\n  binary: {\n    pdf: binary.pdf\n  }\n};"
      },
      "name": "Validar e Preparar Dados",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -800,
        112
      ],
      "id": "499d2768-1a6a-48d7-9c03-43b27316aeb8"
    },
    {
      "parameters": {
        "operation": "extractText"
      },
      "name": "OCR - Extrair Texto",
      "type": "n8n-nodes-base.extractFromFile",
      "typeVersion": 1,
      "position": [
        -432,
        112
      ],
      "id": "72efc7a6-a424-41dd-8b41-a47b803eef2b"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.text }}",
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 2.1,
      "position": [
        -224,
        112
      ],
      "id": "5fdf7dd0-d9db-4e63-9f24-684a024be88b",
      "name": "AI Agent - Extrator"
    },
    {
      "parameters": {
        "model": {
          "__rl": true,
          "value": "gpt-4o",
          "mode": "list"
        },
        "options": {
          "maxTokens": 16000,
          "responseFormat": {
            "type": "json_object"
          },
          "temperature": 0
        }
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1.2,
      "position": [
        -384,
        384
      ],
      "id": "06897e98-6fac-4abc-8374-298340f4a1ef",
      "name": "OpenAI Model GPT-4",
      "credentials": {
        "openAiApi": {
          "id": "J5OoPQPVAwRuX0rf",
          "name": "OpenAI-E7"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "// Processar resposta do AI Agent\nconst agentOutput = $input.first().json.output;\n\nif (!agentOutput) {\n  throw new Error('AI Agent retornou vazio');\n}\n\n// Parse do JSON\nlet parsed;\ntry {\n  if (typeof agentOutput === 'string') {\n    const cleanOutput = agentOutput.replace(/```json|```/g, '').trim();\n    parsed = JSON.parse(cleanOutput);\n  } else {\n    parsed = agentOutput;\n  }\n} catch (e) {\n  throw new Error(`Erro ao parsear JSON: ${e.message}`);\n}\n\n// Validar estrutura\nif (!parsed.empresa || !parsed.proventos) {\n  throw new Error('JSON sem estrutura esperada (empresa/proventos)');\n}\n\nconst empresa = parsed.empresa;\nconst proventos = parsed.proventos;\nconst dadosIniciais = $('Validar e Preparar Dados').first().json;\n\n// Taxa SELIC atual (atualizar conforme necessário)\nconst TAXA_SELIC = 1.03; // 1.03% ao mês\n\n// Processar cada item de provento\nreturn proventos.map(item => {\n  // Valores base\n  const valor = parseFloat(item.valor) || 0;\n  const rat = 2.00; // 2%\n  const terceiros = 5.80; // 5.8%\n  \n  // Cálculos\n  const contribuicao = valor * (rat / 100);\n  const vl_rat_ajustado = contribuicao * (rat / 100);\n  const vl_cont_terceiros = valor * (terceiros / 100);\n  const total = contribuicao + vl_rat_ajustado + vl_cont_terceiros;\n  const vl_selic = total * (TAXA_SELIC / 100);\n  const credito = total + vl_selic;\n  \n  return {\n    json: {\n      // Dados da rubrica\n      cod: item.cod || '',\n      nome_rubrica: item.nome_rubrica || '',\n      valor: valor,\n      \n      // Cálculos tributários\n      contribuicao: parseFloat(contribuicao.toFixed(2)),\n      rat: rat,\n      vl_rat_ajustado: parseFloat(vl_rat_ajustado.toFixed(2)),\n      terceiros: terceiros,\n      vl_cont_terceiros: parseFloat(vl_cont_terceiros.toFixed(2)),\n      total: parseFloat(total.toFixed(2)),\n      selic: TAXA_SELIC,\n      vl_selic: parseFloat(vl_selic.toFixed(2)),\n      credito: parseFloat(credito.toFixed(2)),\n      \n      // Dados complementares\n      periodo: `01/${dadosIniciais.competencia}`,\n      cnpj: empresa.cnpj || '',\n      empresa_nome: empresa.nome || '',\n      competencia: dadosIniciais.competencia,\n      tipo_mapeado: item.tipo_mapeado || 'OUTROS'\n    }\n  };\n});"
      },
      "name": "Processar e Calcular",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        208,
        112
      ],
      "id": "04604e70-771d-46b7-9961-998546f2fc83"
    },
    {
      "parameters": {
        "operation": "toFile",
        "fileFormat": "xlsx",
        "options": {
          "fileName": "={{ 'holerite_' + $('Validar e Preparar Dados').first().json.competencia.replace('/', '_') + '_' + Date.now() + '.xlsx' }}",
          "headerRow": true
        }
      },
      "name": "Converter para XLSX",
      "type": "n8n-nodes-base.spreadsheetFile",
      "typeVersion": 2,
      "position": [
        672,
        -112
      ],
      "id": "e5d8e6ad-d2e9-4980-a25b-a620007e4927"
    },
    {
      "parameters": {
        "jsCode": "// Preparar dados para o formato XLSX correto\nconst items = $input.all();\n\nif (!items || items.length === 0) {\n  throw new Error('Nenhum dado para processar');\n}\n\n// Mapear dados para estrutura correta de colunas\nconst excelData = items.map(item => {\n  const data = item.json;\n  \n  return {\n    'COD': data.cod,\n    'Nome Rubrica': data.nome_rubrica,\n    'Valor': data.valor,\n    'Contribuição': data.contribuicao,\n    'RAT': data.rat + '%',\n    'VL RAT AJUSTADO': data.vl_rat_ajustado,\n    'TERCEIROS 5,8': data.terceiros + '%',\n    'VL CONT TERCEIROS': data.vl_cont_terceiros,\n    'TOTAL': data.total,\n    'SELIC': data.selic + '%',\n    'VL SELIC': data.vl_selic,\n    'Crédito': data.credito,\n    'Período': data.periodo,\n    'CNPJ': data.cnpj\n  };\n});\n\n// Adicionar linha de totais\nconst totais = {\n  'COD': 'TOTAIS',\n  'Nome Rubrica': '',\n  'Valor': excelData.reduce((sum, row) => sum + (parseFloat(row['Valor']) || 0), 0),\n  'Contribuição': excelData.reduce((sum, row) => sum + (parseFloat(row['Contribuição']) || 0), 0),\n  'RAT': '',\n  'VL RAT AJUSTADO': excelData.reduce((sum, row) => sum + (parseFloat(row['VL RAT AJUSTADO']) || 0), 0),\n  'TERCEIROS 5,8': '',\n  'VL CONT TERCEIROS': excelData.reduce((sum, row) => sum + (parseFloat(row['VL CONT TERCEIROS']) || 0), 0),\n  'TOTAL': excelData.reduce((sum, row) => sum + (parseFloat(row['TOTAL']) || 0), 0),\n  'SELIC': '',\n  'VL SELIC': excelData.reduce((sum, row) => sum + (parseFloat(row['VL SELIC']) || 0), 0),\n  'Crédito': excelData.reduce((sum, row) => sum + (parseFloat(row['Crédito']) || 0), 0),\n  'Período': '',\n  'CNPJ': ''\n};\n\n// Adicionar linha de totais\nexcelData.push(totais);\n\n// Informações adicionais\nconst dadosIniciais = $('Validar e Preparar Dados').first().json;\nconst empresaNome = items[0]?.json?.empresa_nome || 'Empresa';\n\nreturn excelData.map((row, index) => ({\n  json: row,\n  pairedItem: index\n}));"
      },
      "name": "Formatar Dados XLSX",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        448,
        -112
      ],
      "id": "c0b61e52-5af7-4c4a-8fb4-fe881b942b29"
    },
    {
      "parameters": {
        "operation": "upload",
        "bucketName": "e7-holerite",
        "fileName": "={{ $('Processar e Calcular').first().json.empresa_nome.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '/' + $('Validar e Preparar Dados').first().json.ano + '/' + $('Validar e Preparar Dados').first().json.competencia.replace('/', '_') + '/holerite_' + Date.now() + '.pdf' }}",
        "additionalFields": {
          "acl": "private",
          "storageClass": "STANDARD"
        }
      },
      "type": "n8n-nodes-base.awsS3",
      "typeVersion": 2,
      "position": [
        -592,
        -32
      ],
      "id": "331ae95d-266b-41b4-8c49-ad24ae3589bb",
      "name": "Upload PDF para S3",
      "credentials": {
        "aws": {
          "id": "xtXoYdILeaEmVmMk",
          "name": "AWS S3 - E7"
        }
      }
    },
    {
      "parameters": {
        "operation": "upload",
        "bucketName": "e7-holerite",
        "fileName": "={{ $('Processar e Calcular').first().json.empresa_nome.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '/' + $('Validar e Preparar Dados').first().json.ano + '/' + $('Validar e Preparar Dados').first().json.competencia.replace('/', '_') + '/extracao_excel/holerite_processado_' + Date.now() + '.xlsx' }}",
        "additionalFields": {
          "acl": "public-read",
          "storageClass": "STANDARD"
        }
      },
      "type": "n8n-nodes-base.awsS3",
      "typeVersion": 2,
      "position": [
        512,
        112
      ],
      "id": "9818226f-a1e5-4878-916d-4a6e54d96a6f",
      "name": "Upload XLSX para S3",
      "credentials": {
        "aws": {
          "id": "xtXoYdILeaEmVmMk",
          "name": "AWS S3 - E7"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "// Gerar URL pré-assinada para download\nconst s3Data = $('Upload XLSX para S3').first().json;\nconst dadosIniciais = $('Validar e Preparar Dados').first().json;\nconst totaisProcessados = $('Formatar Dados XLSX').all().length - 1; // -1 para excluir linha de totais\n\n// Preparar resposta para a aplicação React\nconst response = {\n  success: true,\n  message: 'Processamento concluído com sucesso',\n  data: {\n    // Informações do processamento\n    competencia: dadosIniciais.competencia,\n    totalProventos: totaisProcessados,\n    processadoEm: new Date().toISOString(),\n    \n    // URLs dos arquivos\n    arquivos: {\n      excel: {\n        url: s3Data.Location,\n        nome: s3Data.Key.split('/').pop(),\n        tamanho: s3Data.ContentLength || null,\n        tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'\n      },\n      pdf: {\n        url: $('Upload PDF para S3').first().json.Location,\n        nome: dadosIniciais.nomeArquivo\n      }\n    },\n    \n    // Resumo financeiro\n    resumo: {\n      valorTotal: $('Formatar Dados XLSX').all()\n        .slice(0, -1)\n        .reduce((sum, item) => sum + (item.json['Valor'] || 0), 0),\n      creditoTotal: $('Formatar Dados XLSX').all()\n        .slice(0, -1)\n        .reduce((sum, item) => sum + (item.json['Crédito'] || 0), 0)\n    },\n    \n    // Headers para CORS\n    headers: {\n      'Access-Control-Allow-Origin': '*',\n      'Access-Control-Allow-Methods': 'POST, OPTIONS',\n      'Content-Type': 'application/json'\n    }\n  }\n};\n\nreturn {\n  json: response\n};"
      },
      "name": "Preparar Resposta",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        688,
        112
      ],
      "id": "02cd2830-f887-462b-a4f5-8aff57195d62"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify($json) }}",
        "options": {
          "responseCode": 200,
          "responseHeaders": {
            "entries": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "Access-Control-Allow-Origin",
                "value": "*"
              },
              {
                "name": "Access-Control-Allow-Methods",
                "value": "POST, OPTIONS"
              }
            ]
          }
        }
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        864,
        112
      ],
      "id": "36f09bd1-8729-4fb1-9017-75f26b083cd2",
      "name": "Responder Webhook"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": false,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "combinator": "and",
          "conditions": [
            {
              "id": "error-check",
              "leftValue": "={{ $node['AI Agent - Extrator'].error }}",
              "rightValue": "",
              "operator": {
                "type": "boolean",
                "operation": "notEmpty"
              }
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        208,
        288
      ],
      "id": "1959e7a2-f7f3-4fc2-9178-99b77ec10731",
      "name": "Verificar Erro"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({\n  success: false,\n  error: 'Erro ao processar o PDF',\n  message: $node['AI Agent - Extrator'].error?.message || 'Erro desconhecido',\n  timestamp: new Date().toISOString()\n}) }}",
        "options": {
          "responseCode": 500,
          "responseHeaders": {
            "entries": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "Access-Control-Allow-Origin",
                "value": "*"
              }
            ]
          }
        }
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        464,
        336
      ],
      "id": "ad997267-18f5-40db-bd42-40173e2d02cd",
      "name": "Responder Erro"
    }
  ],
  "connections": {
    "Webhook - Receber PDF": {
      "main": [
        [
          {
            "node": "Validar e Preparar Dados",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Validar e Preparar Dados": {
      "main": [
        [
          {
            "node": "OCR - Extrair Texto",
            "type": "main",
            "index": 0
          },
          {
            "node": "Upload PDF para S3",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OCR - Extrair Texto": {
      "main": [
        [
          {
            "node": "AI Agent - Extrator",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI Agent - Extrator": {
      "main": [
        [
          {
            "node": "Processar e Calcular",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI Model GPT-4": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent - Extrator",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    },
    "Processar e Calcular": {
      "main": [
        [
          {
            "node": "Formatar Dados XLSX",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Converter para XLSX": {
      "main": [
        [
          {
            "node": "Upload XLSX para S3",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Formatar Dados XLSX": {
      "main": [
        [
          {
            "node": "Converter para XLSX",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Upload XLSX para S3": {
      "main": [
        [
          {
            "node": "Preparar Resposta",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Preparar Resposta": {
      "main": [
        [
          {
            "node": "Responder Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Verificar Erro": {
      "main": [
        [
          {
            "node": "Responder Erro",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Processar e Calcular",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "instanceId": "9474c6a00514abf32e506ac1e8a3630f4ad5062151d13e4e269bbbc8b5e3f423"
  }
}