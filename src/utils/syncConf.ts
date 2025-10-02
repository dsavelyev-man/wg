import { exec } from "child_process";

export const syncConf = async (iface: string) => {
  await exec(`wg syncconf ${iface} <(wg-quick strip ${iface})`);
};