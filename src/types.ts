export type OrderStatus =
  | "Yangi buyurtma"
  | "Restoran tasdig‘i kutilmoqda"
  | "Qabul qilindi"
  | "Tayyorlanmoqda"
  | "Yetkazishga chiqdi"
  | "Yetkazildi"
  | "Rad etildi"
  | "Bekor qilindi";

export type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  extras?: MenuExtra[];
  variants?: MenuVariant[];
  prepMinutes?: number;
  stock?: number;
  discountPercent?: number;
};

export type MenuExtra = { id: string; name: string; price: number };
export type MenuVariant = { id: string; name: string; priceDelta: number };

export type StaffRole = "Egasi" | "Administrator" | "Operator" | "Oshpaz";
export type StaffMember = {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  role: StaffRole;
  active: boolean;
};

export type RestaurantApplicationStatus = "Kutilmoqda" | "Tasdiqlandi" | "Rad etildi";
export type RestaurantApplication = {
  id: string;
  ownerName: string;
  restaurantName: string;
  phone: string;
  address: string;
  hours: string;
  cuisine: string;
  logo: string;
  image: string;
  documentImage: string;
  deliveryFee: number;
  minOrder: number;
  status: RestaurantApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  restaurantId?: string;
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviews: number;
  image: string;
  phone: string;
  address: string;
  hours: string;
  isOpen: boolean;
  isBlocked?: boolean;
  minOrder: number;
  deliveryFee: number;
  eta: string;
  commission: number;
  categories?: string[];
  menu: MenuItem[];
};

export type CartItem = MenuItem & {
  lineId: string;
  quantity: number;
  note?: string;
  selectedExtras: MenuExtra[];
  selectedVariant?: MenuVariant;
};

export type Order = {
  id: string;
  serverId?: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  phone: string;
  address: string;
  note?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  payment: "Naqd" | "Yetkazilganda karta orqali";
  status: OrderStatus;
  rejectionReason?: string;
  createdAt: string;
  confirmationDeadline: string;
  prepMinutes?: number;
  acceptedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  courierPhone?: string;
};

export type Campaign = {
  id: string;
  type: "Banner" | "Chegirma" | "Promo-kod";
  title: string;
  code?: string;
  active: boolean;
  restaurantId?: string;
  discountPercent?: number;
};

export type Review = {
  id: string;
  restaurantId: string;
  customerName: string;
  rating: number;
  comment: string;
  visible: boolean;
  reply?: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};
