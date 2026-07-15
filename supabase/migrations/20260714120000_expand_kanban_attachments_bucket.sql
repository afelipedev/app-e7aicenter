-- Amplia os tipos de arquivo aceitos e o limite de tamanho do bucket de anexos do kanban.
-- Motivo: o conjunto anterior (pdf, png, jpeg, webp, text/plain, docx) rejeitava
-- silenciosamente arquivos comuns do jurídico (.doc, .xls, .xlsx, e-mails, zip, csv...),
-- fazendo o upload falhar sem gravar o anexo. Limite elevado de 10 MB para 50 MB.

UPDATE storage.buckets
SET
  file_size_limit = 52428800, -- 50 MB
  allowed_mime_types = ARRAY[
    -- PDF
    'application/pdf',
    -- Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    -- PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- OpenDocument
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    -- Texto / dados
    'text/plain',
    'text/csv',
    'text/rtf',
    'application/rtf',
    'application/xml',
    'text/xml',
    'application/json',
    -- E-mails
    'message/rfc822',
    'application/vnd.ms-outlook',
    -- Compactados
    'application/zip',
    'application/x-zip-compressed',
    'application/x-7z-compressed',
    'application/vnd.rar',
    'application/x-rar-compressed',
    'application/gzip',
    -- Assinatura digital
    'application/pkcs7-signature',
    'application/pkcs7-mime',
    -- Imagens
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/heic',
    'image/heif',
    'image/svg+xml',
    -- Fallback para arquivos cujo browser não informa o mime (ex.: .msg, .p7s)
    'application/octet-stream'
  ]
WHERE id = 'legal-kanban-attachments';
