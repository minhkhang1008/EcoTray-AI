import { createHash } from "node:crypto";
const seconds48h = 172800;
export class MemoryStore {
  values = new Map();
  async get(key) {
    const value = this.values.get(key);
    if (value?.expires < Date.now()) {
      this.values.delete(key);
      return null;
    }
    return value?.value ?? null;
  }
  async commit(stateKey, receiptKeys, expected, next, receipt, image) {
    // No await between read/check/write: the local event loop performs this atomically.
    const entries = receiptKeys
      .map((k) => this.values.get(k))
      .filter((v) => v && v.expires > Date.now());
    if (entries.length) return entries[0].value;
    const current = this.values.get(stateKey)?.value ?? null;
    if (current !== expected) return null;
    this.values.set(stateKey, { value: next, expires: Infinity });
    if (image)
      this.values.set(image.key, {
        value: image.value,
        expires: Date.now() + 30 * 86400000,
      });
    for (const k of receiptKeys)
      this.values.set(k, {
        value: receipt,
        expires: Date.now() + seconds48h * 1000,
      });
    return receipt;
  }
}
const cas = `
for i=3,#KEYS do
 local old=redis.call('GET',KEYS[i])
 if old then return old end
end
local current=redis.call('GET',KEYS[1]) or ''
if current~=ARGV[1] then return false end
redis.call('SET',KEYS[1],ARGV[2])
if ARGV[4]~='' then redis.call('SET',KEYS[2],ARGV[4],'EX',2592000) end
for i=3,#KEYS do redis.call('SET',KEYS[i],ARGV[3],'EX',172800) end
return ARGV[3]`;
export class RedisStore {
  constructor(url, token) {
    this.url = url;
    this.token = token;
  }
  async command(args) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) throw Error("Storage unavailable");
    const data = await response.json();
    if (data.error) throw Error("Storage unavailable");
    return data.result;
  }
  get(key) {
    return this.command(["GET", key]);
  }
  commit(stateKey, receiptKeys, expected, next, receipt, image) {
    return this.command([
      "EVAL",
      cas,
      2 + receiptKeys.length,
      stateKey,
      image?.key ?? stateKey + ":unused-image",
      ...receiptKeys,
      expected ?? "",
      next,
      receipt,
      image?.value ?? "",
    ]);
  }
}
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
