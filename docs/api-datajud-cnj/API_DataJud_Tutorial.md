# API Pública do Datajud — Tutorial de Integração

**Departamento de Pesquisas Judiciária (DPJ)**
**Conselho Nacional de Justiça (CNJ)**

---

## Sumário

1. [Acesso à API Pública do Datajud](#1-acesso-à-api-pública-do-datajud)
2. [Endpoints](#2-endpoints)
3. [Exemplos de Consumo da API](#3-exemplos-de-consumo-da-api-pública-do-datajud)
   - [Exemplo 1: Pesquisar pelo número de processo](#exemplo-1-pesquisar-pelo-número-de-processo)
   - [Exemplo 2: Pesquisar por Classe Processual e Órgão Julgador](#exemplo-2-pesquisar-por-classe-processual-e-órgão-julgador)
   - [Exemplo 3: Pesquisa com paginação (search_after)](#exemplo-3-pesquisa-com-paginação-search_after)
4. [Considerações Finais](#4-considerações-finais)
5. [Anexos](#5-anexos)
   - [Anexo I: Glossário de Dados](#anexo-i-glossário-de-dados)
   - [Anexo II: Relação de Endpoints de Todos os Tribunais](#anexo-ii-relação-de-endpoints-de-todos-os-tribunais)

---

## 1. Acesso à API Pública do Datajud

A API Pública do Datajud é uma ferramenta que disponibiliza ao público o acesso aos metadados dos processos públicos dos tribunais do judiciário brasileiro. Os dados disponibilizados pela API têm origem na **Base Nacional de Dados do Poder Judiciário – Datajud** e atendem aos critérios estabelecidos pela **Portaria nº 160 de 09/09/2020**.

> ⚠️ Antes de começar a utilizar a versão **beta** da API, é necessário criar uma conta no site do Datajud e obter sua credencial de acesso.

**Passo a passo:**
1. Acesse: https://www.cnj.jus.br/sistemas/datajud/api-publica/
2. Siga as instruções para criar uma conta.
3. Obtenha suas credenciais de acesso (usuário e senha).

---

## 2. Endpoints

A API Pública do Datajud oferece várias rotas de pesquisa, devido à organização do Judiciário brasileiro. A rota principal é:

```
https://api-publica.datajud.cnj.jus.br/
```

Essa URL deve ser seguida de um **alias** correspondente ao tribunal desejado. Por exemplo, o endpoint do Tribunal Regional Federal da 1ª Região é:

```
https://api-publica.datajud.cnj.jus.br/api_publica_trf1/
```

### Relação de aliases por segmento de Justiça

**Tribunais Superiores:**
`api_publica_tst`, `api_publica_tse`, `api_publica_stj`, `api_publica_stm`

**Justiça Federal:**
`api_publica_trf1`, `api_publica_trf2`, `api_publica_trf3`, `api_publica_trf4`, `api_publica_trf5`, `api_publica_trf6`

**Justiça Estadual:**
`api_publica_tjac`, `api_publica_tjal`, `api_publica_tjam`, `api_publica_tjap`, `api_publica_tjba`, `api_publica_tjce`, `api_publica_tjdft`, `api_publica_tjes`, `api_publica_tjgo`, `api_publica_tjma`, `api_publica_tjmg`, `api_publica_tjms`, `api_publica_tjmt`, `api_publica_tjpa`, `api_publica_tjpb`, `api_publica_tjpe`, `api_publica_tjpi`, `api_publica_tjpr`, `api_publica_tjrj`, `api_publica_tjrn`, `api_publica_tjro`, `api_publica_tjrr`, `api_publica_tjrs`, `api_publica_tjsc`, `api_publica_tjse`, `api_publica_tjsp`, `api_publica_tjto`

**Justiça do Trabalho:**
`api_publica_trt1` até `api_publica_trt24`

**Justiça Eleitoral:**
`api_publica_ac`, `api_publica_al`, `api_publica_am`, `api_publica_ap`, `api_publica_ba`, `api_publica_ce`, `api_publica_df`, `api_publica_es`, `api_publica_go`, `api_publica_ma`, `api_publica_mg`, `api_publica_ms`, `api_publica_mt`, `api_publica_pa`, `api_publica_pb`, `api_publica_pe`, `api_publica_pi`, `api_publica_pr`, `api_publica_rj`, `api_publica_rn`, `api_publica_ro`, `api_publica_rr`, `api_publica_rs`, `api_publica_sc`, `api_publica_se`, `api_publica_sp`, `api_publica_to`

**Justiça Militar:**
`api_publica_tjmmg`, `api_publica_tjmrs`, `api_publica_tjmsp`

> 📌 O **Anexo II** contém a relação completa dos endpoints (URLs por extenso) dos 91 tribunais acessíveis via API Pública.

---

## 3. Exemplos de Consumo da API Pública do Datajud

> As possibilidades de pesquisa não estão restritas apenas aos exemplos abaixo. Para resultados mais satisfatórios, recomenda-se utilizar os diversos atributos dos metadados processuais listados no **Glossário de Dados** (Anexo I).

### Exemplo 1: Pesquisar pelo número de processo

Consulta de um processo judicial utilizando a numeração única do processo (CNJ) como parâmetro de pesquisa, no tribunal **TRF1**.

**Via Postman:**
1. Abra o Postman e clique em **"New Request"**.
2. Defina o método HTTP como **GET**.
3. Digite a URL: `https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search`
4. Na aba **Authorization**, escolha o tipo **Basic Auth**.
5. Insira suas credenciais de acesso à API (usuário e senha).
6. Na aba **Headers**, adicione: `Content-Type: application/json`.
7. Na aba **Body**, escolha **raw** e insira o JSON abaixo.

```json
{
  "query": {
    "match": {
      "numeroProcesso": "00008323520184013202"
    }
  }
}
```

**Via cURL:**

```bash
curl -u seu_usuario:sua_senha \
-XGET "https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search" \
-H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "numeroProcesso": "00008323520184013202"
    }
  }
}'
```

---

### Exemplo 2: Pesquisar por Classe Processual e Órgão Julgador

Consulta de processos com a Classe Processual **1116 – "Execução Fiscal"** da vara **13597 - VARA DE EXECUÇÃO FISCAL DO DF**, no tribunal **TJDFT**.

**Via Postman:**
1. Abra o Postman e clique em **"New Request"**.
2. Defina o método HTTP como **GET**.
3. Digite a URL: `https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search`
4. Na aba **Authorization**, escolha o tipo **Basic Auth**.
5. Insira suas credenciais de acesso à API (usuário e senha).
6. Na aba **Headers**, adicione: `Content-Type: application/json`.
7. Na aba **Body**, escolha **raw** e insira o JSON abaixo.

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"classe.codigo": 1116}},
        {"match": {"orgaoJulgador.codigo": 13597}}
      ]
    }
  }
}
```

**Via cURL:**

```bash
curl -u seu_usuario:sua_senha \
-XGET "https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search" \
-H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"match": {"classe.codigo": 1116}},
        {"match": {"orgaoJulgador.codigo": 13597}}
      ]
    }
  }
}'
```

---

### Exemplo 3: Pesquisa com paginação (search_after)

Por padrão, as pesquisas na API do **Elasticsearch** retornam até **10 registros** por solicitação. É possível aumentar esse número usando o parâmetro **`size`**, que varia de **10 até 10.000** registros por página.

Para percorrer grandes volumes de resultados, recomenda-se o uso do **`search_after`**. Esse recurso é prioritariamente recomendado para paginação, pois permite que a API continue a partir do ponto onde a última página parou, sem necessidade de recarregar todos os resultados a cada nova página — funcionando como um ponteiro para o último registro retornado.

> ✅ O uso do `search_after` não prejudica a performance da API mesmo em grandes volumes de dados, pois evita o reprocessamento completo dos resultados a cada página. Combinado com o `size`, garante paginação eficiente e baixo impacto no desempenho.

**Requisito:** é necessário utilizar `sort` com o atributo **`@timestamp`**.

**Primeira requisição (sem search_after):**

```json
{
  "size": 100,
  "query": {
    "bool": {
      "must": [
        {"match": {"classe.codigo": 1116}},
        {"match": {"orgaoJulgador.codigo": 13597}}
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

**Resposta da consulta (trecho relevante):**

A resposta incluirá um array `sort` com os valores do campo de ordenação do último documento retornado:

```json
{
  "_index": "api_publica_tjdft",
  "_type": "_doc",
  "_id": "TJDFT_1116_G1_13597_00356079220168070018",
  "_score": null,
  "_source": { "..." : "..." },
  "sort": [
    1681366085550
  ]
}
```

**Próxima página (usando search_after):**

Utilize o valor do campo `sort` do último documento da página anterior:

```json
{
  "size": 100,
  "query": {
    "bool": {
      "must": [
        {"match": {"classe.codigo": 1116}},
        {"match": {"orgaoJulgador.codigo": 13597}}
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
  "search_after": [ 1681366085550 ]
}
```

> ⚠️ O `search_after` deve **sempre** ser usado em conjunto com `sort` e `size` para garantir paginação eficiente.

---

## 4. Considerações Finais

- A API suporta parâmetros de busca e agregações no padrão do **Elasticsearch**, tornando as consultas mais eficientes e precisas. Para mais detalhes, consulte o guia oficial: [Search your data | Elasticsearch Guide [8.7] | Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/search-your-data.html).
- A versão atual da API está em fase **Beta** de testes e permite acesso público aos metadados de processos judiciais em todo o Brasil.
- Os dados são provenientes da **Base Nacional de Dados do Poder Judiciário (Datajud)**, com a devida proteção aos processos sigilosos e dados de partes.
- Desenvolvedores e pesquisadores podem utilizar a API para acessar informações de capas processuais e movimentações em todas as instâncias do Judiciário brasileiro, para fins como:
  - Pesquisas acadêmicas;
  - Desenvolvimento de aplicativos que facilitem o acesso à informação jurídica;
  - Sempre observando os critérios estabelecidos no **Termo de Uso**.

---

## 5. Anexos

### Anexo I: Glossário de Dados

| Atributo | Tipo | Descrição |
|---|---|---|
| `id` | text | Identificador da origem do processo no Datajud |
| `tribunal` | text | Identificação do Tribunal pela sigla |
| `numeroProcesso` | text | Numeração Única (CNJ) do processo sem formatação |
| `dataAjuizamento` | datetime | Data de ajuizamento do processo |
| `grau` | text | Identificação da instância/grau (G1, G2, JE, etc.) |
| `nivelSigilo` | long | Nível de sigilo |
| `formato` | object{} | Identificação de processo Físico ou Eletrônico |
| `formato.codigo` | long | Código de identificação do formato do processo |
| `formato.nome` | text | Identificação se é Físico ou Eletrônico |
| `sistema` | object{} | Sistema processual de origem do processo no Tribunal |
| `sistema.codigo` | long | Código do sistema processual |
| `sistema.nome` | text | Descrição do sistema processual |
| `classe` | object{} | Classe Processual conforme TPU |
| `classe.codigo` | long | Código da classe processual |
| `classe.nome` | text | Descrição da classe processual |
| `assuntos` | array[] | Assuntos do Processo conforme TPU |
| `assuntos.codigo` | long | Código do assunto |
| `assuntos.nome` | text | Descrição do assunto |
| `orgaoJulgador` | object{} | Órgão Julgador |
| `orgaoJulgador.codigo` | long | Código da serventia/vara atual do processo |
| `orgaoJulgador.nome` | text | Nome da serventia/vara |
| `orgaoJulgador.codigoMunicipioIBGE` | long | Identificação do município pelo código do IBGE |
| `movimentos` | array[] | Movimentos Processuais |
| `movimentos.codigo` | long | Código da movimentação processual conforme TPU |
| `movimentos.nome` | text | Descrição da movimentação |
| `movimentos.dataHora` | datetime | Data e hora da ocorrência de movimentação |
| `movimentos.complementosTabelados` | array[] | Lista de complementos tabelados daquela movimentação |
| `movimentos.complementosTabelados.codigo` | long | Código da variável de movimento tabelado |
| `movimentos.complementosTabelados.descricao` | text | Descrição da variável do movimento tabelado |
| `movimentos.complementosTabelados.valor` | long | Código do complemento tabelado |
| `movimentos.complementosTabelados.nome` | text | Descrição do complemento tabelado |
| `movimentos.orgaoJulgador` | object{} | Órgão julgador do movimento |
| `movimentos.orgaoJulgador.codigoOrgao` | long | Código da serventia/vara do movimento |
| `movimentos.orgaoJulgador.nomeOrgao` | text | Nome da serventia/vara |

---

### Anexo II: Relação de Endpoints de Todos os Tribunais

#### Tribunais Superiores

| Tribunal | Endpoint |
|---|---|
| Tribunal Superior do Trabalho | `https://api-publica.datajud.cnj.jus.br/api_publica_tst/_search` |
| Tribunal Superior Eleitoral | `https://api-publica.datajud.cnj.jus.br/api_publica_tse/_search` |
| Tribunal Superior de Justiça | `https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search` |
| Tribunal Superior Militar | `https://api-publica.datajud.cnj.jus.br/api_publica_stm/_search` |

#### Justiça Federal

| Tribunal | Endpoint |
|---|---|
| Tribunal Regional Federal da 1ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search` |
| Tribunal Regional Federal da 2ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trf2/_search` |
| Tribunal Regional Federal da 3ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trf3/_search` |
| Tribunal Regional Federal da 4ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trf4/_search` |
| Tribunal Regional Federal da 5ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trf5/_search` |
| Tribunal Regional Federal da 6ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trf6/_search` |

#### Justiça Estadual

| Tribunal | Endpoint |
|---|---|
| Tribunal de Justiça do Acre | `https://api-publica.datajud.cnj.jus.br/api_publica_tjac/_search` |
| Tribunal de Justiça de Alagoas | `https://api-publica.datajud.cnj.jus.br/api_publica_tjal/_search` |
| Tribunal de Justiça de Manaus | `https://api-publica.datajud.cnj.jus.br/api_publica_tjam/_search` |
| Tribunal de Justiça do Amapá | `https://api-publica.datajud.cnj.jus.br/api_publica_tjap/_search` |
| Tribunal de Justiça da Bahia | `https://api-publica.datajud.cnj.jus.br/api_publica_tjba/_search` |
| Tribunal de Justiça do Ceará | `https://api-publica.datajud.cnj.jus.br/api_publica_tjce/_search` |
| TJ do Distrito Federal e Territórios | `https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search` |
| Tribunal de Justiça do Espírito Santo | `https://api-publica.datajud.cnj.jus.br/api_publica_tjes/_search` |
| Tribunal de Justiça do Goiás | `https://api-publica.datajud.cnj.jus.br/api_publica_tjgo/_search` |
| Tribunal de Justiça do Maranhão | `https://api-publica.datajud.cnj.jus.br/api_publica_tjma/_search` |
| Tribunal de Justiça de Minas Gerais | `https://api-publica.datajud.cnj.jus.br/api_publica_tjmg/_search` |
| TJ do Mato Grosso do Sul | `https://api-publica.datajud.cnj.jus.br/api_publica_tjms/_search` |
| Tribunal de Justiça do Mato Grosso | `https://api-publica.datajud.cnj.jus.br/api_publica_tjmt/_search` |
| Tribunal de Justiça do Pará | `https://api-publica.datajud.cnj.jus.br/api_publica_tjpa/_search` |
| Tribunal de Justiça da Paraíba | `https://api-publica.datajud.cnj.jus.br/api_publica_tjpb/_search` |
| Tribunal de Justiça de Pernambuco | `https://api-publica.datajud.cnj.jus.br/api_publica_tjpe/_search` |
| Tribunal de Justiça do Piauí | `https://api-publica.datajud.cnj.jus.br/api_publica_tjpi/_search` |
| Tribunal de Justiça do Paraná | `https://api-publica.datajud.cnj.jus.br/api_publica_tjpr/_search` |
| Tribunal de Justiça do Rio de Janeiro | `https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search` |
| TJ do Rio Grande do Norte | `https://api-publica.datajud.cnj.jus.br/api_publica_tjrn/_search` |
| Tribunal de Justiça de Rondônia | `https://api-publica.datajud.cnj.jus.br/api_publica_tjro/_search` |
| Tribunal de Justiça de Roraima | `https://api-publica.datajud.cnj.jus.br/api_publica_tjrr/_search` |
| Tribunal de Justiça do Rio Grande do Sul | `https://api-publica.datajud.cnj.jus.br/api_publica_tjrs/_search` |
| Tribunal de Justiça de Santa Catarina | `https://api-publica.datajud.cnj.jus.br/api_publica_tjsc/_search` |
| Tribunal de Justiça de Sergipe | `https://api-publica.datajud.cnj.jus.br/api_publica_tjse/_search` |
| Tribunal de Justiça de São Paulo | `https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search` |
| Tribunal de Justiça do Tocantins | `https://api-publica.datajud.cnj.jus.br/api_publica_tjto/_search` |

#### Justiça do Trabalho

| Tribunal | Endpoint |
|---|---|
| TRT da 1ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt1/_search` |
| TRT da 2ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt2/_search` |
| TRT da 3ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt3/_search` |
| TRT da 4ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt4/_search` |
| TRT da 5ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt5/_search` |
| TRT da 6ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt6/_search` |
| TRT da 7ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt7/_search` |
| TRT da 8ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt8/_search` |
| TRT da 9ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt9/_search` |
| TRT da 10ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt10/_search` |
| TRT da 11ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt11/_search` |
| TRT da 12ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt12/_search` |
| TRT da 13ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt13/_search` |
| TRT da 14ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt14/_search` |
| TRT da 15ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt15/_search` |
| TRT da 16ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt16/_search` |
| TRT da 17ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt17/_search` |
| TRT da 18ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt18/_search` |
| TRT da 19ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt19/_search` |
| TRT da 20ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt20/_search` |
| TRT da 21ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt21/_search` |
| TRT da 22ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt22/_search` |
| TRT da 23ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt23/_search` |
| TRT da 24ª Região | `https://api-publica.datajud.cnj.jus.br/api_publica_trt24/_search` |

> ℹ️ Nota: no documento original, a TRT da 16ª Região aparece com o mesmo endpoint da 15ª Região (possível erro de digitação na fonte). O valor acima (`trt16`) segue o padrão esperado do alias — confirme o endpoint exato junto à documentação oficial do Datajud antes de uso em produção.

#### Justiça Eleitoral

| Tribunal | Endpoint |
|---|---|
| TRE do Acre | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-ac/_search` |
| TRE de Alagoas | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-al/_search` |
| TRE do Amazonas | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-am/_search` |
| TRE do Amapá | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-ap/_search` |
| TRE da Bahia | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-ba/_search` |
| TRE do Ceará | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-ce/_search` |
| TRE do Distrito Federal | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-df/_search` |
| TRE do Espírito Santo | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-es/_search` |
| TRE do Goiás | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-go/_search` |
| TRE do Maranhão | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-ma/_search` |
| TRE de Minas Gerais | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-mg/_search` |
| TRE do Mato Grosso do Sul | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-ms/_search` |
| TRE do Mato Grosso | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-mt/_search` |
| TRE do Pará | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-pa/_search` |
| TRE da Paraíba | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-pb/_search` |
| TRE de Pernambuco | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-pe/_search` |
| TRE do Piauí | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-pi/_search` |
| TRE do Paraná | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-pr/_search` |
| TRE do Rio de Janeiro | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-rj/_search` |
| TRE do Rio Grande do Norte | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-rn/_search` |
| TRE de Rondônia | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-ro/_search` |
| TRE de Roraima | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-rr/_search` |
| TRE do Rio Grande do Sul | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-rs/_search` |
| TRE de Santa Catarina | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-sc/_search` |
| TRE de Sergipe | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-se/_search` |
| TRE de São Paulo | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-sp/_search` |
| TRE do Tocantins | `https://api-publica.datajud.cnj.jus.br/api_publica_tre-to/_search` |

#### Justiça Militar

| Tribunal | Endpoint |
|---|---|
| Tribunal Justiça Militar de Minas Gerais | `https://api-publica.datajud.cnj.jus.br/api_publica_tjmmg/_search` |
| Tribunal Justiça Militar do Rio Grande do Sul | `https://api-publica.datajud.cnj.jus.br/api_publica_tjmrs/_search` |
| Tribunal Justiça Militar de São Paulo | `https://api-publica.datajud.cnj.jus.br/api_publica_tjmsp/_search` |

---

## Resumo Rápido de Integração

1. **Autenticação:** HTTP Basic Auth (`usuário:senha`).
2. **Método:** GET, com corpo de requisição em JSON estilo Elasticsearch.
3. **Header obrigatório:** `Content-Type: application/json`.
4. **Padrão de URL:** `https://api-publica.datajud.cnj.jus.br/{alias_do_tribunal}/_search`
5. **Paginação:** use `size` (até 10.000) e, para grandes volumes, `search_after` combinado com `sort` por `@timestamp`.
6. **Sintaxe de consulta:** segue o padrão de Query DSL do Elasticsearch (`match`, `bool.must`, etc.).