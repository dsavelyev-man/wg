export class WireGuardError extends Error {
  public readonly cause?: unknown

  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message)
    this.name = new.target.name
    this.cause = options.cause
  }
}

export class ConfigParseError extends WireGuardError {}

export class ConfigValidationError extends WireGuardError {}

export class WgNotFoundError extends WireGuardError {}

export class CommandError extends WireGuardError {
  public readonly command: string
  public readonly args: string[]
  public readonly exitCode: number | null
  public readonly stderr: string

  constructor(
    message: string,
    details: {
      command: string
      args: string[]
      exitCode: number | null
      stderr: string
      cause?: unknown
    },
  ) {
    super(message, { cause: details.cause })
    this.command = details.command
    this.args = details.args
    this.exitCode = details.exitCode
    this.stderr = details.stderr
  }
}

export class PeerNotFoundError extends WireGuardError {}
export class PeerAlreadyExistsError extends WireGuardError {}
export class AddressPoolExhaustedError extends WireGuardError {}
export class UnsupportedPlatformError extends WireGuardError {}
