import { linkAccount, storageNamespace } from "../storage/db";
import { firstLinkPreview, resolveFirstLink } from "./reconcile";
import type { AthleteState } from "../domain/schema";
import type { SyncDocument, SyncTransport } from "./types";
export async function completeAccountLink(
  context: {
    namespace: string;
    preview: { remote: SyncDocument[]; guest: AthleteState };
    choice: "cloud" | "device" | "merge";
    choices: Record<string, "local" | "remote" | SyncDocument>;
    isCurrent: () => boolean;
  },
  transport: SyncTransport,
) {
  const assertCurrent = () => {
    if (storageNamespace() !== context.namespace || !context.isCurrent())
      throw Error("Account changed; preview the link again");
  };
  assertCurrent();
  const latest = await transport.snapshot();
  assertCurrent();
  if (JSON.stringify(latest) !== JSON.stringify(context.preview.remote))
    throw Error("Cloud changed; preview the link again");
  if (context.choice === "device" && latest.length)
    throw Error("Cloud already contains history; use the reviewed merge");
  const state =
    context.choice === "device"
      ? context.preview.guest
      : context.choice === "merge"
        ? resolveFirstLink(
            firstLinkPreview(context.preview.guest, latest),
            context.choices,
          )
        : null;
  await linkAccount(
    latest,
    state,
    context.choice === "merge",
    context.namespace,
  );
  assertCurrent();
}
