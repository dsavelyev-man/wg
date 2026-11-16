export * from "./types"
export * from "./errors"

export { parse } from "./parser/parse"
export { stringify } from "./parser/stringify"

export { addPeer, type AddPeerOptions, type AddPeerResult } from "./utils/addPeer"
export { deletePeer } from "./utils/deletePeer"
export {
  addPeerToConfig,
  appendPeer,
  getInterfaceName,
  getPeer,
  listDisabledPeers,
  listPeers,
  readConfig,
  removePeer,
  setPeerEnabled,
  updatePeer,
  validateWireGuardConfig,
  writeConfig,
} from "./utils/config"
export { generateKeys, type GenerateKeysOptions, type GeneratedKeys } from "./utils/generateKeys"
export {
  generatePresharedKey,
  type GeneratePresharedKeyOptions,
  type GeneratedPresharedKey,
} from "./utils/generatePresharedKey"
export { getPubKey, getPublicKey } from "./utils/getPubkey"
export { up, type UpOptions } from "./utils/up"
export { down } from "./utils/down"
export { restart } from "./utils/restart"
export { initConf, type InitConfOptions } from "./utils/initConf"
export { checkWg, requireWg } from "./utils/checkWg"
export { installWg, getInstallInstructions } from "./utils/installWg"
export { syncConf } from "./utils/syncConf"
export { getLatestHandshake, type HandshakeInfo } from "./utils/getLatestHandshake"
export {
  getInterfaceStatus,
  isWgUp,
  parseWgDump,
  validateInterfaceName,
  type InterfaceStatus,
  type PeerStatus,
} from "./utils/interfaceStatus"
export { saveConfig, type SaveConfigOptions } from "./utils/saveConfig"
export {
  generateClientConfig,
  generateClientQRCode,
  type ClientQRCodeOptions,
  type GenerateClientConfigOptions,
} from "./utils/clientConfig"
export {
  formatAddress,
  formatIpv4,
  formatIpv6,
  getNextPeerAddress,
  isValidCidr,
  isValidIp,
  parseCidr,
  parseIpv4,
  parseIpv6,
  type PeerAddressOptions,
} from "./utils/ip"
export { assertWireGuardKey, isWireGuardKey } from "./utils/keys"
