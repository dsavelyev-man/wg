import { spawn } from "child_process"
import { CommandError, WgNotFoundError } from "./errors"

export interface CommandResult {
  stdout: string
  stderr: string
}

export interface CommandOptions {
  input?: string
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
}

const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024

export const runCommand = (
  command: string,
  args: string[] = [],
  options: CommandOptions = {},
): Promise<CommandResult> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    let settled = false
    let timer: NodeJS.Timeout | undefined

    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      callback()
    }

    if (options.timeoutMs && options.timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill("SIGTERM")
        finish(() =>
          reject(
            new CommandError(`Command timed out after ${options.timeoutMs}ms: ${command}`, {
              command,
              args,
              exitCode: null,
              stderr,
            }),
          ),
        )
      }, options.timeoutMs)
    }

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
      if (stdout.length > DEFAULT_MAX_BUFFER) {
        child.kill("SIGTERM")
        finish(() =>
          reject(
            new CommandError(`Command output exceeded ${DEFAULT_MAX_BUFFER} bytes: ${command}`, {
              command,
              args,
              exitCode: null,
              stderr,
            }),
          ),
        )
      }
    })

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
      if (stderr.length > DEFAULT_MAX_BUFFER) {
        child.kill("SIGTERM")
        finish(() =>
          reject(
            new CommandError(
              `Command error output exceeded ${DEFAULT_MAX_BUFFER} bytes: ${command}`,
              {
                command,
                args,
                exitCode: null,
                stderr,
              },
            ),
          ),
        )
      }
    })

    child.on("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(
            new WgNotFoundError(
              `Command not found: ${command}. Install WireGuard tools or set WG_UTILS_WG_PATH/WG_UTILS_WG_QUICK_PATH.`,
              { cause: error },
            ),
          )
          return
        }
        reject(
          new CommandError(`Failed to run ${command}: ${error.message}`, {
            command,
            args,
            exitCode: null,
            stderr,
            cause: error,
          }),
        )
      })
    })

    child.on("close", (code) => {
      finish(() => {
        if (code === 0) {
          resolve({ stdout, stderr })
          return
        }
        reject(
          new CommandError(
            `Command failed (${code ?? "signal"}): ${command}${args.length ? ` ${args.join(" ")}` : ""}`,
            { command, args, exitCode: code, stderr: stderr || stdout },
          ),
        )
      })
    })

    if (options.input !== undefined) {
      child.stdin.end(options.input)
    } else {
      child.stdin.end()
    }
  })
}

export const wgPath = (): string => process.env.WG_UTILS_WG_PATH || "wg"
export const wgQuickPath = (): string => process.env.WG_UTILS_WG_QUICK_PATH || "wg-quick"
export const wireGuardWindowsPath = (): string =>
  process.env.WG_UTILS_WIREGUARD_PATH || "wireguard.exe"

export const runWg = (args: string[], options: CommandOptions = {}): Promise<CommandResult> =>
  runCommand(wgPath(), args, options)

export const runWgQuick = (args: string[], options: CommandOptions = {}): Promise<CommandResult> =>
  runCommand(wgQuickPath(), args, options)

export const commandExists = async (command: string): Promise<boolean> => {
  const finder = process.platform === "win32" ? "where" : "which"
  try {
    await runCommand(finder, [command])
    return true
  } catch {
    return false
  }
}
