# Google orqali kirishni yoqish

Mobil ilova va restoran portali bir xil Supabase loyihasidan foydalanadi. Google akkaunti ikkala joyda ham bir xil `auth.uid()` berishi uchun quyidagi sozlama bir marta bajariladi.

1. Google Cloud Console’da OAuth consent screen yarating.
2. `Web application` turidagi OAuth Client yarating.
3. Google’dagi `Authorized redirect URI` ro‘yxatiga quyidagini kiriting:

   `https://tewraxuhwddaowwjsscj.supabase.co/auth/v1/callback`

4. Supabase Dashboard → Authentication → Providers → Google bo‘limida providerni yoqing va Google bergan Client ID hamda Client Secret’ni saqlang.
5. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs ro‘yxatiga quyidagilarni qo‘shing:

   - `xontaom://auth/callback`
   - restoran portalining aniq HTTPS manzili

Google Client Secret mobil ilova, sayt kodi yoki `.env` fayliga yozilmaydi; u faqat Supabase Dashboard’da saqlanadi.

Tekshiruv: restoran egasi avval portalda Google bilan kirib restoran yaratadi. So‘ng Android ilovada aynan shu Google akkauntini tanlaganda `restaurants.owner_id = auth.uid()` orqali o‘sha restoran paneli ochiladi.
