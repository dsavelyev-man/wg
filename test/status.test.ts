import { describe, expect, it } from "vitest"
import { parseWgDump } from "../src/index"

describe("wg dump parsing", () => {
  it("parses interface and peer statistics", () => {
    const status = parseWgDump(
      "wg0",
      [
        "priv\tpub\t51820\toff",
        "peerPub\t(none)\t198.51.100.2:51820\t10.0.0.2/32\t1700000000\t1024\t2048\t25",
      ].join("\n"),
    )
    expect(status.listenPort).toBe(51820)
    expect(status.peers[0].allowedIps).toEqual(["10.0.0.2/32"])
    expect(status.peers[0].transferRx).toBe(1024)
    expect(status.peers[0].persistentKeepalive).toBe(25)
    expect(status.peers[0].latestHandshakeAt).toBe("2023-11-14T22:13:20.000Z")
  })
})
