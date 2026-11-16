import { writeFile } from "fs/promises"
import { join } from "path"
import { runWg, runWgQuick } from "../commands"
import { validateInterfaceName } from "./interfaceStatus"

export interface SaveConfigOptions {
  /** Destination file. Defaults to the standard wg-quick location. */
  filepath?: string
}

export const saveConfig = async (
  iface: string,
  options: SaveConfigOptions = {},
): Promise<string | undefined> => {
  const name = validateInterfaceName(iface)
  if (process.platform === "win32" || options.filepath) {
    const { stdout } = await runWg(["showconf", name])
    if (options.filepath) {
      await writeFile(options.filepath, stdout, { mode: 0o600 })
      return options.filepath
    }
    return stdout
  }

  await runWgQuick(["save", name])
  return options.filepath ?? join("/etc/wireguard", `${name}.conf`)
}
