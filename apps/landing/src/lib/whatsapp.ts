// Enlace a wa.me a partir del numero capturado en la configuracion. Con 10
// digitos se asume Mexico y se antepone 52; sin digitos no hay enlace.
export const whatsappLink = (raw: string | null | undefined, text?: string): string | null => {
  const digits = raw?.replace(/\D/g, '');
  if (!digits) return null;
  const url = `https://wa.me/${digits.length === 10 ? '52' : ''}${digits}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
};
