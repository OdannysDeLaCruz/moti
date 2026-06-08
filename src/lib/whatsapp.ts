/**
 * Genera la URL de WhatsApp para que el conductor envíe el comprobante de pago.
 */
export function buildWhatsAppUrl(driverEmail: string): string {
  const phone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "573000000000";
  const message = encodeURIComponent(
    `Hola! Acabo de enviar el pago de mi pase diario. Mi correo registrado es: ${driverEmail}`
  );
  return `https://wa.me/${phone}?text=${message}`;
}

/**
 * Formatea un precio en pesos colombianos.
 */
export function formatCOP(amount: number | bigint): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}
