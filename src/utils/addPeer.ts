import { parse } from "../parser/parse"
import { readFile, writeFile  } from "fs/promises";
import { stringify } from "../parser/stringify";
import { exec } from "./helpers";

const ipToNumber = (ip: string) => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

const numberToIp = (num: number) => {
  return [
    (num >> 24) & 255,
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255
  ].join('.');
}

const getNextIp = (currentIp: string) => {
  const num = ipToNumber(currentIp);
  const nextNum = num + 1;
  // Handle overflow if needed (optional)
  return numberToIp(nextNum);
}

/**
 * Add a new `[Peer]` to a WireGuard configuration with automatic IP assignment.
 *
 * The function scans existing peers' `AllowedIPs` (expects `/32` entries) and
 * assigns the next sequential IPv4 address in the `10.0.0.0/24` range produced
 * by `initConf`. When no peers are present it reserves `10.0.0.2/32` for the
 * first client. Optional peer properties such as preshared keys, persistent
 * keepalives, custom `AllowedIPs`, endpoints, or metadata (`AllowedApps`) can
 * be provided via the `options` object.
 *
 * After writing the updated configuration to disk the function runs
 * `wg syncconf <iface> <(wg-quick strip <iface>)` so that changes are applied
 * to the live interface without restarting it.
 *
 * @param filepath Absolute path to the WireGuard config file
 * (e.g., `/etc/wireguard/wg0.conf`).
 * @param options Peer options
 * @param options.publicKey Public key of the peer to add (required).
 * @param options.allowedIPs Optional comma-separated list of CIDRs to write
 * verbatim. Defaults to the auto-generated `<nextIp>/32`.
 * @param options.presharedKey Optional preshared key (from `generatePresharedKey`)
 * for additional encryption.
 * @param options.persistentKeepalive Optional keepalive interval in seconds to
 * keep NAT mappings alive (e.g., `25` for mobile clients).
 * @param options.endpoint Optional `host:port` string for site-to-site setups.
 * @param options.allowedApps Optional metadata string stored alongside the peer
 * (ignored by WireGuard but useful for downstream tooling).
 * @returns Promise resolving to `{ ip: string }` where `ip` is the assigned IPv4
 *          address without CIDR (e.g., `10.0.0.2`).
 * @throws If the file cannot be read/written, the config cannot be parsed, or
 * the sync operation fails.
 *
 * @example
 * ```ts
 * const keys = await generateKeys()
 * const { presharedkey } = await generatePresharedKey()
 * const { ip } = await addPeer("/etc/wireguard/wg0.conf", {
 *   publicKey: keys.publicKey,
 *   presharedKey: presharedkey,
 *   persistentKeepalive: 25,
 *   endpoint: "vpn.example.com:51820"
 * })
 * console.log(ip) // e.g., 10.0.0.2
 * ```
 */
export const addPeer = async (
  filepath: string,
  { publicKey, ...options }: { 
    publicKey: string, 
    persistentKeepalive?: number, 
    presharedKey?: string, 
    allowedIPs?: string, 
    endpoint?: string, 
    allowedApps?: string
  }
) => {
  const file = (await readFile(filepath)).toString();
  const parsed = parse(file);

  // Ensure Peers array exists
  if (!parsed["Peers"]) {
    parsed["Peers"] = [];
  }

  // Find the highest IPv4 address among all peers' AllowedIPs
  let maxIpNum = ipToNumber("10.0.0.1"); // Start before the first assignable IP

  for (const peer of parsed["Peers"]) {
    if (peer.AllowedIPs) {
      // Only consider IPv4 /32 addresses
      const allowed = peer.AllowedIPs.split(",").map((s: string) => s.trim());
      for (const ipCidr of allowed) {
        const [ip, cidr] = ipCidr.split("/");
        if (
          cidr === "32" &&
          /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)
        ) {
          const num = ipToNumber(ip);
          if (num > maxIpNum) {
            maxIpNum = num;
          }
        }
      }
    }
  }

  // Next IP is one after the highest found, or 10.0.0.2 if none
  let nextIp = numberToIp(maxIpNum + 1);
  // If no peers, assign 10.0.0.2
  if (parsed["Peers"].length === 0) {
    nextIp = "10.0.0.2";
  }

  const newPeer = {
    PublicKey: publicKey,
    AllowedIPs: options.allowedIPs || `${nextIp}/32`,
    PersistentKeepalive: options.persistentKeepalive,
    PresharedKey: options.presharedKey,
    Endpoint: options.endpoint,
    AllowedApps: options.allowedApps
  };

  parsed["Peers"].push(newPeer);

  const newFile = stringify(parsed);
  await writeFile(filepath, newFile);

  const iface = filepath.split("/").pop()?.split(".")[0];
  await exec(`bash -c "wg syncconf ${iface} <(wg-quick strip ${iface})"`);

  return {
    ip: nextIp,
  };
};