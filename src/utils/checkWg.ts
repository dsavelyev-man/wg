import { runWg } from "../commands"

/** Return true when the `wg` CLI is installed and executable. */
export const checkWg = async (): Promise<boolean> => {
  try {
    await runWg(["--version"])
    return true
  } catch {
    return false
  }
}

/** Throw a descriptive error when the WireGuard CLI is unavailable. */
export const requireWg = async (): Promise<void> => {
  if (await checkWg()) return
  throw new Error(
    "WireGuard is not installed or not available in PATH. " +
      "Install WireGuard tools or set WG_UTILS_WG_PATH.",
  )
}
