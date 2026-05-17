import handler from "@tanstack/react-start/server-entry";
import { handlePfpRequest } from "./lib/pfp";

type CloudflareRequest = Request & {
  readonly runtime?: {
    readonly cloudflare?: {
      readonly env?: CloudflareEnv;
    };
  };
};

export default {
  async fetch(request: Request, env?: CloudflareEnv) {
    const pfpEnv = env ?? (request as CloudflareRequest).runtime?.cloudflare?.env;
    const pfpResponse = await handlePfpRequest(request, pfpEnv);
    if (pfpResponse !== undefined) return pfpResponse;

    return handler.fetch(request);
  },
};
