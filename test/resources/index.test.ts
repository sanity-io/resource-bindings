import assert from 'node:assert/strict'
import {afterEach, describe, it} from 'node:test'

import {createResourceRef, type ResourceRef} from '../../src/index.ts'

const BINDINGS = [
  {id: 'project-2:cors-1', name: 'localhost', type: 'sanity.project.cors'},
  {id: 'project-2:dataset-1', name: 'production', type: 'sanity.project.dataset'},
  {id: 'project-1', name: 'my-project', type: 'sanity.project'},
  {id: 'role-1', name: 'editor', type: 'sanity.access.role'},
  {id: 'studio-1', name: 'my-studio', type: 'sanity.studio'},
  // Deliberately reuses the `my-project` name under a different type, so the
  // tests can prove lookups are scoped by type and not by name alone.
  {id: 'project-2:dataset-2', name: 'my-project', type: 'sanity.project.dataset'},
]

/**
 * The deploy-time-baked module sets `globalThis.__SANITY_RESOURCE_BINDINGS__`
 * before any app code runs, and `createResourceRef()` reads it on call. Setting
 * the global (or leaving it unset) reproduces every deployment shape.
 */
function setBindings(bindings?: unknown): ResourceRef {
  globalThis.__SANITY_RESOURCE_BINDINGS__ = bindings as never
  return createResourceRef()
}

afterEach(() => {
  // The global is shared across tests, so clear it or it leaks into the next.
  globalThis.__SANITY_RESOURCE_BINDINGS__ = undefined
})

describe('resourceRef', () => {
  it('should have functions for each resource type', () => {
    const resourceRef = setBindings(BINDINGS)
    const types = ['cors', 'dataset', 'project', 'role', 'studio']
    for (const t of types) {
      assert.ok(t in resourceRef, `expected resourceRef to have a "${t}" function`)
    }
  })

  it('resolves ids from the module-graph bindings for every resource type', () => {
    const resourceRef = setBindings(BINDINGS)

    assert.strictEqual(resourceRef.cors('localhost'), 'cors-1')
    assert.strictEqual(resourceRef.dataset('production'), 'dataset-1')
    assert.strictEqual(resourceRef.project('my-project'), 'project-1')
    assert.strictEqual(resourceRef.role('editor'), 'role-1')
    assert.strictEqual(resourceRef.studio('my-studio'), 'studio-1')
  })

  it('scopes lookups by resource type when a name is used more than once', () => {
    const resourceRef = setBindings(BINDINGS)

    assert.strictEqual(resourceRef.project('my-project'), 'project-1')
    assert.strictEqual(resourceRef.dataset('my-project'), 'dataset-2')
    // `localhost` only exists as a cors binding, so asking for it as a dataset
    // must not fall back to matching on name alone.
    assert.throws(() => resourceRef.dataset('localhost'), /Unable to find dataset with name/)
  })

  it('throws a named error when the binding is missing', () => {
    const resourceRef = setBindings(BINDINGS)

    assert.throws(() => resourceRef.project('nope'), /Unable to find project with name nope/)
  })

  it('treats an unset global as having no bindings', () => {
    const resourceRef = createResourceRef()

    assert.throws(() => resourceRef.project('my-project'), /Unable to find project with name my-project/)
  })

  it('treats a non-array global as having no bindings', () => {
    // A malformed or partially-baked global must not take the studio down; it
    // degrades to "no bindings" instead.
    const resourceRef = setBindings('{not an array')

    assert.throws(() => resourceRef.project('my-project'), /Unable to find project with name my-project/)
  })
})
