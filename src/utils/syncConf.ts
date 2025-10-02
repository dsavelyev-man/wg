import { exec } from "./helpers";

export const syncConf = async (iface: string) => {
  await exec(`wg syncconf ${iface} <wg-quick strip ${iface}`);
};