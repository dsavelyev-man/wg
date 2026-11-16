import { describe, expect, it } from "vitest"
import { ConfigParseError, parse, stringify } from "../src/index"

describe("parse", () => {
  it("parses interface and peers", () => {
    const config = parse(`
# comment
[Interface]
PrivateKey = abc
Address = 10.0.0.1/24, fd00::1/64

[Peer]
PublicKey = peer-a
AllowedIPs = 10.0.0.2/32
`)
    expect(config.Interface?.PrivateKey).toBe("abc")
    expect(config.Interface?.Address).toBe("10.0.0.1/24, fd00::1/64")
    expect(config.Peers).toHaveLength(1)
    expect(config.Peers?.[0].PublicKey).toBe("peer-a")
  })

  it("merges repeated keys", () => {
    const config = parse(`
[Interface]
Address = 10.0.0.1/24
Address = fd00::1/64
`)
    expect(config.Interface?.Address).toBe("10.0.0.1/24, fd00::1/64")
  })

  it("rejects malformed input", () => {
    expect(() => parse("PrivateKey = abc")).toThrow(ConfigParseError)
    expect(() => parse("[Peer]\nPublicKey =")).toThrow(ConfigParseError)
  })
})

describe("stringify", () => {
  it("omits undefined and empty values", () => {
    const text = stringify({
      Interface: {
        PrivateKey: "abc",
        DNS: undefined,
        MTU: undefined,
        Address: ["10.0.0.1/24", "fd00::1/64"],
      },
      Peers: [
        {
          PublicKey: "peer-a",
          PresharedKey: undefined,
          AllowedIPs: "10.0.0.2/32",
        },
      ],
    })

    expect(text).not.toContain("undefined")
    expect(text).toContain("Address = 10.0.0.1/24, fd00::1/64")
    expect(text).not.toContain("PresharedKey")
    expect(text.endsWith("\n")).toBe(true)
  })
})
