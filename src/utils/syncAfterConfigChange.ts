import { basename } from "path"
import { SyncOptions } from "../types"
import { isWgUp } from "./interfaceStatus"
import { syncConf } from "./syncConf"

export const syncAfterConfigChange = async (
  filepath: string,
  options: SyncOptions = {},
): Promise<void> => {
  if (options.sync === false) return

  const iface = options.iface ?? basename(filepath).replace(/\.conf$/i, "")
  if (options.sync === "auto" || options.sync === undefined) {
    if (!(await isWgUp(iface))) return
  }
  await syncConf(iface)
}
