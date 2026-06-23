# Exemplos

As possibilidades de pesquisa na API Pública do Datajud não se restringem apenas aos exemplos apresentados nesta seção.

Para obter resultados mais precisos e relevantes em suas consultas, recomenda-se utilizar os diversos atributos dos metadados processuais descritos no **Glossário de Dados**.

A combinação de filtros e atributos disponíveis permite realizar pesquisas mais específicas, aumentando a qualidade e a assertividade dos resultados retornados pela API.

> **Dica:** Antes de construir consultas avançadas, consulte o Glossário de Dados para compreender a estrutura dos documentos, os tipos de dados disponíveis e os campos que podem ser utilizados como critérios de busca.

## Referência

* Glossário de Dados

  * Descrição detalhada dos atributos, estruturas e metadados processuais disponíveis na API.


Segue a versão formatada e organizada em Markdown para documentação técnica (Docusaurus, GitHub Wiki, Notion, README, etc.):

# Ex. 1 - Pesquisar pelo Número do Processo

Neste exemplo é realizada a consulta de um processo judicial utilizando a **Numeração Única do Processo (CNJ)** como parâmetro de pesquisa no tribunal **TRF1**.

---

## Endpoint

```http
POST /api_publica_trf1/_search
```

URL completa:

```text
https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search
```

---

## Configuração da Requisição no Postman

1. Abra o **Postman** e clique em **New Request**.
2. Defina o método HTTP como **POST**.
3. Informe a URL:

```text
https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search
```

4. Na aba **Headers**, adicione:

| Chave         | Valor                  |
| ------------- | ---------------------- |
| Authorization | ApiKey [Chave Pública] |
| Content-Type  | application/json       |

> **Observação:** A chave pública pode ser obtida na seção de acesso à API.

5. Na aba **Body**, selecione:

   * **raw**
   * **JSON**

6. Insira o corpo da requisição conforme o exemplo abaixo.

---

## Query DSL

```json
{
  "query": {
    "match": {
      "numeroProcesso": "00008323520184013202"
    }
  }
}
```

7. Clique em **Send** para executar a consulta.
8. Aguarde o retorno da API.

---

## Exemplo em Python

Utilizando a biblioteca `requests`.

```python
import requests
import json

url = "https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search"

payload = json.dumps({
    "query": {
        "match": {
            "numeroProcesso": "00008323520184013202"
        }
    }
})

# Substituir <API Key> pela Chave Pública
headers = {
    "Authorization": "ApiKey <API Key>",
    "Content-Type": "application/json"
}

response = requests.post(
    url,
    headers=headers,
    data=payload
)

print(response.text)
```

---

## Exemplo em R

Utilizando a biblioteca `httr`.

```r
library(httr)

# Substituir <API Key> pela Chave Pública
headers <- c(
  "Authorization" = "ApiKey <API Key>",
  "Content-Type" = "application/json"
)

body <- '{
  "query": {
    "match": {
      "numeroProcesso": "00008323520184013202"
    }
  }
}'

res <- VERB(
  "POST",
  url = "https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search",
  body = body,
  add_headers(headers)
)

cat(content(res, "text"))
```

---

# Resposta

A resposta esperada é um JSON contendo os metadados de um ou mais processos que correspondam ao critério informado.

## Exemplo de Resposta

