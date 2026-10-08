import { Campaign, Order, Restaurant, Review } from "@/types";

export const restaurantsSeed: Restaurant[] = [
  {
    id: "chortoq",
    name: "Samarqand Osh Markazi",
    cuisine: "Osh, Kabob, Milliy taomlar",
    rating: 4.8,
    reviews: 186,
    image: "https://images.unsplash.com/photo-1642821373181-696a54913e93?auto=format&fit=crop&w=1200&q=80",
    phone: "+998901234567",
    address: "Xonobod, Mustaqillik ko‘chasi 18",
    hours: "09:00–23:00",
    isOpen: true,
    minOrder: 30000,
    deliveryFee: 0,
    eta: "30–40 daqiqa",
    commission: 12,
    menu: [
      { id: "osh-1", category: "Oshlar", name: "Osh (Plov)", description: "Devzira guruch, mol go‘shti, sabzi va no‘xat", price: 45000, image: "https://images.unsplash.com/photo-1642821373181-696a54913e93?auto=format&fit=crop&w=800&q=80", available: true, extras: [{ id: "gosht", name: "Qo‘shimcha go‘sht", price: 15000 }, { id: "salat", name: "Salat", price: 5000 }] },
      { id: "osh-2", category: "Oshlar", name: "Manti", description: "Bug‘da pishirilgan go‘shtli manti", price: 35000, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80", available: true },
      { id: "salat-1", category: "Salatlar", name: "Lag‘mon", description: "Qo‘lda cho‘zilgan ugra va sabzavotlar", price: 32000, image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80", available: true },
      { id: "ich-1", category: "Kaboblar", name: "Shashlik", description: "Ko‘mirda pishirilgan mayin go‘sht", price: 50000, image: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80", available: true }
    ]
  },
  {
    id: "soy",
    name: "Pizza House",
    cuisine: "Pizza, Burger, Salatlar",
    rating: 4.7,
    reviews: 980,
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80",
    phone: "+998907654321",
    address: "Xonobod, Xonobodsoy bo‘yi 7",
    hours: "10:00–22:00",
    isOpen: true,
    minOrder: 40000,
    deliveryFee: 0,
    eta: "25–35 daqiqa",
    commission: 10,
    menu: [
      { id: "kabob-1", category: "Pizza", name: "Pitsa Margarita", description: "Mozzarella, pomidor va rayhon", price: 42000, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80", available: true, extras: [{ id: "cheese", name: "Qo‘shimcha pishloq", price: 7000 }, { id: "sous", name: "Maxsus sous", price: 3000 }] },
      { id: "kabob-2", category: "Pizza", name: "Pepperoni", description: "Pepperoni, mozzarella va pomidor sousi", price: 48000, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80", available: true },
      { id: "non-1", category: "Burger", name: "Cheeseburger", description: "Mol go‘shti kotleti va cheddar", price: 38000, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80", available: true }
    ]
  },
  {
    id: "baraka",
    name: "Choyxona 777",
    cuisine: "Osh, Somsa, Ichimliklar",
    rating: 4.6,
    reviews: 640,
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1200&q=80",
    phone: "+998912223344",
    address: "Xonobod, Amir Temur ko‘chasi 5",
    hours: "11:00–21:00",
    isOpen: true,
    minOrder: 25000,
    deliveryFee: 7000,
    eta: "20–35 daqiqa",
    commission: 12,
    menu: [
      { id: "lavash-1", category: "Milliy", name: "Ko‘za sho‘rva", description: "Mol go‘shti va yangi sabzavotlar", price: 36000, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80", available: true },
      { id: "burger-1", category: "Ichimliklar", name: "Choy dasturxoni", description: "Ko‘k choy, non va shirinlik", price: 22000, image: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=800&q=80", available: true }
    ]
  },
  {
    id: "sweet-life",
    name: "Sweet Life",
    cuisine: "Shirinliklar, Tortlar, Desertlar",
    rating: 4.9,
    reviews: 410,
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80",
    phone: "+998935551122",
    address: "Xonobod, Markaziy xiyobon 4",
    hours: "09:00–22:00",
    isOpen: true,
    minOrder: 20000,
    deliveryFee: 0,
    eta: "20–30 daqiqa",
    commission: 12,
    menu: [
      { id: "cake-1", category: "Shirinlik", name: "Qulupnayli chizkeyk", description: "Yangi qulupnay va mayin krem", price: 28000, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80", available: true },
      { id: "cake-2", category: "Shirinlik", name: "Shokoladli tort", description: "Qora shokolad va qaymoqli krem", price: 30000, image: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=800&q=80", available: true }
    ]
  }
];

export const ordersSeed: Order[] = [
  {
    id: "XT-1048",
    restaurantId: "chortoq",
    restaurantName: "Samarqand Osh Markazi",
    customerName: "Dilshod Karimov",
    phone: "+998 90 123 45 67",
    address: "Mustaqillik ko‘chasi 42, 16-uy. Maktab ro‘parasida",
    note: "Qo‘ng‘iroq qilib kiring",
    items: [{ ...restaurantsSeed[0].menu[0], lineId: "osh-1-demo", quantity: 2, note: "Bittasi yog‘sizroq", selectedExtras: [] }],
    subtotal: 64000,
    deliveryFee: 8000,
    total: 72000,
    payment: "Naqd",
    status: "Restoran tasdig‘i kutilmoqda",
    createdAt: new Date(Date.now() - 6 * 60000).toISOString(),
    confirmationDeadline: new Date(Date.now() - 60000).toISOString()
  },
  {
    id: "XT-1047",
    restaurantId: "soy",
    restaurantName: "Pizza House",
    customerName: "Madina Aliyeva",
    phone: "+998 93 555 44 33",
    address: "Yangi hayot MFY, 8-uy",
    items: [{ ...restaurantsSeed[1].menu[0], lineId: "kabob-1-demo", quantity: 4, selectedExtras: [] }],
    subtotal: 72000,
    deliveryFee: 10000,
    total: 82000,
    payment: "Yetkazilganda karta orqali",
    status: "Yetkazildi",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    confirmationDeadline: new Date(Date.now() - 86100000).toISOString(),
    prepMinutes: 30,
    acceptedAt: new Date(Date.now() - 86100000).toISOString(),
    outForDeliveryAt: new Date(Date.now() - 84600000).toISOString(),
    deliveredAt: new Date(Date.now() - 83700000).toISOString(),
    courierPhone: "+998907654321"
  }
];

export const campaignsSeed: Campaign[] = [
  { id: "banner-1", type: "Banner", title: "Xonobod bo‘ylab tez yetkazish", active: true },
  { id: "discount-1", type: "Chegirma", title: "Milliy taomlarga 10%", active: true },
  { id: "promo-1", type: "Promo-kod", title: "Birinchi buyurtma", code: "XONTAOM10", active: false }
];

export const reviewsSeed: Review[] = [
  { id: "review-1", restaurantId: "chortoq", customerName: "Zilola", rating: 5, comment: "Osh issiq va mazali yetib keldi.", visible: true },
  { id: "review-2", restaurantId: "soy", customerName: "Akmal", rating: 3, comment: "Yetkazish biroz kechikdi.", visible: true }
];
