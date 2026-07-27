const PROMOTIONAL_MARKER = /(?:^|\n)\s*-?\s*THẦY CÔ CẦN ĐỦ BỘ[\s\S]*$/i;

const EXACT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Về khí hậu\)\s*:/gi, 'Về khí hậu:'],
  [/Về tài nguyên nước và đất\s+Hiện tượng/gi, 'Về tài nguyên nước và đất: Hiện tượng'],
  [/\bTHƯC HÀNH\b/g, 'THỰC HÀNH'],
  [/\bĐIA LÍ\b/g, 'ĐỊA LÍ'],
  [/\bHSG 9 mơi\b/g, 'HSG 9 mới'],
  [/\bĐơn vi\b/gi, 'Đơn vị'],
  [/\bV\s+ẽ\b/g, 'Vẽ'],
  [/\bN\s+hận xét\b/g, 'Nhận xét'],
  [/\bBÀI\s+(\d+)\s*-\s*/g, 'BÀI $1 - '],
  [/\(\s*[Đđ]ơn vị\s*%\s*\)/g, '(Đơn vị: %)'],
  [/\(\s*[Đđ]ơn vị\s*:\s*%\s*\)/g, '(Đơn vị: %)'],
  [/\bĐơn vị\s*\(\s*%\s*\)/g, 'Đơn vị: %'],
  [/\),\./g, ').'],
  [/,\./g, '.'],
];

/**
 * Làm sạch an toàn các lỗi trình bày thường gặp trong học liệu nhập từ Word/OCR.
 * Không thay đổi số liệu hoặc nội dung chuyên môn.
 */
export const cleanDisplayText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let text = String(value).normalize('NFC').replace(/\r\n?/g, '\n');
  text = text.replace(PROMOTIONAL_MARKER, '');

  for (const [pattern, replacement] of EXACT_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/[ \t]+([,.:;!?])/g, '$1')
    .replace(/\b(Câu(?: hỏi)?\s+\d+)\s*:/gi, '$1:')
    .replace(/\b([a-zA-Z])\s+\)/g, '$1)')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
};

export const cleanDisplayLines = (values: unknown[] | undefined): string[] =>
  (values || []).map(cleanDisplayText).filter(Boolean);
