export type TargetPlatform = "bluesky" | "mastodon";

export type PlatformEnv = Record<string, string | undefined>;

export interface PlatformProfile<
  TInput = { content: string; scheduledAt?: string | Date | null },
  TEnv extends PlatformEnv = PlatformEnv,
> {
  id: TargetPlatform | string;
  displayName: string;
  maxChars?: number;
  countMethod?: string;
  description?: string;
  validate(input: TInput): { ok: boolean; remaining: number; errors?: string[] };
  toPostPayload(input: TInput): unknown;
  post(payload: unknown, env: TEnv): Promise<{
    uri: string;
    postedAt: Date;
    raw?: unknown;
  }>;
}

export declare const PLATFORMS: {
  BLUESKY: "bluesky";
  MASTODON: "mastodon";
};
