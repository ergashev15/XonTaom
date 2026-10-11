import * as Crypto from "expo-crypto";
import { File, Paths } from "expo-file-system";
import React, { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { addFavorite, createReview, fetchFavorites, fetchReviews, removeFavorite } from "@/api/account-api";
import { catalogApiEnvironment, fetchAdminCatalog, fetchCatalog, fetchOrders, fetchOwnedRestaurant } from "@/api/catalog-api";
import { cancelServerOrder, createServerOrder } from "@/api/order-api";
import { createOwnedCategory, createOwnedMenuItem, deleteOwnedCategory, deleteOwnedMenuItem, updateOwnedMenuAvailability, updateOwnedMenuItem, updateOwnedOrder, updateOwnedRestaurantHours, updateOwnedRestaurantOpen, updateRestaurantBlocked } from "@/api/owner-api";
import { createApplication, createCampaign, createStaffMember, fetchApplications, fetchCampaigns, fetchStaff, moderateMenuItem, moderateRestaurant, replyToReview as replyToServerReview, reviewApplication, setCampaignActive, setReviewVisible, setStaffActive } from "@/api/partner-api";
import { useAuth } from "@/auth/auth-context";
import { campaignsSeed, ordersSeed, restaurantsSeed, reviewsSeed } from "@/data/seed";
import { AppNotification, Campaign, CartItem, MenuExtra, MenuItem, MenuVariant, Order, OrderStatus, Restaurant, RestaurantApplication, Review, StaffMember } from "@/types";
import { calculateTotals, canAddFromRestaurant } from "@/utils/order-rules";

type CheckoutInput = { name: string; phone: string; address: string; note: string; payment: Order["payment"] };
export type NewMenuItemInput = Omit<MenuItem, "id" | "available">;
// With a configured backend the server is the only source of truth for orders;
// the built-in demo data is used only when no backend is configured.
const serverMode = catalogApiEnvironment.isConfigured;

type CatalogStatus = { loading: boolean; syncing: boolean; source: "local" | "server"; error?: string; lastSyncedAt?: string };

type Store = {
  restaurants: Restaurant[];
  orders: Order[];
  // Orders placed by the signed-in customer (orders also holds restaurant and admin views).
  myOrders: Order[];
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
  cancelOrder: (id: string) => Promise<void>;
  setPrepMinutes: (id: string, minutes: number) => void;
  reorder: (id: string) => boolean;
  toggleRestaurant: (id: string) => void;
  toggleBlocked: (id: string) => void;
  reviewRestaurant: (id: string, approve: boolean, rejectionReason?: string) => void;
  reviewMenuItem: (restaurantId: string, itemId: string, approve: boolean, rejectionReason?: string) => void;
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
  submitRestaurantApplication: (application: Omit<RestaurantApplication, "id" | "status" | "createdAt">) => Promise<RestaurantApplication>;
  approveRestaurantApplication: (id: string) => Promise<string | undefined>;
  rejectRestaurantApplication: (id: string, reason: string) => Promise<void>;
  submitReview: (orderId: string, rating: number, comment: string) => Promise<void>;
  replyToReview: (id: string, reply: string) => void;
  toggleCampaign: (id: string) => void;
  toggleReview: (id: string) => void;
  sendNotification: (title: string, body: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  const role = session?.user.app_metadata?.role;
  const [restaurants, setRestaurants] = useState(restaurantsSeed);
  const [orders, setOrders] = useState<Order[]>(serverMode ? [] : ordersSeed);
  // Account that the orders, cart and notifications in memory belong to.
  // undefined until it is known (nothing restored from disk yet).
  const stateOwner = useRef<string | null | undefined>(undefined);
  const checkoutRequestId = useRef<string | undefined>(undefined);
  const [favorites, setFavorites] = useState<string[]>(serverMode ? [] : ["chortoq"]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string>();
  const [campaigns, setCampaigns] = useState<Campaign[]>(serverMode ? [] : campaignsSeed);
  const [reviews, setReviews] = useState<Review[]>(serverMode ? [] : reviewsSeed);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>(serverMode ? [] : [
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
      const accessToken = session?.access_token;
      const remote = accessToken && role === "admin" ? await fetchAdminCatalog(accessToken) : await fetchCatalog();
      const ownerRestaurantId = session?.user.app_metadata?.restaurant_id;
      const owned = ownerRestaurantId && accessToken ? await fetchOwnedRestaurant(ownerRestaurantId, accessToken) : null;
      const merged = owned ? [owned, ...remote.filter((restaurant) => restaurant.id !== owned.id)] : remote;
      if (accessToken && userId) {
        const [received, placed] = await Promise.all([
          role === "admin" ? fetchOrders("all", accessToken) : owned ? fetchOrders({ restaurantId: owned.id }, accessToken) : Promise.resolve([]),
          fetchOrders({ customerId: userId }, accessToken)
        ]);
        const seen = new Set<string>();
        const serverOrders = [...received, ...placed]
          .filter((order) => !seen.has(order.serverId!) && Boolean(seen.add(order.serverId!)))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        // Keep fields that only exist on this device (the full cart lines and prep time).
        setOrders((current) => serverOrders.map((order) => {
          const local = current.find((entry) => entry.serverId === order.serverId);
          return local ? { ...order, prepMinutes: local.prepMinutes, outForDeliveryAt: local.outForDeliveryAt } : order;
        }));
      }
      // A newly created server can legitimately have no approved restaurants yet.
      // Keep the built-in catalog visible instead of replacing it with an empty view;
      // placeOrder refuses to submit against it.
      if (merged.length) {
        setRestaurants(merged);
        setCatalogStatus({ loading: false, syncing: false, source: "server", lastSyncedAt: new Date().toISOString() });
      } else {
        setCatalogStatus({ loading: false, syncing: false, source: "local", lastSyncedAt: new Date().toISOString() });
      }
    } catch (error) {
      setCatalogStatus((current) => ({ ...current, loading: false, syncing: false, error: error instanceof Error ? error.message : "Katalog yangilanmadi." }));
    }
  }, [session?.access_token, session?.user.app_metadata?.restaurant_id, userId, role]);

  // Favorites, reviews, campaigns, staff and applications change rarely, so they
  // are loaded on sign-in, when the app returns to the foreground and after the
  // user changes them, not on every catalog poll. Each one fails independently.
  const refreshAccountData = useCallback(async () => {
    if (!serverMode) return;
    const accessToken = session?.access_token;
    const load = <T,>(request: Promise<T>, apply: (value: T) => void) => request.then(apply).catch(() => undefined);
    await Promise.all([
      load(fetchReviews(accessToken), setReviews),
      load(fetchCampaigns(accessToken), setCampaigns),
      ...(accessToken ? [
        load(fetchFavorites(accessToken), setFavorites),
        load(fetchApplications(accessToken), setRestaurantApplications),
        load(fetchStaff(accessToken), setStaff)
      ] : [])
    ]);
  }, [session?.access_token]);

  useEffect(() => {
    if (!serverMode) return;
    void refreshAccountData();
    const subscription = AppState.addEventListener("change", (next) => { if (next === "active") void refreshAccountData(); });
    return () => subscription.remove();
  }, [refreshAccountData]);

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
        const saved = JSON.parse(await file.text()) as Partial<{ userId: string | null; restaurants: Restaurant[]; orders: Order[]; campaigns: Campaign[]; reviews: Review[]; notifications: AppNotification[]; staff: StaffMember[]; restaurantApplications: RestaurantApplication[] }>;
        stateOwner.current = saved.userId ?? null;
        if (saved.restaurants?.length) setRestaurants(saved.restaurants);
        if (saved.orders?.length) setOrders(saved.orders);
        if (saved.notifications) setNotifications(saved.notifications);
        // With a backend these come from the server; a stale local copy must not override it.
        if (!serverMode) {
          if (saved.campaigns) setCampaigns(saved.campaigns);
          if (saved.reviews) setReviews(saved.reviews);
          if (saved.staff) setStaff(saved.staff);
          if (saved.restaurantApplications) setRestaurantApplications(saved.restaurantApplications);
        }
      } catch {
        // Corrupt local data must not prevent the app from opening; seeds remain available.
      } finally {
        setHydrated(true);
      }
    };
    void restore();
  }, []);

  // Orders, the cart and notifications are personal. Drop them when a different
  // account (or nobody) is signed in than the one they were loaded for.
  useEffect(() => {
    if (!ready || !hydrated) return;
    if (stateOwner.current !== undefined && stateOwner.current !== userId) {
      setOrders(serverMode ? [] : ordersSeed);
      setNotifications([]);
      setCart([]);
      setCartRestaurantId(undefined);
      if (serverMode) {
        setFavorites([]);
        setStaff([]);
        setRestaurantApplications([]);
        // Anything already loaded for the new account was just cleared with the rest.
        void refreshAccountData();
        void refreshCatalog();
      }
    }
    stateOwner.current = userId;
  }, [ready, hydrated, userId, refreshAccountData, refreshCatalog]);

  // A changed cart is a new checkout, not a retry of the previous one.
  useEffect(() => { checkoutRequestId.current = undefined; }, [cart]);

  useEffect(() => {
    if (!ready || !hydrated || process.env.EXPO_OS === "web") return;
    try {
      const file = new File(Paths.document, "xontaom-panel-state.json");
      file.create({ overwrite: true, intermediates: true });
      file.write(JSON.stringify({ userId, restaurants, orders, campaigns, reviews, notifications, staff, restaurantApplications }));
    } catch {
      // Keep the live session working even if device storage is temporarily unavailable.
    }
  }, [ready, hydrated, userId, restaurants, orders, campaigns, reviews, notifications, staff, restaurantApplications]);

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

  const syncOwnerChange = (operation: () => Promise<unknown>) => {
    void Promise.resolve().then(operation).then(() => refreshCatalog()).catch((error) => {
      setCatalogStatus((current) => ({ ...current, error: error instanceof Error ? error.message : "O‘zgarish serverga saqlanmadi." }));
      void refreshCatalog();
    });
  };

  // Applies a change on the server after it was shown optimistically, then
  // reloads the server state so a rejected change is rolled back on screen.
  const syncAccountChange = (operation: () => Promise<unknown>) => {
    void Promise.resolve().then(operation).catch((error) => {
      setCatalogStatus((current) => ({ ...current, error: error instanceof Error ? error.message : "O‘zgarish serverga saqlanmadi." }));
    }).finally(() => void refreshAccountData());
  };

  const placeOrder = async (input: CheckoutInput) => {
    const restaurant = restaurants.find((entry) => entry.id === cartRestaurantId);
    if (!restaurant || !cart.length || !restaurant.isOpen || restaurant.isBlocked) return undefined;
    const totals = calculateTotals(cart, restaurant.deliveryFee);
    // With a backend configured an order only exists once the server accepted it.
    // Never fall back to a local order the restaurant would not receive.
    if (serverMode && !session?.access_token) throw new Error("Buyurtma berish uchun hisobga kiring.");
    if (serverMode && catalogStatus.source !== "server") throw new Error("Server bilan aloqa yo‘q. Internetni tekshirib, qayta urinib ko‘ring.");
    checkoutRequestId.current ??= Crypto.randomUUID();
    const created = serverMode ? await createServerOrder({
      requestId: checkoutRequestId.current,
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
      id: created ? `XT-${created.order_number}` : `XT-${Date.now()}`,
      serverId: created?.id,
      customerId: userId ?? undefined,
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
    myOrders: serverMode ? orders.filter((order) => order.customerId === userId) : orders,
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
    toggleFavorite: (id) => {
      const favorite = favorites.includes(id);
      setFavorites((current) => favorite ? current.filter((entry) => entry !== id) : [...current, id]);
      if (serverMode && session?.access_token) syncAccountChange(() => favorite ? removeFavorite(id, session.user.id, session.access_token) : addFavorite(id, session.user.id, session.access_token));
    },
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
      if (selected?.serverId && session?.access_token) syncOwnerChange(() => updateOwnedOrder(selected.serverId!, status, rejectionReason, session.access_token));
    },
    cancelOrder: async (id) => {
      const selected = orders.find((order) => order.id === id);
      if (!selected) return;
      if (selected.serverId) {
        if (!session?.access_token) throw new Error("Buyurtmani bekor qilish uchun hisobga kiring.");
        await cancelServerOrder(selected.serverId, session.access_token);
      }
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status: "Bekor qilindi" } : order));
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
    toggleRestaurant: (id) => {
      const restaurant = restaurants.find((entry) => entry.id === id);
      if (!restaurant) return;
      setRestaurants((current) => current.map((entry) => entry.id === id ? { ...entry, isOpen: !entry.isOpen } : entry));
      if (session?.access_token) syncOwnerChange(() => updateOwnedRestaurantOpen(id, !restaurant.isOpen, session.access_token));
    },
    toggleBlocked: (id) => {
      const restaurant = restaurants.find((entry) => entry.id === id);
      if (!restaurant) return;
      setRestaurants((current) => current.map((entry) => entry.id === id ? { ...entry, isBlocked: !entry.isBlocked } : entry));
      if (serverMode && session?.access_token) syncOwnerChange(() => updateRestaurantBlocked(id, !restaurant.isBlocked, session.access_token));
    },
    reviewRestaurant: (id, approve, rejectionReason) => {
      setRestaurants((current) => current.map((entry) => entry.id === id ? { ...entry, approvalStatus: approve ? "approved" : "rejected", rejectionReason: approve ? undefined : rejectionReason } : entry));
      if (serverMode && session?.access_token) syncOwnerChange(() => moderateRestaurant(id, approve, rejectionReason, session.access_token));
    },
    reviewMenuItem: (restaurantId, itemId, approve, rejectionReason) => {
      setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, menu: restaurant.menu.map((entry) => entry.id === itemId ? { ...entry, approvalStatus: approve ? "approved" : "rejected", rejectionReason: approve ? undefined : rejectionReason } : entry) } : restaurant));
      if (serverMode && session?.access_token) syncOwnerChange(() => moderateMenuItem(itemId, approve, rejectionReason, session.access_token));
    },
    toggleMenuItem: (restaurantId, itemId) => {
      const item = restaurants.find((entry) => entry.id === restaurantId)?.menu.find((entry) => entry.id === itemId);
      setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, menu: restaurant.menu.map((entry) => entry.id === itemId ? { ...entry, available: !entry.available } : entry) } : restaurant));
      if (item && session?.access_token) syncOwnerChange(() => updateOwnedMenuAvailability(itemId, !item.available, session.access_token));
    },
    addMenuItem: (restaurantId, item) => {
      setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, menu: [...restaurant.menu, { ...item, id: `${restaurantId}-${Date.now()}`, available: (item.stock ?? 1) > 0 }] } : restaurant));
      if (session?.access_token) syncOwnerChange(() => createOwnedMenuItem(restaurantId, item, session.user.id, session.access_token));
    },
    updateMenuItem: (restaurantId, itemId, item) => {
      setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, menu: restaurant.menu.map((entry) => entry.id === itemId ? { ...entry, ...item, available: (item.stock ?? 1) > 0 ? entry.available : false } : entry) } : restaurant));
      if (session?.access_token) syncOwnerChange(() => updateOwnedMenuItem(restaurantId, itemId, item, session.user.id, session.access_token));
    },
    deleteMenuItem: (restaurantId, itemId) => {
      setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, menu: restaurant.menu.filter((entry) => entry.id !== itemId) } : restaurant));
      if (session?.access_token) syncOwnerChange(() => deleteOwnedMenuItem(itemId, session.access_token));
    },
    updateRestaurantHours: (restaurantId, hours) => {
      setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, hours } : restaurant));
      if (session?.access_token) syncOwnerChange(() => updateOwnedRestaurantHours(restaurantId, hours, session.access_token));
    },
    addRestaurantCategory: (restaurantId, category) => {
      const clean = category.trim();
      const sortOrder = restaurants.find((entry) => entry.id === restaurantId)?.categories?.length ?? 0;
      setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, categories: [...new Set([...(restaurant.categories ?? []), clean])] } : restaurant));
      if (session?.access_token) syncOwnerChange(() => createOwnedCategory(restaurantId, clean, sortOrder, session.access_token));
    },
    deleteRestaurantCategory: (restaurantId, category) => {
      setRestaurants((current) => current.map((restaurant) => restaurant.id === restaurantId ? { ...restaurant, categories: (restaurant.categories ?? []).filter((entry) => entry !== category) } : restaurant));
      if (session?.access_token) syncOwnerChange(() => deleteOwnedCategory(restaurantId, category, session.access_token));
    },
    addCampaign: (campaign) => {
      setCampaigns((current) => [{ ...campaign, id: `campaign-${Date.now()}`, active: true }, ...current]);
      if (serverMode && session?.access_token) syncAccountChange(() => createCampaign(campaign, session.access_token));
    },
    addStaffMember: (member) => {
      setStaff((current) => [{ ...member, id: `staff-${Date.now()}`, active: true }, ...current]);
      if (serverMode && session?.access_token) syncAccountChange(() => createStaffMember(member, session.access_token));
    },
    toggleStaffMember: (id) => {
      const member = staff.find((entry) => entry.id === id);
      if (!member) return;
      setStaff((current) => current.map((entry) => entry.id === id ? { ...entry, active: !entry.active } : entry));
      if (serverMode && session?.access_token) syncAccountChange(() => setStaffActive(id, !member.active, session.access_token));
    },
    submitRestaurantApplication: async (application) => {
      if (serverMode) {
        if (!session?.access_token) throw new Error("Ariza yuborish uchun avval hisobga kiring.");
        const created = await createApplication(application, session.user.id, session.access_token);
        setRestaurantApplications((current) => [created, ...current.filter((entry) => entry.id !== created.id)]);
        return created;
      }
      const created: RestaurantApplication = { ...application, id: `application-${Date.now()}`, status: "Kutilmoqda", createdAt: new Date().toISOString() };
      setRestaurantApplications((current) => [created, ...current]);
      return created;
    },
    approveRestaurantApplication: async (id) => {
      const application = restaurantApplications.find((entry) => entry.id === id);
      if (!application || application.status !== "Kutilmoqda") return application?.restaurantId;
      if (serverMode) {
        if (!session?.access_token) throw new Error("Arizani tasdiqlash uchun hisobga kiring.");
        // The server creates the restaurant and links it to the applicant's account.
        const createdId = await reviewApplication(id, true, undefined, session.access_token) ?? undefined;
        setRestaurantApplications((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Tasdiqlandi", reviewedAt: new Date().toISOString(), restaurantId: createdId } : entry));
        void refreshAccountData();
        void refreshCatalog();
        return createdId;
      }
      const baseId = application.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "restaurant";
      const restaurantId = `${baseId}-${Date.now()}`;
      const restaurant: Restaurant = { id: restaurantId, name: application.restaurantName, cuisine: application.cuisine, rating: 5, reviews: 0, image: application.image || application.logo, phone: application.phone, address: application.address, hours: application.hours, isOpen: false, minOrder: application.minOrder, deliveryFee: application.deliveryFee, eta: "30–45 daqiqa", commission: 12, categories: [], menu: [] };
      setRestaurants((current) => [restaurant, ...current]);
      setStaff((current) => [{ id: `owner-${Date.now()}`, restaurantId, name: application.ownerName, phone: application.phone, role: "Egasi", active: true }, ...current]);
      setRestaurantApplications((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Tasdiqlandi", reviewedAt: new Date().toISOString(), restaurantId } : entry));
      return restaurantId;
    },
    rejectRestaurantApplication: async (id, rejectionReason) => {
      const reason = rejectionReason.trim() || "Ma’lumotlar yetarli emas";
      if (serverMode) {
        if (!session?.access_token) throw new Error("Arizani rad etish uchun hisobga kiring.");
        await reviewApplication(id, false, reason, session.access_token);
      }
      setRestaurantApplications((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Rad etildi", reviewedAt: new Date().toISOString(), rejectionReason: reason } : entry));
    },
    submitReview: async (orderId, rating, comment) => {
      const order = orders.find((entry) => entry.id === orderId);
      if (!order) return;
      if (serverMode) {
        if (!order.serverId || !session?.access_token) throw new Error("Baholash uchun hisobga kiring.");
        await createReview({ orderId: order.serverId, restaurantId: order.restaurantId, rating, comment }, session.user.id, session.access_token);
        await refreshAccountData();
        void refreshCatalog();
        return;
      }
      setReviews((current) => [{ id: `review-${Date.now()}`, orderId: order.id, restaurantId: order.restaurantId, customerName: order.customerName, rating, comment: comment.trim(), visible: true }, ...current]);
    },
    replyToReview: (id, reply) => {
      setReviews((current) => current.map((review) => review.id === id ? { ...review, reply: reply.trim() } : review));
      if (serverMode && session?.access_token) syncAccountChange(() => replyToServerReview(id, reply.trim(), session.access_token));
    },
    toggleCampaign: (id) => {
      const campaign = campaigns.find((entry) => entry.id === id);
      if (!campaign) return;
      setCampaigns((current) => current.map((item) => item.id === id ? { ...item, active: !item.active } : item));
      if (serverMode && session?.access_token) syncAccountChange(() => setCampaignActive(id, !campaign.active, session.access_token));
    },
    toggleReview: (id) => {
      const review = reviews.find((entry) => entry.id === id);
      if (!review) return;
      setReviews((current) => current.map((item) => item.id === id ? { ...item, visible: !item.visible } : item));
      if (serverMode && session?.access_token) syncAccountChange(() => setReviewVisible(id, !review.visible, session.access_token));
    },
    sendNotification: (title, body) => setNotifications((current) => [{ id: `notice-${Date.now()}`, title, body, createdAt: new Date().toISOString() }, ...current])
  }), [restaurants, orders, favorites, cart, cartRestaurantId, campaigns, reviews, notifications, staff, restaurantApplications, catalogStatus, refreshCatalog, refreshAccountData, session?.access_token, userId]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const value = use(StoreContext);
  if (!value) throw new Error("useAppStore must be used inside AppStoreProvider");
  return value;
}
