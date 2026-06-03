# Documentação para Desenvolvedor — Ajustes Front-end Holerite

## Contexto

O fluxo n8n de processamento de holerite foi atualizado. Esta documentação descreve as mudanças no contrato da API que impactam o front-end, o novo formato de requisição para lote e como corrigir o download automático do XLSX.

---

## 1. Endpoint

```
POST /webhook/processar-holerite
Content-Type: application/json
```

---

## 2. Formato da Requisição

### 2.1 Arquivo único (compatibilidade mantida)

```json
{
  "processing_id": "proc_abc123",
  "company_id": "empresa_001",
  "company_name": "Empresa Exemplo LTDA",
  "company_cnpj": "12345678000195",
  "pdf": "<base64>",
  "competencia": "12/2025",
  "file_id": "file_001",
  "filename": "holerite_dezembro.pdf"
}
```

### 2.2 Lote — novo formato (até 12 arquivos)

```json
{
  "processing_id": "proc_abc123",
  "company_id": "empresa_001",
  "company_name": "Empresa Exemplo LTDA",
  "company_cnpj": "12345678000195",
  "arquivos": [
    {
      "pdf_base64": "<base64>",
      "competencia": "10/2025",
      "file_id": "file_001",
      "filename": "holerite_out_2025.pdf"
    },
    {
      "pdf_base64": "<base64>",
      "competencia": "11/2025",
      "file_id": "file_002",
      "filename": "holerite_nov_2025.pdf"
    },
    {
      "pdf_base64": "<base64>",
      "competencia": "12/2025",
      "file_id": "file_003",
      "filename": "holerite_dez_2025.pdf"
    }
  ]
}
```

**Regras do lote:**
- Campo `arquivos` é um array de objetos, cada um com seu próprio `pdf_base64` e `competencia`
- Máximo de **12 arquivos** por requisição
- `competencia` obrigatória por arquivo, no formato `MM/AAAA`
- Os arquivos serão processados e consolidados em **um único XLSX**, ordenado cronologicamente

---

## 3. Formato da Resposta

```json
{
  "success": true,
  "status": "completed",
  "processing_id": "proc_abc123",
  "file_id": "file_001",
  "filename": "holerite_lote_10_2025-11_2025-12_2025_Empresa_Exemplo.xlsx",
  "download_url": "https://e7pdf-holerite.s3.sa-east-1.amazonaws.com/...",
  "url": "https://e7pdf-holerite.s3.sa-east-1.amazonaws.com/...",
  "excel_url": "https://e7pdf-holerite.s3.sa-east-1.amazonaws.com/...",
  "file_url": "https://e7pdf-holerite.s3.sa-east-1.amazonaws.com/...",
  "data": {
    "processing_id": "proc_abc123",
    "competencia": "12/2025",
    "total_arquivos": 3,
    "competencias": ["10/2025", "11/2025", "12/2025"],
    "processado_em": "2025-12-31T23:59:00.000Z",
    "arquivo": {
      "filename": "holerite_lote_...",
      "status": "success",
      "download_url": "https://...",
      "url": "https://...",
      "excel_url": "https://...",
      "urls": {
        "pdf": "https://...",
        "excel": "https://...",
        "excel_download": "https://...",
        "download": "https://..."
      }
    },
    "resumo": {
      "total_rubricas": 42,
      "valor_total": 125430.50,
      "credito_total": 9876.30
    }
  }
}
```

---

## 4. Corrigir o Download Automático

O download parou de funcionar após a atualização do fluxo. A URL do arquivo está presente na resposta em múltiplos campos. Verifique qual campo o front-end estava usando e garanta que ele ainda está sendo lido corretamente.

### Campos disponíveis com a URL do XLSX (todos apontam para o mesmo arquivo)

| Campo | Caminho na resposta |
|---|---|
| `download_url` | `response.download_url` |
| `url` | `response.url` |
| `excel_url` | `response.excel_url` |
| `file_url` | `response.file_url` |
| `fileUrl` | `response.fileUrl` |
| `downloadUrl` | `response.downloadUrl` |
| `link` | `response.link` |
| `href` | `response.href` |
| aninhado | `response.data.arquivo.download_url` |
| aninhado | `response.data.arquivo.urls.excel_download` |
| aninhado | `response.data.arquivo.urls.download` |

