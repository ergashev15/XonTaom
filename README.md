# XonTaom MVP

## Restoran boshqaruv sayti

Restoran egalari uchun alohida web-kabinet `restaurant-portal/` papkasida joylashgan. Saytda restoran profili, menyu bo‘limlari, taomlar va ularning mavjudligi boshqariladi. Buyurtmalar esa faqat mobil ilovadagi restoran panelida qabul qilinadi va bajariladi.

Umumiy ma’lumot oqimi:

`Restoran sayti → Supabase REST/Auth/Storage → XonTaom ilovasi`

Ishga tushirishdan oldin Supabase bazasiga quyidagi migrationlarni ketma-ket qo‘llang:

1. `supabase/migrations/0001_initial.sql`
2. `supabase/migrations/0002_restaurant_portal.sql`
3. `supabase/migrations/0003_harden_partner_approval.sql`
4. `supabase/migrations/0004_customer_registration.sql`
5. `supabase/migrations/0005_security_hardening.sql`
6. `supabase/migrations/0006_integrity_and_partner_data.sql`
7. `supabase/migrations/0007_schedule_order_expiry.sql`

Ilovaning joriy versiyasi `0005` migrationisiz buyurtma yubora olmaydi: `place_order` funksiyasi takroriy yuborishdan himoya qiluvchi `p_client_request_id` parametrini kutadi.

Keyin portal konfiguratsiyasini yarating va statik serverni ishga tushiring:

```sh
node restaurant-portal/scripts/build.mjs
cd restaurant-portal/dist
python3 -m http.server 8090
```

XonTaom ilovasi tasdiqlangan restoran va menyularni Supabase’dan oladi, har 30 soniyada hamda ilova qayta faol bo‘lganda yangilaydi. Tarmoq ishlamasa, foydalanuvchiga qayta urinish holati ko‘rsatiladi.

Xonobod shahri uchun restoran buyurtmasi va yetkazib berish tizimining ishlaydigan Expo MVP prototipi. Bitta universal kodbazada mijoz mobil ilovasi, restoran paneli va administrator paneli mavjud.

## Ishga tushirish

Talab: Node.js 22.13+ va npm (Expo SDK 57 talabi).

```bash
npm install
npx expo install --fix
npm run start
```

- Mobil: terminaldagi QR kodni Expo Go bilan skanerlang.
- Web: `npm run web`, so‘ng bosh sahifadan kerakli rolni tanlang.
- Tekshiruv: `npm run typecheck && npm test`.

## Telefon orqali kirish

Kirish ekranlari hozir email/parol va Google orqali ishlaydi. Supabase Phone OTP uchun servis funksiyalari (`requestPhoneOtp`, `verifyPhoneOtp`) tayyor, lekin hali ekranga ulanmagan. Sessiya Android/iOS qurilmada `expo-secure-store` yordamida saqlanadi va access token muddati tugashidan oldin avtomatik yangilanadi. Foydalanuvchi roli `profiles.role` va `restaurants.owner_id` asosida aniqlanadi; haqiqiy ruxsatlarni RLS belgilaydi.

Sozlash qo‘llanmasi: [docs/PHONE_AUTH_SETUP.md](docs/PHONE_AUTH_SETUP.md).

## Restoran egasi uchun Google kirishi

Restoran portali va mobil ilova bir xil Google/Supabase akkauntini ishlatadi. Portalda yaratilgan restoran `owner_id` orqali mobil ilovadagi restoran paneliga avtomatik bog‘lanadi.

Google provider va redirect manzillarini yoqish: [docs/GOOGLE_AUTH_SETUP.md](docs/GOOGLE_AUTH_SETUP.md).

## Ilova rollari

- Mijoz: restoran qidirish, menyu ko‘rish, sevimli qilish, savat, manzil/to‘lov va buyurtma kuzatuvi.
- Restoran: ochiq/yopiq holati, yangi buyurtmani qabul qilish/rad etish, holatni yangilash, menyu mavjudligi va ko‘rsatkichlar.
- Administrator: restoranlar, buyurtmalar, mijozlar, komissiya va moderatsiya ko‘rsatkichlari.

Supabase sozlanmagan bo‘lsa (`.env` yo‘q), ilova ichki demo ma’lumotlari bilan lokal ishlaydi. Supabase sozlanganda buyurtmalar faqat serverda yaratiladi va mijoz, restoran hamda administrator ularni serverdan oladi; server bilan aloqa bo‘lmasa buyurtma yuborilmaydi.

Sevimlilar, manzillar, sharh va baholar, restoran arizalari, aksiyalar va xodimlar ro‘yxati ham serverda saqlanadi (`0006` migrationi). Hali faqat qurilmada ishlaydigan qism: restoran va administrator yuboradigan bildirishnomalar (push ulanmagan).

Javobsiz qolgan buyurtmalar 10 daqiqadan keyin avtomatik bekor qilinadi (`0007` migrationi `pg_cron` ni yoqadi va har daqiqa ishlaydigan vazifani yaratadi). Restoran ish vaqti `Asia/Tashkent` vaqti bo‘yicha serverda tekshiriladi.

Restoran egalari yaratgan yoki tahrirlagan restoran va taomlar administrator panelidagi “Moderatsiya” bo‘limida tasdiqlanmaguncha mijozlarga ko‘rinmaydi.

## Production backendga o‘tish

Auth, katalog, buyurtma yaratish/kuzatish/bekor qilish, restoran paneli va menyu rasmlarini Storage’ga yuklash Supabase bilan ishlaydi. Keyingi bosqichlar: promo-kodlarni narxga qo‘llash, Realtime, Expo push bildirishnomalari, release imzo kaliti va EAS build. Maxfiy kalitlar faqat server muhitida saqlanadi.

To‘liq MVP scope, oqimlar, ekranlar, DB sxemasi va roadmap: [docs/MVP.md](docs/MVP.md).
# XonTaom
