import { rest } from "@/api/rest";
import { DOCUMENTS_BUCKET, ensurePublicImage, privateDocumentUrl, uploadImage } from "@/api/storage-api";
import type { Campaign, RestaurantApplication, RestaurantApplicationStatus, StaffMember, StaffRole } from "@/types";

type ApplicationRow = {
  id: string; owner_name: string; restaurant_name: string; phone: string; address: string; hours: string; cuisine: string;
  logo_url: string | null; image_url: string | null; document_path: string; delivery_fee: number; min_order: number;
  status: "pending" | "approved" | "rejected"; rejection_reason: string | null; reviewed_at: string | null;
  restaurant_id: string | null; created_at: string;
};

const applicationStatus: Record<ApplicationRow["status"], RestaurantApplicationStatus> = { pending: "Kutilmoqda", approved: "Tasdiqlandi", rejected: "Rad etildi" };

const mapApplication = (row: ApplicationRow): RestaurantApplication => ({
  id: row.id,
  ownerName: row.owner_name,
  restaurantName: row.restaurant_name,
  phone: row.phone,
  address: row.address,
  hours: row.hours,
  cuisine: row.cuisine,
  logo: row.logo_url ?? "",
  image: row.image_url ?? "",
  documentImage: privateDocumentUrl(row.document_path),
  deliveryFee: Number(row.delivery_fee),
  minOrder: Number(row.min_order),
  status: applicationStatus[row.status],
  createdAt: row.created_at,
  reviewedAt: row.reviewed_at ?? undefined,
  rejectionReason: row.rejection_reason ?? undefined,
  restaurantId: row.restaurant_id ?? undefined
});

// Applicants receive their own applications, administrators receive all of them.
export async function fetchApplications(accessToken: string, signal?: AbortSignal) {
  const rows = await rest<ApplicationRow[]>("restaurant_applications?select=*&order=created_at.desc&limit=200", accessToken, { signal });
  return rows.map(mapApplication);
}

export async function createApplication(input: Omit<RestaurantApplication, "id" | "status" | "createdAt">, userId: string, accessToken: string) {
  // The identity document goes to the private bucket; only its path is stored.
  const [logo, image, documentPath] = await Promise.all([
    ensurePublicImage(input.logo, userId, "logo", accessToken),
    ensurePublicImage(input.image, userId, "restaurant", accessToken),
    uploadImage(DOCUMENTS_BUCKET, input.documentImage, userId, "document", accessToken)
  ]);
  const rows = await rest<ApplicationRow[]>("restaurant_applications?select=*", accessToken, {
    method: "POST",
    prefer: "return=representation",
    body: {
      applicant_id: userId,
      owner_name: input.ownerName,
      restaurant_name: input.restaurantName,
      phone: input.phone,
      address: input.address,
      hours: input.hours,
      cuisine: input.cuisine,
      logo_url: logo || null,
      image_url: image || null,
      document_path: documentPath,
      delivery_fee: input.deliveryFee,
      min_order: input.minOrder
    }
  });
  return mapApplication(rows[0]);
}

// Returns the id of the created restaurant when the application is approved.
export function reviewApplication(id: string, approve: boolean, rejectionReason: string | undefined, accessToken: string) {
  return rest<string | null>("rpc/review_restaurant_application", accessToken, {
    method: "POST",
    body: { p_application_id: id, p_approve: approve, p_rejection_reason: rejectionReason ?? null }
  });
}

type CampaignRow = { id: string; restaurant_id: string | null; type: "banner" | "discount" | "promo"; title: string; code: string | null; discount_percent: number | null; is_active: boolean };

const campaignType: Record<CampaignRow["type"], Campaign["type"]> = { banner: "Banner", discount: "Chegirma", promo: "Promo-kod" };
const campaignTypeRow = Object.fromEntries(Object.entries(campaignType).map(([row, label]) => [label, row])) as Record<Campaign["type"], CampaignRow["type"]>;

