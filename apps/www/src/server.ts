import handler from "@tanstack/react-start/server-entry";
import { handlePfpRequest, type PfpEnv } from "./pfp";

export default {
  async fetch(request: Request, env?: PfpEnv) {
    const pfpResponse = await handlePfpRequest(request, env);
    if (pfpResponse !== undefined) return pfpResponse;

    return handler.fetch(request);
  },
};
