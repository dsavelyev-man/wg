import { runCommand, runWgQuick, wireGuardWindowsPath } from "../commands"
import { validateInterfaceName } from "./interfaceStatus"

/** Bring down a WireGuard interface without invoking a shell. */
export const down = async (iface: string): Promise<void> => {
  const name = validateInterfaceName(iface)
  if (process.platform === "win32") {
    await runCommand(wireGuardWindowsPath(), ["/uninstalltunnelservice", name])
    return
  }
  await runWgQuick(["down", name])
}