export async function fetchCampaigns(accessToken?: string, signal?: AbortSignal): Promise<Campaign[]> {
  const rows = await rest<CampaignRow[]>("campaigns?select=id,restaurant_id,type,title,code,discount_percent,is_active&order=created_at.desc", accessToken, { signal });
  return rows.map((row) => ({
    id: row.id,
    type: campaignType[row.type],
    title: row.title,
    code: row.code ?? undefined,
    active: row.is_active,
    restaurantId: row.restaurant_id ?? undefined,
    discountPercent: row.discount_percent ?? undefined
  }));
}

export function createCampaign(campaign: Omit<Campaign, "id" | "active">, accessToken: string) {
  return rest("campaigns", accessToken, {
    method: "POST",
    prefer: "return=minimal",
    body: { restaurant_id: campaign.restaurantId ?? null, type: campaignTypeRow[campaign.type], title: campaign.title, code: campaign.code ?? null, discount_percent: campaign.discountPercent ?? null }
  });
}

export function setCampaignActive(id: string, active: boolean, accessToken: string) {
  return rest(`campaigns?id=eq.${encodeURIComponent(id)}`, accessToken, { method: "PATCH", prefer: "return=minimal", body: { is_active: active } });
}

type StaffRow = { id: string; restaurant_id: string; name: string; phone: string; role: "owner" | "administrator" | "operator" | "cook"; is_active: boolean };

const staffRole: Record<StaffRow["role"], StaffRole> = { owner: "Egasi", administrator: "Administrator", operator: "Operator", cook: "Oshpaz" };
const staffRoleRow = Object.fromEntries(Object.entries(staffRole).map(([row, label]) => [label, row])) as Record<StaffRole, StaffRow["role"]>;

export async function fetchStaff(accessToken: string, signal?: AbortSignal): Promise<StaffMember[]> {
  const rows = await rest<StaffRow[]>("restaurant_staff?select=id,restaurant_id,name,phone,role,is_active&order=created_at.asc", accessToken, { signal });
  return rows.map((row) => ({ id: row.id, restaurantId: row.restaurant_id, name: row.name, phone: row.phone, role: staffRole[row.role], active: row.is_active }));
}

export function createStaffMember(member: Omit<StaffMember, "id" | "active">, accessToken: string) {
  return rest("restaurant_staff", accessToken, {
    method: "POST",
    prefer: "return=minimal",
    body: { restaurant_id: member.restaurantId, name: member.name, phone: member.phone, role: staffRoleRow[member.role] }
  });
}

export function setStaffActive(id: string, active: boolean, accessToken: string) {
  return rest(`restaurant_staff?id=eq.${encodeURIComponent(id)}`, accessToken, { method: "PATCH", prefer: "return=minimal", body: { is_active: active } });
}

// Approving or rejecting catalog content is limited to administrators by the
// approval triggers; an owner sending this request keeps the previous status.
function moderation(approve: boolean, rejectionReason?: string) {
  return {
    approval_status: approve ? "approved" : "rejected",
    rejection_reason: approve ? null : rejectionReason?.trim() || "Ma’lumotlar yetarli emas",
    reviewed_at: new Date().toISOString()
  };
}

export function moderateRestaurant(id: string, approve: boolean, rejectionReason: string | undefined, accessToken: string) {
  return rest(`restaurants?id=eq.${encodeURIComponent(id)}`, accessToken, { method: "PATCH", prefer: "return=minimal", body: moderation(approve, rejectionReason) });
}

export function moderateMenuItem(id: string, approve: boolean, rejectionReason: string | undefined, accessToken: string) {
  return rest(`menu_items?id=eq.${encodeURIComponent(id)}`, accessToken, { method: "PATCH", prefer: "return=minimal", body: moderation(approve, rejectionReason) });
}

export function replyToReview(id: string, reply: string, accessToken: string) {
  return rest("rpc/reply_to_review", accessToken, { method: "POST", body: { p_review_id: id, p_reply: reply } });
}

// Moderation is limited to administrators by row level security.
export function setReviewVisible(id: string, visible: boolean, accessToken: string) {
  return rest(`reviews?id=eq.${encodeURIComponent(id)}`, accessToken, { method: "PATCH", prefer: "return=minimal", body: { is_visible: visible } });
}
