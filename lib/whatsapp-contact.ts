const TEN_DIGIT_MOBILE = /^3\d{9}$/;

export function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (TEN_DIGIT_MOBILE.test(digits)) {
    return `57${digits}`;
  }
  if (digits.startsWith("57") && TEN_DIGIT_MOBILE.test(digits.slice(2))) {
    return digits;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return null;
}

export function whatsappChatHref(e164Digits: string, text?: string) {
  const base = `https://wa.me/${e164Digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function formatWhatsappDisplay(e164Digits: string) {
  if (e164Digits.startsWith("57") && e164Digits.length === 12) {
    return `+57 ${e164Digits.slice(2, 5)} ${e164Digits.slice(5, 8)} ${e164Digits.slice(8)}`;
  }
  return `+${e164Digits}`;
}
