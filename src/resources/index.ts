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
 * A map of supported resource types to their blueprint-specific information.
 */
const RESOURCE_MAP: Record<keyof ResourceRef, {type: string}> = {
  cors: {type: 'sanity.project.cors'},
  dataset: {type: 'sanity.project.dataset'},
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
    console.log('parsing:', el?.textContent.substring(0, 20) ?? 'not found')
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
      const data = RESOURCE_MAP[resourceType]
      const found = bindings.find((b) => b.name === name && b.type === data.type)
      console.log('lookup', name, resourceType, found)
      if (!found) {
        throw new Error(`Unable to find ${resourceType} with name ${name}`)
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
