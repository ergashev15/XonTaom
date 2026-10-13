import { rest } from "@/api/rest";

export async function requestAccountDeletion(accessToken: string) {
  return rest<string>("rpc/request_account_deletion", accessToken, {
    method: "POST",
    body: {}
  });
}
