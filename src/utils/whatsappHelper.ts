/**
 * Helper utility for emergency WhatsApp messaging with geolocation & help text
 */

export function cleanPhoneNumberForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^\d]/g, '');
  // If number starts with 8 and is 11 digits (e.g. 87011234567 in KZ/RU), convert to international 7
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.slice(1);
  }
  return cleaned;
}

export interface EmergencyMessageParams {
  fullName?: string;
  bloodGroup?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  incidentType?: string;
  language?: 'ru' | 'kz' | 'en';
}

export function buildEmergencyWhatsAppMessage(params: EmergencyMessageParams): string {
  const isKz = params.language === 'kz';
  const lat = params.latitude.toFixed(6);
  const lng = params.longitude.toFixed(6);
  const mapLink = `https://maps.google.com/?q=${lat},${lng}`;
  const accuracyStr = params.accuracy ? ` (±${Math.round(params.accuracy)}м)` : '';

  if (isKz) {
    return `🚨 ШҰҒЫЛ! КӨМЕК ҚАЖЕТ! 🚨
Менде төтенше жағдай! Qutqar 112 жүйесі арқылы SOS дабылы жіберілді.

📍 МЕНІҢ ГЕОЛОКАЦИЯМ:
${lat}, ${lng}${accuracyStr}

🗺 КАРТА СІЛТЕМЕСІ (Google Maps / 2ГИС):
${mapLink}

🏠 МЕКЕНЖАЙ / БАҒДАР:
${params.address || 'GPS арқылы анықталуда'}

👤 ЖІБЕРУШІ:
${params.fullName || 'Мен'} ${params.bloodGroup ? `(Қан тобы: ${params.bloodGroup})` : ''}

⚠️ ТӨТЕНШЕ ЖАҒДАЙ ТҮРІ:
${params.incidentType || 'Шұғыл көмек'}

Маған шұғыл хабарласыңыз немесе 112 қызметін шақырыңыз!`;
  }

  return `🚨 СРОЧНО! ТРЕБУЕТСЯ ПОМОЩЬ! 🚨
Я нахожусь в экстренной ситуации! Отправлен сигнал бедствия через Qutqar 112.

📍 МОЯ ГЕОЛОКАЦИЯ:
${lat}, ${lng}${accuracyStr}

🗺 ССЫЛКА НА КАРТУ (Google Maps / 2ГИС):
${mapLink}

🏠 АДРЕС / ОРИЕНТИР:
${params.address || 'Определяется по GPS'}

👤 ОТПРАВИТЕЛЬ:
${params.fullName || 'Я'} ${params.bloodGroup ? `(Группа крови: ${params.bloodGroup})` : ''}

⚠️ ТИП ЧС:
${params.incidentType || 'Экстренная ситуация'}

Пожалуйста, срочно свяжитесь со мной или вызовите спасателей по номеру 112!`;
}

export function openWhatsAppChat(phone: string, message: string): void {
  const cleanedPhone = cleanPhoneNumberForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  
  // If phone is valid, direct message to that specific phone number
  const url = cleanedPhone
    ? `https://wa.me/${cleanedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
    
  window.open(url, '_blank');
}
