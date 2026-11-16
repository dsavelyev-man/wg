import { join } from "path"
import { runCommand, runWgQuick, wireGuardWindowsPath } from "../commands"
import { validateInterfaceName } from "./interfaceStatus"

export interface UpOptions {
  /** Windows only: path to the tunnel configuration file. */
  configPath?: string
}

const windowsConfigPath = (iface: string, configPath?: string): string =>
  configPath ?? join(process.env.ProgramData || "C:\\ProgramData", "WireGuard", `${iface}.conf`)

/** Bring up a WireGuard interface without invoking a shell. */
export const up = async (iface: string, options: UpOptions = {}): Promise<void> => {
  const name = validateInterfaceName(iface)
  if (process.platform === "win32") {
    await runCommand(wireGuardWindowsPath(), [
      "/installtunnelservice",
      windowsConfigPath(name, options.configPath),
    ])
    return
  }
  await runWgQuick(["up", name])
}
