import { exec } from "child_process";

/**
 * Brings down a WireGuard interface.
 * @param iface The name of the WireGuard interface (e.g., wg0)
 * @returns Promise that resolves when the interface is brought down
 */
export const down = (iface: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    exec(`wg-quick down ${iface}`, (error, stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            `Failed to bring down WireGuard interface ${iface}: ${stderr || error.message}`
          )
        );
        return;
      }
      resolve();
    });
  });
}