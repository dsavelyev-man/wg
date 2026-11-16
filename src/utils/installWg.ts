import { readFile } from "fs/promises"
import { platform } from "os"
import { commandExists, runCommand } from "../commands"
import { UnsupportedPlatformError } from "../errors"

type SupportedPlatform = "linux" | "darwin" | "win32"

interface InstallPlan {
  platform: SupportedPlatform | string
  packageManager?: string
  name?: string
  commands: string[][]
}

const readLinuxIds = async (): Promise<string[]> => {
  try {
    const osRelease = await readFile("/etc/os-release", "utf8")
    const values = osRelease
      .split(/\r?\n/)
      .map((line) => line.match(/^(ID|ID_LIKE)=(.*)$/))
      .filter(Boolean)
      .map((match) => match![2].replace(/^["']|["']$/g, "").toLowerCase())
    return values.flatMap((value) => value.split(/\s+/)).filter(Boolean)
  } catch {
    return []
  }
}

const sudo = (): string[] => (process.getuid?.() === 0 ? [] : ["sudo"])

const detectInstallPlan = async (): Promise<InstallPlan> => {
  const currentPlatform = platform()

  if (currentPlatform === "linux") {
    const ids = await readLinuxIds()
    if (
      ids.some((id) => ["ubuntu", "debian", "linuxmint", "pop"].includes(id)) &&
      (await commandExists("apt-get"))
    ) {
      return {
        platform: "linux",
        packageManager: "apt-get",
        name: "Ubuntu/Debian",
        commands: [
          [...sudo(), "apt-get", "update"],
          [...sudo(), "apt-get", "install", "-y", "wireguard"],
        ],
      }
    }
    if (ids.some((id) => ["fedora", "rhel", "centos", "rocky", "almalinux"].includes(id))) {
      if (await commandExists("dnf")) {
        return {
          platform: "linux",
          packageManager: "dnf",
          name: "Fedora/RHEL",
          commands: [[...sudo(), "dnf", "install", "-y", "wireguard-tools"]],
        }
      }
      if (await commandExists("yum")) {
        return {
          platform: "linux",
          packageManager: "yum",
          name: "CentOS/RHEL",
          commands: [
            [...sudo(), "yum", "install", "-y", "epel-release"],
            [...sudo(), "yum", "install", "-y", "wireguard-tools"],
          ],
        }
      }
    }
    if (ids.includes("arch") && (await commandExists("pacman"))) {
      return {
        platform: "linux",
        packageManager: "pacman",
        name: "Arch Linux",
        commands: [[...sudo(), "pacman", "-S", "--noconfirm", "wireguard-tools"]],
      }
    }
    if (ids.includes("alpine") && (await commandExists("apk"))) {
      return {
        platform: "linux",
        packageManager: "apk",
        name: "Alpine Linux",
        commands: [["apk", "add", "--no-cache", "wireguard-tools"]],
      }
    }
  }

  if (currentPlatform === "darwin" && (await commandExists("brew"))) {
    return {
      platform: "darwin",
      packageManager: "homebrew",
      name: "macOS (Homebrew)",
      commands: [["brew", "install", "wireguard-tools"]],
    }
  }

  if (currentPlatform === "win32") {
    if (await commandExists("choco")) {
      return {
        platform: "win32",
        packageManager: "chocolatey",
        name: "Windows (Chocolatey)",
        commands: [["choco", "install", "wireguard", "-y"]],
      }
    }
    if (await commandExists("winget")) {
      return {
        platform: "win32",
        packageManager: "winget",
        name: "Windows (Winget)",
        commands: [
          [
            "winget",
            "install",
            "--id",
            "WireGuard.WireGuard",
            "--exact",
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
          ],
        ],
      }
    }
  }

  return { platform: currentPlatform, commands: [] }
}

const commandToString = (parts: string[]): string => parts.join(" ")

/** Install WireGuard with platform-specific commands, without shell chaining. */
export const installWg = async (
  options: { force?: boolean; silent?: boolean } = {},
): Promise<void> => {
  const { force = false, silent = false } = options
  if (!force) {
    try {
      await runCommand("wg", ["--version"])
      if (!silent) console.log("WireGuard is already installed")
      return
    } catch {
      // Continue with installation.
    }
  }

  const plan = await detectInstallPlan()
  if (plan.commands.length === 0) {
    throw new UnsupportedPlatformError(
      `Unsupported platform: ${plan.platform}. Install WireGuard manually: https://www.wireguard.com/install/`,
    )
  }

  if (!silent) console.log(`Installing WireGuard on ${plan.name}...`)
  for (const command of plan.commands) {
    const [file, ...args] = command
    const result = await runCommand(file, args, { timeoutMs: 10 * 60 * 1000 })
    if (!silent && result.stdout) console.log(result.stdout)
    if (!silent && result.stderr && !result.stderr.toLowerCase().includes("warning")) {
      console.error(result.stderr)
    }
  }

  await runCommand(process.env.WG_UTILS_WG_PATH || "wg", ["--version"])
  if (!silent) console.log("WireGuard installed successfully!")
}

export const getInstallInstructions = async (): Promise<{
  platform: string
  packageManager?: string
  command?: string
  commands: string[][]
  name?: string
  supported: boolean
}> => {
  const plan = await detectInstallPlan()
  return {
    platform: plan.platform,
    packageManager: plan.packageManager,
    command: plan.commands.length ? plan.commands.map(commandToString).join(" && ") : undefined,
    commands: plan.commands,
    name: plan.name,
    supported: plan.commands.length > 0,
  }
}
