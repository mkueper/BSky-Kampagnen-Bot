import { getProfile } from "../platforms/registry";
import type { PostInput, PlatformEnv } from "../platforms/types";

export async function sendPost(input: PostInput, platformId: string, env: PlatformEnv) {
  const profile = getProfile(platformId);
  const check = profile.validate(input);
  if (!check.ok) throw new Error(check.errors?.join("; ") || "Ungültiger Inhalt.");

  const payload = profile.toPostPayload(input);
  return profile.post(payload, env);
}
