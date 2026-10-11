# Telefon orqali kirishni ishga tushirish

Ilovadagi OTP oqimi tayyor. Real SMS yuborilishi uchun Supabase loyihasi va SMS provayder sozlamalari kerak.

## 1. Supabase loyihasi

1. Supabase'da loyiha yarating.
2. `supabase/migrations/` papkasidagi migrationlarni tartib bilan qo‘llang (profil jadvali va yangi foydalanuvchi triggeri shu yerda yaratiladi).
3. Authentication → Providers → Phone bo‘limida telefon provayderini yoqing.
4. Supabase qo‘llaydigan SMS provayderlardan birini ulang yoki mahalliy SMS xizmati uchun Send SMS Hook yarating.
5. Authentication rate limit va CAPTCHA sozlamalarini production uchun yoqing.

## 2. Ilova muhiti

`.env.example` nusxasidan `.env` yarating:

```env
EXPO_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_AUTH_DEV_MODE=false
```

Publishable key mobil ilovada ishlatish uchun mo‘ljallangan. `service_role` yoki secret key'ni hech qachon ilovaga yozmang.

## 3. Rollar

Yangi foydalanuvchi avtomatik `customer` bo‘ladi. Administrator roli faqat Supabase SQL Editor yoki ishonchli server orqali beriladi:

```sql
update public.profiles set role = 'admin' where phone = '+998901234567';
```

Restoran roli alohida berilmaydi: foydalanuvchi `restaurants.owner_id` orqali restoranga bog‘langan bo‘lsa, ilova uni restoran egasi deb oladi. Foydalanuvchilar o‘z `role` ustunini REST API orqali o‘zgartira olmaydi (`0005_security_hardening.sql`).

Ilova quyidagicha yo‘naltiradi:

- `customer` → `/home`
- `restaurant` → `/restaurant-panel`
- `admin` → `/admin-panel`

Ekrandagi yo‘naltirish ruxsat bermaydi; haqiqiy ruxsatni serverdagi RLS siyosatlari belgilaydi.

## 4. Lokal sinov

Faqat development build uchun:

```env
EXPO_PUBLIC_AUTH_DEV_MODE=true
```

Sinov OTP kodi: `123456`. `__DEV__` false bo‘lgan release buildda bu rejim avtomatik ishlamaydi.

## 5. Production tekshiruvi

- Bir raqamga 60 soniyada faqat bitta SMS yuborilishini tekshiring.
- Noto‘g‘ri va eskirgan kodlar rad qilinishini tekshiring.
- Ilova qayta ochilganda sessiya tiklanishini tekshiring.
- Customer raqami admin/restoran paneliga kira olmasligini tekshiring.
- Hisobdan chiqishda SecureStore sessiyasi o‘chishini tekshiring.
- Supabase RLS va Security Advisor ogohlantirishlarini tekshiring.
