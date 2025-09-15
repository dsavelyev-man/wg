import { exec } from "child_process"
import { promisify } from "util"
import { platform } from "os"

const execAsync = promisify(exec)

/**
 * Platform-specific WireGuard installation commands and detection.
 */
const PLATFORM_COMMANDS = {
  linux: {
    ubuntu: {
      detect: "which apt",
      install: "sudo apt update && sudo apt install -y wireguard",
      name: "Ubuntu/Debian"
    },
    centos: {
      detect: "which yum",
      install: "sudo yum install -y epel-release && sudo yum install -y wireguard-tools",
      name: "CentOS/RHEL"
    },
    fedora: {
      detect: "which dnf",
      install: "sudo dnf install -y wireguard-tools",
      name: "Fedora"
    },
    arch: {
      detect: "which pacman",
      install: "sudo pacman -S --noconfirm wireguard-tools",
      name: "Arch Linux"
    },
    alpine: {
      detect: "which apk",
      install: "sudo apk add --no-cache wireguard-tools",
      name: "Alpine Linux"
    }
  },
  darwin: {
    homebrew: {
      detect: "which brew",
      install: "brew install wireguard-tools",
      name: "macOS (Homebrew)"
    }
  },
  win32: {
    chocolatey: {
      detect: "where choco",
      install: "choco install wireguard",
      name: "Windows (Chocolatey)"
    },
    winget: {
      detect: "where winget",
      install: "winget install WireGuard.WireGuard",
      name: "Windows (Winget)"
    }
  }
} as const

type Platform = keyof typeof PLATFORM_COMMANDS
type LinuxDistro = keyof typeof PLATFORM_COMMANDS.linux
type MacPackageManager = keyof typeof PLATFORM_COMMANDS.darwin
type WindowsPackageManager = keyof typeof PLATFORM_COMMANDS.win32

/**
 * Detect the current platform and available package managers.
 */
async function detectPlatform(): Promise<{
  platform: Platform
  packageManager?: string
  command?: string
  name?: string
}> {
  const currentPlatform = platform() as Platform

  if (currentPlatform === 'linux') {
    // Try to detect Linux distribution
    for (const [distro, config] of Object.entries(PLATFORM_COMMANDS.linux)) {
      try {
        await execAsync(config.detect)
        return {
          platform: 'linux',
          packageManager: distro,
          command: config.install,
          name: config.name
        }
      } catch {
        // Continue to next distro
      }
    }
  } else if (currentPlatform === 'darwin') {
    // Try Homebrew
    try {
      await execAsync(PLATFORM_COMMANDS.darwin.homebrew.detect)
      return {
        platform: 'darwin',
        packageManager: 'homebrew',
        command: PLATFORM_COMMANDS.darwin.homebrew.install,
        name: PLATFORM_COMMANDS.darwin.homebrew.name
      }
    } catch {
      // Homebrew not available
    }
  } else if (currentPlatform === 'win32') {
    // Try Chocolatey first, then Winget
    try {
      await execAsync(PLATFORM_COMMANDS.win32.chocolatey.detect)
      return {
        platform: 'win32',
        packageManager: 'chocolatey',
        command: PLATFORM_COMMANDS.win32.chocolatey.install,
        name: PLATFORM_COMMANDS.win32.chocolatey.name
      }
    } catch {
      try {
        await execAsync(PLATFORM_COMMANDS.win32.winget.detect)
        return {
          platform: 'win32',
          packageManager: 'winget',
          command: PLATFORM_COMMANDS.win32.winget.install,
          name: PLATFORM_COMMANDS.win32.winget.name
        }
      } catch {
        // Neither package manager available
      }
    }
  }

  return { platform: currentPlatform }
}

/**
 * Install WireGuard tools on the current platform.
 *
 * This function automatically detects the platform and available package
 * managers, then attempts to install WireGuard using the appropriate
 * package manager.
 *
 * @param options Installation options
 * @param options.force Force installation even if WireGuard is already installed
 * @param options.silent Suppress output from package manager
 * @returns Promise that resolves when installation completes
 * @throws Error if platform is unsupported or installation fails
 *
 * @example
 * ```ts
 * import { installWg } from "@kriper0nind/wg-utils"
 * 
 * try {
 *   await installWg()
 *   console.log("WireGuard installed successfully")
 * } catch (error) {
 *   console.error("Installation failed:", error.message)
 * }
 * ```
 */
export const installWg = async (options: {
  force?: boolean
  silent?: boolean
} = {}): Promise<void> => {
  const { force = false, silent = false } = options

  // Check if already installed (unless forced)
  if (!force) {
    try {
      await execAsync("wg --version")
      if (!silent) {
        console.log("WireGuard is already installed")
      }
      return
    } catch {
      // Not installed, continue with installation
    }
  }

  const platformInfo = await detectPlatform()

  if (!platformInfo.command) {
    throw new Error(
      `Unsupported platform: ${platformInfo.platform}. ` +
      "Please install WireGuard manually:\n" +
      "  Linux: https://www.wireguard.com/install/\n" +
      "  macOS: brew install wireguard-tools\n" +
      "  Windows: https://www.wireguard.com/install/"
    )
  }

  if (!silent) {
    console.log(`Installing WireGuard on ${platformInfo.name}...`)
  }

  try {
    const { stdout, stderr } = await execAsync(platformInfo.command)
    
    if (!silent) {
      if (stdout) console.log(stdout)
      if (stderr && !stderr.includes('warning')) console.error(stderr)
    }

    // Verify installation
    await execAsync("wg --version")
    
    if (!silent) {
      console.log("WireGuard installed successfully!")
    }
  } catch (error: any) {
    throw new Error(
      `Failed to install WireGuard: ${error.message}\n` +
      `Command: ${platformInfo.command}\n` +
      "Please install WireGuard manually or check your permissions."
    )
  }
}

/**
 * Get installation instructions for the current platform.
 *
 * @returns Object containing platform info and installation command
 *
 * @example
 * ```ts
 * import { getInstallInstructions } from "@kriper0nind/wg-utils"
 * 
 * const instructions = await getInstallInstructions()
 * console.log(`Install on ${instructions.name}: ${instructions.command}`)
 * ```
 */
export const getInstallInstructions = async (): Promise<{
  platform: string
  packageManager?: string
  command?: string
  name?: string
  supported: boolean
}> => {
  const platformInfo = await detectPlatform()
  
  return {
    platform: platformInfo.platform,
    packageManager: platformInfo.packageManager,
    command: platformInfo.command,
    name: platformInfo.name,
    supported: !!platformInfo.command
  }
}
