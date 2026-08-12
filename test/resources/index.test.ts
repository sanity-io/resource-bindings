import assert from 'node:assert/strict'
import {afterEach, describe, it} from 'node:test'

import {createResourceRef, type ResourceRef} from '../../src/index.ts'

const SCRIPT_ID = 'sanity-resource-bindings'

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
 * The node test runner has no DOM, and the module under test only ever reads
 * `document.getElementById(...)?.textContent`, so a tiny stub covers it. It is
 * installed as a global before any dynamic import of the module below.
 */
interface StubElement {
  id: string
  type: string
  textContent: string | null
  remove: () => void
}

const elementsById = new Map<string, StubElement>()

globalThis.document = {
  createElement(): StubElement {
    const el: StubElement = {
      id: '',
      type: '',
      textContent: null,
      remove: () => {
        elementsById.delete(el.id)
      },
    }
    return el
  },
  getElementById(id: string): StubElement | null {
    return elementsById.get(id) ?? null
  },
  body: {
    appendChild(el: StubElement): StubElement {
      elementsById.set(el.id, el)
      return el
    },
  },
} as unknown as Document

/**
 * The module reads the `<script>` element and builds `resourceRef` at *import*
 * time, so the bindings have to be in the DOM before the module is evaluated.
 * Node's ESM cache is permanent and has no `vi.resetModules()` equivalent, so a
 * unique query string is appended to force a fresh evaluation of the module's
 * top-level code against the DOM as it stands right now.
 *
 * Passing no argument omits the script element entirely, which is what a studio
 * built without blueprint resource bindings looks like.
 */
async function loadResourceRef(scriptContent?: string): Promise<ResourceRef> {
  if (typeof scriptContent === 'string') {
    const el = document.createElement('script')
    el.id = SCRIPT_ID
    el.type = 'application/json'
    el.textContent = scriptContent
    document.body.appendChild(el)
  }

  return createResourceRef()
}

afterEach(() => {
  // The stubbed `document` is shared by every test in this file, so the injected
  // element has to be removed or it leaks into the next test.
  document.getElementById(SCRIPT_ID)?.remove()
})

describe('resourceRef', () => {
  it('should have functions for each resource type', async () => {
    const resourceRef = await loadResourceRef(JSON.stringify(BINDINGS))
    const types = ['cors', 'dataset', 'project', 'role', 'studio']
    for (const t of types) {
      assert.ok(t in resourceRef, `expected resourceRef to have a "${t}" function`)
    }
  })

  it('resolves ids from the parsed script element for every resource type', async () => {
    const resourceRef = await loadResourceRef(JSON.stringify(BINDINGS))

    assert.strictEqual(resourceRef.cors('localhost'), 'cors-1')
    assert.strictEqual(resourceRef.dataset('production'), 'dataset-1')
    assert.strictEqual(resourceRef.project('my-project'), 'project-1')
    assert.strictEqual(resourceRef.role('editor'), 'role-1')
    assert.strictEqual(resourceRef.studio('my-studio'), 'studio-1')
  })

  it('scopes lookups by resource type when a name is used more than once', async () => {
    const resourceRef = await loadResourceRef(JSON.stringify(BINDINGS))

    assert.strictEqual(resourceRef.project('my-project'), 'project-1')
    assert.strictEqual(resourceRef.dataset('my-project'), 'dataset-2')
    // `localhost` only exists as a cors binding, so asking for it as a dataset
    // must not fall back to matching on name alone.
    assert.throws(() => resourceRef.dataset('localhost'), /Unable to find dataset with name/)
  })

  it('throws a named error when the binding is missing', async () => {
    const resourceRef = await loadResourceRef(JSON.stringify(BINDINGS))

    assert.throws(() => resourceRef.project('nope'), /Unable to find project with name nope/)
  })

  it('treats a missing script element as having no bindings', async () => {
    const resourceRef = await loadResourceRef()

    assert.throws(() => resourceRef.project('my-project'), /Unable to find project with name my-project/)
  })

  it('treats an empty script element as having no bindings', async () => {
    const resourceRef = await loadResourceRef('')

    assert.throws(() => resourceRef.project('my-project'), /Unable to find project with name my-project/)
  })

  it('does not fail at import time when the script content is not valid JSON', async () => {
    // A truncated or HTML-escaped payload must not take the whole studio down
    // at module evaluation; it degrades to "no bindings" instead.
    const resourceRef = await loadResourceRef('{not json')

    assert.throws(() => resourceRef.project('my-project'), /Unable to find project with name my-project/)
  })
})
