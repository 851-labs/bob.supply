import handler from "@tanstack/react-start/server-entry";
import { handleGeneratedAssetRequest, handlePfpRequest } from "./lib/pfp";

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

    const generatedAssetResponse = await handleGeneratedAssetRequest(request, pfpEnv);
    if (generatedAssetResponse !== undefined) return generatedAssetResponse;

    return handler.fetch(request);
  },
};
