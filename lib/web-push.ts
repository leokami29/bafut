import webpush from "web-push";

export type PushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushSendResult =
  | { ok: true; statusCode: number }
  | { ok: false; statusCode: number; gone: boolean; message: string };

let configured = false;

function ensureVapid() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:hola@bafut.app";
  if (!publicKey || !privateKey) {
    throw new Error("Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendWebPush(
  sub: PushSubscriptionKeys,
  payload: Record<string, unknown>,
): Promise<PushSendResult> {
  ensureVapid();
  try {
    const result = await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
    return { ok: true, statusCode: result.statusCode };
  } catch (err) {
    const statusCode =
      typeof err === "object" && err && "statusCode" in err
        ? Number((err as { statusCode?: number }).statusCode) || 0
        : 0;
    const message = err instanceof Error ? err.message : "push_failed";
    return {
      ok: false,
      statusCode,
      gone: statusCode === 404 || statusCode === 410,
      message: message.slice(0, 120),
    };
  }
}
