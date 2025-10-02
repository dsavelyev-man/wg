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
 * The next IP address is determined by scanning existing peers' `AllowedIPs`
 * (assuming `/32`) and incrementing the highest IPv4 address found.
 * If no peers exist, the first peer is assigned `10.0.0.2/32`.
 *
 * Notes:
 * - Works with IPv4 addresses in the 10.0.0.0/24 range used by `initConf`.
 * - Ensures `Peers` array exists when adding the first peer.
 * - Does not validate uniqueness of provided publicKey.
 *
 * @param filepath Absolute path to the WireGuard config file
 * (e.g., `/etc/wireguard/wg0.conf`).
 * @param options Object containing the peer's `publicKey`.
 * @returns Promise resolving to `{ ip: string }` where `ip` is the assigned IPv4
 *          address without CIDR (e.g., `10.0.0.2`).
 * @throws If the file cannot be read/written or the config cannot be parsed.
 *
 * @example
 * ```ts
 * import { addPeer, generateKeys } from "@kriper0nind/wg-utils"
 * const keys = await generateKeys()
 * const { ip } = await addPeer("/etc/wireguard/wg0.conf", { publicKey: keys.publicKey })
 * console.log(ip) // e.g., 10.0.0.2
 * ```
 */
export const addPeer = async (
  filepath: string,
  { publicKey }: { publicKey: string }
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
    AllowedIPs: `${nextIp}/32`,
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