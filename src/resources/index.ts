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
 * The shape of the resources in the script element
 */
interface ResourceBinding {
  id: string
  name: string
  type: string
}

function getBindings(): ResourceBinding[] {
  let bindings: ResourceBinding[]
  const el = document.getElementById('sanity-resource-bindings')
  try {
    bindings = el ? (JSON.parse(el.textContent || '[]') as ResourceBinding[]) : []
  } catch {
    bindings = []
  }
  return bindings
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
