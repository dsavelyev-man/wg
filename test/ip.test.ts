import { describe, expect, it } from "vitest"
import { AddressPoolExhaustedError, formatIpv6, getNextPeerAddress, parseIpv6 } from "../src/index"

describe("IP allocation", () => {
  it("allocates the next IPv4 peer address", () => {
    const result = getNextPeerAddress({
      Interface: { Address: "10.0.0.1/24" },
      Peers: [{ PublicKey: "a", AllowedIPs: "10.0.0.2/32" }],
    })
    expect(result).toEqual({
      address: "10.0.0.3/32",
      ip: "10.0.0.3",
      cidr: "32",
      family: "ipv4",
    })
  })

  it("uses the configured subnet", () => {
    const result = getNextPeerAddress({
      Interface: { Address: "192.168.44.1/24" },
    })
    expect(result.ip).toBe("192.168.44.2")
  })

  it("allocates IPv6 peers", () => {
    const result = getNextPeerAddress(
      {
        Interface: { Address: "fd00:1234::1/64" },
        Peers: [{ PublicKey: "a", AllowedIPs: "fd00:1234::2/128" }],
      },
      { family: "ipv6" },
    )
    expect(result.ip).toBe("fd00:1234::3")
    expect(result.address).toBe("fd00:1234::3/128")
  })

  it("throws when the IPv4 subnet has no peer addresses", () => {
    expect(() => getNextPeerAddress({ Interface: { Address: "10.0.0.1/32" } })).toThrow(
      AddressPoolExhaustedError,
    )
  })

  it("round-trips compressed IPv6 addresses", () => {
    expect(formatIpv6(parseIpv6("2001:db8::1"))).toBe("2001:db8::1")
    expect(formatIpv6(parseIpv6("::1"))).toBe("::1")
  })
})
