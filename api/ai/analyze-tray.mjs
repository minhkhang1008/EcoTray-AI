import { configuredVisionService } from "../../server/vision.mjs";
import { nodeHandler } from "../../server/node-handler.mjs";
export const config = { api: { bodyParser: false } };
export default nodeHandler(configuredVisionService());
