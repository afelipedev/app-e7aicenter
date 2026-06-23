// Resolução do alias/endpoint do DataJud a partir do número CNJ.
//
// A Numeração Única (CNJ) tem o formato NNNNNNN-DD.AAAA.J.TR.OOOO, onde:
//   J  = segmento do Judiciário (1 dígito)
//   TR = tribunal / região (2 dígitos)
// Cada tribunal possui um índice/endpoint próprio na API Pública do DataJud
// (ex.: api_publica_tjsp). Como o segmento e o tribunal estão codificados no
// próprio número, o alias é derivável para a consulta por CNJ.

const UF_BY_ESTADUAL_TR: Record<string, string> = {
  "01": "ac",
  "02": "al",
  "03": "ap",
  "04": "am",
  "05": "ba",
  "06": "ce",
  "07": "dft", // Distrito Federal e Territórios -> tjdft
  "08": "es",
  "09": "go",
  "10": "ma",
  "11": "mt",
  "12": "ms",
  "13": "mg",
  "14": "pa",
  "15": "pb",
  "16": "pr",
  "17": "pe",
  "18": "pi",
  "19": "rj",
  "20": "rn",
  "21": "rs",
  "22": "ro",
  "23": "rr",
  "24": "sc",
  "25": "se",
  "26": "sp",
  "27": "to",
};

// Justiça Eleitoral usa a mesma ordenação de UF por TR, porém com o prefixo tre-.
// O DF na eleitoral usa o alias tre-dft (conforme docs/api-datajud-cnj).
const UF_BY_ELEITORAL_TR = UF_BY_ESTADUAL_TR;

// Justiça Militar Estadual (segmento 9): apenas MG, RS e SP possuem tribunal.
const MILITAR_ESTADUAL_BY_TR: Record<string, string> = {
  "13": "tjmmg",
  "21": "tjmrs",
  "26": "tjmsp",
};

/** Remove qualquer formatação do CNJ, retornando apenas os 20 dígitos. */
export const onlyDigitsCnj = (cnj: string): string => cnj.replace(/\D/g, "");

interface CnjSegments {
  sequencial: string;
  digitoVerificador: string;
  ano: string;
  justica: string;
  tribunal: string;
  origem: string;
}

/** Faz o parse dos 20 dígitos do CNJ nos segmentos da Numeração Única. */
export const parseCnjSegments = (cnj: string): CnjSegments | null => {
  const digits = onlyDigitsCnj(cnj);
  if (digits.length !== 20) {
    return null;
  }

  return {
    sequencial: digits.slice(0, 7),
    digitoVerificador: digits.slice(7, 9),
    ano: digits.slice(9, 13),
    justica: digits.slice(13, 14),
    tribunal: digits.slice(14, 16),
    origem: digits.slice(16, 20),
  };
};

/**
 * Resolve o alias do tribunal (ex.: "tjsp", "trf1", "trt2") a partir do CNJ.
 * Retorna null quando o segmento/tribunal não é suportado pela API Pública.
 */
export const resolveTribunalAlias = (cnj: string): string | null => {
  const segments = parseCnjSegments(cnj);
  if (!segments) return null;

  const { justica, tribunal } = segments;
  const trNumber = Number(tribunal);

  switch (justica) {
    // Justiça Federal -> TRF1..TRF6
    case "4":
      return trNumber >= 1 && trNumber <= 6 ? `trf${trNumber}` : null;

    // Justiça do Trabalho -> TRT1..TRT24 (TR 90 = TST)
    case "5":
      if (trNumber >= 1 && trNumber <= 24) return `trt${trNumber}`;
      return "tst";

    // Justiça Eleitoral -> TSE (TR 00) ou TRE-UF
    case "6": {
      if (trNumber === 0) return "tse";
      const uf = UF_BY_ELEITORAL_TR[tribunal];
      return uf ? `tre-${uf}` : null;
    }

    // Justiça Militar da União -> STM
    case "7":
      return "stm";

    // Justiça Estadual -> TJ-UF
    case "8": {
      const uf = UF_BY_ESTADUAL_TR[tribunal];
      return uf ? `tj${uf}` : null;
    }

    // Justiça Militar Estadual -> TJM MG/RS/SP
    case "9":
      return MILITAR_ESTADUAL_BY_TR[tribunal] ?? null;

    // Tribunais Superiores (segmento 3 = STJ). STF (1) não tem API pública.
    case "3":
      return "stj";

    default:
      return null;
  }
};

/** Constrói a URL base do índice do tribunal no DataJud. */
export const buildTribunalSearchUrl = (baseUrl: string, alias: string): string => {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}/api_publica_${alias}/_search`;
};
