const PUNCTUATION_PATTERN = /[，。、“”‘’；：？！,.!?;:'"()\[\]（）《》<>·\s]/g;
const CHINESE_NUMERAL_PATTERN = /[零〇一二两三四五六七八九十百千万亿]+/g;

const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const CHINESE_UNITS: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
  万: 10000,
  亿: 100000000,
};

function parseChineseNumeral(input: string) {
  if (!input) {
    return input;
  }

  let total = 0;
  let section = 0;
  let number = 0;

  for (const char of input) {
    if (char in CHINESE_DIGITS) {
      number = CHINESE_DIGITS[char];
      continue;
    }

    if (!(char in CHINESE_UNITS)) {
      return input;
    }

    const unit = CHINESE_UNITS[char];

    if (unit >= 10000) {
      section = (section + (number || 0)) * unit;
      total += section;
      section = 0;
      number = 0;
      continue;
    }

    section += (number || 1) * unit;
    number = 0;
  }

  return String(total + section + number);
}

export function normalizeFillBlankAnswer(value: string) {
  return value
    .trim()
    .replace(PUNCTUATION_PATTERN, "")
    .replace(CHINESE_NUMERAL_PATTERN, (match) => parseChineseNumeral(match))
    .toLowerCase();
}
