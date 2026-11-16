import { chmod, mkdtemp, readFile, rm } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { afterEach, describe, expect, it } from "vitest"
import {
  addPeer,
  deletePeer,
  generateClientConfig,
  generateClientQRCode,
  getNextPeerAddress,
  getPeer,
  initConf,
  listDisabledPeers,
  listPeers,
  setPeerEnabled,
  updatePeer,
} from "../src/index"

const dirs: string[] = []
const privateKey = `${"A".repeat(43)}=`
const publicKey = `${"B".repeat(43)}=`

const makeConfig = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "wg-utils-"))
  dirs.push(dir)
  const filepath = join(dir, "wg0.conf")
  await initConf(filepath, {
    privateKey,
    ip: "10.10.10.1",
    dns: "1.1.1.1",
  })
  return filepath
}

const writeComment = async (filepath: string): Promise<void> => {
  const text = await readFile(filepath, "utf8")
  const { writeFile } = await import("fs/promises")
  await writeFile(filepath, `${text}\n# operator note\n`)
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("config file API", () => {
  it("writes a clean config without undefined fields", async () => {
    const filepath = await makeConfig()
    const text = await readFile(filepath, "utf8")
    expect(text).toContain("Address = 10.10.10.1/24")
    expect(text).not.toContain("undefined")
    if (process.platform !== "win32") {
      await chmod(filepath, 0o600)
    }
  })

  it("adds, reads, updates, disables, enables, and deletes peers", async () => {
    const filepath = await makeConfig()
    const added = await addPeer(filepath, { publicKey, sync: false })
    expect(added.ip).toBe("10.10.10.2")

    expect((await getPeer(filepath, publicKey))?.AllowedIPs).toBe("10.10.10.2/32")
    await updatePeer(filepath, publicKey, { PersistentKeepalive: 25 }, { sync: false })
    expect((await getPeer(filepath, publicKey))?.PersistentKeepalive).toBe("25")

    expect(await setPeerEnabled(filepath, publicKey, false, { sync: false })).toBe(true)
    expect(await listPeers(filepath)).toHaveLength(0)
    expect(await listDisabledPeers(filepath)).toHaveLength(1)

    expect(await setPeerEnabled(filepath, publicKey, true, { sync: false })).toBe(true)
    expect(await listPeers(filepath)).toHaveLength(1)

    expect(await deletePeer(filepath, { publicKey }, { sync: false })).toBe(true)
    expect(await deletePeer(filepath, { publicKey }, { sync: false })).toBe(false)
  })

  it("preserves comments while appending and updating peers", async () => {
    const filepath = await makeConfig()
    const original = await readFile(filepath, "utf8")
    await writeComment(filepath)
    await addPeer(filepath, { publicKey, sync: false })
    await updatePeer(filepath, publicKey, { PersistentKeepalive: 15 }, { sync: false })

    const text = await readFile(filepath, "utf8")
    expect(text).toContain("# operator note")
    expect(text).toContain(original.trim())
    expect(text).toContain("PersistentKeepalive = 15")
  })

  it("does not reuse existing peer addresses", async () => {
    const filepath = await makeConfig()
    await addPeer(filepath, { publicKey, sync: false })
    const next = await addPeer(filepath, {
      publicKey: `${"C".repeat(43)}=`,
      sync: false,
    })
    expect(next.ip).toBe("10.10.10.3")
  })
})

describe("client configs", () => {
  it("generates a client config and QR code", async () => {
    const config = generateClientConfig({
      privateKey,
      clientAddress: "10.10.10.2/32",
      serverPublicKey: publicKey,
      serverEndpoint: "vpn.example.com:51820",
      dns: "1.1.1.1",
      persistentKeepalive: 25,
    })
    expect(config).toContain("[Interface]")
    expect(config).toContain("Endpoint = vpn.example.com:51820")

    const qr = await generateClientQRCode(config)
    expect(qr.startsWith("data:image/png;base64,")).toBe(true)
  })
})

describe("address allocation validation", () => {
  it("handles a fully populated small pool", () => {
    expect(() =>
      getNextPeerAddress({
        Interface: { Address: "10.0.0.0/30" },
        Peers: [
          { PublicKey: "a", AllowedIPs: "10.0.0.1/32" },
          { PublicKey: "b", AllowedIPs: "10.0.0.2/32" },
        ],
      }),
    ).toThrow()
  })
})
