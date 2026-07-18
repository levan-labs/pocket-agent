import type { AgentProvider } from './AgentProvider'

export type ProviderFactory = () => AgentProvider

/**
 * Maps provider ids (e.g. "mock", "opencode") to factories. The UI picks a
 * provider by id and never imports adapter packages directly.
 */
export class ProviderRegistry {
  private readonly factories = new Map<string, ProviderFactory>()

  register(id: string, factory: ProviderFactory): void {
    if (this.factories.has(id)) {
      throw new Error(`Provider already registered: ${id}`)
    }
    this.factories.set(id, factory)
  }

  create(id: string): AgentProvider {
    const factory = this.factories.get(id)
    if (!factory) {
      throw new Error(`Unknown provider: ${id}`)
    }
    return factory()
  }

  ids(): string[] {
    return [...this.factories.keys()]
  }
}
