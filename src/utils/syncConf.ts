import { chmod, unlink, writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { runWg, runWgQuick } from "../commands"
import { validateInterfaceName } from "./interfaceStatus"

/**
 * Apply `wg-quick strip <iface>` output to a running interface using a
 * temporary file. This avoids shell process substitution and is portable to
 * environments that do not provide bash.
 */
export const syncConf = async (iface: string): Promise<void> => {
  const name = validateInterfaceName(iface)
  const stripped = await runWgQuick(["strip", name])
  const tempPath = join(
    tmpdir(),
    `wg-utils-${name}-${process.pid}-${Math.random().toString(16).slice(2)}.conf`,
  )

  try {
    await writeFile(tempPath, stripped.stdout, { mode: 0o600 })
    await chmod(tempPath, 0o600)
    await runWg(["syncconf", name, tempPath])
  } finally {
    try {
      await unlink(tempPath)
    } catch {
      // Ignore cleanup errors.
    }
  }
}
