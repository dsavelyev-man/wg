import { down } from "./down"
import { up, UpOptions } from "./up"

export const restart = async (iface: string, options: UpOptions = {}): Promise<void> => {
  await down(iface)
  await up(iface, options)
}
