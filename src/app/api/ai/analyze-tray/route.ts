// Web-standard compatibility entry. This repository deploys api/ai/analyze-tray.mjs on Vercel.
import { configuredVisionService } from "../../../../../server/vision.mjs";
const service = configuredVisionService();
export const GET = (request: Request): Promise<Response> => service(request);
export const POST = (request: Request): Promise<Response> => service(request);
