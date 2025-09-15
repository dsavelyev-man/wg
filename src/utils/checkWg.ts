import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

/**
 * Check if WireGuard tools are installed and available on the system.
 *
 * This function attempts to run `wg --version` to verify that WireGuard
 * CLI tools are properly installed and accessible from the current PATH.
 *
 * @returns Promise that resolves to `true` if WireGuard is available, `false` otherwise.
 *
 * @example
 * ```ts
 * import { checkWg } from "@kriper0nind/wg-utils"
 * 
 * const isInstalled = await checkWg()
 * if (!isInstalled) {
 *   console.error("WireGuard is not installed. Please install WireGuard tools.")
 * }
 * ```
 */
export const checkWg = async (): Promise<boolean> => {
  try {
    await execAsync("wg --version")
    return true
  } catch (error) {
    return false
  }
}

/**
 * Check if WireGuard tools are installed and throw an error if not.
 *
 * This is a convenience function that calls `checkWg()` and throws a
 * descriptive error if WireGuard is not available.
 *
 * @throws Error with installation instructions if WireGuard is not found.
 *
 * @example
 * ```ts
 * import { requireWg } from "@kriper0nind/wg-utils"
 * 
 * try {
 *   await requireWg()
 *   console.log("WireGuard is ready to use")
 * } catch (error) {
 *   console.error(error.message)
 * }
 * ```
 */
export const requireWg = async (): Promise<void> => {
  const isInstalled = await checkWg()
  
  if (!isInstalled) {
    throw new Error(
      "WireGuard is not installed or not available in PATH. " +
      "Please install WireGuard tools:\n" +
      "  Ubuntu/Debian: sudo apt install wireguard\n" +
      "  CentOS/RHEL: sudo yum install wireguard-tools\n" +
      "  Fedora: sudo dnf install wireguard-tools\n" +
      "  macOS: brew install wireguard-tools"
    )
  }
}