```json
{
  "took": 6679,
  "timed_out": false,
  "_shards": {
    "total": 7,
    "successful": 7,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": {
      "value": 1,
      "relation": "eq"
    },
    "max_score": 13.917725,
    "hits": [
      {
        "_index": "api_publica_trf1",
        "_type": "_doc",
        "_id": "TRF1_436_JE_16403_00008323520184013202",
        "_score": 13.917725,
        "_source": {
          "numeroProcesso": "00008323520184013202",
          "classe": {
            "codigo": 436,
            "nome": "Procedimento do Juizado Especial Cível"
          },
          "sistema": {
            "codigo": 1,
            "nome": "PJe"
          },
          "formato": {
            "codigo": 1,
            "nome": "Eletrônico"
          },
          "tribunal": "TRF1",
          "dataHoraUltimaAtualizacao": "2023-07-21T19:10:08.483Z",
          "grau": "JE",
          "@timestamp": "2023-08-14T11:50:51.994Z",
          "dataAjuizamento": "2018-10-29T00:00:00.000Z",
          "movimentos": [
            {
              "complementosTabelados": [
                {
                  "codigo": 2,
                  "valor": 1,
                  "nome": "competência exclusiva",
                  "descricao": "tipo_de_distribuicao_redistribuicao"
                }
              ],
              "codigo": 26,
              "nome": "Distribuição",
              "dataHora": "2018-10-30T14:06:24.000Z"
            },
            {
              "codigo": 14732,
              "nome": "Conversão de Autos Físicos em Eletrônicos",
              "dataHora": "2020-08-05T01:15:18.000Z"
            }
          ],
          "id": "TRF1_436_JE_16403_00008323520184013202",
          "nivelSigilo": 0,
          "orgaoJulgador": {
            "codigoMunicipioIBGE": 5128,
            "codigo": 16403,
            "nome": "JEF Adj - Tefé"
          },
          "assuntos": [
            {
              "codigo": 6177,
              "nome": "Concessão"
            }
          ]
        }
      }
    ]
  }
}
```

---

## Resumo

| Item             | Valor                           |
| ---------------- | ------------------------------- |
| Método           | POST                            |
| Endpoint         | `/api_publica_trf1/_search`     |
| Tipo de Consulta | Busca por número do processo    |
| Campo Utilizado  | `numeroProcesso`                |
| Tipo de Busca    | `match`                         |
| Retorno          | Metadados processuais completos |

Essa versão está pronta para ser utilizada em uma Wiki técnica, documentação OpenAPI complementar ou portal Docusaurus.


Segue a versão formatada e organizada em Markdown:

# Ex. 2 - Pesquisar por Classe Processual e Órgão Julgador

Neste exemplo é realizada a consulta de processos que possuam:

* **Classe Processual:** `1116 - Execução Fiscal`
* **Órgão Julgador:** `13597 - VARA DE EXECUÇÃO FISCAL DO DF`
* **Tribunal:** `TJDFT`

---

## Endpoint

```http
POST /api_publica_tjdft/_search
```

URL completa:

```text
https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search
```

---

## Configuração da Requisição no Postman

1. Abra o **Postman** e clique em **New Request**.
2. Defina o método HTTP como **POST**.
3. Informe a URL:

```text
https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search
```

4. Na aba **Headers**, adicione:

| Chave         | Valor                  |
| ------------- | ---------------------- |
| Authorization | ApiKey [Chave Pública] |
| Content-Type  | application/json       |

> **Observação:** Substitua `[Chave Pública]` pela chave disponibilizada pelo CNJ.

5. Na aba **Body**:

   * Selecione **raw**
   * Escolha o formato **JSON**

6. Insira o corpo da requisição conforme o exemplo abaixo.

---

## Query DSL

A consulta utiliza uma cláusula `bool` com dois critérios obrigatórios (`must`):

* Classe Processual = `1116`
* Órgão Julgador = `13597`

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "classe.codigo": 1116
          }
        },
        {
          "match": {
            "orgaoJulgador.codigo": 13597
          }
        }
      ]
    }
  }
}
```

7. Clique em **Send** para executar a consulta.
8. Aguarde o retorno da API.

---

## Exemplo em Python

Utilizando a biblioteca `requests`.

```python
import requests
import json

url = "https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search"

payload = json.dumps({
    "query": {
        "bool": {
            "must": [
                {
                    "match": {
                        "classe.codigo": 1116
                    }
                },
                {
                    "match": {
                        "orgaoJulgador.codigo": 13597
                    }
                }
            ]
        }
    }
})

# Substituir <API Key> pela Chave Pública
headers = {
    "Authorization": "ApiKey <API Key>",
    "Content-Type": "application/json"
}

response = requests.post(
    url,
    headers=headers,
    data=payload
)

print(response.text)
```

---

## Exemplo em R

Utilizando a biblioteca `httr`.

```r
library(httr)

# Substituir <API Key> pela Chave Pública
headers <- c(
  "Authorization" = "ApiKey <API Key>",
  "Content-Type" = "application/json"
)

