const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Integer with `.` thousands separators, e.g. `1.234` or `12.345.678`. */
const GROUPED_INTEGER = /^\d{1,3}(\.\d{3})+$/;

/**
 * Parses user input for money into integer cents (> 0), or returns null if invalid or non-positive.
 *
 * Rules:
 * - Strips currency symbol 'R$' and surrounding whitespace.
 * - Negative values are rejected (cents must be strictly positive).
 * - If comma (`,`) is present:
 *   - Comma acts as the decimal separator.
 *   - Fraction must have 1 or 2 digits (e.g. '0,5' -> 50 cents, '15,99' -> 1599 cents).
 *   - Thousands separator in integer part can only be `.`.
 * - If no comma (`,`) is present:
 *   - A single `.` followed by exactly 2 digits is treated as a decimal separator (e.g. '1234.56').
 *   - Otherwise, `.` is treated as a thousands separator (e.g. '1.234' -> 123400 cents).
 */
export function parseMoneyInput(input: string): number | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Reject negative signs explicitly
  if (trimmed.includes("-")) {
    return null;
  }

  // Remove leading 'R$' or 'r$' and optional whitespace
  const clean = trimmed.replace(/^r\$\s*/i, "").trim();
  if (!clean) {
    return null;
  }

  // Must only contain digits, '.', and ','
  if (!/^[0-9.,]+$/.test(clean)) {
    return null;
  }

  let intStr: string;
  let fracStr: string;

  const commaIndex = clean.indexOf(",");
  if (commaIndex !== -1) {
    // Only one comma is allowed
    if (clean.indexOf(",", commaIndex + 1) !== -1) {
      return null;
    }

    const rawInt = clean.slice(0, commaIndex);
    const rawFrac = clean.slice(commaIndex + 1);

    // Fraction must be exactly 1 or 2 digits
    if (!/^\d{1,2}$/.test(rawFrac)) {
      return null;
    }

    // Integer part validation
    if (rawInt.includes(".")) {
      if (!GROUPED_INTEGER.test(rawInt)) {
        return null;
      }
      intStr = rawInt.replace(/\./g, "");
    } else {
      if (!/^\d+$/.test(rawInt)) {
        return null;
      }
      intStr = rawInt;
    }

    fracStr = rawFrac.padEnd(2, "0");
  } else {
    // No comma present
    const dotMatches = clean.match(/\./g);
    const dotCount = dotMatches ? dotMatches.length : 0;

    if (dotCount === 1) {
      const dotIndex = clean.indexOf(".");
      const rawInt = clean.slice(0, dotIndex);
      const rawFrac = clean.slice(dotIndex + 1);

      if (
        rawFrac.length === 2 &&
        /^\d+$/.test(rawInt) &&
        /^\d{2}$/.test(rawFrac)
      ) {
        // Single dot followed by exactly 2 digits: decimal separator
        intStr = rawInt;
        fracStr = rawFrac;
      } else {
        // Otherwise dot is a thousands separator
        if (!GROUPED_INTEGER.test(clean)) {
          return null;
        }
        intStr = clean.replace(/\./g, "");
        fracStr = "00";
      }
    } else if (dotCount > 1) {
      // Multiple dots: thousands separators
      if (!GROUPED_INTEGER.test(clean)) {
        return null;
      }
      intStr = clean.replace(/\./g, "");
      fracStr = "00";
    } else {
      // No dots, no commas: plain integer
      if (!/^\d+$/.test(clean)) {
        return null;
      }
      intStr = clean;
      fracStr = "00";
    }
  }

  const intPart = parseInt(intStr, 10);
  const fracPart = parseInt(fracStr, 10);

  if (Number.isNaN(intPart) || Number.isNaN(fracPart)) {
    return null;
  }

  const cents = intPart * 100 + fracPart;

  if (cents <= 0 || !Number.isSafeInteger(cents)) {
    return null;
  }

  return cents;
}

/**
 * Formats a cent value into BRL currency string (e.g. 'R$ 1.234,56' or '-R$ 5,00').
 */
export function formatBRL(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}

/**
 * Computes the sum of integer cent amounts.
 */
export function sumCents(values: number[]): number {
  return values.reduce((acc, curr) => acc + curr, 0);
}
