import { File, Paths } from "expo-file-system";
import React, { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { catalogApiEnvironment, fetchCatalog } from "@/api/catalog-api";
import { createServerOrder } from "@/api/order-api";
import { useAuth } from "@/auth/auth-context";
import { campaignsSeed, ordersSeed, restaurantsSeed, reviewsSeed } from "@/data/seed";
import { AppNotification, Campaign, CartItem, MenuExtra, MenuItem, MenuVariant, Order, OrderStatus, Restaurant, RestaurantApplication, Review, StaffMember } from "@/types";
import { calculateTotals, canAddFromRestaurant } from "@/utils/order-rules";

type CheckoutInput = { name: string; phone: string; address: string; note: string; payment: Order["payment"] };
export type NewMenuItemInput = Omit<MenuItem, "id" | "available">;
type CatalogStatus = { loading: boolean; syncing: boolean; source: "local" | "server"; error?: string; lastSyncedAt?: string };

type Store = {
  restaurants: Restaurant[];
  orders: Order[];
  favorites: string[];
  cart: CartItem[];
  cartRestaurant?: Restaurant;
  campaigns: Campaign[];
  reviews: Review[];
  notifications: AppNotification[];
  staff: StaffMember[];
  restaurantApplications: RestaurantApplication[];
  catalogStatus: CatalogStatus;
  refreshCatalog: () => Promise<void>;
  addToCart: (restaurantId: string, item: MenuItem, quantity?: number, note?: string, selectedExtras?: MenuExtra[], selectedVariant?: MenuVariant) => boolean;
  setCartQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  toggleFavorite: (id: string) => void;
  placeOrder: (input: CheckoutInput) => Promise<Order | undefined>;
  updateOrder: (id: string, status: OrderStatus, rejectionReason?: string) => void;
  setPrepMinutes: (id: string, minutes: number) => void;
  reorder: (id: string) => boolean;
  toggleRestaurant: (id: string) => void;
  toggleBlocked: (id: string) => void;
  toggleMenuItem: (restaurantId: string, itemId: string) => void;
  addMenuItem: (restaurantId: string, item: NewMenuItemInput) => void;
  updateMenuItem: (restaurantId: string, itemId: string, item: NewMenuItemInput) => void;
  deleteMenuItem: (restaurantId: string, itemId: string) => void;
  updateRestaurantHours: (restaurantId: string, hours: string) => void;
  addRestaurantCategory: (restaurantId: string, category: string) => void;
  deleteRestaurantCategory: (restaurantId: string, category: string) => void;
  addCampaign: (campaign: Omit<Campaign, "id" | "active">) => void;
  addStaffMember: (member: Omit<StaffMember, "id" | "active">) => void;
  toggleStaffMember: (id: string) => void;
  submitRestaurantApplication: (application: Omit<RestaurantApplication, "id" | "status" | "createdAt">) => RestaurantApplication;
  approveRestaurantApplication: (id: string) => string | undefined;
  rejectRestaurantApplication: (id: string, reason: string) => void;
  replyToReview: (id: string, reply: string) => void;
  toggleCampaign: (id: string) => void;
  toggleReview: (id: string) => void;
  sendNotification: (title: string, body: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [restaurants, setRestaurants] = useState(restaurantsSeed);
  const [orders, setOrders] = useState(ordersSeed);
  const [favorites, setFavorites] = useState<string[]>(["chortoq"]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string>();
  const [campaigns, setCampaigns] = useState(campaignsSeed);
  const [reviews, setReviews] = useState(reviewsSeed);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([
    { id: "staff-owner", restaurantId: "chortoq", name: "Restoran egasi", phone: "+998 90 123 45 67", role: "Egasi", active: true },
    { id: "staff-cook", restaurantId: "chortoq", name: "Bosh oshpaz", phone: "+998 93 222 11 00", role: "Oshpaz", active: true }
  ]);
  const [restaurantApplications, setRestaurantApplications] = useState<RestaurantApplication[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>({ loading: catalogApiEnvironment.isConfigured, syncing: false, source: "local" });

  const refreshCatalog = useCallback(async () => {
    if (!catalogApiEnvironment.isConfigured) return;
    setCatalogStatus((current) => ({ ...current, syncing: true, error: undefined }));
    try {
      const remote = await fetchCatalog();
      // A newly created server can legitimately have no approved restaurants yet.
      // Keep the built-in catalog usable instead of replacing it with an empty view.
      if (remote.length) {
        setRestaurants(remote);
        setCatalogStatus({ loading: false, syncing: false, source: "server", lastSyncedAt: new Date().toISOString() });
      } else {
        setCatalogStatus({ loading: false, syncing: false, source: "local", lastSyncedAt: new Date().toISOString() });
      }
    } catch (error) {
      setCatalogStatus((current) => ({ ...current, loading: false, syncing: false, error: error instanceof Error ? error.message : "Katalog yangilanmadi." }));
    }
  }, []);

  useEffect(() => {
    if (!catalogApiEnvironment.isConfigured) return;
    void refreshCatalog();
    const timer = setInterval(() => void refreshCatalog(), 30000);
    const subscription = AppState.addEventListener("change", (next) => { if (next === "active") void refreshCatalog(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [refreshCatalog]);

  useEffect(() => {
    if (process.env.EXPO_OS === "web") { setHydrated(true); return; }
    const restore = async () => {
      try {
        const file = new File(Paths.document, "xontaom-panel-state.json");
        if (!file.exists) return;
        const saved = JSON.parse(await file.text()) as Partial<{ restaurants: Restaurant[]; orders: Order[]; campaigns: Campaign[]; reviews: Review[]; notifications: AppNotification[]; staff: StaffMember[]; restaurantApplications: RestaurantApplication[] }>;
        if (saved.restaurants?.length) setRestaurants(saved.restaurants);
        if (saved.orders?.length) setOrders(saved.orders);
        if (saved.campaigns) setCampaigns(saved.campaigns);
        if (saved.reviews) setReviews(saved.reviews);
        if (saved.notifications) setNotifications(saved.notifications);
        if (saved.staff) setStaff(saved.staff);
        if (saved.restaurantApplications) setRestaurantApplications(saved.restaurantApplications);
      } catch {
        // Corrupt local data must not prevent the app from opening; seeds remain available.
      } finally {
        setHydrated(true);
      }
    };
    void restore();
  }, []);

  useEffect(() => {
    if (!hydrated || process.env.EXPO_OS === "web") return;
    try {
      const file = new File(Paths.document, "xontaom-panel-state.json");
      file.create({ overwrite: true, intermediates: true });
      file.write(JSON.stringify({ restaurants, orders, campaigns, reviews, notifications, staff, restaurantApplications }));
    } catch {
      // Keep the live session working even if device storage is temporarily unavailable.
    }
  }, [hydrated, restaurants, orders, campaigns, reviews, notifications, staff, restaurantApplications]);

  const addToCart: Store["addToCart"] = (restaurantId, item, quantity = 1, note, selectedExtras = [], selectedVariant) => {
    if (!canAddFromRestaurant(cartRestaurantId, restaurantId, cart.length)) return false;
    setCartRestaurantId(restaurantId);
    setCart((current) => {
      const extrasKey = selectedExtras.map((entry) => entry.id).sort().join("-");
      const lineId = `${item.id}:${selectedVariant?.id ?? "default"}:${extrasKey}:${note?.trim() ?? ""}`;
      const found = current.find((entry) => entry.lineId === lineId);
      if (found) return current.map((entry) => entry.lineId === lineId ? { ...entry, quantity: entry.quantity + quantity } : entry);
      return [...current, { ...item, lineId, quantity, note: note?.trim() || undefined, selectedExtras, selectedVariant }];
    });
    return true;
  };

  const setCartQuantity = (lineId: string, quantity: number) => {
    setCart((current) => current.map((item) => item.lineId === lineId ? { ...item, quantity } : item).filter((item) => item.quantity > 0));
  };

  const clearCart = () => { setCart([]); setCartRestaurantId(undefined); };

  const placeOrder = async (input: CheckoutInput) => {
    const restaurant = restaurants.find((entry) => entry.id === cartRestaurantId);
    if (!restaurant || !cart.length || !restaurant.isOpen || restaurant.isBlocked) return undefined;
    const totals = calculateTotals(cart, restaurant.deliveryFee);
    // Customer checkout is available without an account. Only submit to the
    // authenticated server endpoint when a session is actually available.
    const created = catalogStatus.source === "server" && session?.access_token ? await createServerOrder({
      accessToken: session!.access_token,
      restaurantId: restaurant.id,
      payment: input.payment,
      name: input.name,
      phone: input.phone,
      address: input.address,
      note: input.note,
      items: cart
    }) : null;
    const order: Order = {
      id: created ? `XT-${created.order_number}` : `XT-${1050 + orders.length}`,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      customerName: input.name,
      phone: input.phone,
      address: input.address,
      note: input.note,
      items: cart.map((item) => ({ ...item })),
      ...totals,
      payment: input.payment,
      status: "Restoran tasdig‘i kutilmoqda",
      createdAt: created?.created_at ?? new Date().toISOString(),
      confirmationDeadline: new Date(Date.now() + 5 * 60000).toISOString(),
      courierPhone: restaurant.phone
    };
    setOrders((current) => [order, ...current]);
    setRestaurants((current) => current.map((entry) => entry.id !== restaurant.id ? entry : { ...entry, menu: entry.menu.map((menuItem) => {
      const ordered = cart.find((cartItem) => cartItem.id === menuItem.id);
      if (!ordered || menuItem.stock === undefined) return menuItem;
      const stock = Math.max(0, menuItem.stock - ordered.quantity);
      return { ...menuItem, stock, available: stock > 0 };
    }) }));
    clearCart();
    return order;
  };

  const value = useMemo<Store>(() => ({
    restaurants,
    orders,
    favorites,
    cart,
    campaigns,
    reviews,
    notifications,
    staff,
    restaurantApplications,
    catalogStatus,
    refreshCatalog,
    cartRestaurant: restaurants.find((entry) => entry.id === cartRestaurantId),
    addToCart,
    setCartQuantity,
    clearCart,
    toggleFavorite: (id) => setFavorites((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]),
    placeOrder,
    updateOrder: (id, status, rejectionReason) => {
      const now = new Date().toISOString();
      const selected = orders.find((order) => order.id === id);
      setOrders((current) => current.map((order) => order.id === id ? {
        ...order,
        status,
        rejectionReason,
        acceptedAt: status === "Qabul qilindi" ? now : order.acceptedAt,
        outForDeliveryAt: status === "Yetkazishga chiqdi" ? now : order.outForDeliveryAt,
        deliveredAt: status === "Yetkazildi" ? now : order.deliveredAt
      } : order));
      if (status === "Yetkazishga chiqdi" && selected) setNotifications((current) => [{ id: `${id}-${Date.now()}`, title: "Buyurtma yo‘lda", body: `${selected.restaurantName} buyurtmangizni yetkazishga chiqardi.`, createdAt: now }, ...current]);
    },
    setPrepMinutes: (id, minutes) => setOrders((current) => current.map((order) => order.id === id ? { ...order, prepMinutes: minutes } : order)),
    reorder: (id) => {
      const order = orders.find((entry) => entry.id === id);
      const restaurant = restaurants.find((entry) => entry.id === order?.restaurantId);
      if (!order || !restaurant || !restaurant.isOpen || restaurant.isBlocked) return false;
      const available = order.items.filter((item) => restaurant.menu.some((menuItem) => menuItem.id === item.id && menuItem.available));
      if (!available.length) return false;
      setCart(available.map((item, index) => ({ ...item, lineId: `${item.lineId}:repeat:${Date.now()}:${index}` })));
      setCartRestaurantId(restaurant.id);
      return true;
    },
    toggleRestaurant: (id) => setRestaurants((current) => current.map((restaurant) => restaurant.id === id ? { ...restaurant, isOpen: !restaurant.isOpen } : restaurant)),
    toggleBlocked: (id) => setRestaurants((current) => current.map((restaurant) => restaurant.id === id ? { ...restaurant, isBlocked: !restaurant.isBlocked } : restaurant)),
    toggleMenuItem: (restaurantId, itemId) => setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, menu: restaurant.menu.map((item) => item.id === itemId ? { ...item, available: !item.available } : item) } : restaurant)),
    addMenuItem: (restaurantId, item) => setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, menu: [...restaurant.menu, { ...item, id: `${restaurantId}-${Date.now()}`, available: (item.stock ?? 1) > 0 }] } : restaurant)),
    updateMenuItem: (restaurantId, itemId, item) => setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, menu: restaurant.menu.map((entry) => entry.id === itemId ? { ...entry, ...item, available: (item.stock ?? 1) > 0 ? entry.available : false } : entry) } : restaurant)),
    deleteMenuItem: (restaurantId, itemId) => setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, menu: restaurant.menu.filter((entry) => entry.id !== itemId) } : restaurant)),
    updateRestaurantHours: (restaurantId, hours) => setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, hours } : restaurant)),
    addRestaurantCategory: (restaurantId, category) => setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, categories: [...new Set([...(restaurant.categories ?? []), category.trim()])] } : restaurant)),
    deleteRestaurantCategory: (restaurantId, category) => setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, categories: (restaurant.categories ?? []).filter((entry) => entry !== category) } : restaurant)),
    addCampaign: (campaign) => setCampaigns((current) => [{ ...campaign, id: `campaign-${Date.now()}`, active: true }, ...current]),
    addStaffMember: (member) => setStaff((current) => [{ ...member, id: `staff-${Date.now()}`, active: true }, ...current]),
    toggleStaffMember: (id) => setStaff((current) => current.map((member) => member.id === id ? { ...member, active: !member.active } : member)),
    submitRestaurantApplication: (application) => {
      const created: RestaurantApplication = { ...application, id: `application-${Date.now()}`, status: "Kutilmoqda", createdAt: new Date().toISOString() };
      setRestaurantApplications((current) => [created, ...current]);
      return created;
    },
    approveRestaurantApplication: (id) => {
      const application = restaurantApplications.find((entry) => entry.id === id);
      if (!application || application.status !== "Kutilmoqda") return application?.restaurantId;
      const baseId = application.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "restaurant";
      const restaurantId = `${baseId}-${Date.now()}`;
      const restaurant: Restaurant = { id: restaurantId, name: application.restaurantName, cuisine: application.cuisine, rating: 5, reviews: 0, image: application.image || application.logo, phone: application.phone, address: application.address, hours: application.hours, isOpen: false, minOrder: application.minOrder, deliveryFee: application.deliveryFee, eta: "30–45 daqiqa", commission: 12, categories: [], menu: [] };
      setRestaurants((current) => [restaurant, ...current]);
      setStaff((current) => [{ id: `owner-${Date.now()}`, restaurantId, name: application.ownerName, phone: application.phone, role: "Egasi", active: true }, ...current]);
      setRestaurantApplications((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Tasdiqlandi", reviewedAt: new Date().toISOString(), restaurantId } : entry));
      return restaurantId;
    },
    rejectRestaurantApplication: (id, rejectionReason) => setRestaurantApplications((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Rad etildi", reviewedAt: new Date().toISOString(), rejectionReason: rejectionReason.trim() || "Ma’lumotlar yetarli emas" } : entry)),
    replyToReview: (id, reply) => setReviews((current) => current.map((review) => review.id === id ? { ...review, reply: reply.trim() } : review)),
    toggleCampaign: (id) => setCampaigns((current) => current.map((item) => item.id === id ? { ...item, active: !item.active } : item)),
    toggleReview: (id) => setReviews((current) => current.map((item) => item.id === id ? { ...item, visible: !item.visible } : item)),
    sendNotification: (title, body) => setNotifications((current) => [{ id: `notice-${Date.now()}`, title, body, createdAt: new Date().toISOString() }, ...current])
  }), [restaurants, orders, favorites, cart, cartRestaurantId, campaigns, reviews, notifications, staff, restaurantApplications, catalogStatus, refreshCatalog]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const value = use(StoreContext);
  if (!value) throw new Error("useAppStore must be used inside AppStoreProvider");
  return value;
}
