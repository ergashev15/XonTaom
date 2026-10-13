import { LegalDocument, type LegalSection } from "@/components/legal-document";

const sections: LegalSection[] = [
  { title: "Xizmatdan foydalanish", paragraphs: [
    "XonTaom mijozlar va restoranlar o‘rtasida buyurtma ma’lumotlarini uzatadigan platformadir. Foydalanuvchi kiritgan ma’lumotlarning to‘g‘riligi va akkaunti xavfsizligi uchun javobgardir.",
    "Ilovadan qonunga zid, firibgarlik yoki boshqa foydalanuvchilarga zarar yetkazadigan maqsadda foydalanish taqiqlanadi."
  ]},
  { title: "Buyurtmalar va to‘lov", paragraphs: [
    "Narx, yetkazish haqi, minimal buyurtma va taxminiy vaqt buyurtmani tasdiqlashdan oldin ko‘rsatiladi. Restoran buyurtmani qabul qilishi, rad etishi yoki asosli holatlarda bekor qilishi mumkin.",
    "Naqd yoki yetkazilganda karta orqali to‘lov restoran yoki yetkazib beruvchi bilan amalga oshiriladi. Ilovada alohida ko‘rsatilmagan bo‘lsa, XonTaom karta ma’lumotlarini saqlamaydi."
  ]},
  { title: "Bekor qilish va muammolar", paragraphs: [
    "Restoran buyurtmani qabul qilguniga qadar ilovada bekor qilish mumkin. Qabul qilingandan keyingi o‘zgarishlar uchun restoran yoki yordam xizmatiga murojaat qilish kerak.",
    "Xizmat uzilishi, noto‘g‘ri mahsulot yoki yetkazish muammosi yuz bersa, buyurtma raqami bilan yordam bo‘limiga murojaat qiling."
  ]},
  { title: "Akkaunt va kontent", paragraphs: [
    "Foydalanuvchi o‘z akkauntidan amalga oshirilgan harakatlar uchun javob beradi. Restoran hamkorlari joylagan nom, rasm, narx va tavsiflar qonuniy hamda haqqoniy bo‘lishi kerak.",
    "Qoidabuzarlik, xavfsizlik tahdidi yoki qonuniy talab bo‘lsa, akkaunt yoki kontent vaqtincha cheklanishi mumkin."
  ]},
  { title: "Shartlarning o‘zgarishi", paragraphs: [
    "Xizmat va qonun talablari o‘zgarganda ushbu shartlar yangilanishi mumkin. Muhim o‘zgarishlar ilova yoki boshqa mavjud aloqa kanali orqali bildiriladi."
  ]}
];

export default function TermsScreen() {
  return <LegalDocument title="Foydalanish shartlari" intro="XonTaom’dan foydalanish orqali ushbu shartlarga rozilik bildirasiz." sections={sections} />;
}
