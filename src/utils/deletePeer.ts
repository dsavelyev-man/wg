import { ConfigWriteOptions, SyncOptions } from "../types"
import { removePeer } from "./config"

/**
 * Remove an active or disabled peer. Returns `false` when the peer does not
 * exist, making deletion idempotent.
 */
export const deletePeer = async (
  filepath: string,
  where: { publicKey: string },
  options: ConfigWriteOptions & SyncOptions = {},
): Promise<boolean> => removePeer(filepath, where.publicKey, options)