body <- '{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "classe.codigo": 1116
          }
        },
        {
          "match": {
            "orgaoJulgador.codigo": 13597
          }
        }
      ]
    }
  }
}'

res <- VERB(
  "POST",
  url = "https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search",
  body = body,
  add_headers(headers)
)

cat(content(res, "text"))
```

---

# Resposta

A resposta esperada é um JSON contendo um ou mais processos que atendam simultaneamente aos critérios informados.

## Exemplo de Resposta

```json
{
  "took": 213,
  "timed_out": false,
  "_shards": {
    "total": 3,
    "successful": 3,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": {
      "value": 10000,
      "relation": "gte"
    },
    "max_score": 2.0,
    "hits": [
      {
        "_index": "api_publica_tjdft",
        "_id": "TJDFT_1116_G1_13597_07223914020178070001",
        "_source": {
          "classe": {
            "codigo": 1116,
            "nome": "Execução Fiscal"
          },
          "numeroProcesso": "07223914020178070001",
          "tribunal": "TJDFT",
          "grau": "G1",
          "orgaoJulgador": {
            "codigo": 13597,
            "nome": "VARA DE EXECUÇÃO FISCAL DO DF"
          },
          "assuntos": [
            {
              "codigo": 6017,
              "nome": "Dívida Ativa (Execução Fiscal)"
            }
          ]
        }
      }
    ]
  }
}
```

> O retorno real poderá conter milhares de processos. O exemplo acima foi reduzido para facilitar a leitura da documentação.

---

## Campos Utilizados na Consulta

| Campo                  | Valor     |
| ---------------------- | --------- |
| `classe.codigo`        | 1116      |
| `orgaoJulgador.codigo` | 13597     |
| Tribunal               | TJDFT     |
| Operador               | bool.must |

---

## Lógica da Consulta

A consulta utiliza uma estrutura `bool.must`, equivalente a um operador lógico **AND**:

```text
Classe Processual = 1116
AND
Órgão Julgador = 13597
```

Somente processos que satisfaçam **ambos os critérios** serão retornados.

---

## Resumo

| Item              | Valor                                 |
| ----------------- | ------------------------------------- |
| Método            | POST                                  |
| Endpoint          | `/api_publica_tjdft/_search`          |
| Tipo de Busca     | Composta                              |
| Operador          | `bool.must`                           |
| Classe Processual | 1116 - Execução Fiscal                |
| Órgão Julgador    | 13597 - Vara de Execução Fiscal do DF |
| Retorno           | Metadados processuais completos       |

Esta versão está pronta para uso em **Docusaurus**, **GitHub Wiki**, **Notion**, **MkDocs** ou documentação técnica corporativa.


# Ex. 3 - Pesquisa com Paginação (`search_after`)

Por padrão, as consultas na API do Datajud (baseada em Elasticsearch) retornam até **10 registros por requisição**.

É possível aumentar a quantidade de resultados retornados utilizando o parâmetro **`size`**, que permite definir o número de registros por página, variando de **10 até 10.000 documentos**.

Quando há necessidade de percorrer grandes volumes de dados, recomenda-se utilizar o recurso **`search_after`**, que oferece uma forma eficiente de paginação sem impactar significativamente a performance da API.

---

## O que é o `search_after`?

O `search_after` funciona como um ponteiro para o último documento retornado na consulta anterior.

Ao invés de recalcular todas as páginas anteriores a cada requisição, a API continua a busca exatamente a partir do último registro recuperado, tornando a navegação por grandes conjuntos de dados muito mais eficiente.

### Vantagens

* Melhor desempenho em grandes volumes de dados.
* Menor consumo de recursos do Elasticsearch.
* Evita problemas de performance associados a paginações profundas.
* Ideal para processos de extração e sincronização de dados.

---

## Requisitos para Utilização

Para utilizar o `search_after`, é obrigatório:

1. Definir um campo de ordenação (`sort`).
2. Utilizar o mesmo campo de ordenação em todas as páginas.
3. Informar o valor retornado no campo `sort` do último documento da página anterior.

No Datajud, recomenda-se utilizar o atributo:

```text
@timestamp
```

---

## Primeira Consulta

O exemplo abaixo retorna os primeiros **100 processos** ordenados pelo campo `@timestamp`.

### Query DSL

```json
{
  "size": 100,
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "classe.codigo": 1116
          }
        },
        {
          "match": {
            "orgaoJulgador.codigo": 13597
          }
        }
      ]
    }
  },
  "sort": [
    {
      "@timestamp": {
        "order": "asc"
      }
    }
  ]
}
```

---

## Obtendo o Valor para o `search_after`

Na resposta da API, cada documento retornado conterá um atributo chamado `sort`.

Exemplo:

```json
{
  "_index": "api_publica_tjdft",
  "_type": "_doc",
  "_id": "TJDFT_1116_G1_13597_00356079220168070018",
  "_score": null,
  "_source": {
    ...
  },
  "sort": [
    1681366085550
  ]
}
```

O valor presente no array `sort` do **último documento retornado** deverá ser utilizado na próxima consulta.

Neste exemplo:

```json
[
  1681366085550
]
```

---

## Consulta da Próxima Página

Para recuperar os próximos 100 registros, basta informar o valor obtido anteriormente no parâmetro `search_after`.

### Query DSL

```json
{
  "size": 100,
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "classe.codigo": 1116
          }
        },
        {
          "match": {
            "orgaoJulgador.codigo": 13597
          }
        }
      ]
    }
  },
  "sort": [
    {
      "@timestamp": {
        "order": "asc"
      }
    }
  ],
  "search_after": [
    1681366085550
  ]
}
```

---

## Fluxo de Paginação

```text
Página 1
↓
Último documento retornado
↓
Campo sort = [1681366085550]
↓
Informar esse valor em search_after
↓
Página 2
↓
Novo último documento
↓
Novo valor de sort
↓
Página 3
...
```

---

## Boas Práticas

### Utilize sempre o mesmo `sort`

O campo definido em `sort` deve permanecer idêntico em todas as páginas da consulta.

### Utilize o último documento da página

O valor informado em `search_after` deve ser obtido a partir do atributo `sort` do último registro retornado.

### Combine com `size`

O `search_after` deve ser utilizado em conjunto com:

* `size`
* `sort`

Exemplo:

```json
{
  "size": 100,
  "sort": [
    {
      "@timestamp": {
        "order": "asc"
      }
    }
  ],
  "search_after": [
    1681366085550
  ]
}
```

### Evite paginação profunda tradicional

Para grandes volumes de dados, prefira `search_after` em vez de mecanismos tradicionais de paginação (`from` + `size`), pois o desempenho é significativamente superior.

---

## Resumo

| Item                             | Descrição                                 |
| -------------------------------- | ----------------------------------------- |
| Objetivo                         | Paginar grandes volumes de dados          |
| Recurso                          | `search_after`                            |
| Campo recomendado para ordenação | `@timestamp`                              |
| Requer `sort`                    | Sim                                       |
| Requer `size`                    | Sim                                       |
| Performance                      | Alta                                      |
| Uso recomendado                  | Extração massiva e sincronização de dados |
| Limite por página                | Até 10.000 registros                      |

---

## Exemplo Completo

```json
{
  "size": 100,
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "classe.codigo": 1116
          }
        },
        {
          "match": {
            "orgaoJulgador.codigo": 13597
          }
        }
      ]
    }
  },
  "sort": [
    {
      "@timestamp": {
        "order": "asc"
      }
    }
  ],
  "search_after": [
    1681366085550
  ]
}
```

Esse modelo permite percorrer milhões de registros de forma eficiente, mantendo baixo impacto na infraestrutura do Datajud e garantindo melhor desempenho das consultas.


# Glossário de Dados

O glossário de dados da API Pública do Datajud oferece de maneira detalhada os termos, conceitos e estruturas de dados específicos dessa API.

A compreensão desse glossário é essencial para otimizar suas consultas, pois ele oferece uma referência sobre como os dados estão organizados e como podem ser acessados. Isso não só agiliza suas pesquisas, mas também garante a precisão e relevância dos resultados obtidos.

Portanto, recomendamos enfaticamente a exploração e compreensão do glossário como um passo essencial para aproveitar plenamente os recursos da API.

---

## Atributos do Processo

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **id** | text/keyword | Identificador da origem do processo no Datajud. Chave: **Tribunal_Classe_Grau_OrgaoJulgador_NumeroProcesso** |
| **tribunal** | text/keyword | Identificação do Tribunal pela sigla |
| **numeroProcesso** | text/keyword | Numeração Única (CNJ) do processo sem formatação |
| **dataAjuizamento** | datetime | Data de ajuizamento da capa do processo |
| **grau** | text/keyword | Identificação da instância/grau (G1, G2, JE, etc.) |
| **nivelSigilo** | long | Nível de sigilo |

---

## Formato do Processo

Identificação de processo **Físico** ou **Eletrônico**.

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **formato.codigo** | long | Código de identificação do formato do processo |
| **formato.nome** | text/keyword | Identificação se é Físico ou Eletrônico |

---

## Sistema Processual

Sistema processual de origem do processo no Tribunal.

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **sistema.codigo** | long | Código do sistema processual |
| **sistema.nome** | text/keyword | Descrição do sistema processual |

---

## Classe Processual

Classe Processual conforme TPU.

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **classe.codigo** | long | Código da classe processual |
| **classe.nome** | text/keyword | Descrição da classe processual |

---

## Assuntos do Processo

Assuntos do processo conforme TPU.

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **assuntos.codigo** | long | Código do assunto |
| **assuntos.nome** | text/keyword | Descrição do assunto |

---

## Órgão Julgador

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **orgaoJulgador.codigo** | long | Código da serventia/vara atual do processo |
| **orgaoJulgador.nome** | text/keyword | Nome da serventia/vara |
| **orgaoJulgador.codigoMunicipioIBGE** | long | Identificação do município pelo código IBGE |

---

## Movimentos Processuais

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **movimentos.codigo** | long | Código da movimentação processual conforme TPU |
| **movimentos.nome** | text/keyword | Descrição da movimentação |
| **movimentos.dataHora** | datetime | Data e hora da ocorrência da movimentação |

### Complementos Tabelados da Movimentação

Lista de complementos tabelados daquela movimentação.

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **movimentos.complementosTabelados.codigo** | long | Código da variável de movimento tabelado |
| **movimentos.complementosTabelados.descricao** | text/keyword | Descrição da variável do movimento tabelado |
| **movimentos.complementosTabelados.valor** | long | Código do complemento tabelado |
| **movimentos.complementosTabelados.nome** | text/keyword | Descrição do complemento tabelado |

### Órgão Julgador da Movimentação

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **movimentos.orgaoJulgador.codigoOrgao** | long | Código da serventia/vara do movimento |
| **movimentos.orgaoJulgador.nomeOrgao** | text/keyword | Nome da serventia/vara |

---

## Atributos de Controle Interno

Os atributos abaixo são utilizados para controle interno da aplicação.

| Atributo | Tipo | Descrição |
|-----------|------|------------|
| **dataHoraUltimaAtualizacao** | datetime | Milissegundos do atributo *millisInsercao* da origem do dado |
| **@timestamp** | datetime | *Timestamp* da atualização do documento no índice |

---

## Estrutura Simplificada do Documento

```json
{
  "id": "TRF1_123_G1_456_00000000000000000000",
  "tribunal": "TRF1",
  "numeroProcesso": "00000000000000000000",
  "dataAjuizamento": "2024-01-01T00:00:00",
  "grau": "G1",
  "nivelSigilo": 0,
  "formato": {
    "codigo": 1,
    "nome": "Eletrônico"
  },
  "sistema": {
    "codigo": 1,
    "nome": "PJe"
  },
  "classe": {
    "codigo": 123,
    "nome": "Procedimento Comum Cível"
  },
  "assuntos": [
    {
      "codigo": 456,
      "nome": "Direito Tributário"
    }
  ],
  "orgaoJulgador": {
    "codigo": 789,
    "nome": "1ª Vara Federal",
    "codigoMunicipioIBGE": 3304557
  },
  "movimentos": [
    {
      "codigo": 51,
      "nome": "Conclusão",
      "dataHora": "2024-01-15T14:30:00"
    }
  ]
}
```