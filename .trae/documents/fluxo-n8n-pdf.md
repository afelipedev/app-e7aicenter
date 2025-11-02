{
  "name": "VERSÃO FINAL A SER AJUSTADA copy",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "processar-folha-pagamento",
        "responseMode": "responseNode",
        "options": {
          "binaryPropertyName": "pdf",
          "rawBody": false
        }
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [
        -1248,
        -128
      ],
      "id": "516a2fe7-dd96-40e8-88aa-cb01b9e5d575",
      "name": "Webhook - Receber PDF",
      "webhookId": "a8322e03-bfdc-4d30-a2bd-c6d7467def40"
    },
    {
      "parameters": {
        "jsCode": "// Validar dados recebidos\nconst body = $input.all()[0].json;\nconst binary = $input.all()[0].binary;\n\n// Validar campos obrigatórios\nif (!body.dataExtracao) {\n  throw new Error('Campo \"dataExtracao\" é obrigatório');\n}\n\nif (!body.sistema || !['Dominio', 'Totvs', 'Senior HCM', 'Alterdata'].includes(body.sistema)) {\n  throw new Error('Campo \"sistema\" é obrigatório e deve ser: Dominio, Totvs, Senior HCM ou Alterdata');\n}\n\n// Verificar se foi enviado um PDF\nif (!binary || !binary.pdf) {\n  throw new Error('Arquivo PDF não encontrado. Envie o PDF no campo \"pdf\"');\n}\n\n// Preparar dados para o próximo node\nreturn {\n  json: {\n    'Data da extração': body.dataExtracao,\n    'Sistema': body.sistema,\n    'nomeArquivo': body.nomeArquivo || 'folha_pagamento.pdf'\n  },\n  binary: {\n    data: binary.pdf\n  }\n};"
      },
      "name": "Validar e Preparar Dados",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -1024,
        -128
      ],
      "id": "0c67217e-0e7c-40ea-a737-9539e7aa8c5c"
    },
    {
      "parameters": {
        "operation": "upload",
        "bucketName": "e7pdf-holerite",
        "fileName": "={{ 'e7-holerite/' + $json['Data da extração'].split('-')[0] + '/' + $json['Data da extração'].split('-')[1] + '/' + new Date().toISOString().slice(0,10) + '_' + new Date().toISOString().slice(11,19).replace(/:/g, '') + '.pdf' }}",
        "additionalFields": {}
      },
      "type": "n8n-nodes-base.awsS3",
      "typeVersion": 2,
      "position": [
        -688,
        -128
      ],
      "id": "0f2dbba0-b42e-4d75-b719-1477896178c8",
      "name": "Upload a file",
      "credentials": {
        "aws": {
          "id": "xtXoYdILeaEmVmMk",
          "name": "AWS S3 - E7"
        }
      }
    },
    {
      "parameters": {
        "operation": "text",
        "options": {}
      },
      "type": "n8n-nodes-base.extractFromFile",
      "typeVersion": 1,
      "position": [
        -688,
        96
      ],
      "id": "1f87a748-500d-424d-af48-523f87a9dfda",
      "name": "Extrair Texto do PDF"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "=Extract ONLY PROVENTOS (earnings) data from the payroll text below and return it as JSON. IGNORE all DESCONTOS and INFORMATIVA sections completely.\n\nTEXT CONTENT:\n{{ $json.text }}\n\nTASK: Parse the text and extract company data and ONLY the rubrica items from the PROVENTOS section.\n\nSTRUCTURE:\n- Header contains: Company name (after \"Empresa:\"), CNPJ (after \"CNPJ:\"), Period (after \"Competência:\")\n- Extract ONLY items under \"PROVENTOS\" section - stop when you reach \"DESCONTOS\"\n- Each rubrica line has: Code | Name | Employees | Value1 | Value2\n\nEXTRACTION RULES:\n\nFor company object:\n- name = company name from \"Empresa:\" line\n- cnpj = CNPJ from \"CNPJ:\" line  \n- competence = period from \"Competência:\" line (format MM/YYYY)\n\nFor each rubrica in items array (ONLY FROM PROVENTOS):\n- code = rubrica code (first column - IMPORTANT: keep the exact code like \"16\", \"29\", \"807\", etc.)\n- rubrica = full rubrica name (second column)\n- valor = last column value (Valor Calculado) - convert R$ 3.915,95 to 3915.95\n- reference = employee count (Nº Empregados column)\n- tipo = \"Provento\" (always for all items since we only extract PROVENTOS)\n- periodo = period in YYYY-MM format (convert 03/2025 to 2025-03)\n- cnpj = company CNPJ numbers only (no formatting)\n- contribuicao = 0.00\n- rat = 0.00\n- vl_rat_ajustado = 0.00\n- terceiros = 5.80\n- vl_cont_terceiros_total = 0.00\n- selic = 0.00\n- vl_selic = 0.00\n- credito = \"\"\n- normalized = category based on rubrica name:\n  * INSALUBRIDADE/PERICULOSIDADE = ADICIONAL_INSALUBRIDADE\n  * SALARIO/DIA/PRO-LABORE/DIAS NORMAIS = SALARIO_BASE\n  * HORA EXTRA/50% = HORA_EXTRA_50\n  * 100% = HORA_EXTRA_100\n  * FERIAS (not 1/3) = FERIAS\n  * 1/3/TERCO/ADC 1/3 = TERCO_FERIAS\n  * 13/DECIMO = SALARIO_13\n  * AVISO PREVIO = AVISO_PREVIO\n  * Others = OUTROS\n\nCRITICAL: \n- ONLY extract items between \"PROVENTOS\" and \"Total:\" of the PROVENTOS section\n- DO NOT include any items from DESCONTOS or INFORMATIVA sections\n- KEEP the exact rubrica codes as they appear (e.g., \"16\", \"29\", \"807\", \"8781\")\n\nReturn ONLY this JSON structure with actual data:\n{\n  \"company\": {\n    \"name\": \"extracted company name\",\n    \"cnpj\": \"extracted cnpj\",\n    \"competence\": \"MM/YYYY\"\n  },\n  \"items\": [\n    {\n      \"code\": \"16\",\n      \"rubrica\": \"INSALUBRIDADE 20%\",\n      \"valor\": 4473.04,\n      \"contribuicao\": 0.00,\n      \"rat\": 0.00,\n      \"vl_rat_ajustado\": 0.00,\n      \"terceiros\": 5.80,\n      \"vl_cont_terceiros_total\": 0.00,\n      \"selic\": 0.00,\n      \"vl_selic\": 0.00,\n      \"credito\": \"\",\n      \"periodo\": \"2025-03\",\n      \"cnpj\": \"08281777000183\",\n      \"tipo\": \"Provento\",\n      \"normalized\": \"ADICIONAL_INSALUBRIDADE\",\n      \"reference\": \"17\"\n    }\n  ]\n}\n\nExtract ALL rubricas from PROVENTOS section ONLY. Return valid JSON only, no explanations.",
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 2.1,
      "position": [
        -368,
        -128
      ],
      "id": "28d3d343-357e-42c0-9bcf-082fff27c779",
      "name": "AI Agent"
    },
    {
      "parameters": {
        "model": {
          "__rl": true,
          "value": "gpt-4o-mini",
          "mode": "list"
        },
        "options": {
          "maxTokens": 8000,
          "temperature": 0
        }
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1.2,
      "position": [
        -368,
        96
      ],
      "id": "c1734ab4-7a89-4bfc-9bfa-d7339d9daffa",
      "name": "OpenAI Chat Model",
      "credentials": {
        "openAiApi": {
          "id": "J5OoPQPVAwRuX0rf",
          "name": "OpenAi account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const agentOutput = $input.first().json.output;\n\n// Validar se existe output\nif (!agentOutput) {\n  throw new Error('AI Agent retornou vazio. Verifique o prompt e o modelo.');\n}\n\n// Se for string, tentar parsear\nlet parsed;\nif (typeof agentOutput === 'string') {\n  // Remover markdown se existir\n  const cleanOutput = agentOutput.replace(/```json|```/g, '').trim();\n  \n  // Tentar parsear\n  try {\n    parsed = JSON.parse(cleanOutput);\n  } catch (e) {\n    throw new Error(`AI Agent não retornou JSON válido. Output: ${agentOutput.substring(0, 200)}...`);\n  }\n} else {\n  parsed = agentOutput;\n}\n\n// Validar estrutura\nif (!parsed.company || !parsed.items) {\n  throw new Error('JSON sem estrutura esperada (company/items). Verifique o prompt.');\n}\n\nconst company = parsed.company;\nconst items = parsed.items;\n\nconst formData = $('Validar e Preparar Dados').first().json;\n\n// Log para debug\nconsole.log(`Processando ${items.length} rubricas de PROVENTOS`);\n\n// Retornar itens mapeados\nreturn items.map(item => ({\n  json: {\n    cod: item.code || '',  // Mantém o código exato\n    rubrica: item.rubrica || '',\n    valor: parseFloat(item.valor) || 0,\n    contribuicao: parseFloat(item.contribuicao) || 0,\n    rat: parseFloat(item.rat) || 0,\n    vl_rat_ajustado: parseFloat(item.vl_rat_ajustado) || 0,\n    terceiros: parseFloat(item.terceiros) || 5.80,\n    vl_cont_terceiros_total: parseFloat(item.vl_cont_terceiros_total) || 0,\n    selic: parseFloat(item.selic) || 0,\n    vl_selic: parseFloat(item.vl_selic) || 0,\n    credito: item.credito || '',\n    periodo: item.periodo || '',\n    cnpj: item.cnpj || company.cnpj || '',\n    tipo: 'Provento',  // Sempre será Provento\n    sistema: formData['Sistema'] || '',\n    normalized: item.normalized || 'OUTROS',\n    reference: item.reference || ''\n  }\n}));"
      },
      "name": "Processar Resposta",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -32,
        80
      ],
      "id": "53a5a983-2145-49d9-927e-8b902c5c6048"
    },
    {
      "parameters": {
        "jsCode": "const items = $input.all();\n\nif (!items || items.length === 0) {\n  throw new Error('Nenhum dado para processar');\n}\n\n// Mapear dados para o formato CSV - conforme planilha modelo\nconst excelData = items.map(item => ({\n  'COD': item.json.cod || '',  // Mantém o código da rubrica\n  'RUBRICA': item.json.rubrica || '',\n  'VALOR': item.json.valor || 0,\n  'CONTRIBUIÇÃO': item.json.contribuicao || 0,\n  'RAT': item.json.rat || 0,\n  'VL RAT AJUSTADO': item.json.vl_rat_ajustado || 0,\n  'TERCEIROS (5,8)': item.json.terceiros || 5.80,\n  'VL CONT TERCEIROS': item.json.vl_cont_terceiros_total || 0,\n  'TOTAL': ((item.json.valor || 0) + (item.json.contribuicao || 0) + (item.json.vl_rat_ajustado || 0) + (item.json.vl_cont_terceiros_total || 0)).toFixed(2),\n  'SELIC': item.json.selic || 0,\n  'VL.SELIC': item.json.vl_selic || 0,\n  'CRÉDITO': item.json.credito || '',\n  'Período': item.json.periodo || ''\n}));\n\n// Criar CSV com encoding correto\nconst headers = Object.keys(excelData[0]);\nconst csvRows = [];\n\n// Adicionar cabeçalho\ncsvRows.push(headers.join(';'));\n\n// Adicionar linhas de dados\nfor (const row of excelData) {\n  const values = headers.map(header => {\n    let val = row[header];\n    // Converter números para formato brasileiro (vírgula)\n    if (typeof val === 'number' || !isNaN(parseFloat(val))) {\n      val = parseFloat(val).toFixed(2).replace('.', ',');\n    }\n    // Escapar valores com ponto e vírgula\n    if (typeof val === 'string' && (val.includes(';') || val.includes(',') || val.includes('\\n'))) {\n      val = `\"${val}\"`;\n    }\n    return val;\n  });\n  csvRows.push(values.join(';'));\n}\n\nconst csvContent = csvRows.join('\\r\\n');\n\n// Nome do arquivo\nconst sistema = items[0].json.sistema || 'Sistema';\nconst dataExtracao = $('Validar e Preparar Dados').first().json['Data da extração'] || new Date().toISOString().split('T')[0];\nconst fileName = `proventos_folha_${sistema}_${dataExtracao.replace(/-/g, '')}_${Date.now()}.csv`;\n\n// Log informativo\nconsole.log(`CSV gerado com ${excelData.length} proventos`);\n\n// Retornar com encoding UTF-8 com BOM (para Excel abrir corretamente)\nconst BOM = '\\uFEFF';\nconst csvWithBom = BOM + csvContent;\n\nreturn {\n  json: { \n    fileName, \n    rowCount: excelData.length,\n    totalProventos: items.length,\n    sistema: sistema,\n    dataExtracao: dataExtracao\n  },\n  binary: {\n    data: {\n      data: Buffer.from(csvWithBom, 'utf-8').toString('base64'),\n      mimeType: 'text/csv; charset=utf-8',\n      fileName: fileName,\n      fileExtension: 'csv'\n    }\n  }\n};"
      },
      "name": "Converter para CSV",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        112,
        -128
      ],
      "id": "a1b88a42-17b9-4826-b74d-faef1a1a710b"
    },
    {
      "parameters": {
        "operation": "upload",
        "bucketName": "e7pdf-holerite",
        "fileName": "={{ 'e7-holerite/processados/' + $('Validar e Preparar Dados').first().json['Data da extração'].split('-')[0] + '/' + $('Validar e Preparar Dados').first().json['Data da extração'].split('-')[1] + '/' + $json.fileName }}",
        "additionalFields": {}
      },
      "type": "n8n-nodes-base.awsS3",
      "typeVersion": 2,
      "position": [
        336,
        -128
      ],
      "id": "315fc37b-6bea-4b38-99e7-eaac84a345df",
      "name": "Upload Excel para S3",
      "credentials": {
        "aws": {
          "id": "xtXoYdILeaEmVmMk",
          "name": "AWS S3 - E7"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({\n  success: true,\n  message: 'Processamento concluído com sucesso',\n  data: {\n    totalProventos: $('Converter para CSV').first().json.totalProventos,\n    arquivoCSV: {\n      nome: $('Converter para CSV').first().json.fileName,\n      url: $('Upload Excel para S3').first().json.Location\n    },\n    arquivoPDF: {\n      url: $('Upload a file').first().json.Location\n    },\n    sistema: $('Converter para CSV').first().json.sistema,\n    dataExtracao: $('Converter para CSV').first().json.dataExtracao,\n    processadoEm: new Date().toISOString()\n  }\n}) }}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        624,
        -128
      ],
      "id": "1ae6f0a4-45af-452b-8cd8-a95fa8d6fb7a",
      "name": "Responder ao Webhook"
    }
  ],
  "pinData": {},
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
            "node": "Upload a file",
            "type": "main",
            "index": 0
          },
          {
            "node": "Extrair Texto do PDF",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Upload a file": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extrair Texto do PDF": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI Agent": {
      "main": [
        [
          {
            "node": "Processar Resposta",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    },
    "Processar Resposta": {
      "main": [
        [
          {
            "node": "Converter para CSV",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Converter para CSV": {
      "main": [
        [
          {
            "node": "Upload Excel para S3",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Upload Excel para S3": {
      "main": [
        [
          {
            "node": "Responder ao Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1",
    "timezone": "America/Sao_Paulo",
    "callerPolicy": "workflowsFromSameOwner"
  },
  "versionId": "367e29d1-3eae-405f-946e-f499a0f930f7",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "9474c6a00514abf32e506ac1e8a3630f4ad5062151d13e4e269bbbc8b5e3f423"
  },
  "id": "sCMwRLpmkJoHyrAx",
  "tags": []
}