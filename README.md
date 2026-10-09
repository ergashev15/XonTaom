# XonTaom MVP

## Restoran boshqaruv sayti

Restoran egalari uchun alohida web-kabinet `restaurant-portal/` papkasida joylashgan. U restoran profili, menyu bo‘limlari, taomlar, mavjudlik va buyurtmalarni boshqaradi.

Umumiy ma’lumot oqimi:

`Restoran sayti → Supabase REST/Auth/Storage → XonTaom ilovasi`

Ishga tushirishdan oldin Supabase bazasiga quyidagi migrationlarni ketma-ket qo‘llang:

1. `supabase/migrations/0001_initial.sql`
2. `supabase/migrations/0002_restaurant_portal.sql`

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

Ushbu kompyuterda Node/npm mavjud bo‘lmagani uchun paketlarni o‘rnatish va runtime tekshiruvi bajarilmadi.

## Telefon orqali kirish

Ilova Supabase Phone OTP bilan real SMS orqali kirishga tayyor. Sessiya Android/iOS qurilmada `expo-secure-store` yordamida saqlanadi, foydalanuvchi roli esa xavfsiz `app_metadata` qiymatidan olinadi.

Sozlash qo‘llanmasi: [docs/PHONE_AUTH_SETUP.md](docs/PHONE_AUTH_SETUP.md).

## Restoran egasi uchun Google kirishi

Restoran portali va mobil ilova bir xil Google/Supabase akkauntini ishlatadi. Portalda yaratilgan restoran `owner_id` orqali mobil ilovadagi restoran paneliga avtomatik bog‘lanadi.

Google provider va redirect manzillarini yoqish: [docs/GOOGLE_AUTH_SETUP.md](docs/GOOGLE_AUTH_SETUP.md).

## Ilova rollari

- Mijoz: restoran qidirish, menyu ko‘rish, sevimli qilish, savat, manzil/to‘lov va buyurtma kuzatuvi.
- Restoran: ochiq/yopiq holati, yangi buyurtmani qabul qilish/rad etish, holatni yangilash, menyu mavjudligi va ko‘rsatkichlar.
- Administrator: restoranlar, buyurtmalar, mijozlar, komissiya va moderatsiya ko‘rsatkichlari.

Buyurtma va restoran demo ma’lumotlari hozircha lokal holatda ishlaydi. Ilova qayta yuklanganda boshlang‘ich holat tiklanadi.

## Production backendga o‘tish

Supabase Phone OTP va asosiy profil RLS sxemasi ulangan. Keyingi bosqichda `src/store/app-store.tsx` dagi buyurtma amallari API repository bilan almashtiriladi. Expo push tokenlari va rasmlarni serverda siqish server tomonda ulanadi. Maxfiy kalitlar faqat server muhitida saqlanadi.

To‘liq MVP scope, oqimlar, ekranlar, DB sxemasi va roadmap: [docs/MVP.md](docs/MVP.md).
# XonTaom
