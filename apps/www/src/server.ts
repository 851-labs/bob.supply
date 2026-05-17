import handler from "@tanstack/react-start/server-entry";
import { handleGeneratedAssetRequest, handlePfpRequest, type PfpEnv } from "./lib/pfp";

export default {
  async fetch(request: Request, env?: PfpEnv) {
    const pfpResponse = await handlePfpRequest(request, env);
    if (pfpResponse !== undefined) return pfpResponse;

    const generatedAssetResponse = await handleGeneratedAssetRequest(request, env);
    if (generatedAssetResponse !== undefined) return generatedAssetResponse;

    return handler.fetch(request);
  },
};
