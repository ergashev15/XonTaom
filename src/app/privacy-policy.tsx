import { LegalDocument, type LegalSection } from "@/components/legal-document";

const sections: LegalSection[] = [
  { title: "Qanday ma’lumotlar olinadi", paragraphs: [
    "XonTaom ro‘yxatdan o‘tish va xizmat ko‘rsatish uchun ism, email, telefon raqami va yetkazib berish manzilini qayta ishlaydi.",
    "Buyurtma tarkibi, to‘lov turi, restoran bilan bog‘liq ma’lumotlar va xizmat tarixini saqlaymiz. Restoran hamkorlari yuklagan taom rasmlari faqat foydalanuvchi tanlaganidan keyin olinadi.",
    "Push bildirishnomalar uchun qurilma turi va Expo push token saqlanadi. Token reklama kuzatuvi uchun ishlatilmaydi."
  ]},
  { title: "Ma’lumotlardan foydalanish", paragraphs: [
    "Ma’lumotlar hisobni yuritish, buyurtmani restoranga yetkazish, holat haqida xabar berish, firibgarlikning oldini olish va xizmatni yaxshilash uchun ishlatiladi.",
    "XonTaom shaxsiy ma’lumotlarni sotmaydi. Xizmat ishlashi uchun ma’lumotlar Supabase, Google autentifikatsiyasi, Expo va Firebase Cloud Messaging kabi texnik xizmatlarda qayta ishlanishi mumkin."
  ]},
  { title: "Saqlash va himoya", paragraphs: [
    "Ma’lumotlar xizmat ko‘rsatish, nizolarni hal qilish va qonuniy majburiyatlar uchun zarur muddat davomida saqlanadi. Kirish tokenlari qurilmaning himoyalangan xotirasida saqlanadi.",
    "Internet orqali uzatiladigan ma’lumotlar shifrlangan HTTPS aloqasidan foydalanadi. Hech bir tizim mutlaq xavfsizlikni kafolatlamaydi, ammo ruxsatlarni cheklash va server qoidalari qo‘llanadi."
  ]},
  { title: "Sizning huquqlaringiz", paragraphs: [
    "Profil bo‘limidan akkauntni o‘chirish so‘rovini yuborishingiz mumkin. So‘rovdan keyin akkaunt va unga bog‘liq shaxsiy ma’lumotlar qonuniy saqlash talablari hisobga olingan holda o‘chiriladi yoki anonimlashtiriladi.",
    "Bildirishnoma ruxsatini telefon sozlamalaridan istalgan vaqtda o‘chirishingiz mumkin. Yordam va ma’lumot so‘rovlari ilovadagi “Yordam va qo‘llab-quvvatlash” bo‘limi orqali qabul qilinadi."
  ]},
  { title: "Bolalar va o‘zgarishlar", paragraphs: [
    "Xizmat mustaqil buyurtma bera olmaydigan bolalar uchun mo‘ljallanmagan. Siyosat o‘zgarsa, yangi sana shu sahifada ko‘rsatiladi."
  ]}
];

export default function PrivacyPolicyScreen() {
  return <LegalDocument title="Maxfiylik siyosati" intro="Ushbu siyosat XonTaom ilovasi shaxsiy ma’lumotlarni qanday yig‘ishi, ishlatishi va himoya qilishini tushuntiradi." sections={sections} />;
}
