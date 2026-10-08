# XonTaom — MVP spetsifikatsiyasi

## 1. MVP funksiyalari

**Mijoz:** telefon orqali kirish uchun tayyor auth chegarasi, restoran katalogi/qidiruvi, ochiq-yopiq holat, kategoriya menyusi, taom miqdori va izohi, bir restoranlik savat qoidasi, manzil, naqd yoki yetkazilganda terminal, summa hisoblash, buyurtma yaratish/kuzatish/tarix, sevimlilar, baholash va qo‘ng‘iroq havolasi.

**Restoran:** profil va ish holati, menyu mavjudligi, buyurtma qabul/rad qilish, tayyorlash va yetkazish holatlari, mijoz aloqa/manzil ma’lumotlari, kunlik/haftalik/oylik savdo va komissiya.

**Admin:** restoranlar va bloklash, buyurtma/holat filtri, mijozlar, komissiya, banner/kategoriya/moderatsiya uchun MVP ko‘rsatkichlari, muammoli buyurtmalar.

## 2. Foydalanuvchi oqimlari

1. Mijoz → restoran qidiradi → menyudan taom qo‘shadi → savat → manzil/to‘lov → tasdiq → status kuzatuvi.
2. Restoran → yangi buyurtma → qabul yoki sabab bilan rad → tayyorlanmoqda → yetkazishga chiqdi → yetkazildi.
3. Admin → restoran/buyurtma filtrlaydi → restoran holatini boshqaradi → savdo va komissiyani nazorat qiladi.

## 3. Ekranlar

- Rol tanlash / demo kirish
- Bosh sahifa va qidiruv
- Restoran va kategoriya menyusi
- Savat
- Buyurtmani rasmiylashtirish
- Buyurtmalar va status tafsiloti
- Profil / sevimlilar
- Restoran dashboardi, buyurtmalar va menyu
- Admin dashboardi, restoranlar va buyurtmalar

## 4. Ma’lumotlar bazasi

| Jadval | Muhim ustunlar |
|---|---|
| `profiles` | id, role, name, phone, language, created_at |
| `restaurants` | id, owner_id, name, phone, address, image_url, is_open, is_blocked, min_order, delivery_fee, eta_min, commission_rate |
| `restaurant_hours` | restaurant_id, weekday, opens_at, closes_at, is_closed |
| `delivery_zones` | id, restaurant_id, name, polygon, fee |
| `categories` | id, restaurant_id, name, sort_order, is_active |
| `menu_items` | id, category_id, restaurant_id, name, description, image_url, price, is_available |
| `favorites` | profile_id, restaurant_id, created_at |
| `addresses` | id, profile_id, label, address, house, landmark, lat, lng |
| `orders` | id, customer_id, restaurant_id, status, payment_method, subtotal, delivery_fee, total, address_snapshot, note, rejection_reason, created_at |
| `order_items` | id, order_id, menu_item_id, name_snapshot, price_snapshot, quantity, note |
| `reviews` | id, order_id, customer_id, restaurant_id, rating, comment, is_visible |
| `notifications` | id, profile_id, title, body, read_at, data, created_at |
| `banners` | id, title, image_url, target_url, starts_at, ends_at, is_active |
| `audit_logs` | id, actor_id, action, entity_type, entity_id, before, after, created_at |

Pul qiymatlari integer so‘mda. `order_items.price_snapshot` tarixiy narxni saqlaydi. RLS rollar bo‘yicha cheklaydi: mijoz faqat o‘z buyurtmasi, restoran faqat o‘z restorani, admin to‘liq auditlangan kirish.

## 5. Texnik arxitektura

- Frontend: Expo + React Native + Expo Router + TypeScript, universal Android/iOS/Web.
- UI: tokenlarga asoslangan dizayn tizimi, `expo-image`, responsiv panellar.
- Backend: Supabase Auth/PostgreSQL/Realtime/Storage; biznes qoidalari Edge Function yoki transaction RPC’da.
- Realtime: order status kanali; offline/sekina internet uchun keyinchalik React Query cache.
- Notification: Expo Push, server webhook/event orqali.
- To‘lov: `PaymentProvider` interfeysi; MVPda `cash` va `card_on_delivery`.
- Xavfsizlik: OTP, RLS, server-only secrets, audit log, idempotent order creation.

## 6. Bosqichma-bosqich reja

1. Universal demo va dizayn tizimi — ushbu MVPda bajarildi.
2. Supabase sxema, migration, seed va RLS.
3. Telefon OTP va rollar asosidagi sessiya.
4. CRUD, real-time order va rasm storage/siqish.
5. Expo Push, timeout ogohlantirishlari va background jobs.
6. E2E, xavfsizlik/performance audit, store build va pilot restoranlar.
