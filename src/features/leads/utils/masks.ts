function onlyDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  // 00.000.000/0000-00
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);

  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `/${p4}`;
  if (p5) out += `-${p5}`;
  return out;
}

export function formatCurrencyBR(value: string): string {
  // Armazena como string formatada (ex: 150.000,00). O parse p/ number já existe no schema do form.
  let digits = onlyDigits(value);
  if (!digits) return "";

  // numeric(15,2) => até 13 dígitos na parte inteira + 2 decimais
  digits = digits.slice(0, 15);

  const cents = digits.slice(-2).padStart(2, "0");
  let ints = digits.slice(0, -2);
  if (!ints) ints = "0";

  // milhares com ponto
  ints = ints.replace(/^0+(?=\d)/, ""); // remove zeros à esquerda
  const withThousands = ints.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${withThousands},${cents}`;
}

export function formatPhoneBR(value: string): string {
  let digits = onlyDigits(value);
  if (!digits) return "";

  // suporte a +55 (13 dígitos = 55 + DDD + 9 dígitos)
  let hasBR = false;
  if (digits.startsWith("55") && digits.length > 11) {
    hasBR = true;
    digits = digits.slice(0, 13);
  } else {
    digits = digits.slice(0, 11);
  }

  const area = hasBR ? digits.slice(2, 4) : digits.slice(0, 2);
  const rest = hasBR ? digits.slice(4) : digits.slice(2);

  const isMobile = rest.length > 8; // 9 dígitos => celular
  const part1 = isMobile ? rest.slice(0, 5) : rest.slice(0, 4);
  const part2 = isMobile ? rest.slice(5, 9) : rest.slice(4, 8);

  let out = "";
  if (hasBR) out += "+55 ";
  if (area) out += `(${area})`;
  if (part1) out += ` ${part1}`;
  if (part2) out += `-${part2}`;
  return out.trim();
}

