import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { RedisStore } from "../server/store.mjs";
import { createIotService } from "../server/iot.mjs";
const directory = await mkdtemp(join(tmpdir(), "ecotray-redis-"));
const socket = join(directory, "redis.sock");
const redis = spawn(
  "redis-server",
  ["--port", "0", "--unixsocket", socket, "--save", "", "--appendonly", "no"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
try {
  await new Promise((resolve, reject) => {
    redis.once("error", reject);
    redis.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Ready to accept connections")) resolve();
    });
    redis.once("exit", (code) => reject(Error("Redis exited: " + code)));
  });
  const exec = promisify(execFile),
    hash = "a".repeat(64),
    at = "2026-10-22T04:00:00Z";
  // Execute the production CAS Lua against a real, isolated Redis process.
  const store = new RedisStore("unused", "unused");
  store.command = async (args) =>
    JSON.parse(
      (await exec("redis-cli", ["-s", socket, "--json", ...args.map(String)]))
        .stdout,
    );
  const make = () =>
    createIotService({
      store,
      profiles: [
        {
          cardUidHash: hash,
          schoolId: "ptnk",
          menuId: "vit",
          menuName: "Vịt kho gừng",
          allergyFlags: [],
        },
      ],
      now: () => new Date(at),
    });
  const body = {
    eventId: "e1",
    schoolId: "ptnk",
    stationId: "gate",
    cardUidHash: hash,
    scannedAt: at,
  };
  const req = (b = body) =>
    new Request("http://localhost/api/iot/nfc-scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "e1",
      },
      body: JSON.stringify(b),
    });
  const a = make(),
    b = make();
  const output = await Promise.all(
    Array.from({ length: 20 }, (_, i) => (i % 2 ? a : b)(req())),
  );
  assert.ok(output.every((r) => r.status === 200));
  assert.ok(
    (await Promise.all(output.map((r) => r.json()))).every(
      (r) => r.servedCount === 1,
    ),
  );
  assert.equal((await a(req({ ...body, stationId: "changed" }))).status, 409);
  const fresh = make();
  const state = await (
    await fresh(
      new Request("http://localhost/api/iot/status?schoolId=ptnk"),
    )
  ).json();
  assert.equal(state.servedCount, 1);
  const ttl = await store.command([
    "TTL",
    "ecotray:{ptnk}:receipt:nfc-scan:e1",
  ]);
  assert.ok(ttl > 172700);
  const imageKey = "ecotray:{ptnk}:test-image";
  const first = await store.commit(
    "ecotray:{ptnk}:image-test-state",
    ["ecotray:{ptnk}:image-test-receipt"],
    null,
    "first-state",
    "first-receipt",
    { key: imageKey, value: "first-image" },
  );
  const second = await store.commit(
    "ecotray:{ptnk}:image-test-state",
    ["ecotray:{ptnk}:image-test-receipt"],
    "first-state",
    "second-state",
    "second-receipt",
    { key: imageKey, value: "second-image" },
  );
  assert.equal(first, "first-receipt");
  assert.equal(second, "first-receipt");
  assert.equal(await store.get(imageKey), "first-image");
  assert.ok((await store.command(["TTL", imageKey])) > 2591900);
  console.log(
    "PASS: production Lua on real Redis, 20 concurrent retries across two services, changed body conflict, fresh instance reads count=1, idempotency TTL=48h, atomic image preservation and 30-day TTL.",
  );
} finally {
  redis.kill();
  await new Promise((resolve) => {
    if (redis.exitCode !== null) resolve();
    else redis.once("exit", resolve);
  });
  await rm(directory, { recursive: true });
}
