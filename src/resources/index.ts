/**
 * The interface through which users can lookup identifiers using a blueprint resource name.
 */
export type ResourceRef = {
  /** Lookup a CORS origin ID */
  cors: (name: string) => string
  /** Lookup a Dataset name */
  dataset: (name: string) => string
  /** Lookup a project ID */
  project: (name: string) => string
  /** Lookup a role name */
  role: (name: string) => string
  /** Lookup a studio's app ID */
  studio: (name: string) => string
}

/**
 * Configuration for resource types to allow lookup to work.
 */
type ResourceTypeConfig = {
  /** The blueprint-specific type of the resource */
  type: string
  /** Whether or not the externalId is prefixed with a project ID */
  hasProjectPrefix?: boolean
}

/**
 * A map of supported resource types to their blueprint-specific information.
 */
const RESOURCE_CONFIG_MAP: Record<keyof ResourceRef, ResourceTypeConfig> = {
  cors: {type: 'sanity.project.cors', hasProjectPrefix: true},
  dataset: {type: 'sanity.project.dataset', hasProjectPrefix: true},
  project: {type: 'sanity.project'},
  role: {type: 'sanity.access.role'},
  studio: {type: 'sanity.studio'},
}

/**
 * The shape of a resource binding baked into the module graph.
 */
interface ResourceBinding {
  id: string
  name: string
  type: string
}

declare global {
  /**
   * Set as a side effect by the statically-imported, deploy-time-baked bindings
   * module, which runs before any app code. Absent when the bundle is used
   * without that module (e.g. this package standalone).
   */
  var __SANITY_RESOURCE_BINDINGS__: ResourceBinding[] | undefined
}

function getBindings(): ResourceBinding[] {
  const bindings = globalThis.__SANITY_RESOURCE_BINDINGS__
  return Array.isArray(bindings) ? bindings : []
}

/**
 * Returns an object that allows a resource identifier to be looked up based on its name in a blueprint.
 *
 * ```
 * resourceRef.project('my-project') // returns the project ID
 * ```
 */
export function createResourceRef(): ResourceRef {
  const bindings = getBindings()

  function lookup(resourceType: keyof ResourceRef): (name: string) => string {
    return (name: string) => {
      const data = RESOURCE_CONFIG_MAP[resourceType]
      const found = bindings.find((b) => b.name === name && b.type === data.type)
      if (!found) {
        throw new Error(`Unable to find ${resourceType} with name ${name}`)
      }
      if (data.hasProjectPrefix && found.id.includes(':')) {
        return found.id.split(':')[1]
      }
      return found.id
    }
  }

  return {
    cors: lookup('cors'),
    dataset: lookup('dataset'),
    project: lookup('project'),
    role: lookup('role'),
    studio: lookup('studio'),
  }
}