### Implementação recomendada do download

```javascript
function acionarDownload(response) {
  // Tenta todos os campos possíveis em ordem de prioridade
  const url =
    response.download_url ||
    response.url ||
    response.excel_url ||
    response.file_url ||
    response.fileUrl ||
    response.downloadUrl ||
    response.data?.arquivo?.download_url ||
    response.data?.arquivo?.url ||
    response.data?.arquivo?.urls?.excel_download ||
    response.data?.arquivo?.urls?.download;

  if (!url) {
    console.error('URL de download não encontrada na resposta:', response);
    return;
  }

  const filename = response.filename || response.excel_filename || 'holerite.xlsx';

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

### Como chamar após receber a resposta do webhook

```javascript
const res = await fetch('/webhook/processar-holerite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const data = await res.json();

if (data.success && data.status === 'completed') {
  acionarDownload(data);
} else {
  console.error('Processamento falhou ou ainda em andamento:', data);
}
```

---

## 5. Mudanças no XLSX gerado

| Campo | Antes | Depois |
|---|---|---|
| Coluna `SELIC` | Preenchida automaticamente com 15% | Vazia — preencher manualmente |
| Coluna `VL SELIC` | Calculado automaticamente | Vazio — preencher manualmente |
| Coluna `Período` | `01/MM/AAAA` (com dia) | `MM/AAAA` (reconhecido pelo Excel como data) |
| Estrutura | Um arquivo por competência | Um XLSX consolidado com todas as competências |
| Ordenação | Sem ordenação garantida | Ordenado do mais antigo para o mais novo |
| Subtotais | Apenas total geral | Subtotal por competência + total geral |

---

## 6. Interface recomendada para upload em lote

O front-end precisa suportar seleção de múltiplos arquivos, cada um com seu campo de competência individual.

```javascript
// Estrutura de estado sugerida
const [arquivos, setArquivos] = useState([
  { file: null, competencia: '', file_id: '', preview: '' }
]);

// Máximo de 12 arquivos
const MAX_ARQUIVOS = 12;

// Ao montar o payload para envio
async function montarPayload(arquivos) {
  const arquivosProcessados = await Promise.all(
    arquivos
      .filter(a => a.file && a.competencia)
      .map(async (a, idx) => ({
        pdf_base64: await fileToBase64(a.file),
        competencia: a.competencia, // formato MM/AAAA
        file_id: a.file_id || `file_${idx + 1}_${Date.now()}`,
        filename: a.file.name
      }))
  );

  return {
    processing_id: `proc_${Date.now()}`,
    company_id: empresaSelecionada.id,
    company_name: empresaSelecionada.nome,
    company_cnpj: empresaSelecionada.cnpj,
    arquivos: arquivosProcessados
  };
}

// Helper: converte File para base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

---

## 7. Validações a implementar no front-end

- Máximo de **12 arquivos** por envio — bloquear adição além desse limite
- Campo `competencia` obrigatório para cada arquivo, no formato `MM/AAAA`
- Não permitir envio com arquivos sem competência definida
- Exibir lista das competências que serão processadas antes de confirmar o envio
- Mostrar loader durante o processamento (pode demorar dependendo do número de PDFs)
- Tratar resposta `duplicate: true` — significa que o `processing_id` já está em processamento

---

## 8. Tratamento de erros

| Cenário | Campo na resposta | Ação sugerida |
|---|---|---|
| Execução duplicada | `duplicate: true` | Exibir aviso e não reprocessar |
| Mais de 12 arquivos | erro 500 com mensagem | Validar antes do envio |
| Competência inválida | erro 500 com mensagem | Validar formato `MM/AAAA` antes do envio |
| Arquivo sem `pdf_base64` | erro 500 com mensagem | Validar conversão base64 antes do envio |
| URL de download ausente | `download_url` nulo | Exibir mensagem de erro amigável |
