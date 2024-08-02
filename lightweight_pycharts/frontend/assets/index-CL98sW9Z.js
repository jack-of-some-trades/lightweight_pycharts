true && function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
      }
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
}();

const equalFn = (a, b) => a === b;
const $PROXY = Symbol("solid-proxy");
const $TRACK = Symbol("solid-track");
const signalOptions = {
  equals: equalFn
};
let runEffects = runQueue;
const STALE = 1;
const PENDING = 2;
const UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
const NO_INIT = {};
var Owner = null;
let Transition = null;
let ExternalSourceConfig = null;
let Listener = null;
let Updates = null;
let Effects = null;
let ExecCount = 0;
function createRoot(fn, detachedOwner) {
  const listener = Listener,
    owner = Owner,
    unowned = fn.length === 0,
    current = detachedOwner === undefined ? owner : detachedOwner,
    root = unowned
      ? UNOWNED
      : {
          owned: null,
          cleanups: null,
          context: current ? current.context : null,
          owner: current
        },
    updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
  Owner = root;
  Listener = null;
  try {
    return runUpdates(updateFn, true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    comparator: options.equals || undefined
  };
  const setter = value => {
    if (typeof value === "function") {
      value = value(s.value);
    }
    return writeSignal(s, value);
  };
  return [readSignal.bind(s), setter];
}
function createComputed(fn, value, options) {
  const c = createComputation(fn, value, true, STALE);
  updateComputation(c);
}
function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  updateComputation(c);
}
function createEffect(fn, value, options) {
  runEffects = runUserEffects;
  const c = createComputation(fn, value, false, STALE);
  c.user = true;
  Effects ? Effects.push(c) : updateComputation(c);
}
function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || undefined;
  updateComputation(c);
  return readSignal.bind(c);
}
function isPromise(v) {
  return v && typeof v === "object" && "then" in v;
}
function createResource(pSource, pFetcher, pOptions) {
  let source;
  let fetcher;
  let options;
  if ((arguments.length === 2 && typeof pFetcher === "object") || arguments.length === 1) {
    source = true;
    fetcher = pSource;
    options = {};
  } else {
    source = pSource;
    fetcher = pFetcher;
    options = {};
  }
  let pr = null,
    initP = NO_INIT,
    scheduled = false,
    resolved = "initialValue" in options,
    dynamic = typeof source === "function" && createMemo(source);
  const contexts = new Set(),
    [value, setValue] = (options.storage || createSignal)(options.initialValue),
    [error, setError] = createSignal(undefined),
    [track, trigger] = createSignal(undefined, {
      equals: false
    }),
    [state, setState] = createSignal(resolved ? "ready" : "unresolved");
  function loadEnd(p, v, error, key) {
    if (pr === p) {
      pr = null;
      key !== undefined && (resolved = true);
      if ((p === initP || v === initP) && options.onHydrated)
        queueMicrotask(() =>
          options.onHydrated(key, {
            value: v
          })
        );
      initP = NO_INIT;
      completeLoad(v, error);
    }
    return v;
  }
  function completeLoad(v, err) {
    runUpdates(() => {
      if (err === undefined) setValue(() => v);
      setState(err !== undefined ? "errored" : resolved ? "ready" : "unresolved");
      setError(err);
      for (const c of contexts.keys()) c.decrement();
      contexts.clear();
    }, false);
  }
  function read() {
    const c = SuspenseContext ,
      v = value(),
      err = error();
    if (err !== undefined && !pr) throw err;
    if (Listener && !Listener.user && c) {
      createComputed(() => {
        track();
        if (pr) {
          if (c.resolved  ) ;
          else if (!contexts.has(c)) {
            c.increment();
            contexts.add(c);
          }
        }
      });
    }
    return v;
  }
  function load(refetching = true) {
    if (refetching !== false && scheduled) return;
    scheduled = false;
    const lookup = dynamic ? dynamic() : source;
    if (lookup == null || lookup === false) {
      loadEnd(pr, untrack(value));
      return;
    }
    const p =
      initP !== NO_INIT
        ? initP
        : untrack(() =>
            fetcher(lookup, {
              value: value(),
              refetching
            })
          );
    if (!isPromise(p)) {
      loadEnd(pr, p, undefined, lookup);
      return p;
    }
    pr = p;
    if ("value" in p) {
      if (p.status === "success") loadEnd(pr, p.value, undefined, lookup);
      else loadEnd(pr, undefined, undefined, lookup);
      return p;
    }
    scheduled = true;
    queueMicrotask(() => (scheduled = false));
    runUpdates(() => {
      setState(resolved ? "refreshing" : "pending");
      trigger();
    }, false);
    return p.then(
      v => loadEnd(p, v, undefined, lookup),
      e => loadEnd(p, undefined, castError(e), lookup)
    );
  }
  Object.defineProperties(read, {
    state: {
      get: () => state()
    },
    error: {
      get: () => error()
    },
    loading: {
      get() {
        const s = state();
        return s === "pending" || s === "refreshing";
      }
    },
    latest: {
      get() {
        if (!resolved) return read();
        const err = error();
        if (err && !pr) throw err;
        return value();
      }
    }
  });
  if (dynamic) createComputed(() => load(false));
  else load(false);
  return [
    read,
    {
      refetch: load,
      mutate: setValue
    }
  ];
}
function batch(fn) {
  return runUpdates(fn, false);
}
function untrack(fn) {
  if (Listener === null) return fn();
  const listener = Listener;
  Listener = null;
  try {
    if (ExternalSourceConfig) ;
    return fn();
  } finally {
    Listener = listener;
  }
}
function on$1(deps, fn, options) {
  const isArray = Array.isArray(deps);
  let prevInput;
  return prevValue => {
    let input;
    if (isArray) {
      input = Array(deps.length);
      for (let i = 0; i < deps.length; i++) input[i] = deps[i]();
    } else input = deps();
    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}
function onMount(fn) {
  createEffect(() => untrack(fn));
}
function onCleanup(fn) {
  if (Owner === null);
  else if (Owner.cleanups === null) Owner.cleanups = [fn];
  else Owner.cleanups.push(fn);
  return fn;
}
function getListener() {
  return Listener;
}
function createContext(defaultValue, options) {
  const id = Symbol("context");
  return {
    id,
    Provider: createProvider(id),
    defaultValue
  };
}
function useContext(context) {
  return Owner && Owner.context && Owner.context[context.id] !== undefined
    ? Owner.context[context.id]
    : context.defaultValue;
}
function children(fn) {
  const children = createMemo(fn);
  const memo = createMemo(() => resolveChildren(children()));
  memo.toArray = () => {
    const c = memo();
    return Array.isArray(c) ? c : c != null ? [c] : [];
  };
  return memo;
}
let SuspenseContext;
function readSignal() {
  if (this.sources && (this.state)) {
    if ((this.state) === STALE) updateComputation(this);
    else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(this), false);
      Updates = updates;
    }
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  return this.value;
}
function writeSignal(node, value, isComp) {
  let current =
    node.value;
  if (!node.comparator || !node.comparator(current, value)) {
    node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          const TransitionRunning = Transition && Transition.running;
          if (TransitionRunning && Transition.disposed.has(o)) ;
          if (TransitionRunning ? !o.tState : !o.state) {
            if (o.pure) Updates.push(o);
            else Effects.push(o);
            if (o.observers) markDownstream(o);
          }
          if (!TransitionRunning) o.state = STALE;
        }
        if (Updates.length > 10e5) {
          Updates = [];
          if (false);
          throw new Error();
        }
      }, false);
    }
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn) return;
  cleanNode(node);
  const time = ExecCount;
  runComputation(
    node,
    node.value,
    time
  );
}
function runComputation(node, value, time) {
  let nextValue;
  const owner = Owner,
    listener = Listener;
  Listener = Owner = node;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    if (node.pure) {
      {
        node.state = STALE;
        node.owned && node.owned.forEach(cleanNode);
        node.owned = null;
      }
    }
    node.updatedAt = time + 1;
    return handleError(err);
  } finally {
    Listener = listener;
    Owner = owner;
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.updatedAt != null && "observers" in node) {
      writeSignal(node, nextValue);
    } else node.value = nextValue;
    node.updatedAt = time;
  }
}
function createComputation(fn, init, pure, state = STALE, options) {
  const c = {
    fn,
    state: state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: Owner ? Owner.context : null,
    pure
  };
  if (Owner === null);
  else if (Owner !== UNOWNED) {
    {
      if (!Owner.owned) Owner.owned = [c];
      else Owner.owned.push(c);
    }
  }
  return c;
}
function runTop(node) {
  if ((node.state) === 0) return;
  if ((node.state) === PENDING) return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (node.state) ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if ((node.state) === STALE) {
      updateComputation(node);
    } else if ((node.state) === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(node, ancestors[0]), false);
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;
  else Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    handleError(err);
  }
}
function completeUpdates(wait) {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }
  if (wait) return;
  const e = Effects;
  Effects = null;
  if (e.length) runUpdates(() => runEffects(e), false);
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}
function runUserEffects(queue) {
  let i,
    userLength = 0;
  for (i = 0; i < queue.length; i++) {
    const e = queue[i];
    if (!e.user) runTop(e);
    else queue[userLength++] = e;
  }
  for (i = 0; i < userLength; i++) runTop(queue[i]);
}
function lookUpstream(node, ignore) {
  node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      const state = source.state;
      if (state === STALE) {
        if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount))
          runTop(source);
      } else if (state === PENDING) lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (!o.state) {
      o.state = PENDING;
      if (o.pure) Updates.push(o);
      else Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(),
        index = node.sourceSlots.pop(),
        obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(),
          s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (node.owned) {
    for (i = node.owned.length - 1; i >= 0; i--) cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = node.cleanups.length - 1; i >= 0; i--) node.cleanups[i]();
    node.cleanups = null;
  }
  node.state = 0;
}
function castError(err) {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error", {
    cause: err
  });
}
function handleError(err, owner = Owner) {
  const error = castError(err);
  throw error;
}
function resolveChildren(children) {
  if (typeof children === "function" && !children.length) return resolveChildren(children());
  if (Array.isArray(children)) {
    const results = [];
    for (let i = 0; i < children.length; i++) {
      const result = resolveChildren(children[i]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }
    return results;
  }
  return children;
}
function createProvider(id, options) {
  return function provider(props) {
    let res;
    createRenderEffect(
      () =>
        (res = untrack(() => {
          Owner.context = {
            ...Owner.context,
            [id]: props.value
          };
          return children(() => props.children);
        })),
      undefined
    );
    return res;
  };
}

const FALLBACK = Symbol("fallback");
function dispose(d) {
  for (let i = 0; i < d.length; i++) d[i]();
}
function mapArray(list, mapFn, options = {}) {
  let items = [],
    mapped = [],
    disposers = [],
    len = 0,
    indexes = mapFn.length > 1 ? [] : null;
  onCleanup(() => dispose(disposers));
  return () => {
    let newItems = list() || [],
      i,
      j;
    newItems[$TRACK];
    return untrack(() => {
      let newLen = newItems.length,
        newIndices,
        newIndicesNext,
        temp,
        tempdisposers,
        tempIndexes,
        start,
        end,
        newEnd,
        item;
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          indexes && (indexes = []);
        }
        if (options.fallback) {
          items = [FALLBACK];
          mapped[0] = createRoot(disposer => {
            disposers[0] = disposer;
            return options.fallback();
          });
          len = 1;
        }
      } else if (len === 0) {
        mapped = new Array(newLen);
        for (j = 0; j < newLen; j++) {
          items[j] = newItems[j];
          mapped[j] = createRoot(mapper);
        }
        len = newLen;
      } else {
        temp = new Array(newLen);
        tempdisposers = new Array(newLen);
        indexes && (tempIndexes = new Array(newLen));
        for (
          start = 0, end = Math.min(len, newLen);
          start < end && items[start] === newItems[start];
          start++
        );
        for (
          end = len - 1, newEnd = newLen - 1;
          end >= start && newEnd >= start && items[end] === newItems[newEnd];
          end--, newEnd--
        ) {
          temp[newEnd] = mapped[end];
          tempdisposers[newEnd] = disposers[end];
          indexes && (tempIndexes[newEnd] = indexes[end]);
        }
        newIndices = new Map();
        newIndicesNext = new Array(newEnd + 1);
        for (j = newEnd; j >= start; j--) {
          item = newItems[j];
          i = newIndices.get(item);
          newIndicesNext[j] = i === undefined ? -1 : i;
          newIndices.set(item, j);
        }
        for (i = start; i <= end; i++) {
          item = items[i];
          j = newIndices.get(item);
          if (j !== undefined && j !== -1) {
            temp[j] = mapped[i];
            tempdisposers[j] = disposers[i];
            indexes && (tempIndexes[j] = indexes[i]);
            j = newIndicesNext[j];
            newIndices.set(item, j);
          } else disposers[i]();
        }
        for (j = start; j < newLen; j++) {
          if (j in temp) {
            mapped[j] = temp[j];
            disposers[j] = tempdisposers[j];
            if (indexes) {
              indexes[j] = tempIndexes[j];
              indexes[j](j);
            }
          } else mapped[j] = createRoot(mapper);
        }
        mapped = mapped.slice(0, (len = newLen));
        items = newItems.slice(0);
      }
      return mapped;
    });
    function mapper(disposer) {
      disposers[j] = disposer;
      if (indexes) {
        const [s, set] = createSignal(j);
        indexes[j] = set;
        return mapFn(newItems[j], s);
      }
      return mapFn(newItems[j]);
    }
  };
}
function createComponent(Comp, props) {
  return untrack(() => Comp(props || {}));
}
function trueFn() {
  return true;
}
const propTraps = {
  get(_, property, receiver) {
    if (property === $PROXY) return receiver;
    return _.get(property);
  },
  has(_, property) {
    if (property === $PROXY) return true;
    return _.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn
    };
  },
  ownKeys(_) {
    return _.keys();
  }
};
function resolveSource(s) {
  return !(s = typeof s === "function" ? s() : s) ? {} : s;
}
function resolveSources() {
  for (let i = 0, length = this.length; i < length; ++i) {
    const v = this[i]();
    if (v !== undefined) return v;
  }
}
function mergeProps(...sources) {
  let proxy = false;
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    proxy = proxy || (!!s && $PROXY in s);
    sources[i] = typeof s === "function" ? ((proxy = true), createMemo(s)) : s;
  }
  if (proxy) {
    return new Proxy(
      {
        get(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            const v = resolveSource(sources[i])[property];
            if (v !== undefined) return v;
          }
        },
        has(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            if (property in resolveSource(sources[i])) return true;
          }
          return false;
        },
        keys() {
          const keys = [];
          for (let i = 0; i < sources.length; i++)
            keys.push(...Object.keys(resolveSource(sources[i])));
          return [...new Set(keys)];
        }
      },
      propTraps
    );
  }
  const sourcesMap = {};
  const defined = Object.create(null);
  for (let i = sources.length - 1; i >= 0; i--) {
    const source = sources[i];
    if (!source) continue;
    const sourceKeys = Object.getOwnPropertyNames(source);
    for (let i = sourceKeys.length - 1; i >= 0; i--) {
      const key = sourceKeys[i];
      if (key === "__proto__" || key === "constructor") continue;
      const desc = Object.getOwnPropertyDescriptor(source, key);
      if (!defined[key]) {
        defined[key] = desc.get
          ? {
              enumerable: true,
              configurable: true,
              get: resolveSources.bind((sourcesMap[key] = [desc.get.bind(source)]))
            }
          : desc.value !== undefined
          ? desc
          : undefined;
      } else {
        const sources = sourcesMap[key];
        if (sources) {
          if (desc.get) sources.push(desc.get.bind(source));
          else if (desc.value !== undefined) sources.push(() => desc.value);
        }
      }
    }
  }
  const target = {};
  const definedKeys = Object.keys(defined);
  for (let i = definedKeys.length - 1; i >= 0; i--) {
    const key = definedKeys[i],
      desc = defined[key];
    if (desc && desc.get) Object.defineProperty(target, key, desc);
    else target[key] = desc ? desc.value : undefined;
  }
  return target;
}
function splitProps(props, ...keys) {
  if ($PROXY in props) {
    const blocked = new Set(keys.length > 1 ? keys.flat() : keys[0]);
    const res = keys.map(k => {
      return new Proxy(
        {
          get(property) {
            return k.includes(property) ? props[property] : undefined;
          },
          has(property) {
            return k.includes(property) && property in props;
          },
          keys() {
            return k.filter(property => property in props);
          }
        },
        propTraps
      );
    });
    res.push(
      new Proxy(
        {
          get(property) {
            return blocked.has(property) ? undefined : props[property];
          },
          has(property) {
            return blocked.has(property) ? false : property in props;
          },
          keys() {
            return Object.keys(props).filter(k => !blocked.has(k));
          }
        },
        propTraps
      )
    );
    return res;
  }
  const otherObject = {};
  const objects = keys.map(() => ({}));
  for (const propName of Object.getOwnPropertyNames(props)) {
    const desc = Object.getOwnPropertyDescriptor(props, propName);
    const isDefaultDesc =
      !desc.get && !desc.set && desc.enumerable && desc.writable && desc.configurable;
    let blocked = false;
    let objectIndex = 0;
    for (const k of keys) {
      if (k.includes(propName)) {
        blocked = true;
        isDefaultDesc
          ? (objects[objectIndex][propName] = desc.value)
          : Object.defineProperty(objects[objectIndex], propName, desc);
      }
      ++objectIndex;
    }
    if (!blocked) {
      isDefaultDesc
        ? (otherObject[propName] = desc.value)
        : Object.defineProperty(otherObject, propName, desc);
    }
  }
  return [...objects, otherObject];
}

const narrowedError = name => `Stale read from <${name}>.`;
function For(props) {
  const fallback = "fallback" in props && {
    fallback: () => props.fallback
  };
  return createMemo(mapArray(() => props.each, props.children, fallback || undefined));
}
function Show(props) {
  const keyed = props.keyed;
  const condition = createMemo(() => props.when, undefined, {
    equals: (a, b) => (keyed ? a === b : !a === !b)
  });
  return createMemo(
    () => {
      const c = condition();
      if (c) {
        const child = props.children;
        const fn = typeof child === "function" && child.length > 0;
        return fn
          ? untrack(() =>
              child(
                keyed
                  ? c
                  : () => {
                      if (!untrack(condition)) throw narrowedError("Show");
                      return props.when;
                    }
              )
            )
          : child;
      }
      return props.fallback;
    },
    undefined,
    undefined
  );
}

const booleans = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "hidden",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected"
];
const Properties = /*#__PURE__*/ new Set([
  "className",
  "value",
  "readOnly",
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  ...booleans
]);
const ChildProperties = /*#__PURE__*/ new Set([
  "innerHTML",
  "textContent",
  "innerText",
  "children"
]);
const Aliases = /*#__PURE__*/ Object.assign(Object.create(null), {
  className: "class",
  htmlFor: "for"
});
const PropAliases = /*#__PURE__*/ Object.assign(Object.create(null), {
  class: "className",
  formnovalidate: {
    $: "formNoValidate",
    BUTTON: 1,
    INPUT: 1
  },
  ismap: {
    $: "isMap",
    IMG: 1
  },
  nomodule: {
    $: "noModule",
    SCRIPT: 1
  },
  playsinline: {
    $: "playsInline",
    VIDEO: 1
  },
  readonly: {
    $: "readOnly",
    INPUT: 1,
    TEXTAREA: 1
  }
});
function getPropAlias(prop, tagName) {
  const a = PropAliases[prop];
  return typeof a === "object" ? (a[tagName] ? a["$"] : undefined) : a;
}
const DelegatedEvents = /*#__PURE__*/ new Set([
  "beforeinput",
  "click",
  "dblclick",
  "contextmenu",
  "focusin",
  "focusout",
  "input",
  "keydown",
  "keyup",
  "mousedown",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "pointerdown",
  "pointermove",
  "pointerout",
  "pointerover",
  "pointerup",
  "touchend",
  "touchmove",
  "touchstart"
]);
const SVGNamespace = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace"
};

function reconcileArrays(parentNode, a, b) {
  let bLength = b.length,
    aEnd = a.length,
    bEnd = bLength,
    aStart = 0,
    bStart = 0,
    after = a[aEnd - 1].nextSibling,
    map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    if (aEnd === aStart) {
      const node = bEnd < bLength ? (bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart]) : after;
      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = new Map();
        let i = bStart;
        while (i < bEnd) map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart,
            sequence = 1,
            t;
          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence) break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) parentNode.insertBefore(b[bStart++], node);
          } else parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else aStart++;
      } else a[aStart++].remove();
    }
  }
}

const $$EVENTS = "_$DX_DELEGATE";
function render(code, element, init, options = {}) {
  let disposer;
  createRoot(dispose => {
    disposer = dispose;
    element === document
      ? code()
      : insert(element, code(), element.firstChild ? null : undefined, init);
  }, options.owner);
  return () => {
    disposer();
    element.textContent = "";
  };
}
function template(html, isCE, isSVG) {
  let node;
  const create = () => {
    const t = document.createElement("template");
    t.innerHTML = html;
    return t.content.firstChild;
  };
  const fn = () => (node || (node = create())).cloneNode(true);
  fn.cloneNode = fn;
  return fn;
}
function delegateEvents(eventNames, document = window.document) {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}
function setAttribute(node, name, value) {
  if (value == null) node.removeAttribute(name);
  else node.setAttribute(name, value);
}
function setAttributeNS(node, namespace, name, value) {
  if (value == null) node.removeAttributeNS(namespace, name);
  else node.setAttributeNS(namespace, name, value);
}
function className(node, value) {
  if (value == null) node.removeAttribute("class");
  else node.className = value;
}
function addEventListener(node, name, handler, delegate) {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    const handlerFn = handler[0];
    node.addEventListener(name, (handler[0] = e => handlerFn.call(node, handler[1], e)));
  } else node.addEventListener(name, handler);
}
function classList(node, value, prev = {}) {
  const classKeys = Object.keys(value || {}),
    prevKeys = Object.keys(prev);
  let i, len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === "undefined" || value[key]) continue;
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
    toggleClassKey(node, key, true);
    prev[key] = classValue;
  }
  return prev;
}
function style(node, value, prev) {
  if (!value) return prev ? setAttribute(node, "style") : value;
  const nodeStyle = node.style;
  if (typeof value === "string") return (nodeStyle.cssText = value);
  typeof prev === "string" && (nodeStyle.cssText = prev = undefined);
  prev || (prev = {});
  value || (value = {});
  let v, s;
  for (s in prev) {
    value[s] == null && nodeStyle.removeProperty(s);
    delete prev[s];
  }
  for (s in value) {
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}
function spread(node, props = {}, isSVG, skipChildren) {
  const prevProps = {};
  if (!skipChildren) {
    createRenderEffect(
      () => (prevProps.children = insertExpression(node, props.children, prevProps.children))
    );
  }
  createRenderEffect(() =>
    typeof props.ref === "function" ? use(props.ref, node) : (props.ref = node)
  );
  createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
  return prevProps;
}
function use(fn, element, arg) {
  return untrack(() => fn(element, arg));
}
function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
}
function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
  props || (props = {});
  for (const prop in prevProps) {
    if (!(prop in props)) {
      if (prop === "children") continue;
      prevProps[prop] = assignProp(node, prop, null, prevProps[prop], isSVG, skipRef);
    }
  }
  for (const prop in props) {
    if (prop === "children") {
      continue;
    }
    const value = props[prop];
    prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef);
  }
}
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}
function toggleClassKey(node, key, value) {
  const classNames = key.trim().split(/\s+/);
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++)
    node.classList.toggle(classNames[i], value);
}
function assignProp(node, prop, value, prev, isSVG, skipRef) {
  let isCE, isProp, isChildProp, propAlias, forceProp;
  if (prop === "style") return style(node, value, prev);
  if (prop === "classList") return classList(node, value, prev);
  if (value === prev) return prev;
  if (prop === "ref") {
    if (!skipRef) value(node);
  } else if (prop.slice(0, 3) === "on:") {
    const e = prop.slice(3);
    prev && node.removeEventListener(e, prev);
    value && node.addEventListener(e, value);
  } else if (prop.slice(0, 10) === "oncapture:") {
    const e = prop.slice(10);
    prev && node.removeEventListener(e, prev, true);
    value && node.addEventListener(e, value, true);
  } else if (prop.slice(0, 2) === "on") {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    if (!delegate && prev) {
      const h = Array.isArray(prev) ? prev[0] : prev;
      node.removeEventListener(name, h);
    }
    if (delegate || value) {
      addEventListener(node, name, value, delegate);
      delegate && delegateEvents([name]);
    }
  } else if (prop.slice(0, 5) === "attr:") {
    setAttribute(node, prop.slice(5), value);
  } else if (
    (forceProp = prop.slice(0, 5) === "prop:") ||
    (isChildProp = ChildProperties.has(prop)) ||
    (!isSVG &&
      ((propAlias = getPropAlias(prop, node.tagName)) || (isProp = Properties.has(prop)))) ||
    (isCE = node.nodeName.includes("-"))
  ) {
    if (forceProp) {
      prop = prop.slice(5);
      isProp = true;
    }
    if (prop === "class" || prop === "className") className(node, value);
    else if (isCE && !isProp && !isChildProp) node[toPropertyName(prop)] = value;
    else node[propAlias || prop] = value;
  } else {
    const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
    if (ns) setAttributeNS(node, ns, prop, value);
    else setAttribute(node, Aliases[prop] || prop, value);
  }
  return value;
}
function eventHandler(e) {
  const key = `$$${e.type}`;
  let node = (e.composedPath && e.composedPath()[0]) || e.target;
  if (e.target !== node) {
    Object.defineProperty(e, "target", {
      configurable: true,
      value: node
    });
  }
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  while (node) {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== undefined ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble) return;
    }
    node = node._$host || node.parentNode || node.host;
  }
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  while (typeof current === "function") current = current();
  if (value === current) return current;
  const t = typeof value,
    multi = marker !== undefined;
  parent = (multi && current[0] && current[0].parentNode) || parent;
  if (t === "string" || t === "number") {
    if (t === "number") value = value.toString();
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data !== value && (node.data = value);
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v = value();
      while (typeof v === "function") v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    const currentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(array, value, current, unwrapArray)) {
      createRenderEffect(() => (current = insertExpression(parent, array, current, marker, true)));
      return () => current;
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else reconcileArrays(parent, current, array);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value.nodeType) {
    if (Array.isArray(current)) {
      if (multi) return (current = cleanChildren(parent, current, marker, value));
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else;
  return current;
}
function normalizeIncomingArray(normalized, array, current, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i],
      prev = current && current[normalized.length],
      t;
    if (item == null || item === true || item === false);
    else if ((t = typeof item) === "object" && item.nodeType) {
      normalized.push(item);
    } else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
    } else if (t === "function") {
      if (unwrap) {
        while (typeof item === "function") item = item();
        dynamic =
          normalizeIncomingArray(
            normalized,
            Array.isArray(item) ? item : [item],
            Array.isArray(prev) ? prev : [prev]
          ) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      const value = String(item);
      if (prev && prev.nodeType === 3 && prev.data === value) normalized.push(prev);
      else normalized.push(document.createTextNode(value));
    }
  }
  return dynamic;
}
function appendNodes(parent, array, marker = null) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return (parent.textContent = "");
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i)
          isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
        else isParent && el.remove();
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
}

const $RAW = Symbol("store-raw"),
  $NODE = Symbol("store-node"),
  $HAS = Symbol("store-has"),
  $SELF = Symbol("store-self");
function wrap$1(value) {
  let p = value[$PROXY];
  if (!p) {
    Object.defineProperty(value, $PROXY, {
      value: (p = new Proxy(value, proxyTraps$1))
    });
    if (!Array.isArray(value)) {
      const keys = Object.keys(value),
        desc = Object.getOwnPropertyDescriptors(value);
      for (let i = 0, l = keys.length; i < l; i++) {
        const prop = keys[i];
        if (desc[prop].get) {
          Object.defineProperty(value, prop, {
            enumerable: desc[prop].enumerable,
            get: desc[prop].get.bind(p)
          });
        }
      }
    }
  }
  return p;
}
function isWrappable(obj) {
  let proto;
  return (
    obj != null &&
    typeof obj === "object" &&
    (obj[$PROXY] ||
      !(proto = Object.getPrototypeOf(obj)) ||
      proto === Object.prototype ||
      Array.isArray(obj))
  );
}
function unwrap(item, set = new Set()) {
  let result, unwrapped, v, prop;
  if ((result = item != null && item[$RAW])) return result;
  if (!isWrappable(item) || set.has(item)) return item;
  if (Array.isArray(item)) {
    if (Object.isFrozen(item)) item = item.slice(0);
    else set.add(item);
    for (let i = 0, l = item.length; i < l; i++) {
      v = item[i];
      if ((unwrapped = unwrap(v, set)) !== v) item[i] = unwrapped;
    }
  } else {
    if (Object.isFrozen(item)) item = Object.assign({}, item);
    else set.add(item);
    const keys = Object.keys(item),
      desc = Object.getOwnPropertyDescriptors(item);
    for (let i = 0, l = keys.length; i < l; i++) {
      prop = keys[i];
      if (desc[prop].get) continue;
      v = item[prop];
      if ((unwrapped = unwrap(v, set)) !== v) item[prop] = unwrapped;
    }
  }
  return item;
}
function getNodes(target, symbol) {
  let nodes = target[symbol];
  if (!nodes)
    Object.defineProperty(target, symbol, {
      value: (nodes = Object.create(null))
    });
  return nodes;
}
function getNode(nodes, property, value) {
  if (nodes[property]) return nodes[property];
  const [s, set] = createSignal(value, {
    equals: false,
    internal: true
  });
  s.$ = set;
  return (nodes[property] = s);
}
function proxyDescriptor$1(target, property) {
  const desc = Reflect.getOwnPropertyDescriptor(target, property);
  if (!desc || desc.get || !desc.configurable || property === $PROXY || property === $NODE)
    return desc;
  delete desc.value;
  delete desc.writable;
  desc.get = () => target[$PROXY][property];
  return desc;
}
function trackSelf(target) {
  getListener() && getNode(getNodes(target, $NODE), $SELF)();
}
function ownKeys(target) {
  trackSelf(target);
  return Reflect.ownKeys(target);
}
const proxyTraps$1 = {
  get(target, property, receiver) {
    if (property === $RAW) return target;
    if (property === $PROXY) return receiver;
    if (property === $TRACK) {
      trackSelf(target);
      return receiver;
    }
    const nodes = getNodes(target, $NODE);
    const tracked = nodes[property];
    let value = tracked ? tracked() : target[property];
    if (property === $NODE || property === $HAS || property === "__proto__") return value;
    if (!tracked) {
      const desc = Object.getOwnPropertyDescriptor(target, property);
      if (
        getListener() &&
        (typeof value !== "function" || target.hasOwnProperty(property)) &&
        !(desc && desc.get)
      )
        value = getNode(nodes, property, value)();
    }
    return isWrappable(value) ? wrap$1(value) : value;
  },
  has(target, property) {
    if (
      property === $RAW ||
      property === $PROXY ||
      property === $TRACK ||
      property === $NODE ||
      property === $HAS ||
      property === "__proto__"
    )
      return true;
    getListener() && getNode(getNodes(target, $HAS), property)();
    return property in target;
  },
  set() {
    return true;
  },
  deleteProperty() {
    return true;
  },
  ownKeys: ownKeys,
  getOwnPropertyDescriptor: proxyDescriptor$1
};
function setProperty(state, property, value, deleting = false) {
  if (!deleting && state[property] === value) return;
  const prev = state[property],
    len = state.length;
  if (value === undefined) {
    delete state[property];
    if (state[$HAS] && state[$HAS][property] && prev !== undefined) state[$HAS][property].$();
  } else {
    state[property] = value;
    if (state[$HAS] && state[$HAS][property] && prev === undefined) state[$HAS][property].$();
  }
  let nodes = getNodes(state, $NODE),
    node;
  if ((node = getNode(nodes, property, prev))) node.$(() => value);
  if (Array.isArray(state) && state.length !== len) {
    for (let i = state.length; i < len; i++) (node = nodes[i]) && node.$();
    (node = getNode(nodes, "length", len)) && node.$(state.length);
  }
  (node = nodes[$SELF]) && node.$();
}
function mergeStoreNode(state, value) {
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    setProperty(state, key, value[key]);
  }
}
function updateArray(current, next) {
  if (typeof next === "function") next = next(current);
  next = unwrap(next);
  if (Array.isArray(next)) {
    if (current === next) return;
    let i = 0,
      len = next.length;
    for (; i < len; i++) {
      const value = next[i];
      if (current[i] !== value) setProperty(current, i, value);
    }
    setProperty(current, "length", len);
  } else mergeStoreNode(current, next);
}
function updatePath(current, path, traversed = []) {
  let part,
    prev = current;
  if (path.length > 1) {
    part = path.shift();
    const partType = typeof part,
      isArray = Array.isArray(current);
    if (Array.isArray(part)) {
      for (let i = 0; i < part.length; i++) {
        updatePath(current, [part[i]].concat(path), traversed);
      }
      return;
    } else if (isArray && partType === "function") {
      for (let i = 0; i < current.length; i++) {
        if (part(current[i], i)) updatePath(current, [i].concat(path), traversed);
      }
      return;
    } else if (isArray && partType === "object") {
      const { from = 0, to = current.length - 1, by = 1 } = part;
      for (let i = from; i <= to; i += by) {
        updatePath(current, [i].concat(path), traversed);
      }
      return;
    } else if (path.length > 1) {
      updatePath(current[part], path, [part].concat(traversed));
      return;
    }
    prev = current[part];
    traversed = [part].concat(traversed);
  }
  let value = path[0];
  if (typeof value === "function") {
    value = value(prev, traversed);
    if (value === prev) return;
  }
  if (part === undefined && value == undefined) return;
  value = unwrap(value);
  if (part === undefined || (isWrappable(prev) && isWrappable(value) && !Array.isArray(value))) {
    mergeStoreNode(prev, value);
  } else setProperty(current, part, value);
}
function createStore(...[store, options]) {
  const unwrappedStore = unwrap(store || {});
  const isArray = Array.isArray(unwrappedStore);
  const wrappedStore = wrap$1(unwrappedStore);
  function setStore(...args) {
    batch(() => {
      isArray && args.length === 1
        ? updateArray(unwrappedStore, args[0])
        : updatePath(unwrappedStore, args);
    });
  }
  return [wrappedStore, setStore];
}

var _tmpl$$d = /* @__PURE__ */template(`<div id=overlay_manager>`),
  _tmpl$2$7 = /* @__PURE__ */template(`<div>`);
const default_ctx_args = {
  attachOverlay: () => {},
  detachOverlay: () => {},
  getDivReference: () => {
    return void 0;
  },
  setDivReference: () => {},
  getDisplaySetter: () => () => {},
  getDisplayAccessor: () => () => false
};
let OverlayContext = createContext(default_ctx_args);
function OverlayCTX() {
  return useContext(OverlayContext);
}
function OverlayContextProvider(props) {
  const [overlays, setOverlays] = createStore([]);
  const displayMap = /* @__PURE__ */new Map();
  const divMap = /* @__PURE__ */new Map();
  function attachOverlay(id, el, autohide = true) {
    setOverlays([...overlays, {
      id,
      el,
      hide: autohide
    }]);
    displayMap.set(id, createSignal(false));
  }
  function detachOverlay(id) {
    displayMap.delete(id);
    setOverlays(overlays.filter(overlay => overlay.id !== id));
  }
  function getDivReference(id) {
    return divMap.get(id);
  }
  function setDivReference(id, el) {
    divMap.set(id, el);
  }
  function getDisplayAccessor(id) {
    const display = displayMap.get(id);
    return display !== void 0 ? display[0] : () => false;
  }
  function getDisplaySetter(id) {
    const display = displayMap.get(id);
    return display !== void 0 ? display[1] : () => void 0;
  }
  document.body.addEventListener("mousedown", e => Array.from(overlays).forEach(({
    id,
    hide
  }) => {
    if (!hide) return;
    let el = getDivReference(id);
    if (el && !el.contains(e.target)) getDisplaySetter(id)(false);
  }));
  document.body.addEventListener("keydown", e => {
    if (e.key === "Escape") Array.from(overlays).forEach(({
      id,
      hide
    }) => {
      if (hide) getDisplaySetter(id)(false);
    });
  });
  const OverlayCTX2 = {
    attachOverlay,
    detachOverlay,
    getDivReference,
    setDivReference,
    getDisplaySetter,
    getDisplayAccessor
  };
  return createComponent(OverlayContext.Provider, {
    value: OverlayCTX2,
    get children() {
      return [createMemo(() => props.children), (() => {
        var _el$ = _tmpl$$d();
        insert(_el$, createComponent(For, {
          each: overlays,
          children: overlay => createComponent(Show, {
            get when() {
              return getDisplayAccessor(overlay.id)();
            },
            get children() {
              return overlay.el;
            }
          })
        }));
        return _el$;
      })()];
    }
  });
}
var location_reference = /* @__PURE__ */(location_reference2 => {
  location_reference2[location_reference2["TOP_RIGHT"] = 0] = "TOP_RIGHT";
  location_reference2[location_reference2["TOP_LEFT"] = 1] = "TOP_LEFT";
  location_reference2[location_reference2["BOTTOM_RIGHT"] = 2] = "BOTTOM_RIGHT";
  location_reference2[location_reference2["BOTTOM_LEFT"] = 3] = "BOTTOM_LEFT";
  location_reference2[location_reference2["CENTER"] = 4] = "CENTER";
  return location_reference2;
})(location_reference || {});
function OverlayDiv(props) {
  let divRef = void 0;
  props.classList = {
    ...props.classList,
    overlay: true
  };
  const [style, setStyle] = createSignal(initPosition(props.location_ref, props.location));
  const [, divProps] = splitProps(props, ["id", "location", "location_ref", "updateLocation"]);
  let getBoundedPosition = getBoundedPositionFunc(props.location_ref);
  createEffect(() => {
    getBoundedPosition = getBoundedPositionFunc(props.location_ref);
  });
  onMount(() => {
    const display = OverlayCTX().getDisplayAccessor(props.id);
    createEffect(on$1(display, () => {
      divRef = document.querySelector(`#${props.id}`) ?? void 0;
      OverlayCTX().setDivReference(props.id, divRef);
    }));
    createEffect(() => {
      let pos = getBoundedPosition(props.location, divRef?.getBoundingClientRect());
      if (pos) setStyle(pos);
    });
    if (props.updateLocation) {
      createEffect(on$1(display, props.updateLocation));
      window.addEventListener("resize", props.updateLocation);
    }
  });
  onCleanup(() => {
    if (props.updateLocation) window.removeEventListener("resize", props.updateLocation);
  });
  return (() => {
    var _el$2 = _tmpl$2$7();
    spread(_el$2, mergeProps(divProps, {
      get id() {
        return props.id;
      },
      get style() {
        return style();
      }
    }), false, true);
    insert(_el$2, () => props.children);
    return _el$2;
  })();
}
function getBoundedPositionFunc(display_ref) {
  switch (display_ref) {
    case 1 /* TOP_LEFT */:
      return (pt, overlay_rect) => {
        const window_rect = document.querySelector("#overlay_manager")?.getBoundingClientRect();
        if (!window_rect || !overlay_rect) return;
        return {
          top: `${Math.round(Math.min(Math.max(pt.y, 0), window_rect.height - overlay_rect.height))}px`,
          left: `${Math.round(Math.min(Math.max(pt.x, 0), window_rect.width - overlay_rect.width))}px`
        };
      };
    case 3 /* BOTTOM_LEFT */:
      return (pt, overlay_rect) => {
        const window_rect = document.querySelector("#overlay_manager")?.getBoundingClientRect();
        if (!window_rect || !overlay_rect) return;
        return {
          bottom: `${Math.round(window_rect.height - Math.min(Math.max(pt.y, overlay_rect.height), window_rect.height))}px`,
          left: `${Math.round(Math.min(Math.max(pt.x, 0), window_rect.width - overlay_rect.width))}px`
        };
      };
    case 0 /* TOP_RIGHT */:
      return (pt, overlay_rect) => {
        const window_rect = document.querySelector("#overlay_manager")?.getBoundingClientRect();
        if (!window_rect || !overlay_rect) return;
        return {
          top: `${Math.round(Math.min(Math.max(pt.y, 0), window_rect.height - overlay_rect.height))}px`,
          right: `${Math.round(window_rect.width - Math.min(Math.max(pt.x, overlay_rect.width), window_rect.width))}px`
        };
      };
    case 2 /* BOTTOM_RIGHT */:
      return (pt, overlay_rect) => {
        const window_rect = document.querySelector("#overlay_manager")?.getBoundingClientRect();
        if (!window_rect || !overlay_rect) return;
        return {
          bottom: `${Math.round(window_rect.height - Math.min(Math.max(pt.y, overlay_rect.height), window_rect.height))}px`,
          right: `${Math.round(window_rect.width - Math.min(Math.max(pt.x, overlay_rect.width), window_rect.width))}px`
        };
      };
    case 4 /* CENTER */:
      return (pt, overlay_rect) => {
        const window_rect = document.querySelector("#overlay_manager")?.getBoundingClientRect();
        if (!window_rect || !overlay_rect) return;
        const left_offset = overlay_rect.width / 2;
        const top_offset = overlay_rect.height / 2;
        const right_bound = window_rect.width - overlay_rect.width;
        const bottom_bound = window_rect.height - overlay_rect.height;
        return {
          top: `${Math.round(Math.min(Math.max(pt.y - top_offset, 0), bottom_bound))}px`,
          left: `${Math.round(Math.min(Math.max(pt.x - left_offset, 0), right_bound))}px`
        };
      };
  }
}
function initPosition(display_ref, pt) {
  const window_rect = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  if (!window_rect) return {
    left: "-1px",
    top: "-1px"
  };
  switch (display_ref) {
    case 4 /* CENTER */:
    case 1 /* TOP_LEFT */:
      return {
        top: `${Math.round(Math.min(Math.max(pt.y, 0), window_rect.height))}px`,
        left: `${Math.round(Math.min(Math.max(pt.x, 0), window_rect.width))}px`
      };
    case 3 /* BOTTOM_LEFT */:
      return {
        bottom: `${Math.round(window_rect.height - Math.min(Math.max(pt.y, 0), window_rect.height))}px`,
        left: `${Math.round(Math.min(Math.max(pt.x, 0), window_rect.width))}px`
      };
    case 0 /* TOP_RIGHT */:
      return {
        top: `${Math.round(Math.min(Math.max(pt.y, 0), window_rect.height))}px`,
        right: `${Math.round(window_rect.width - Math.min(Math.max(pt.x, 0), window_rect.width))}px`
      };
    case 2 /* BOTTOM_RIGHT */:
      return {
        bottom: `${Math.round(window_rect.height - Math.min(Math.max(pt.y, 0), window_rect.height))}px`,
        right: `${Math.round(window_rect.width - Math.min(Math.max(pt.x, 0), window_rect.width))}px`
      };
  }
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var draggabilly = {exports: {}};

var getSize = {exports: {}};

/*!
 * Infinite Scroll v2.0.4
 * measure size of elements
 * MIT license
 */

var hasRequiredGetSize;

function requireGetSize () {
	if (hasRequiredGetSize) return getSize.exports;
	hasRequiredGetSize = 1;
	(function (module) {
		( function( window, factory ) {
		  if ( module.exports ) {
		    // CommonJS
		    module.exports = factory();
		  } else {
		    // browser global
		    window.getSize = factory();
		  }

		} )( window, function factory() {

		// -------------------------- helpers -------------------------- //

		// get a number from a string, not a percentage
		function getStyleSize( value ) {
		  let num = parseFloat( value );
		  // not a percent like '100%', and a number
		  let isValid = value.indexOf('%') == -1 && !isNaN( num );
		  return isValid && num;
		}

		// -------------------------- measurements -------------------------- //

		let measurements = [
		  'paddingLeft',
		  'paddingRight',
		  'paddingTop',
		  'paddingBottom',
		  'marginLeft',
		  'marginRight',
		  'marginTop',
		  'marginBottom',
		  'borderLeftWidth',
		  'borderRightWidth',
		  'borderTopWidth',
		  'borderBottomWidth',
		];

		function getZeroSize() {
		  let size = {
		    width: 0,
		    height: 0,
		    innerWidth: 0,
		    innerHeight: 0,
		    outerWidth: 0,
		    outerHeight: 0,
		  };
		  measurements.forEach( ( measurement ) => {
		    size[ measurement ] = 0;
		  } );
		  return size;
		}

		// -------------------------- getSize -------------------------- //

		function getSize( elem ) {
		  // use querySeletor if elem is string
		  if ( typeof elem == 'string' ) elem = document.querySelector( elem );

		  // do not proceed on non-objects
		  let isElement = elem && typeof elem == 'object' && elem.nodeType;
		  if ( !isElement ) return;

		  let style = getComputedStyle( elem );

		  // if hidden, everything is 0
		  if ( style.display == 'none' ) return getZeroSize();

		  let size = {};
		  size.width = elem.offsetWidth;
		  size.height = elem.offsetHeight;

		  let isBorderBox = size.isBorderBox = style.boxSizing == 'border-box';

		  // get all measurements
		  measurements.forEach( ( measurement ) => {
		    let value = style[ measurement ];
		    let num = parseFloat( value );
		    // any 'auto', 'medium' value will be 0
		    size[ measurement ] = !isNaN( num ) ? num : 0;
		  } );

		  let paddingWidth = size.paddingLeft + size.paddingRight;
		  let paddingHeight = size.paddingTop + size.paddingBottom;
		  let marginWidth = size.marginLeft + size.marginRight;
		  let marginHeight = size.marginTop + size.marginBottom;
		  let borderWidth = size.borderLeftWidth + size.borderRightWidth;
		  let borderHeight = size.borderTopWidth + size.borderBottomWidth;

		  // overwrite width and height if we can get it from style
		  let styleWidth = getStyleSize( style.width );
		  if ( styleWidth !== false ) {
		    size.width = styleWidth +
		      // add padding and border unless it's already including it
		      ( isBorderBox ? 0 : paddingWidth + borderWidth );
		  }

		  let styleHeight = getStyleSize( style.height );
		  if ( styleHeight !== false ) {
		    size.height = styleHeight +
		      // add padding and border unless it's already including it
		      ( isBorderBox ? 0 : paddingHeight + borderHeight );
		  }

		  size.innerWidth = size.width - ( paddingWidth + borderWidth );
		  size.innerHeight = size.height - ( paddingHeight + borderHeight );

		  size.outerWidth = size.width + marginWidth;
		  size.outerHeight = size.height + marginHeight;

		  return size;
		}

		return getSize;

		} ); 
	} (getSize));
	return getSize.exports;
}

var unidragger = {exports: {}};

var evEmitter = {exports: {}};

/**
 * EvEmitter v2.1.1
 * Lil' event emitter
 * MIT License
 */

var hasRequiredEvEmitter;

function requireEvEmitter () {
	if (hasRequiredEvEmitter) return evEmitter.exports;
	hasRequiredEvEmitter = 1;
	(function (module) {
		( function( global, factory ) {
		  // universal module definition
		  if ( module.exports ) {
		    // CommonJS - Browserify, Webpack
		    module.exports = factory();
		  } else {
		    // Browser globals
		    global.EvEmitter = factory();
		  }

		}( typeof window != 'undefined' ? window : commonjsGlobal, function() {

		function EvEmitter() {}

		let proto = EvEmitter.prototype;

		proto.on = function( eventName, listener ) {
		  if ( !eventName || !listener ) return this;

		  // set events hash
		  let events = this._events = this._events || {};
		  // set listeners array
		  let listeners = events[ eventName ] = events[ eventName ] || [];
		  // only add once
		  if ( !listeners.includes( listener ) ) {
		    listeners.push( listener );
		  }

		  return this;
		};

		proto.once = function( eventName, listener ) {
		  if ( !eventName || !listener ) return this;

		  // add event
		  this.on( eventName, listener );
		  // set once flag
		  // set onceEvents hash
		  let onceEvents = this._onceEvents = this._onceEvents || {};
		  // set onceListeners object
		  let onceListeners = onceEvents[ eventName ] = onceEvents[ eventName ] || {};
		  // set flag
		  onceListeners[ listener ] = true;

		  return this;
		};

		proto.off = function( eventName, listener ) {
		  let listeners = this._events && this._events[ eventName ];
		  if ( !listeners || !listeners.length ) return this;

		  let index = listeners.indexOf( listener );
		  if ( index != -1 ) {
		    listeners.splice( index, 1 );
		  }

		  return this;
		};

		proto.emitEvent = function( eventName, args ) {
		  let listeners = this._events && this._events[ eventName ];
		  if ( !listeners || !listeners.length ) return this;

		  // copy over to avoid interference if .off() in listener
		  listeners = listeners.slice( 0 );
		  args = args || [];
		  // once stuff
		  let onceListeners = this._onceEvents && this._onceEvents[ eventName ];

		  for ( let listener of listeners ) {
		    let isOnce = onceListeners && onceListeners[ listener ];
		    if ( isOnce ) {
		      // remove listener
		      // remove before trigger to prevent recursion
		      this.off( eventName, listener );
		      // unset once flag
		      delete onceListeners[ listener ];
		    }
		    // trigger listener
		    listener.apply( this, args );
		  }

		  return this;
		};

		proto.allOff = function() {
		  delete this._events;
		  delete this._onceEvents;
		  return this;
		};

		return EvEmitter;

		} ) ); 
	} (evEmitter));
	return evEmitter.exports;
}

/*!
 * Unidragger v3.0.1
 * Draggable base class
 * MIT license
 */

var hasRequiredUnidragger;

function requireUnidragger () {
	if (hasRequiredUnidragger) return unidragger.exports;
	hasRequiredUnidragger = 1;
	(function (module) {
		( function( window, factory ) {
		  // universal module definition
		  if ( module.exports ) {
		    // CommonJS
		    module.exports = factory(
		        window,
		        requireEvEmitter(),
		    );
		  } else {
		    // browser global
		    window.Unidragger = factory(
		        window,
		        window.EvEmitter,
		    );
		  }

		}( typeof window != 'undefined' ? window : commonjsGlobal, function factory( window, EvEmitter ) {

		function Unidragger() {}

		// inherit EvEmitter
		let proto = Unidragger.prototype = Object.create( EvEmitter.prototype );

		// ----- bind start ----- //

		// trigger handler methods for events
		proto.handleEvent = function( event ) {
		  let method = 'on' + event.type;
		  if ( this[ method ] ) {
		    this[ method ]( event );
		  }
		};

		let startEvent, activeEvents;
		if ( 'ontouchstart' in window ) {
		  // HACK prefer Touch Events as you can preventDefault on touchstart to
		  // disable scroll in iOS & mobile Chrome metafizzy/flickity#1177
		  startEvent = 'touchstart';
		  activeEvents = [ 'touchmove', 'touchend', 'touchcancel' ];
		} else if ( window.PointerEvent ) {
		  // Pointer Events
		  startEvent = 'pointerdown';
		  activeEvents = [ 'pointermove', 'pointerup', 'pointercancel' ];
		} else {
		  // mouse events
		  startEvent = 'mousedown';
		  activeEvents = [ 'mousemove', 'mouseup' ];
		}

		// prototype so it can be overwriteable by Flickity
		proto.touchActionValue = 'none';

		proto.bindHandles = function() {
		  this._bindHandles( 'addEventListener', this.touchActionValue );
		};

		proto.unbindHandles = function() {
		  this._bindHandles( 'removeEventListener', '' );
		};

		/**
		 * Add or remove start event
		 * @param {String} bindMethod - addEventListener or removeEventListener
		 * @param {String} touchAction - value for touch-action CSS property
		 */
		proto._bindHandles = function( bindMethod, touchAction ) {
		  this.handles.forEach( ( handle ) => {
		    handle[ bindMethod ]( startEvent, this );
		    handle[ bindMethod ]( 'click', this );
		    // touch-action: none to override browser touch gestures. metafizzy/flickity#540
		    if ( window.PointerEvent ) handle.style.touchAction = touchAction;
		  } );
		};

		proto.bindActivePointerEvents = function() {
		  activeEvents.forEach( ( eventName ) => {
		    window.addEventListener( eventName, this );
		  } );
		};

		proto.unbindActivePointerEvents = function() {
		  activeEvents.forEach( ( eventName ) => {
		    window.removeEventListener( eventName, this );
		  } );
		};

		// ----- event handler helpers ----- //

		// trigger method with matching pointer
		proto.withPointer = function( methodName, event ) {
		  if ( event.pointerId === this.pointerIdentifier ) {
		    this[ methodName ]( event, event );
		  }
		};

		// trigger method with matching touch
		proto.withTouch = function( methodName, event ) {
		  let touch;
		  for ( let changedTouch of event.changedTouches ) {
		    if ( changedTouch.identifier === this.pointerIdentifier ) {
		      touch = changedTouch;
		    }
		  }
		  if ( touch ) this[ methodName ]( event, touch );
		};

		// ----- start event ----- //

		proto.onmousedown = function( event ) {
		  this.pointerDown( event, event );
		};

		proto.ontouchstart = function( event ) {
		  this.pointerDown( event, event.changedTouches[0] );
		};

		proto.onpointerdown = function( event ) {
		  this.pointerDown( event, event );
		};

		// nodes that have text fields
		const cursorNodes = [ 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION' ];
		// input types that do not have text fields
		const clickTypes = [ 'radio', 'checkbox', 'button', 'submit', 'image', 'file' ];

		/**
		 * any time you set `event, pointer` it refers to:
		 * @param {Event} event
		 * @param {Event | Touch} pointer
		 */
		proto.pointerDown = function( event, pointer ) {
		  // dismiss multi-touch taps, right clicks, and clicks on text fields
		  let isCursorNode = cursorNodes.includes( event.target.nodeName );
		  let isClickType = clickTypes.includes( event.target.type );
		  let isOkayElement = !isCursorNode || isClickType;
		  let isOkay = !this.isPointerDown && !event.button && isOkayElement;
		  if ( !isOkay ) return;

		  this.isPointerDown = true;
		  // save pointer identifier to match up touch events
		  this.pointerIdentifier = pointer.pointerId !== undefined ?
		    // pointerId for pointer events, touch.indentifier for touch events
		    pointer.pointerId : pointer.identifier;
		  // track position for move
		  this.pointerDownPointer = {
		    pageX: pointer.pageX,
		    pageY: pointer.pageY,
		  };

		  this.bindActivePointerEvents();
		  this.emitEvent( 'pointerDown', [ event, pointer ] );
		};

		// ----- move ----- //

		proto.onmousemove = function( event ) {
		  this.pointerMove( event, event );
		};

		proto.onpointermove = function( event ) {
		  this.withPointer( 'pointerMove', event );
		};

		proto.ontouchmove = function( event ) {
		  this.withTouch( 'pointerMove', event );
		};

		proto.pointerMove = function( event, pointer ) {
		  let moveVector = {
		    x: pointer.pageX - this.pointerDownPointer.pageX,
		    y: pointer.pageY - this.pointerDownPointer.pageY,
		  };
		  this.emitEvent( 'pointerMove', [ event, pointer, moveVector ] );
		  // start drag if pointer has moved far enough to start drag
		  let isDragStarting = !this.isDragging && this.hasDragStarted( moveVector );
		  if ( isDragStarting ) this.dragStart( event, pointer );
		  if ( this.isDragging ) this.dragMove( event, pointer, moveVector );
		};

		// condition if pointer has moved far enough to start drag
		proto.hasDragStarted = function( moveVector ) {
		  return Math.abs( moveVector.x ) > 3 || Math.abs( moveVector.y ) > 3;
		};

		// ----- drag ----- //

		proto.dragStart = function( event, pointer ) {
		  this.isDragging = true;
		  this.isPreventingClicks = true; // set flag to prevent clicks
		  this.emitEvent( 'dragStart', [ event, pointer ] );
		};

		proto.dragMove = function( event, pointer, moveVector ) {
		  this.emitEvent( 'dragMove', [ event, pointer, moveVector ] );
		};

		// ----- end ----- //

		proto.onmouseup = function( event ) {
		  this.pointerUp( event, event );
		};

		proto.onpointerup = function( event ) {
		  this.withPointer( 'pointerUp', event );
		};

		proto.ontouchend = function( event ) {
		  this.withTouch( 'pointerUp', event );
		};

		proto.pointerUp = function( event, pointer ) {
		  this.pointerDone();
		  this.emitEvent( 'pointerUp', [ event, pointer ] );

		  if ( this.isDragging ) {
		    this.dragEnd( event, pointer );
		  } else {
		    // pointer didn't move enough for drag to start
		    this.staticClick( event, pointer );
		  }
		};

		proto.dragEnd = function( event, pointer ) {
		  this.isDragging = false; // reset flag
		  // re-enable clicking async
		  setTimeout( () => delete this.isPreventingClicks );

		  this.emitEvent( 'dragEnd', [ event, pointer ] );
		};

		// triggered on pointer up & pointer cancel
		proto.pointerDone = function() {
		  this.isPointerDown = false;
		  delete this.pointerIdentifier;
		  this.unbindActivePointerEvents();
		  this.emitEvent('pointerDone');
		};

		// ----- cancel ----- //

		proto.onpointercancel = function( event ) {
		  this.withPointer( 'pointerCancel', event );
		};

		proto.ontouchcancel = function( event ) {
		  this.withTouch( 'pointerCancel', event );
		};

		proto.pointerCancel = function( event, pointer ) {
		  this.pointerDone();
		  this.emitEvent( 'pointerCancel', [ event, pointer ] );
		};

		// ----- click ----- //

		// handle all clicks and prevent clicks when dragging
		proto.onclick = function( event ) {
		  if ( this.isPreventingClicks ) event.preventDefault();
		};

		// triggered after pointer down & up with no/tiny movement
		proto.staticClick = function( event, pointer ) {
		  // ignore emulated mouse up clicks
		  let isMouseup = event.type === 'mouseup';
		  if ( isMouseup && this.isIgnoringMouseUp ) return;

		  this.emitEvent( 'staticClick', [ event, pointer ] );

		  // set flag for emulated clicks 300ms after touchend
		  if ( isMouseup ) {
		    this.isIgnoringMouseUp = true;
		    // reset flag after 400ms
		    setTimeout( () => {
		      delete this.isIgnoringMouseUp;
		    }, 400 );
		  }
		};

		// -----  ----- //

		return Unidragger;

		} ) ); 
	} (unidragger));
	return unidragger.exports;
}

/*!
 * Draggabilly v3.0.0
 * Make that shiz draggable
 * https://draggabilly.desandro.com
 * MIT license
 */

(function (module) {
	( function( window, factory ) {
	  // universal module definition
	  if ( module.exports ) {
	    // CommonJS
	    module.exports = factory(
	        window,
	        requireGetSize(),
	        requireUnidragger(),
	    );
	  } else {
	    // browser global
	    window.Draggabilly = factory(
	        window,
	        window.getSize,
	        window.Unidragger,
	    );
	  }

	}( typeof window != 'undefined' ? window : commonjsGlobal,
	    function factory( window, getSize, Unidragger ) {

	// -------------------------- helpers & variables -------------------------- //

	function noop() {}

	let jQuery = window.jQuery;

	// -------------------------- Draggabilly -------------------------- //

	function Draggabilly( element, options ) {
	  // querySelector if string
	  this.element = typeof element == 'string' ?
	    document.querySelector( element ) : element;

	  if ( jQuery ) {
	    this.$element = jQuery( this.element );
	  }

	  // options
	  this.options = {};
	  this.option( options );

	  this._create();
	}

	// inherit Unidragger methods
	let proto = Draggabilly.prototype = Object.create( Unidragger.prototype );

	/**
	 * set options
	 * @param {Object} opts
	 */
	proto.option = function( opts ) {
	  this.options = {
	    ...this.options,
	    ...opts,
	  };
	};

	// css position values that don't need to be set
	const positionValues = [ 'relative', 'absolute', 'fixed' ];

	proto._create = function() {
	  // properties
	  this.position = {};
	  this._getPosition();

	  this.startPoint = { x: 0, y: 0 };
	  this.dragPoint = { x: 0, y: 0 };

	  this.startPosition = { ...this.position };

	  // set relative positioning
	  let style = getComputedStyle( this.element );
	  if ( !positionValues.includes( style.position ) ) {
	    this.element.style.position = 'relative';
	  }

	  // events
	  this.on( 'pointerDown', this.handlePointerDown );
	  this.on( 'pointerUp', this.handlePointerUp );
	  this.on( 'dragStart', this.handleDragStart );
	  this.on( 'dragMove', this.handleDragMove );
	  this.on( 'dragEnd', this.handleDragEnd );

	  this.setHandles();
	  this.enable();
	};

	// set this.handles  and bind start events to 'em
	proto.setHandles = function() {
	  let { handle } = this.options;
	  if ( typeof handle == 'string' ) {
	    this.handles = this.element.querySelectorAll( handle );
	  } else if ( typeof handle == 'object' && handle.length ) {
	    this.handles = handle;
	  } else if ( handle instanceof HTMLElement ) {
	    this.handles = [ handle ];
	  } else {
	    this.handles = [ this.element ];
	  }
	};

	const cancelableEvents = [ 'dragStart', 'dragMove', 'dragEnd' ];

	// duck-punch emitEvent to dispatch jQuery events as well
	let emitEvent = proto.emitEvent;
	proto.emitEvent = function( eventName, args ) {
	  // do not emit cancelable events if dragging is disabled
	  let isCanceled = !this.isEnabled && cancelableEvents.includes( eventName );
	  if ( isCanceled ) return;

	  emitEvent.call( this, eventName, args );

	  // trigger jQuery event
	  let jquery = window.jQuery;
	  if ( !jquery || !this.$element ) return;
	  // create jQuery event
	  let event;
	  let jqArgs = args;
	  let isFirstArgEvent = args && args[0] instanceof Event;
	  if ( isFirstArgEvent ) [ event, ...jqArgs ] = args;
	  /* eslint-disable-next-line new-cap */
	  let $event = jquery.Event( event );
	  $event.type = eventName;
	  this.$element.trigger( $event, jqArgs );
	};

	// -------------------------- position -------------------------- //

	// get x/y position from style
	proto._getPosition = function() {
	  let style = getComputedStyle( this.element );
	  let x = this._getPositionCoord( style.left, 'width' );
	  let y = this._getPositionCoord( style.top, 'height' );
	  // clean up 'auto' or other non-integer values
	  this.position.x = isNaN( x ) ? 0 : x;
	  this.position.y = isNaN( y ) ? 0 : y;

	  this._addTransformPosition( style );
	};

	proto._getPositionCoord = function( styleSide, measure ) {
	  if ( styleSide.includes('%') ) {
	    // convert percent into pixel for Safari, #75
	    let parentSize = getSize( this.element.parentNode );
	    // prevent not-in-DOM element throwing bug, #131
	    return !parentSize ? 0 :
	      ( parseFloat( styleSide ) / 100 ) * parentSize[ measure ];
	  }
	  return parseInt( styleSide, 10 );
	};

	// add transform: translate( x, y ) to position
	proto._addTransformPosition = function( style ) {
	  let transform = style.transform;
	  // bail out if value is 'none'
	  if ( !transform.startsWith('matrix') ) return;

	  // split matrix(1, 0, 0, 1, x, y)
	  let matrixValues = transform.split(',');
	  // translate X value is in 12th or 4th position
	  let xIndex = transform.startsWith('matrix3d') ? 12 : 4;
	  let translateX = parseInt( matrixValues[ xIndex ], 10 );
	  // translate Y value is in 13th or 5th position
	  let translateY = parseInt( matrixValues[ xIndex + 1 ], 10 );
	  this.position.x += translateX;
	  this.position.y += translateY;
	};

	// -------------------------- events -------------------------- //

	proto.handlePointerDown = function( event, pointer ) {
	  if ( !this.isEnabled ) return;
	  // track start event position
	  // Safari 9 overrides pageX and pageY. These values needs to be copied. flickity#842
	  this.pointerDownPointer = {
	    pageX: pointer.pageX,
	    pageY: pointer.pageY,
	  };

	  event.preventDefault();
	  document.activeElement.blur();
	  // bind move and end events
	  this.bindActivePointerEvents( event );
	  this.element.classList.add('is-pointer-down');
	};

	proto.handleDragStart = function() {
	  if ( !this.isEnabled ) return;

	  this._getPosition();
	  this.measureContainment();
	  // position _when_ drag began
	  this.startPosition.x = this.position.x;
	  this.startPosition.y = this.position.y;
	  // reset left/top style
	  this.setLeftTop();

	  this.dragPoint.x = 0;
	  this.dragPoint.y = 0;

	  this.element.classList.add('is-dragging');
	  // start animation
	  this.animate();
	};

	proto.measureContainment = function() {
	  let container = this.getContainer();
	  if ( !container ) return;

	  let elemSize = getSize( this.element );
	  let containerSize = getSize( container );
	  let {
	    borderLeftWidth,
	    borderRightWidth,
	    borderTopWidth,
	    borderBottomWidth,
	  } = containerSize;
	  let elemRect = this.element.getBoundingClientRect();
	  let containerRect = container.getBoundingClientRect();

	  let borderSizeX = borderLeftWidth + borderRightWidth;
	  let borderSizeY = borderTopWidth + borderBottomWidth;

	  let position = this.relativeStartPosition = {
	    x: elemRect.left - ( containerRect.left + borderLeftWidth ),
	    y: elemRect.top - ( containerRect.top + borderTopWidth ),
	  };

	  this.containSize = {
	    width: ( containerSize.width - borderSizeX ) - position.x - elemSize.width,
	    height: ( containerSize.height - borderSizeY ) - position.y - elemSize.height,
	  };
	};

	proto.getContainer = function() {
	  let containment = this.options.containment;
	  if ( !containment ) return;

	  let isElement = containment instanceof HTMLElement;
	  // use as element
	  if ( isElement ) return containment;

	  // querySelector if string
	  if ( typeof containment == 'string' ) {
	    return document.querySelector( containment );
	  }
	  // fallback to parent element
	  return this.element.parentNode;
	};

	// ----- move event ----- //

	/**
	 * drag move
	 * @param {Event} event
	 * @param {Event | Touch} pointer
	 * @param {Object} moveVector - x and y coordinates
	 */
	proto.handleDragMove = function( event, pointer, moveVector ) {
	  if ( !this.isEnabled ) return;

	  let dragX = moveVector.x;
	  let dragY = moveVector.y;

	  let grid = this.options.grid;
	  let gridX = grid && grid[0];
	  let gridY = grid && grid[1];

	  dragX = applyGrid( dragX, gridX );
	  dragY = applyGrid( dragY, gridY );

	  dragX = this.containDrag( 'x', dragX, gridX );
	  dragY = this.containDrag( 'y', dragY, gridY );

	  // constrain to axis
	  dragX = this.options.axis == 'y' ? 0 : dragX;
	  dragY = this.options.axis == 'x' ? 0 : dragY;

	  this.position.x = this.startPosition.x + dragX;
	  this.position.y = this.startPosition.y + dragY;
	  // set dragPoint properties
	  this.dragPoint.x = dragX;
	  this.dragPoint.y = dragY;
	};

	function applyGrid( value, grid, method ) {
	  if ( !grid ) return value;

	  method = method || 'round';
	  return Math[ method ]( value/grid ) * grid;
	}

	proto.containDrag = function( axis, drag, grid ) {
	  if ( !this.options.containment ) return drag;

	  let measure = axis == 'x' ? 'width' : 'height';

	  let rel = this.relativeStartPosition[ axis ];
	  let min = applyGrid( -rel, grid, 'ceil' );
	  let max = this.containSize[ measure ];
	  max = applyGrid( max, grid, 'floor' );
	  return Math.max( min, Math.min( max, drag ) );
	};

	// ----- end event ----- //

	proto.handlePointerUp = function() {
	  this.element.classList.remove('is-pointer-down');
	};

	proto.handleDragEnd = function() {
	  if ( !this.isEnabled ) return;

	  // use top left position when complete
	  this.element.style.transform = '';
	  this.setLeftTop();
	  this.element.classList.remove('is-dragging');
	};

	// -------------------------- animation -------------------------- //

	proto.animate = function() {
	  // only render and animate if dragging
	  if ( !this.isDragging ) return;

	  this.positionDrag();
	  requestAnimationFrame( () => this.animate() );
	};

	// left/top positioning
	proto.setLeftTop = function() {
	  let { x, y } = this.position;
	  this.element.style.left = `${x}px`;
	  this.element.style.top = `${y}px`;
	};

	proto.positionDrag = function() {
	  let { x, y } = this.dragPoint;
	  this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
	};

	// ----- methods ----- //

	/**
	 * @param {Number} x
	 * @param {Number} y
	 */
	proto.setPosition = function( x, y ) {
	  this.position.x = x;
	  this.position.y = y;
	  this.setLeftTop();
	};

	proto.enable = function() {
	  if ( this.isEnabled ) return;
	  this.isEnabled = true;
	  this.bindHandles();
	};

	proto.disable = function() {
	  if ( !this.isEnabled ) return;
	  this.isEnabled = false;
	  if ( this.isDragging ) this.dragEnd();
	  this.unbindHandles();
	};

	const resetCssProperties = [ 'transform', 'left', 'top', 'position' ];

	proto.destroy = function() {
	  this.disable();
	  // reset styles
	  resetCssProperties.forEach( ( prop ) => {
	    this.element.style[ prop ] = '';
	  } );
	  // unbind handles
	  this.unbindHandles();
	  // remove jQuery data
	  if ( this.$element ) this.$element.removeData('draggabilly');
	};

	// ----- jQuery bridget ----- //

	// required for jQuery bridget
	proto._init = noop;

	if ( jQuery && jQuery.bridget ) {
	  jQuery.bridget( 'draggabilly', Draggabilly );
	}

	// -----  ----- //

	return Draggabilly;

	} ) ); 
} (draggabilly));

var draggabillyExports = draggabilly.exports;
const vitePluginRequire_1722615218630_97351255 = /*@__PURE__*/getDefaultExportFromCjs(draggabillyExports);

const RESIZE_HANDLE_WIDTH = 6;
const HALF_WIDTH = 3;
const MIN_FRAME_WIDTH = 0.15;
const MIN_FRAME_HEIGHT = 0.1;
var Orientation = /* @__PURE__ */(Orientation2 => {
  Orientation2[Orientation2["Horizontal"] = 0] = "Horizontal";
  Orientation2[Orientation2["Vertical"] = 1] = "Vertical";
  Orientation2[Orientation2["null"] = 2] = "null";
  return Orientation2;
})(Orientation || {});
var Container_Layouts = /* @__PURE__ */(Container_Layouts2 => {
  Container_Layouts2[Container_Layouts2["SINGLE"] = 0] = "SINGLE";
  Container_Layouts2[Container_Layouts2["DOUBLE_VERT"] = 1] = "DOUBLE_VERT";
  Container_Layouts2[Container_Layouts2["DOUBLE_HORIZ"] = 2] = "DOUBLE_HORIZ";
  Container_Layouts2[Container_Layouts2["TRIPLE_VERT"] = 3] = "TRIPLE_VERT";
  Container_Layouts2[Container_Layouts2["TRIPLE_VERT_LEFT"] = 4] = "TRIPLE_VERT_LEFT";
  Container_Layouts2[Container_Layouts2["TRIPLE_VERT_RIGHT"] = 5] = "TRIPLE_VERT_RIGHT";
  Container_Layouts2[Container_Layouts2["TRIPLE_HORIZ"] = 6] = "TRIPLE_HORIZ";
  Container_Layouts2[Container_Layouts2["TRIPLE_HORIZ_TOP"] = 7] = "TRIPLE_HORIZ_TOP";
  Container_Layouts2[Container_Layouts2["TRIPLE_HORIZ_BOTTOM"] = 8] = "TRIPLE_HORIZ_BOTTOM";
  Container_Layouts2[Container_Layouts2["QUAD_SQ_V"] = 9] = "QUAD_SQ_V";
  Container_Layouts2[Container_Layouts2["QUAD_SQ_H"] = 10] = "QUAD_SQ_H";
  Container_Layouts2[Container_Layouts2["QUAD_VERT"] = 11] = "QUAD_VERT";
  Container_Layouts2[Container_Layouts2["QUAD_HORIZ"] = 12] = "QUAD_HORIZ";
  Container_Layouts2[Container_Layouts2["QUAD_LEFT"] = 13] = "QUAD_LEFT";
  Container_Layouts2[Container_Layouts2["QUAD_RIGHT"] = 14] = "QUAD_RIGHT";
  Container_Layouts2[Container_Layouts2["QUAD_TOP"] = 15] = "QUAD_TOP";
  Container_Layouts2[Container_Layouts2["QUAD_BOTTOM"] = 16] = "QUAD_BOTTOM";
  return Container_Layouts2;
})(Container_Layouts || {});
function num_frames(layout) {
  switch (layout) {
    case 0 /* SINGLE */:
      return 1;
    case 1 /* DOUBLE_VERT */:
      return 2;
    case 2 /* DOUBLE_HORIZ */:
      return 2;
    case 3 /* TRIPLE_VERT */:
      return 3;
    case 4 /* TRIPLE_VERT_LEFT */:
      return 3;
    case 5 /* TRIPLE_VERT_RIGHT */:
      return 3;
    case 6 /* TRIPLE_HORIZ */:
      return 3;
    case 7 /* TRIPLE_HORIZ_TOP */:
      return 3;
    case 8 /* TRIPLE_HORIZ_BOTTOM */:
      return 3;
    case 9 /* QUAD_SQ_V */:
      return 4;
    case 10 /* QUAD_SQ_H */:
      return 4;
    case 11 /* QUAD_VERT */:
      return 4;
    case 12 /* QUAD_HORIZ */:
      return 4;
    case 13 /* QUAD_LEFT */:
      return 4;
    case 14 /* QUAD_RIGHT */:
      return 4;
    case 15 /* QUAD_TOP */:
      return 4;
    case 16 /* QUAD_BOTTOM */:
      return 4;
    default:
      return 0;
  }
}
function frame_section(flex_width, flex_height) {
  let new_section = {
    rect: {
      top: 0,
      left: 0,
      width: 0,
      height: 0
    },
    style: "",
    mouseDown: () => {},
    flex_width,
    flex_height,
    orientation: 2 /* null */,
    resize_pos: [],
    resize_neg: []
  };
  return new_section;
}
function separator_section(type, size, ref_div, resize) {
  let new_section = {
    rect: {
      top: 0,
      left: 0,
      width: 0,
      height: 0
    },
    style: "",
    mouseDown: () => {},
    flex_height: type === 1 /* Vertical */ ? size : 0,
    flex_width: type === 0 /* Horizontal */ ? size : 0,
    orientation: type,
    resize_pos: [],
    resize_neg: []
  };
  let resize_partial_func;
  if (type === 1 /* Vertical */) resize_partial_func = resize_flex_horizontal.bind(void 0, ref_div, resize, new_section);else resize_partial_func = resize_flex_vertical.bind(void 0, ref_div, resize, new_section);
  const mouseup = () => {
    document.removeEventListener("mousemove", resize_partial_func);
    document.removeEventListener("mouseup", mouseup);
  };
  new_section.mouseDown = () => {
    document.addEventListener("mousemove", resize_partial_func);
    document.addEventListener("mouseup", mouseup);
  };
  return new_section;
}
function resize_flex_horizontal(ref_div, resize, separator, e) {
  let flex_total = separator.resize_pos[0].flex_width + separator.resize_neg[0].flex_width;
  let width_total = separator.resize_pos[0].rect.width + separator.resize_neg[0].rect.width;
  let relative_x = e.clientX - (ref_div.getBoundingClientRect().left + (separator.resize_pos[0]?.rect.left ?? 0));
  let flex_size_left = relative_x / width_total * flex_total;
  let flex_size_right = flex_total - flex_size_left;
  if (flex_size_left < MIN_FRAME_WIDTH) {
    flex_size_left = MIN_FRAME_WIDTH;
    flex_size_right = flex_total - flex_size_left;
  } else if (flex_size_right < MIN_FRAME_WIDTH) {
    flex_size_right = MIN_FRAME_WIDTH;
    flex_size_left = flex_total - flex_size_right;
  }
  separator.resize_pos.forEach(section => {
    section.flex_width = flex_size_left;
  });
  separator.resize_neg.forEach(section => {
    section.flex_width = flex_size_right;
  });
  resize();
}
function resize_flex_vertical(ref_div, resize, separator, e) {
  let flex_total = separator.resize_pos[0].flex_height + separator.resize_neg[0].flex_height;
  let height_total = separator.resize_pos[0].rect.height + separator.resize_neg[0].rect.height;
  let container_y = e.clientY - (ref_div.getBoundingClientRect().top + (separator.resize_pos[0]?.rect.top ?? 0));
  let flex_size_top = container_y / height_total * flex_total;
  let flex_size_bottom = flex_total - flex_size_top;
  if (flex_size_top < MIN_FRAME_HEIGHT) {
    flex_size_top = MIN_FRAME_HEIGHT;
    flex_size_bottom = flex_total - flex_size_top;
  } else if (flex_size_bottom < MIN_FRAME_HEIGHT) {
    flex_size_bottom = MIN_FRAME_HEIGHT;
    flex_size_top = flex_total - flex_size_bottom;
  }
  separator.resize_pos.forEach(section => {
    section.flex_height = flex_size_top;
  });
  separator.resize_neg.forEach(section => {
    section.flex_height = flex_size_bottom;
  });
  resize();
}
function resize_frames(width, height, frames) {
  if (width <= 0 || height <= 0) return;
  frames.forEach((section, i) => {
    let new_rect, top, left;
    if (section.orientation === 1 /* Vertical */) {
      let ref_rect = section.resize_pos[0]?.rect;
      top = ref_rect?.top;
      left = ref_rect?.left + ref_rect?.width;
      new_rect = {
        top: top ?? 0,
        left: left ?? 0,
        width: RESIZE_HANDLE_WIDTH,
        height: Math.round(height * section.flex_height)
      };
      frames[i].style = `{top:${new_rect.top}px; left:${new_rect.left - HALF_WIDTH}px; width:${new_rect.width}px; height:${new_rect.height}px}`;
    } else if (section.orientation === 0 /* Horizontal */) {
      let ref_rect = section.resize_pos[0]?.rect;
      top = ref_rect?.top + ref_rect?.height;
      left = ref_rect?.left;
      new_rect = {
        top: top ?? 0,
        left: left ?? 0,
        width: Math.round(width * section.flex_width),
        height: RESIZE_HANDLE_WIDTH
      };
      frames[i].style = `{top:${new_rect.top - HALF_WIDTH}px; left:${new_rect.left}px; width:${new_rect.width}px; height:${new_rect.height}px}`;
    } else {
      if (section.resize_pos[0]?.orientation === 0 /* Horizontal */) {
        top = section.resize_pos[0]?.rect.top;
        left = section.resize_pos[1]?.rect.left;
      } else {
        top = section.resize_pos[1]?.rect.top;
        left = section.resize_pos[0]?.rect.left;
      }
      new_rect = {
        top: top ?? 0,
        left: left ?? 0,
        width: Math.round(width * section.flex_width),
        height: Math.round(height * section.flex_height)
      };
      frames[i].style = `{top:${new_rect.top}px; left:${new_rect.left}px; width:${new_rect.width}px; height:${new_rect.height}px}`;
    }
    frames[i].rect = new_rect;
  });
}
function layout_switch(layout, ref_div, resize) {
  switch (layout) {
    case 1 /* DOUBLE_VERT */:
      {
        let f1 = frame_section(0.5, 1);
        let s1 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f2 = frame_section(0.5, 1);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        f2.resize_pos.push(s1);
        return [f1, s1, f2];
      }
    case 2 /* DOUBLE_HORIZ */:
      {
        let f1 = frame_section(1, 0.5);
        let s1 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f2 = frame_section(1, 0.5);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        f2.resize_pos.push(s1);
        return [f1, s1, f2];
      }
    case 3 /* TRIPLE_VERT */:
      {
        let f1 = frame_section(0.333, 1);
        let s1 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f2 = frame_section(0.333, 1);
        let s2 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f3 = frame_section(0.333, 1);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        return [f1, s1, f2, s2, f3];
      }
    case 4 /* TRIPLE_VERT_LEFT */:
      {
        let f1 = frame_section(0.5, 1);
        let s1 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f2 = frame_section(0.5, 0.5);
        let s2 = separator_section(0 /* Horizontal */, 0.5, ref_div, resize);
        let f3 = frame_section(0.5, 0.5);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2, f3, s2);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s1, s2);
        return [f1, s1, f2, s2, f3];
      }
    case 5 /* TRIPLE_VERT_RIGHT */:
      {
        let f1 = frame_section(0.5, 0.5);
        let s1 = separator_section(0 /* Horizontal */, 0.5, ref_div, resize);
        let f2 = frame_section(0.5, 0.5);
        let s2 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f3 = frame_section(0.5, 1);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s2.resize_pos.push(f1, f2, s1);
        s2.resize_neg.push(f3);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        return [f1, s1, f2, s2, f3];
      }
    case 6 /* TRIPLE_HORIZ */:
      {
        let f1 = frame_section(1, 0.333);
        let s1 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f2 = frame_section(1, 0.333);
        let s2 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f3 = frame_section(1, 0.333);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        return [f1, s1, f2, s2, f3];
      }
    case 7 /* TRIPLE_HORIZ_TOP */:
      {
        let f1 = frame_section(1, 0.5);
        let s1 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f2 = frame_section(0.5, 0.5);
        let s2 = separator_section(1 /* Vertical */, 0.5, ref_div, resize);
        let f3 = frame_section(0.5, 0.5);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2, f3, s2);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s1, s2);
        return [f1, s1, f2, s2, f3];
      }
    case 8 /* TRIPLE_HORIZ_BOTTOM */:
      {
        let f1 = frame_section(0.5, 0.5);
        let s1 = separator_section(1 /* Vertical */, 0.5, ref_div, resize);
        let f2 = frame_section(0.5, 0.5);
        let s2 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f3 = frame_section(1, 0.5);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s2.resize_pos.push(f1, f2, s1);
        s2.resize_neg.push(f3);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        return [f1, s1, f2, s2, f3];
      }
    case 10 /* QUAD_SQ_H */:
      {
        let f1 = frame_section(0.5, 0.5);
        let s1 = separator_section(1 /* Vertical */, 0.5, ref_div, resize);
        let f2 = frame_section(0.5, 0.5);
        let s2 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f3 = frame_section(0.5, 0.5);
        let s3 = separator_section(1 /* Vertical */, 0.5, ref_div, resize);
        let f4 = frame_section(0.5, 0.5);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s3.resize_pos.push(f3);
        s3.resize_neg.push(f4);
        s2.resize_pos.push(f1, f2, s1);
        s2.resize_neg.push(f3, f4, s3);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        f4.resize_pos.push(s2, s3);
        return [f1, s1, f2, s2, f3, s3, f4];
      }
    case 9 /* QUAD_SQ_V */:
      {
        let f1 = frame_section(0.5, 0.5);
        let s1 = separator_section(0 /* Horizontal */, 0.5, ref_div, resize);
        let f2 = frame_section(0.5, 0.5);
        let s2 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f3 = frame_section(0.5, 0.5);
        let s3 = separator_section(0 /* Horizontal */, 0.5, ref_div, resize);
        let f4 = frame_section(0.5, 0.5);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s3.resize_pos.push(f3);
        s3.resize_neg.push(f4);
        s2.resize_pos.push(f1, f2, s1);
        s2.resize_neg.push(f3, f4, s3);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        f4.resize_pos.push(s2, s3);
        return [f1, s1, f2, s2, f3, s3, f4];
      }
    case 11 /* QUAD_VERT */:
      {
        let f1 = frame_section(0.25, 1);
        let s1 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f2 = frame_section(0.25, 1);
        let s2 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f3 = frame_section(0.25, 1);
        let s3 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f4 = frame_section(0.25, 1);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        s3.resize_pos.push(f3);
        s3.resize_neg.push(f4);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        f4.resize_pos.push(s3);
        return [f1, s1, f2, s2, f3, s3, f4];
      }
    case 12 /* QUAD_HORIZ */:
      {
        let f1 = frame_section(1, 0.25);
        let s1 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f2 = frame_section(1, 0.25);
        let s2 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f3 = frame_section(1, 0.25);
        let s3 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f4 = frame_section(1, 0.25);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        s3.resize_pos.push(f3);
        s3.resize_neg.push(f4);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        f4.resize_pos.push(s3);
        return [f1, s1, f2, s2, f3, s3, f4];
      }
    case 13 /* QUAD_LEFT */:
      {
        let f1 = frame_section(0.5, 1);
        let s1 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f2 = frame_section(0.5, 0.333);
        let s2 = separator_section(0 /* Horizontal */, 0.5, ref_div, resize);
        let f3 = frame_section(0.5, 0.333);
        let s3 = separator_section(0 /* Horizontal */, 0.5, ref_div, resize);
        let f4 = frame_section(0.5, 0.333);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2, f3, f4, s2, s3);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        s3.resize_pos.push(f3);
        s3.resize_neg.push(f4);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s1, s2);
        f4.resize_pos.push(s1, s3);
        return [f1, s1, f2, s2, f3, s3, f4];
      }
    case 14 /* QUAD_RIGHT */:
      {
        let f1 = frame_section(0.5, 0.333);
        let s1 = separator_section(0 /* Horizontal */, 0.5, ref_div, resize);
        let f2 = frame_section(0.5, 0.333);
        let s2 = separator_section(0 /* Horizontal */, 0.5, ref_div, resize);
        let f3 = frame_section(0.5, 0.333);
        let s3 = separator_section(1 /* Vertical */, 1, ref_div, resize);
        let f4 = frame_section(0.5, 1);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        s3.resize_pos.push(f1, f2, f3, s1, s2);
        s3.resize_neg.push(f4);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        f4.resize_pos.push(s3);
        return [f1, s1, f2, s2, f3, s3, f4];
      }
    case 15 /* QUAD_TOP */:
      {
        let f1 = frame_section(1, 0.5);
        let s1 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f2 = frame_section(0.333, 0.5);
        let s2 = separator_section(1 /* Vertical */, 0.5, ref_div, resize);
        let f3 = frame_section(0.333, 0.5);
        let s3 = separator_section(1 /* Vertical */, 0.5, ref_div, resize);
        let f4 = frame_section(0.333, 0.5);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2, f3, f4, s2, s3);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        s3.resize_pos.push(f3);
        s3.resize_neg.push(f4);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s1, s2);
        f4.resize_pos.push(s1, s3);
        return [f1, s1, f2, s2, f3, s3, f4];
      }
    case 16 /* QUAD_BOTTOM */:
      {
        let f1 = frame_section(0.333, 0.5);
        let s1 = separator_section(1 /* Vertical */, 0.5, ref_div, resize);
        let f2 = frame_section(0.333, 0.5);
        let s2 = separator_section(1 /* Vertical */, 0.5, ref_div, resize);
        let f3 = frame_section(0.333, 0.5);
        let s3 = separator_section(0 /* Horizontal */, 1, ref_div, resize);
        let f4 = frame_section(1, 0.5);
        s1.resize_pos.push(f1);
        s1.resize_neg.push(f2);
        s2.resize_pos.push(f2);
        s2.resize_neg.push(f3);
        s3.resize_pos.push(f1, f2, f3, s1, s2);
        s3.resize_neg.push(f4);
        f2.resize_pos.push(s1);
        f3.resize_pos.push(s2);
        f4.resize_pos.push(s3);
        return [f1, s1, f2, s2, f3, s3, f4];
      }
    default:
      return [frame_section(1, 1)];
  }
}

var _tmpl$$c = /* @__PURE__ */template(`<div>`);
function Container(props) {
  return createComponent(For, {
    get each() {
      return props.displays;
    },
    children: display => {
      return (() => {
        var _el$ = _tmpl$$c();
        addEventListener(_el$, "mousedown", display.mouseDown, true);
        insert(_el$, () => display.element);
        createRenderEffect(_p$ => {
          var _v$ = !!(display.orientation === Orientation.null ? true : false),
            _v$2 = !!(display.orientation === Orientation.Vertical ? true : false),
            _v$3 = !!(display.orientation === Orientation.Horizontal ? true : false),
            _v$4 = display.el_active() ? "" : void 0,
            _v$5 = display.el_target() ? "" : void 0;
          _v$ !== _p$.e && _el$.classList.toggle("frame", _p$.e = _v$);
          _v$2 !== _p$.t && _el$.classList.toggle("frame_separator_v", _p$.t = _v$2);
          _v$3 !== _p$.a && _el$.classList.toggle("frame_separator_h", _p$.a = _v$3);
          _v$4 !== _p$.o && setAttribute(_el$, "active", _p$.o = _v$4);
          _v$5 !== _p$.i && setAttribute(_el$, "target", _p$.i = _v$5);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0,
          i: void 0
        });
        return _el$;
      })();
    }
  });
}
delegateEvents(["mousedown"]);

function size(_a) {
    var width = _a.width, height = _a.height;
    if (width < 0) {
        throw new Error('Negative width is not allowed for Size');
    }
    if (height < 0) {
        throw new Error('Negative height is not allowed for Size');
    }
    return {
        width: width,
        height: height,
    };
}
function equalSizes(first, second) {
    return (first.width === second.width) &&
        (first.height === second.height);
}

var Observable = /** @class */ (function () {
    function Observable(win) {
        var _this = this;
        this._resolutionListener = function () { return _this._onResolutionChanged(); };
        this._resolutionMediaQueryList = null;
        this._observers = [];
        this._window = win;
        this._installResolutionListener();
    }
    Observable.prototype.dispose = function () {
        this._uninstallResolutionListener();
        this._window = null;
    };
    Object.defineProperty(Observable.prototype, "value", {
        get: function () {
            return this._window.devicePixelRatio;
        },
        enumerable: false,
        configurable: true
    });
    Observable.prototype.subscribe = function (next) {
        var _this = this;
        var observer = { next: next };
        this._observers.push(observer);
        return {
            unsubscribe: function () {
                _this._observers = _this._observers.filter(function (o) { return o !== observer; });
            },
        };
    };
    Observable.prototype._installResolutionListener = function () {
        if (this._resolutionMediaQueryList !== null) {
            throw new Error('Resolution listener is already installed');
        }
        var dppx = this._window.devicePixelRatio;
        this._resolutionMediaQueryList = this._window.matchMedia("all and (resolution: ".concat(dppx, "dppx)"));
        // IE and some versions of Edge do not support addEventListener/removeEventListener, and we are going to use the deprecated addListener/removeListener
        this._resolutionMediaQueryList.addListener(this._resolutionListener);
    };
    Observable.prototype._uninstallResolutionListener = function () {
        if (this._resolutionMediaQueryList !== null) {
            // IE and some versions of Edge do not support addEventListener/removeEventListener, and we are going to use the deprecated addListener/removeListener
            this._resolutionMediaQueryList.removeListener(this._resolutionListener);
            this._resolutionMediaQueryList = null;
        }
    };
    Observable.prototype._reinstallResolutionListener = function () {
        this._uninstallResolutionListener();
        this._installResolutionListener();
    };
    Observable.prototype._onResolutionChanged = function () {
        var _this = this;
        this._observers.forEach(function (observer) { return observer.next(_this._window.devicePixelRatio); });
        this._reinstallResolutionListener();
    };
    return Observable;
}());
function createObservable(win) {
    return new Observable(win);
}

var DevicePixelContentBoxBinding = /** @class */ (function () {
    function DevicePixelContentBoxBinding(canvasElement, transformBitmapSize, options) {
        var _a;
        this._canvasElement = null;
        this._bitmapSizeChangedListeners = [];
        this._suggestedBitmapSize = null;
        this._suggestedBitmapSizeChangedListeners = [];
        // devicePixelRatio approach
        this._devicePixelRatioObservable = null;
        // ResizeObserver approach
        this._canvasElementResizeObserver = null;
        this._canvasElement = canvasElement;
        this._canvasElementClientSize = size({
            width: this._canvasElement.clientWidth,
            height: this._canvasElement.clientHeight,
        });
        this._transformBitmapSize = transformBitmapSize !== null && transformBitmapSize !== void 0 ? transformBitmapSize : (function (size) { return size; });
        this._allowResizeObserver = (_a = options === null || options === void 0 ? void 0 : options.allowResizeObserver) !== null && _a !== void 0 ? _a : true;
        this._chooseAndInitObserver();
        // we MAY leave the constuctor without any bitmap size observation mechanics initialized
    }
    DevicePixelContentBoxBinding.prototype.dispose = function () {
        var _a, _b;
        if (this._canvasElement === null) {
            throw new Error('Object is disposed');
        }
        (_a = this._canvasElementResizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
        this._canvasElementResizeObserver = null;
        (_b = this._devicePixelRatioObservable) === null || _b === void 0 ? void 0 : _b.dispose();
        this._devicePixelRatioObservable = null;
        this._suggestedBitmapSizeChangedListeners.length = 0;
        this._bitmapSizeChangedListeners.length = 0;
        this._canvasElement = null;
    };
    Object.defineProperty(DevicePixelContentBoxBinding.prototype, "canvasElement", {
        get: function () {
            if (this._canvasElement === null) {
                throw new Error('Object is disposed');
            }
            return this._canvasElement;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DevicePixelContentBoxBinding.prototype, "canvasElementClientSize", {
        get: function () {
            return this._canvasElementClientSize;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DevicePixelContentBoxBinding.prototype, "bitmapSize", {
        get: function () {
            return size({
                width: this.canvasElement.width,
                height: this.canvasElement.height,
            });
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Use this function to change canvas element client size until binding is disposed
     * @param clientSize New client size for bound HTMLCanvasElement
     */
    DevicePixelContentBoxBinding.prototype.resizeCanvasElement = function (clientSize) {
        this._canvasElementClientSize = size(clientSize);
        this.canvasElement.style.width = "".concat(this._canvasElementClientSize.width, "px");
        this.canvasElement.style.height = "".concat(this._canvasElementClientSize.height, "px");
        this._invalidateBitmapSize();
    };
    DevicePixelContentBoxBinding.prototype.subscribeBitmapSizeChanged = function (listener) {
        this._bitmapSizeChangedListeners.push(listener);
    };
    DevicePixelContentBoxBinding.prototype.unsubscribeBitmapSizeChanged = function (listener) {
        this._bitmapSizeChangedListeners = this._bitmapSizeChangedListeners.filter(function (l) { return l !== listener; });
    };
    Object.defineProperty(DevicePixelContentBoxBinding.prototype, "suggestedBitmapSize", {
        get: function () {
            return this._suggestedBitmapSize;
        },
        enumerable: false,
        configurable: true
    });
    DevicePixelContentBoxBinding.prototype.subscribeSuggestedBitmapSizeChanged = function (listener) {
        this._suggestedBitmapSizeChangedListeners.push(listener);
    };
    DevicePixelContentBoxBinding.prototype.unsubscribeSuggestedBitmapSizeChanged = function (listener) {
        this._suggestedBitmapSizeChangedListeners = this._suggestedBitmapSizeChangedListeners.filter(function (l) { return l !== listener; });
    };
    DevicePixelContentBoxBinding.prototype.applySuggestedBitmapSize = function () {
        if (this._suggestedBitmapSize === null) {
            // nothing to apply
            return;
        }
        var oldSuggestedSize = this._suggestedBitmapSize;
        this._suggestedBitmapSize = null;
        this._resizeBitmap(oldSuggestedSize);
        this._emitSuggestedBitmapSizeChanged(oldSuggestedSize, this._suggestedBitmapSize);
    };
    DevicePixelContentBoxBinding.prototype._resizeBitmap = function (newSize) {
        var oldSize = this.bitmapSize;
        if (equalSizes(oldSize, newSize)) {
            return;
        }
        this.canvasElement.width = newSize.width;
        this.canvasElement.height = newSize.height;
        this._emitBitmapSizeChanged(oldSize, newSize);
    };
    DevicePixelContentBoxBinding.prototype._emitBitmapSizeChanged = function (oldSize, newSize) {
        var _this = this;
        this._bitmapSizeChangedListeners.forEach(function (listener) { return listener.call(_this, oldSize, newSize); });
    };
    DevicePixelContentBoxBinding.prototype._suggestNewBitmapSize = function (newSize) {
        var oldSuggestedSize = this._suggestedBitmapSize;
        var finalNewSize = size(this._transformBitmapSize(newSize, this._canvasElementClientSize));
        var newSuggestedSize = equalSizes(this.bitmapSize, finalNewSize) ? null : finalNewSize;
        if (oldSuggestedSize === null && newSuggestedSize === null) {
            return;
        }
        if (oldSuggestedSize !== null && newSuggestedSize !== null
            && equalSizes(oldSuggestedSize, newSuggestedSize)) {
            return;
        }
        this._suggestedBitmapSize = newSuggestedSize;
        this._emitSuggestedBitmapSizeChanged(oldSuggestedSize, newSuggestedSize);
    };
    DevicePixelContentBoxBinding.prototype._emitSuggestedBitmapSizeChanged = function (oldSize, newSize) {
        var _this = this;
        this._suggestedBitmapSizeChangedListeners.forEach(function (listener) { return listener.call(_this, oldSize, newSize); });
    };
    DevicePixelContentBoxBinding.prototype._chooseAndInitObserver = function () {
        var _this = this;
        if (!this._allowResizeObserver) {
            this._initDevicePixelRatioObservable();
            return;
        }
        isDevicePixelContentBoxSupported()
            .then(function (isSupported) {
            return isSupported ?
                _this._initResizeObserver() :
                _this._initDevicePixelRatioObservable();
        });
    };
    // devicePixelRatio approach
    DevicePixelContentBoxBinding.prototype._initDevicePixelRatioObservable = function () {
        var _this = this;
        if (this._canvasElement === null) {
            // it looks like we are already dead
            return;
        }
        var win = canvasElementWindow(this._canvasElement);
        if (win === null) {
            throw new Error('No window is associated with the canvas');
        }
        this._devicePixelRatioObservable = createObservable(win);
        this._devicePixelRatioObservable.subscribe(function () { return _this._invalidateBitmapSize(); });
        this._invalidateBitmapSize();
    };
    DevicePixelContentBoxBinding.prototype._invalidateBitmapSize = function () {
        var _a, _b;
        if (this._canvasElement === null) {
            // it looks like we are already dead
            return;
        }
        var win = canvasElementWindow(this._canvasElement);
        if (win === null) {
            return;
        }
        var ratio = (_b = (_a = this._devicePixelRatioObservable) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : win.devicePixelRatio;
        var canvasRects = this._canvasElement.getClientRects();
        var newSize = 
        // eslint-disable-next-line no-negated-condition
        canvasRects[0] !== undefined ?
            predictedBitmapSize(canvasRects[0], ratio) :
            size({
                width: this._canvasElementClientSize.width * ratio,
                height: this._canvasElementClientSize.height * ratio,
            });
        this._suggestNewBitmapSize(newSize);
    };
    // ResizeObserver approach
    DevicePixelContentBoxBinding.prototype._initResizeObserver = function () {
        var _this = this;
        if (this._canvasElement === null) {
            // it looks like we are already dead
            return;
        }
        this._canvasElementResizeObserver = new ResizeObserver(function (entries) {
            var entry = entries.find(function (entry) { return entry.target === _this._canvasElement; });
            if (!entry || !entry.devicePixelContentBoxSize || !entry.devicePixelContentBoxSize[0]) {
                return;
            }
            var entrySize = entry.devicePixelContentBoxSize[0];
            var newSize = size({
                width: entrySize.inlineSize,
                height: entrySize.blockSize,
            });
            _this._suggestNewBitmapSize(newSize);
        });
        this._canvasElementResizeObserver.observe(this._canvasElement, { box: 'device-pixel-content-box' });
    };
    return DevicePixelContentBoxBinding;
}());
function bindTo(canvasElement, target) {
    if (target.type === 'device-pixel-content-box') {
        return new DevicePixelContentBoxBinding(canvasElement, target.transform, target.options);
    }
    throw new Error('Unsupported binding target');
}
function canvasElementWindow(canvasElement) {
    // According to DOM Level 2 Core specification, ownerDocument should never be null for HTMLCanvasElement
    // see https://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#node-ownerDoc
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return canvasElement.ownerDocument.defaultView;
}
function isDevicePixelContentBoxSupported() {
    return new Promise(function (resolve) {
        var ro = new ResizeObserver(function (entries) {
            resolve(entries.every(function (entry) { return 'devicePixelContentBoxSize' in entry; }));
            ro.disconnect();
        });
        ro.observe(document.body, { box: 'device-pixel-content-box' });
    })
        .catch(function () { return false; });
}
function predictedBitmapSize(canvasRect, ratio) {
    return size({
        width: Math.round(canvasRect.left * ratio + canvasRect.width * ratio) -
            Math.round(canvasRect.left * ratio),
        height: Math.round(canvasRect.top * ratio + canvasRect.height * ratio) -
            Math.round(canvasRect.top * ratio),
    });
}

/**
 * @experimental
 */
var CanvasRenderingTarget2D = /** @class */ (function () {
    function CanvasRenderingTarget2D(context, mediaSize, bitmapSize) {
        if (mediaSize.width === 0 || mediaSize.height === 0) {
            throw new TypeError('Rendering target could only be created on a media with positive width and height');
        }
        this._mediaSize = mediaSize;
        // !Number.isInteger(bitmapSize.width) || !Number.isInteger(bitmapSize.height)
        if (bitmapSize.width === 0 || bitmapSize.height === 0) {
            throw new TypeError('Rendering target could only be created using a bitmap with positive integer width and height');
        }
        this._bitmapSize = bitmapSize;
        this._context = context;
    }
    CanvasRenderingTarget2D.prototype.useMediaCoordinateSpace = function (f) {
        try {
            this._context.save();
            // do not use resetTransform to support old versions of Edge
            this._context.setTransform(1, 0, 0, 1, 0, 0);
            this._context.scale(this._horizontalPixelRatio, this._verticalPixelRatio);
            return f({
                context: this._context,
                mediaSize: this._mediaSize,
            });
        }
        finally {
            this._context.restore();
        }
    };
    CanvasRenderingTarget2D.prototype.useBitmapCoordinateSpace = function (f) {
        try {
            this._context.save();
            // do not use resetTransform to support old versions of Edge
            this._context.setTransform(1, 0, 0, 1, 0, 0);
            return f({
                context: this._context,
                mediaSize: this._mediaSize,
                bitmapSize: this._bitmapSize,
                horizontalPixelRatio: this._horizontalPixelRatio,
                verticalPixelRatio: this._verticalPixelRatio,
            });
        }
        finally {
            this._context.restore();
        }
    };
    Object.defineProperty(CanvasRenderingTarget2D.prototype, "_horizontalPixelRatio", {
        get: function () {
            return this._bitmapSize.width / this._mediaSize.width;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CanvasRenderingTarget2D.prototype, "_verticalPixelRatio", {
        get: function () {
            return this._bitmapSize.height / this._mediaSize.height;
        },
        enumerable: false,
        configurable: true
    });
    return CanvasRenderingTarget2D;
}());
/**
 * @experimental
 */
function tryCreateCanvasRenderingTarget2D(binding, contextOptions) {
    var mediaSize = binding.canvasElementClientSize;
    if (mediaSize.width === 0 || mediaSize.height === 0) {
        return null;
    }
    var bitmapSize = binding.bitmapSize;
    if (bitmapSize.width === 0 || bitmapSize.height === 0) {
        return null;
    }
    var context = binding.canvasElement.getContext('2d', contextOptions);
    if (context === null) {
        return null;
    }
    return new CanvasRenderingTarget2D(context, mediaSize, bitmapSize);
}

/*!
 * @license
 * TradingView Lightweight Charts™ v4.1.6
 * Copyright (c) 2024 TradingView, Inc.
 * Licensed under Apache License 2.0 https://www.apache.org/licenses/LICENSE-2.0
 */
const e={upColor:"#26a69a",downColor:"#ef5350",wickVisible:!0,borderVisible:!0,borderColor:"#378658",borderUpColor:"#26a69a",borderDownColor:"#ef5350",wickColor:"#737375",wickUpColor:"#26a69a",wickDownColor:"#ef5350"},r={upColor:"#26a69a",downColor:"#ef5350",openVisible:!0,thinBars:!0},h={color:"#2196f3",lineStyle:0,lineWidth:3,lineType:0,lineVisible:!0,crosshairMarkerVisible:!0,crosshairMarkerRadius:4,crosshairMarkerBorderColor:"",crosshairMarkerBorderWidth:2,crosshairMarkerBackgroundColor:"",lastPriceAnimation:0,pointMarkersVisible:!1},l={topColor:"rgba( 46, 220, 135, 0.4)",bottomColor:"rgba( 40, 221, 100, 0)",invertFilledArea:!1,lineColor:"#33D778",lineStyle:0,lineWidth:3,lineType:0,lineVisible:!0,crosshairMarkerVisible:!0,crosshairMarkerRadius:4,crosshairMarkerBorderColor:"",crosshairMarkerBorderWidth:2,crosshairMarkerBackgroundColor:"",lastPriceAnimation:0,pointMarkersVisible:!1},a={baseValue:{type:"price",price:0},topFillColor1:"rgba(38, 166, 154, 0.28)",topFillColor2:"rgba(38, 166, 154, 0.05)",topLineColor:"rgba(38, 166, 154, 1)",bottomFillColor1:"rgba(239, 83, 80, 0.05)",bottomFillColor2:"rgba(239, 83, 80, 0.28)",bottomLineColor:"rgba(239, 83, 80, 1)",lineWidth:3,lineStyle:0,lineType:0,lineVisible:!0,crosshairMarkerVisible:!0,crosshairMarkerRadius:4,crosshairMarkerBorderColor:"",crosshairMarkerBorderWidth:2,crosshairMarkerBackgroundColor:"",lastPriceAnimation:0,pointMarkersVisible:!1},o={color:"#26a69a",base:0},_={color:"#2196f3"},u={title:"",visible:!0,lastValueVisible:!0,priceLineVisible:!0,priceLineSource:0,priceLineWidth:1,priceLineColor:"",priceLineStyle:2,baseLineVisible:!0,baseLineWidth:1,baseLineColor:"#B2B5BE",baseLineStyle:0,priceFormat:{type:"price",precision:2,minMove:.01}};var c,d;function f(t,i){const n={0:[],1:[t.lineWidth,t.lineWidth],2:[2*t.lineWidth,2*t.lineWidth],3:[6*t.lineWidth,6*t.lineWidth],4:[t.lineWidth,4*t.lineWidth]}[i];t.setLineDash(n);}function v(t,i,n,s){t.beginPath();const e=t.lineWidth%2?.5:0;t.moveTo(n,i+e),t.lineTo(s,i+e),t.stroke();}function p(t,i){if(!t)throw new Error("Assertion failed"+(i?": "+i:""))}function m(t){if(void 0===t)throw new Error("Value is undefined");return t}function b(t){if(null===t)throw new Error("Value is null");return t}function w(t){return b(m(t))}!function(t){t[t.Simple=0]="Simple",t[t.WithSteps=1]="WithSteps",t[t.Curved=2]="Curved";}(c||(c={})),function(t){t[t.Solid=0]="Solid",t[t.Dotted=1]="Dotted",t[t.Dashed=2]="Dashed",t[t.LargeDashed=3]="LargeDashed",t[t.SparseDotted=4]="SparseDotted";}(d||(d={}));const g={khaki:"#f0e68c",azure:"#f0ffff",aliceblue:"#f0f8ff",ghostwhite:"#f8f8ff",gold:"#ffd700",goldenrod:"#daa520",gainsboro:"#dcdcdc",gray:"#808080",green:"#008000",honeydew:"#f0fff0",floralwhite:"#fffaf0",lightblue:"#add8e6",lightcoral:"#f08080",lemonchiffon:"#fffacd",hotpink:"#ff69b4",lightyellow:"#ffffe0",greenyellow:"#adff2f",lightgoldenrodyellow:"#fafad2",limegreen:"#32cd32",linen:"#faf0e6",lightcyan:"#e0ffff",magenta:"#f0f",maroon:"#800000",olive:"#808000",orange:"#ffa500",oldlace:"#fdf5e6",mediumblue:"#0000cd",transparent:"#0000",lime:"#0f0",lightpink:"#ffb6c1",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",midnightblue:"#191970",orchid:"#da70d6",mediumorchid:"#ba55d3",mediumturquoise:"#48d1cc",orangered:"#ff4500",royalblue:"#4169e1",powderblue:"#b0e0e6",red:"#f00",coral:"#ff7f50",turquoise:"#40e0d0",white:"#fff",whitesmoke:"#f5f5f5",wheat:"#f5deb3",teal:"#008080",steelblue:"#4682b4",bisque:"#ffe4c4",aquamarine:"#7fffd4",aqua:"#0ff",sienna:"#a0522d",silver:"#c0c0c0",springgreen:"#00ff7f",antiquewhite:"#faebd7",burlywood:"#deb887",brown:"#a52a2a",beige:"#f5f5dc",chocolate:"#d2691e",chartreuse:"#7fff00",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",cadetblue:"#5f9ea0",tomato:"#ff6347",fuchsia:"#f0f",blue:"#00f",salmon:"#fa8072",blanchedalmond:"#ffebcd",slateblue:"#6a5acd",slategray:"#708090",thistle:"#d8bfd8",tan:"#d2b48c",cyan:"#0ff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkgray:"#a9a9a9",blueviolet:"#8a2be2",black:"#000",darkmagenta:"#8b008b",darkslateblue:"#483d8b",darkkhaki:"#bdb76b",darkorchid:"#9932cc",darkorange:"#ff8c00",darkgreen:"#006400",darkred:"#8b0000",dodgerblue:"#1e90ff",darkslategray:"#2f4f4f",dimgray:"#696969",deepskyblue:"#00bfff",firebrick:"#b22222",forestgreen:"#228b22",indigo:"#4b0082",ivory:"#fffff0",lavenderblush:"#fff0f5",feldspar:"#d19275",indianred:"#cd5c5c",lightgreen:"#90ee90",lightgrey:"#d3d3d3",lightskyblue:"#87cefa",lightslategray:"#789",lightslateblue:"#8470ff",snow:"#fffafa",lightseagreen:"#20b2aa",lightsalmon:"#ffa07a",darksalmon:"#e9967a",darkviolet:"#9400d3",mediumpurple:"#9370d8",mediumaquamarine:"#66cdaa",skyblue:"#87ceeb",lavender:"#e6e6fa",lightsteelblue:"#b0c4de",mediumvioletred:"#c71585",mintcream:"#f5fffa",navajowhite:"#ffdead",navy:"#000080",olivedrab:"#6b8e23",palevioletred:"#d87093",violetred:"#d02090",yellow:"#ff0",yellowgreen:"#9acd32",lawngreen:"#7cfc00",pink:"#ffc0cb",paleturquoise:"#afeeee",palegoldenrod:"#eee8aa",darkolivegreen:"#556b2f",darkseagreen:"#8fbc8f",darkturquoise:"#00ced1",peachpuff:"#ffdab9",deeppink:"#ff1493",violet:"#ee82ee",palegreen:"#98fb98",mediumseagreen:"#3cb371",peru:"#cd853f",saddlebrown:"#8b4513",sandybrown:"#f4a460",rosybrown:"#bc8f8f",purple:"#800080",seagreen:"#2e8b57",seashell:"#fff5ee",papayawhip:"#ffefd5",mediumslateblue:"#7b68ee",plum:"#dda0dd",mediumspringgreen:"#00fa9a"};function M(t){return t<0?0:t>255?255:Math.round(t)||0}function x(t){return t<=0||t>1?Math.min(Math.max(t,0),1):Math.round(1e4*t)/1e4}const S=/^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i,k=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i,y=/^rgb\(\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*\)$/,C=/^rgba\(\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*,\s*(-?\d*\.?\d+)\s*\)$/;function T(t){(t=t.toLowerCase())in g&&(t=g[t]);{const i=C.exec(t)||y.exec(t);if(i)return [M(parseInt(i[1],10)),M(parseInt(i[2],10)),M(parseInt(i[3],10)),x(i.length<5?1:parseFloat(i[4]))]}{const i=k.exec(t);if(i)return [M(parseInt(i[1],16)),M(parseInt(i[2],16)),M(parseInt(i[3],16)),1]}{const i=S.exec(t);if(i)return [M(17*parseInt(i[1],16)),M(17*parseInt(i[2],16)),M(17*parseInt(i[3],16)),1]}throw new Error(`Cannot parse color: ${t}`)}function P(t){const i=T(t);return {t:`rgb(${i[0]}, ${i[1]}, ${i[2]})`,i:(n=i,.199*n[0]+.687*n[1]+.114*n[2]>160?"black":"white")};var n;}class R{constructor(){this.h=[];}l(t,i,n){const s={o:t,_:i,u:!0===n};this.h.push(s);}v(t){const i=this.h.findIndex((i=>t===i.o));i>-1&&this.h.splice(i,1);}p(t){this.h=this.h.filter((i=>i._!==t));}m(t,i,n){const s=[...this.h];this.h=this.h.filter((t=>!t.u)),s.forEach((s=>s.o(t,i,n)));}M(){return this.h.length>0}S(){this.h=[];}}function D(t,...i){for(const n of i)for(const i in n)void 0!==n[i]&&("object"!=typeof n[i]||void 0===t[i]||Array.isArray(n[i])?t[i]=n[i]:D(t[i],n[i]));return t}function O(t){return "number"==typeof t&&isFinite(t)}function A(t){return "number"==typeof t&&t%1==0}function B(t){return "string"==typeof t}function V(t){return "boolean"==typeof t}function I(t){const i=t;if(!i||"object"!=typeof i)return i;let n,s,e;for(s in n=Array.isArray(i)?[]:{},i)i.hasOwnProperty(s)&&(e=i[s],n[s]=e&&"object"==typeof e?I(e):e);return n}function z(t){return null!==t}function L(t){return null===t?void 0:t}const E="-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";function N(t,i,n){return void 0===i&&(i=E),`${n=void 0!==n?`${n} `:""}${t}px ${i}`}class F{constructor(t){this.k={C:1,T:5,P:NaN,R:"",D:"",O:"",A:"",B:0,V:0,I:0,L:0,N:0},this.F=t;}W(){const t=this.k,i=this.j(),n=this.H();return t.P===i&&t.D===n||(t.P=i,t.D=n,t.R=N(i,n),t.L=2.5/12*i,t.B=t.L,t.V=i/12*t.T,t.I=i/12*t.T,t.N=0),t.O=this.$(),t.A=this.U(),this.k}$(){return this.F.W().layout.textColor}U(){return this.F.q()}j(){return this.F.W().layout.fontSize}H(){return this.F.W().layout.fontFamily}}class W{constructor(){this.Y=[];}X(t){this.Y=t;}K(t,i,n){this.Y.forEach((s=>{s.K(t,i,n);}));}}class j{K(t,i,n){t.useBitmapCoordinateSpace((t=>this.Z(t,i,n)));}}class H extends j{constructor(){super(...arguments),this.G=null;}J(t){this.G=t;}Z({context:t,horizontalPixelRatio:i,verticalPixelRatio:n}){if(null===this.G||null===this.G.tt)return;const s=this.G.tt,e=this.G,r=Math.max(1,Math.floor(i))%2/2,h=h=>{t.beginPath();for(let l=s.to-1;l>=s.from;--l){const s=e.it[l],a=Math.round(s.nt*i)+r,o=s.st*n,_=h*n+r;t.moveTo(a,o),t.arc(a,o,_,0,2*Math.PI);}t.fill();};e.et>0&&(t.fillStyle=e.rt,h(e.ht+e.et)),t.fillStyle=e.lt,h(e.ht);}}function $(){return {it:[{nt:0,st:0,ot:0,_t:0}],lt:"",rt:"",ht:0,et:0,tt:null}}const U={from:0,to:1};class q{constructor(t,i){this.ut=new W,this.ct=[],this.dt=[],this.ft=!0,this.F=t,this.vt=i,this.ut.X(this.ct);}bt(t){const i=this.F.wt();i.length!==this.ct.length&&(this.dt=i.map($),this.ct=this.dt.map((t=>{const i=new H;return i.J(t),i})),this.ut.X(this.ct)),this.ft=!0;}gt(){return this.ft&&(this.Mt(),this.ft=!1),this.ut}Mt(){const t=2===this.vt.W().mode,i=this.F.wt(),n=this.vt.xt(),s=this.F.St();i.forEach(((i,e)=>{var r;const h=this.dt[e],l=i.kt(n);if(t||null===l||!i.yt())return void(h.tt=null);const a=b(i.Ct());h.lt=l.Tt,h.ht=l.ht,h.et=l.Pt,h.it[0]._t=l._t,h.it[0].st=i.Dt().Rt(l._t,a.Ot),h.rt=null!==(r=l.At)&&void 0!==r?r:this.F.Bt(h.it[0].st/i.Dt().Vt()),h.it[0].ot=n,h.it[0].nt=s.It(n),h.tt=U;}));}}class Y extends j{constructor(t){super(),this.zt=t;}Z({context:t,bitmapSize:i,horizontalPixelRatio:n,verticalPixelRatio:s}){if(null===this.zt)return;const e=this.zt.Lt.yt,r=this.zt.Et.yt;if(!e&&!r)return;const h=Math.round(this.zt.nt*n),l=Math.round(this.zt.st*s);t.lineCap="butt",e&&h>=0&&(t.lineWidth=Math.floor(this.zt.Lt.et*n),t.strokeStyle=this.zt.Lt.O,t.fillStyle=this.zt.Lt.O,f(t,this.zt.Lt.Nt),function(t,i,n,s){t.beginPath();const e=t.lineWidth%2?.5:0;t.moveTo(i+e,n),t.lineTo(i+e,s),t.stroke();}(t,h,0,i.height)),r&&l>=0&&(t.lineWidth=Math.floor(this.zt.Et.et*s),t.strokeStyle=this.zt.Et.O,t.fillStyle=this.zt.Et.O,f(t,this.zt.Et.Nt),v(t,l,0,i.width));}}class X{constructor(t){this.ft=!0,this.Ft={Lt:{et:1,Nt:0,O:"",yt:!1},Et:{et:1,Nt:0,O:"",yt:!1},nt:0,st:0},this.Wt=new Y(this.Ft),this.jt=t;}bt(){this.ft=!0;}gt(){return this.ft&&(this.Mt(),this.ft=!1),this.Wt}Mt(){const t=this.jt.yt(),i=b(this.jt.Ht()),n=i.$t().W().crosshair,s=this.Ft;if(2===n.mode)return s.Et.yt=!1,void(s.Lt.yt=!1);s.Et.yt=t&&this.jt.Ut(i),s.Lt.yt=t&&this.jt.qt(),s.Et.et=n.horzLine.width,s.Et.Nt=n.horzLine.style,s.Et.O=n.horzLine.color,s.Lt.et=n.vertLine.width,s.Lt.Nt=n.vertLine.style,s.Lt.O=n.vertLine.color,s.nt=this.jt.Yt(),s.st=this.jt.Xt();}}function K(t,i,n,s,e,r){t.fillRect(i+r,n,s-2*r,r),t.fillRect(i+r,n+e-r,s-2*r,r),t.fillRect(i,n,r,e),t.fillRect(i+s-r,n,r,e);}function Z(t,i,n,s,e,r){t.save(),t.globalCompositeOperation="copy",t.fillStyle=r,t.fillRect(i,n,s,e),t.restore();}function G(t,i,n,s,e,r){t.beginPath(),t.roundRect?t.roundRect(i,n,s,e,r):(t.lineTo(i+s-r[1],n),0!==r[1]&&t.arcTo(i+s,n,i+s,n+r[1],r[1]),t.lineTo(i+s,n+e-r[2]),0!==r[2]&&t.arcTo(i+s,n+e,i+s-r[2],n+e,r[2]),t.lineTo(i+r[3],n+e),0!==r[3]&&t.arcTo(i,n+e,i,n+e-r[3],r[3]),t.lineTo(i,n+r[0]),0!==r[0]&&t.arcTo(i,n,i+r[0],n,r[0]));}function J(t,i,n,s,e,r,h=0,l=[0,0,0,0],a=""){if(t.save(),!h||!a||a===r)return G(t,i,n,s,e,l),t.fillStyle=r,t.fill(),void t.restore();const o=h/2;var _;G(t,i+o,n+o,s-h,e-h,(_=-o,l.map((t=>0===t?t:t+_)))),"transparent"!==r&&(t.fillStyle=r,t.fill()),"transparent"!==a&&(t.lineWidth=h,t.strokeStyle=a,t.closePath(),t.stroke()),t.restore();}function Q(t,i,n,s,e,r,h){t.save(),t.globalCompositeOperation="copy";const l=t.createLinearGradient(0,0,0,e);l.addColorStop(0,r),l.addColorStop(1,h),t.fillStyle=l,t.fillRect(i,n,s,e),t.restore();}class tt{constructor(t,i){this.J(t,i);}J(t,i){this.zt=t,this.Kt=i;}Vt(t,i){return this.zt.yt?t.P+t.L+t.B:0}K(t,i,n,s){if(!this.zt.yt||0===this.zt.Zt.length)return;const e=this.zt.O,r=this.Kt.t,h=t.useBitmapCoordinateSpace((t=>{const h=t.context;h.font=i.R;const l=this.Gt(t,i,n,s),a=l.Jt,o=(t,i)=>{l.Qt?J(h,a.ti,a.ii,a.ni,a.si,t,a.ei,[a.ht,0,0,a.ht],i):J(h,a.ri,a.ii,a.ni,a.si,t,a.ei,[0,a.ht,a.ht,0],i);};return o(r,"transparent"),this.zt.hi&&(h.fillStyle=e,h.fillRect(a.ri,a.li,a.ai-a.ri,a.oi)),o("transparent",r),this.zt._i&&(h.fillStyle=i.A,h.fillRect(l.Qt?a.ui-a.ei:0,a.ii,a.ei,a.ci-a.ii)),l}));t.useMediaCoordinateSpace((({context:t})=>{const n=h.di;t.font=i.R,t.textAlign=h.Qt?"right":"left",t.textBaseline="middle",t.fillStyle=e,t.fillText(this.zt.Zt,n.fi,(n.ii+n.ci)/2+n.pi);}));}Gt(t,i,n,s){var e;const{context:r,bitmapSize:h,mediaSize:l,horizontalPixelRatio:a,verticalPixelRatio:o}=t,_=this.zt.hi||!this.zt.mi?i.T:0,u=this.zt.bi?i.C:0,c=i.L+this.Kt.wi,d=i.B+this.Kt.gi,f=i.V,v=i.I,p=this.zt.Zt,m=i.P,b=n.Mi(r,p),w=Math.ceil(n.xi(r,p)),g=m+c+d,M=i.C+f+v+w+_,x=Math.max(1,Math.floor(o));let S=Math.round(g*o);S%2!=x%2&&(S+=1);const k=u>0?Math.max(1,Math.floor(u*a)):0,y=Math.round(M*a),C=Math.round(_*a),T=null!==(e=this.Kt.Si)&&void 0!==e?e:this.Kt.ki,P=Math.round(T*o)-Math.floor(.5*o),R=Math.floor(P+x/2-S/2),D=R+S,O="right"===s,A=O?l.width-u:u,B=O?h.width-k:k;let V,I,z;return O?(V=B-y,I=B-C,z=A-_-f-u):(V=B+y,I=B+C,z=A+_+f),{Qt:O,Jt:{ii:R,li:P,ci:D,ni:y,si:S,ht:2*a,ei:k,ti:V,ri:B,ai:I,oi:x,ui:h.width},di:{ii:R/o,ci:D/o,fi:z,pi:b}}}}class it{constructor(t){this.yi={ki:0,t:"#000",gi:0,wi:0},this.Ci={Zt:"",yt:!1,hi:!0,mi:!1,At:"",O:"#FFF",_i:!1,bi:!1},this.Ti={Zt:"",yt:!1,hi:!1,mi:!0,At:"",O:"#FFF",_i:!0,bi:!0},this.ft=!0,this.Pi=new(t||tt)(this.Ci,this.yi),this.Ri=new(t||tt)(this.Ti,this.yi);}Zt(){return this.Di(),this.Ci.Zt}ki(){return this.Di(),this.yi.ki}bt(){this.ft=!0;}Vt(t,i=!1){return Math.max(this.Pi.Vt(t,i),this.Ri.Vt(t,i))}Oi(){return this.yi.Si||0}Ai(t){this.yi.Si=t;}Bi(){return this.Di(),this.Ci.yt||this.Ti.yt}Vi(){return this.Di(),this.Ci.yt}gt(t){return this.Di(),this.Ci.hi=this.Ci.hi&&t.W().ticksVisible,this.Ti.hi=this.Ti.hi&&t.W().ticksVisible,this.Pi.J(this.Ci,this.yi),this.Ri.J(this.Ti,this.yi),this.Pi}Ii(){return this.Di(),this.Pi.J(this.Ci,this.yi),this.Ri.J(this.Ti,this.yi),this.Ri}Di(){this.ft&&(this.Ci.hi=!0,this.Ti.hi=!1,this.zi(this.Ci,this.Ti,this.yi));}}class nt extends it{constructor(t,i,n){super(),this.jt=t,this.Li=i,this.Ei=n;}zi(t,i,n){if(t.yt=!1,2===this.jt.W().mode)return;const s=this.jt.W().horzLine;if(!s.labelVisible)return;const e=this.Li.Ct();if(!this.jt.yt()||this.Li.Ni()||null===e)return;const r=P(s.labelBackgroundColor);n.t=r.t,t.O=r.i;const h=2/12*this.Li.P();n.wi=h,n.gi=h;const l=this.Ei(this.Li);n.ki=l.ki,t.Zt=this.Li.Fi(l._t,e),t.yt=!0;}}const st=/[1-9]/g;class et{constructor(){this.zt=null;}J(t){this.zt=t;}K(t,i){if(null===this.zt||!1===this.zt.yt||0===this.zt.Zt.length)return;const n=t.useMediaCoordinateSpace((({context:t})=>(t.font=i.R,Math.round(i.Wi.xi(t,b(this.zt).Zt,st)))));if(n<=0)return;const s=i.ji,e=n+2*s,r=e/2,h=this.zt.Hi;let l=this.zt.ki,a=Math.floor(l-r)+.5;a<0?(l+=Math.abs(0-a),a=Math.floor(l-r)+.5):a+e>h&&(l-=Math.abs(h-(a+e)),a=Math.floor(l-r)+.5);const o=a+e,_=Math.ceil(0+i.C+i.T+i.L+i.P+i.B);t.useBitmapCoordinateSpace((({context:t,horizontalPixelRatio:n,verticalPixelRatio:s})=>{const e=b(this.zt);t.fillStyle=e.t;const r=Math.round(a*n),h=Math.round(0*s),l=Math.round(o*n),u=Math.round(_*s),c=Math.round(2*n);if(t.beginPath(),t.moveTo(r,h),t.lineTo(r,u-c),t.arcTo(r,u,r+c,u,c),t.lineTo(l-c,u),t.arcTo(l,u,l,u-c,c),t.lineTo(l,h),t.fill(),e.hi){const r=Math.round(e.ki*n),l=h,a=Math.round((l+i.T)*s);t.fillStyle=e.O;const o=Math.max(1,Math.floor(n)),_=Math.floor(.5*n);t.fillRect(r-_,l,o,a-l);}})),t.useMediaCoordinateSpace((({context:t})=>{const n=b(this.zt),e=0+i.C+i.T+i.L+i.P/2;t.font=i.R,t.textAlign="left",t.textBaseline="middle",t.fillStyle=n.O;const r=i.Wi.Mi(t,"Apr0");t.translate(a+s,e+r),t.fillText(n.Zt,0,0);}));}}class rt{constructor(t,i,n){this.ft=!0,this.Wt=new et,this.Ft={yt:!1,t:"#4c525e",O:"white",Zt:"",Hi:0,ki:NaN,hi:!0},this.vt=t,this.$i=i,this.Ei=n;}bt(){this.ft=!0;}gt(){return this.ft&&(this.Mt(),this.ft=!1),this.Wt.J(this.Ft),this.Wt}Mt(){const t=this.Ft;if(t.yt=!1,2===this.vt.W().mode)return;const i=this.vt.W().vertLine;if(!i.labelVisible)return;const n=this.$i.St();if(n.Ni())return;t.Hi=n.Hi();const s=this.Ei();if(null===s)return;t.ki=s.ki;const e=n.Ui(this.vt.xt());t.Zt=n.qi(b(e)),t.yt=!0;const r=P(i.labelBackgroundColor);t.t=r.t,t.O=r.i,t.hi=n.W().ticksVisible;}}class ht{constructor(){this.Yi=null,this.Xi=0;}Ki(){return this.Xi}Zi(t){this.Xi=t;}Dt(){return this.Yi}Gi(t){this.Yi=t;}Ji(t){return []}Qi(){return []}yt(){return !0}}var lt;!function(t){t[t.Normal=0]="Normal",t[t.Magnet=1]="Magnet",t[t.Hidden=2]="Hidden";}(lt||(lt={}));class at extends ht{constructor(t,i){super(),this.tn=null,this.nn=NaN,this.sn=0,this.en=!0,this.rn=new Map,this.hn=!1,this.ln=NaN,this.an=NaN,this._n=NaN,this.un=NaN,this.$i=t,this.cn=i,this.dn=new q(t,this);this.fn=((t,i)=>n=>{const s=i(),e=t();if(n===b(this.tn).vn())return {_t:e,ki:s};{const t=b(n.Ct());return {_t:n.pn(s,t),ki:s}}})((()=>this.nn),(()=>this.an));const n=((t,i)=>()=>{const n=this.$i.St().mn(t()),s=i();return n&&Number.isFinite(s)?{ot:n,ki:s}:null})((()=>this.sn),(()=>this.Yt()));this.bn=new rt(this,t,n),this.wn=new X(this);}W(){return this.cn}gn(t,i){this._n=t,this.un=i;}Mn(){this._n=NaN,this.un=NaN;}xn(){return this._n}Sn(){return this.un}kn(t,i,n){this.hn||(this.hn=!0),this.en=!0,this.yn(t,i,n);}xt(){return this.sn}Yt(){return this.ln}Xt(){return this.an}yt(){return this.en}Cn(){this.en=!1,this.Tn(),this.nn=NaN,this.ln=NaN,this.an=NaN,this.tn=null,this.Mn();}Pn(t){return null!==this.tn?[this.wn,this.dn]:[]}Ut(t){return t===this.tn&&this.cn.horzLine.visible}qt(){return this.cn.vertLine.visible}Rn(t,i){this.en&&this.tn===t||this.rn.clear();const n=[];return this.tn===t&&n.push(this.Dn(this.rn,i,this.fn)),n}Qi(){return this.en?[this.bn]:[]}Ht(){return this.tn}On(){this.wn.bt(),this.rn.forEach((t=>t.bt())),this.bn.bt(),this.dn.bt();}An(t){return t&&!t.vn().Ni()?t.vn():null}yn(t,i,n){this.Bn(t,i,n)&&this.On();}Bn(t,i,n){const s=this.ln,e=this.an,r=this.nn,h=this.sn,l=this.tn,a=this.An(n);this.sn=t,this.ln=isNaN(t)?NaN:this.$i.St().It(t),this.tn=n;const o=null!==a?a.Ct():null;return null!==a&&null!==o?(this.nn=i,this.an=a.Rt(i,o)):(this.nn=NaN,this.an=NaN),s!==this.ln||e!==this.an||h!==this.sn||r!==this.nn||l!==this.tn}Tn(){const t=this.$i.wt().map((t=>t.In().Vn())).filter(z),i=0===t.length?null:Math.max(...t);this.sn=null!==i?i:NaN;}Dn(t,i,n){let s=t.get(i);return void 0===s&&(s=new nt(this,i,n),t.set(i,s)),s}}function ot(t){return "left"===t||"right"===t}class _t{constructor(t){this.zn=new Map,this.Ln=[],this.En=t;}Nn(t,i){const n=function(t,i){return void 0===t?i:{Fn:Math.max(t.Fn,i.Fn),Wn:t.Wn||i.Wn}}(this.zn.get(t),i);this.zn.set(t,n);}jn(){return this.En}Hn(t){const i=this.zn.get(t);return void 0===i?{Fn:this.En}:{Fn:Math.max(this.En,i.Fn),Wn:i.Wn}}$n(){this.Un(),this.Ln=[{qn:0}];}Yn(t){this.Un(),this.Ln=[{qn:1,Ot:t}];}Xn(t){this.Kn(),this.Ln.push({qn:5,Ot:t});}Un(){this.Kn(),this.Ln.push({qn:6});}Zn(){this.Un(),this.Ln=[{qn:4}];}Gn(t){this.Un(),this.Ln.push({qn:2,Ot:t});}Jn(t){this.Un(),this.Ln.push({qn:3,Ot:t});}Qn(){return this.Ln}ts(t){for(const i of t.Ln)this.ns(i);this.En=Math.max(this.En,t.En),t.zn.forEach(((t,i)=>{this.Nn(i,t);}));}static ss(){return new _t(2)}static es(){return new _t(3)}ns(t){switch(t.qn){case 0:this.$n();break;case 1:this.Yn(t.Ot);break;case 2:this.Gn(t.Ot);break;case 3:this.Jn(t.Ot);break;case 4:this.Zn();break;case 5:this.Xn(t.Ot);break;case 6:this.Kn();}}Kn(){const t=this.Ln.findIndex((t=>5===t.qn));-1!==t&&this.Ln.splice(t,1);}}const ut=".";function ct(t,i){if(!O(t))return "n/a";if(!A(i))throw new TypeError("invalid length");if(i<0||i>16)throw new TypeError("invalid length");if(0===i)return t.toString();return ("0000000000000000"+t.toString()).slice(-i)}class dt{constructor(t,i){if(i||(i=1),O(t)&&A(t)||(t=100),t<0)throw new TypeError("invalid base");this.Li=t,this.rs=i,this.hs();}format(t){const i=t<0?"−":"";return t=Math.abs(t),i+this.ls(t)}hs(){if(this.os=0,this.Li>0&&this.rs>0){let t=this.Li;for(;t>1;)t/=10,this.os++;}}ls(t){const i=this.Li/this.rs;let n=Math.floor(t),s="";const e=void 0!==this.os?this.os:NaN;if(i>1){let r=+(Math.round(t*i)-n*i).toFixed(this.os);r>=i&&(r-=i,n+=1),s=ut+ct(+r.toFixed(this.os)*this.rs,e);}else n=Math.round(n*i)/i,e>0&&(s=ut+ct(0,e));return n.toFixed(0)+s}}class ft extends dt{constructor(t=100){super(t);}format(t){return `${super.format(t)}%`}}class vt{constructor(t){this._s=t;}format(t){let i="";return t<0&&(i="-",t=-t),t<995?i+this.us(t):t<999995?i+this.us(t/1e3)+"K":t<999999995?(t=1e3*Math.round(t/1e3),i+this.us(t/1e6)+"M"):(t=1e6*Math.round(t/1e6),i+this.us(t/1e9)+"B")}us(t){let i;const n=Math.pow(10,this._s);return i=(t=Math.round(t*n)/n)>=1e-15&&t<1?t.toFixed(this._s).replace(/\.?0+$/,""):String(t),i.replace(/(\.[1-9]*)0+$/,((t,i)=>i))}}function pt(t,i,n,s,e,r,h){if(0===i.length||s.from>=i.length||s.to<=0)return;const{context:l,horizontalPixelRatio:a,verticalPixelRatio:o}=t,_=i[s.from];let u=r(t,_),c=_;if(s.to-s.from<2){const i=e/2;l.beginPath();const n={nt:_.nt-i,st:_.st},s={nt:_.nt+i,st:_.st};l.moveTo(n.nt*a,n.st*o),l.lineTo(s.nt*a,s.st*o),h(t,u,n,s);}else {const e=(i,n)=>{h(t,u,c,n),l.beginPath(),u=i,c=n;};let d=c;l.beginPath(),l.moveTo(_.nt*a,_.st*o);for(let h=s.from+1;h<s.to;++h){d=i[h];const s=r(t,d);switch(n){case 0:l.lineTo(d.nt*a,d.st*o);break;case 1:l.lineTo(d.nt*a,i[h-1].st*o),s!==u&&(e(s,d),l.lineTo(d.nt*a,i[h-1].st*o)),l.lineTo(d.nt*a,d.st*o);break;case 2:{const[t,n]=gt(i,h-1,h);l.bezierCurveTo(t.nt*a,t.st*o,n.nt*a,n.st*o,d.nt*a,d.st*o);break}}1!==n&&s!==u&&(e(s,d),l.moveTo(d.nt*a,d.st*o));}(c!==d||c===d&&1===n)&&h(t,u,c,d);}}const mt=6;function bt(t,i){return {nt:t.nt-i.nt,st:t.st-i.st}}function wt(t,i){return {nt:t.nt/i,st:t.st/i}}function gt(t,i,n){const s=Math.max(0,i-1),e=Math.min(t.length-1,n+1);var r,h;return [(r=t[i],h=wt(bt(t[n],t[s]),mt),{nt:r.nt+h.nt,st:r.st+h.st}),bt(t[n],wt(bt(t[e],t[i]),mt))]}function Mt(t,i,n,s,e){const{context:r,horizontalPixelRatio:h,verticalPixelRatio:l}=i;r.lineTo(e.nt*h,t*l),r.lineTo(s.nt*h,t*l),r.closePath(),r.fillStyle=n,r.fill();}class xt extends j{constructor(){super(...arguments),this.G=null;}J(t){this.G=t;}Z(t){var i;if(null===this.G)return;const{it:n,tt:s,cs:e,et:r,Nt:h,ds:l}=this.G,a=null!==(i=this.G.fs)&&void 0!==i?i:this.G.vs?0:t.mediaSize.height;if(null===s)return;const o=t.context;o.lineCap="butt",o.lineJoin="round",o.lineWidth=r,f(o,h),o.lineWidth=1,pt(t,n,l,s,e,this.ps.bind(this),Mt.bind(null,a));}}function St(t,i,n){return Math.min(Math.max(t,i),n)}function kt(t,i,n){return i-t<=n}function yt(t){const i=Math.ceil(t);return i%2==0?i-1:i}class Ct{bs(t,i){const n=this.ws,{gs:s,Ms:e,xs:r,Ss:h,ks:l,fs:a}=i;if(void 0===this.ys||void 0===n||n.gs!==s||n.Ms!==e||n.xs!==r||n.Ss!==h||n.fs!==a||n.ks!==l){const n=t.context.createLinearGradient(0,0,0,l);if(n.addColorStop(0,s),null!=a){const i=St(a*t.verticalPixelRatio/l,0,1);n.addColorStop(i,e),n.addColorStop(i,r);}n.addColorStop(1,h),this.ys=n,this.ws=i;}return this.ys}}class Tt extends xt{constructor(){super(...arguments),this.Cs=new Ct;}ps(t,i){return this.Cs.bs(t,{gs:i.Ts,Ms:"",xs:"",Ss:i.Ps,ks:t.bitmapSize.height})}}function Pt(t,i){const n=t.context;n.strokeStyle=i,n.stroke();}class Rt extends j{constructor(){super(...arguments),this.G=null;}J(t){this.G=t;}Z(t){if(null===this.G)return;const{it:i,tt:n,cs:s,ds:e,et:r,Nt:h,Rs:l}=this.G;if(null===n)return;const a=t.context;a.lineCap="butt",a.lineWidth=r*t.verticalPixelRatio,f(a,h),a.lineJoin="round";const o=this.Ds.bind(this);void 0!==e&&pt(t,i,e,n,s,o,Pt),l&&function(t,i,n,s,e){const{horizontalPixelRatio:r,verticalPixelRatio:h,context:l}=t;let a=null;const o=Math.max(1,Math.floor(r))%2/2,_=n*h+o;for(let n=s.to-1;n>=s.from;--n){const s=i[n];if(s){const i=e(t,s);i!==a&&(l.beginPath(),null!==a&&l.fill(),l.fillStyle=i,a=i);const n=Math.round(s.nt*r)+o,u=s.st*h;l.moveTo(n,u),l.arc(n,u,_,0,2*Math.PI);}}l.fill();}(t,i,l,n,o);}}class Dt extends Rt{Ds(t,i){return i.lt}}function Ot(t,i,n,s,e=0,r=i.length){let h=r-e;for(;0<h;){const r=h>>1,l=e+r;s(i[l],n)===t?(e=l+1,h-=r+1):h=r;}return e}const At=Ot.bind(null,!0),Bt=Ot.bind(null,!1);function Vt(t,i){return t.ot<i}function It(t,i){return i<t.ot}function zt(t,i,n){const s=i.Os(),e=i.ui(),r=At(t,s,Vt),h=Bt(t,e,It);if(!n)return {from:r,to:h};let l=r,a=h;return r>0&&r<t.length&&t[r].ot>=s&&(l=r-1),h>0&&h<t.length&&t[h-1].ot<=e&&(a=h+1),{from:l,to:a}}class Lt{constructor(t,i,n){this.As=!0,this.Bs=!0,this.Vs=!0,this.Is=[],this.zs=null,this.Ls=t,this.Es=i,this.Ns=n;}bt(t){this.As=!0,"data"===t&&(this.Bs=!0),"options"===t&&(this.Vs=!0);}gt(){return this.Ls.yt()?(this.Fs(),null===this.zs?null:this.Ws):null}js(){this.Is=this.Is.map((t=>Object.assign(Object.assign({},t),this.Ls.$s().Hs(t.ot))));}Us(){this.zs=null;}Fs(){this.Bs&&(this.qs(),this.Bs=!1),this.Vs&&(this.js(),this.Vs=!1),this.As&&(this.Ys(),this.As=!1);}Ys(){const t=this.Ls.Dt(),i=this.Es.St();if(this.Us(),i.Ni()||t.Ni())return;const n=i.Xs();if(null===n)return;if(0===this.Ls.In().Ks())return;const s=this.Ls.Ct();null!==s&&(this.zs=zt(this.Is,n,this.Ns),this.Zs(t,i,s.Ot),this.Gs());}}class Et extends Lt{constructor(t,i){super(t,i,!0);}Zs(t,i,n){i.Js(this.Is,L(this.zs)),t.Qs(this.Is,n,L(this.zs));}te(t,i){return {ot:t,_t:i,nt:NaN,st:NaN}}qs(){const t=this.Ls.$s();this.Is=this.Ls.In().ie().map((i=>{const n=i.Ot[3];return this.ne(i.se,n,t)}));}}class Nt extends Et{constructor(t,i){super(t,i),this.Ws=new W,this.ee=new Tt,this.re=new Dt,this.Ws.X([this.ee,this.re]);}ne(t,i,n){return Object.assign(Object.assign({},this.te(t,i)),n.Hs(t))}Gs(){const t=this.Ls.W();this.ee.J({ds:t.lineType,it:this.Is,Nt:t.lineStyle,et:t.lineWidth,fs:null,vs:t.invertFilledArea,tt:this.zs,cs:this.Es.St().he()}),this.re.J({ds:t.lineVisible?t.lineType:void 0,it:this.Is,Nt:t.lineStyle,et:t.lineWidth,tt:this.zs,cs:this.Es.St().he(),Rs:t.pointMarkersVisible?t.pointMarkersRadius||t.lineWidth/2+2:void 0});}}class Ft extends j{constructor(){super(...arguments),this.zt=null,this.le=0,this.ae=0;}J(t){this.zt=t;}Z({context:t,horizontalPixelRatio:i,verticalPixelRatio:n}){if(null===this.zt||0===this.zt.In.length||null===this.zt.tt)return;if(this.le=this.oe(i),this.le>=2){Math.max(1,Math.floor(i))%2!=this.le%2&&this.le--;}this.ae=this.zt._e?Math.min(this.le,Math.floor(i)):this.le;let s=null;const e=this.ae<=this.le&&this.zt.he>=Math.floor(1.5*i);for(let r=this.zt.tt.from;r<this.zt.tt.to;++r){const h=this.zt.In[r];s!==h.ue&&(t.fillStyle=h.ue,s=h.ue);const l=Math.floor(.5*this.ae),a=Math.round(h.nt*i),o=a-l,_=this.ae,u=o+_-1,c=Math.min(h.ce,h.de),d=Math.max(h.ce,h.de),f=Math.round(c*n)-l,v=Math.round(d*n)+l,p=Math.max(v-f,this.ae);t.fillRect(o,f,_,p);const m=Math.ceil(1.5*this.le);if(e){if(this.zt.fe){const i=a-m;let s=Math.max(f,Math.round(h.ve*n)-l),e=s+_-1;e>f+p-1&&(e=f+p-1,s=e-_+1),t.fillRect(i,s,o-i,e-s+1);}const i=a+m;let s=Math.max(f,Math.round(h.pe*n)-l),e=s+_-1;e>f+p-1&&(e=f+p-1,s=e-_+1),t.fillRect(u+1,s,i-u,e-s+1);}}}oe(t){const i=Math.floor(t);return Math.max(i,Math.floor(function(t,i){return Math.floor(.3*t*i)}(b(this.zt).he,t)))}}class Wt extends Lt{constructor(t,i){super(t,i,!1);}Zs(t,i,n){i.Js(this.Is,L(this.zs)),t.me(this.Is,n,L(this.zs));}be(t,i,n){return {ot:t,we:i.Ot[0],ge:i.Ot[1],Me:i.Ot[2],xe:i.Ot[3],nt:NaN,ve:NaN,ce:NaN,de:NaN,pe:NaN}}qs(){const t=this.Ls.$s();this.Is=this.Ls.In().ie().map((i=>this.ne(i.se,i,t)));}}class jt extends Wt{constructor(){super(...arguments),this.Ws=new Ft;}ne(t,i,n){return Object.assign(Object.assign({},this.be(t,i,n)),n.Hs(t))}Gs(){const t=this.Ls.W();this.Ws.J({In:this.Is,he:this.Es.St().he(),fe:t.openVisible,_e:t.thinBars,tt:this.zs});}}class Ht extends xt{constructor(){super(...arguments),this.Cs=new Ct;}ps(t,i){const n=this.G;return this.Cs.bs(t,{gs:i.Se,Ms:i.ke,xs:i.ye,Ss:i.Ce,ks:t.bitmapSize.height,fs:n.fs})}}class $t extends Rt{constructor(){super(...arguments),this.Te=new Ct;}Ds(t,i){const n=this.G;return this.Te.bs(t,{gs:i.Pe,Ms:i.Pe,xs:i.Re,Ss:i.Re,ks:t.bitmapSize.height,fs:n.fs})}}class Ut extends Et{constructor(t,i){super(t,i),this.Ws=new W,this.De=new Ht,this.Oe=new $t,this.Ws.X([this.De,this.Oe]);}ne(t,i,n){return Object.assign(Object.assign({},this.te(t,i)),n.Hs(t))}Gs(){const t=this.Ls.Ct();if(null===t)return;const i=this.Ls.W(),n=this.Ls.Dt().Rt(i.baseValue.price,t.Ot),s=this.Es.St().he();this.De.J({it:this.Is,et:i.lineWidth,Nt:i.lineStyle,ds:i.lineType,fs:n,vs:!1,tt:this.zs,cs:s}),this.Oe.J({it:this.Is,et:i.lineWidth,Nt:i.lineStyle,ds:i.lineVisible?i.lineType:void 0,Rs:i.pointMarkersVisible?i.pointMarkersRadius||i.lineWidth/2+2:void 0,fs:n,tt:this.zs,cs:s});}}class qt extends j{constructor(){super(...arguments),this.zt=null,this.le=0;}J(t){this.zt=t;}Z(t){if(null===this.zt||0===this.zt.In.length||null===this.zt.tt)return;const{horizontalPixelRatio:i}=t;if(this.le=function(t,i){if(t>=2.5&&t<=4)return Math.floor(3*i);const n=1-.2*Math.atan(Math.max(4,t)-4)/(.5*Math.PI),s=Math.floor(t*n*i),e=Math.floor(t*i),r=Math.min(s,e);return Math.max(Math.floor(i),r)}(this.zt.he,i),this.le>=2){Math.floor(i)%2!=this.le%2&&this.le--;}const n=this.zt.In;this.zt.Ae&&this.Be(t,n,this.zt.tt),this.zt._i&&this.Ve(t,n,this.zt.tt);const s=this.Ie(i);(!this.zt._i||this.le>2*s)&&this.ze(t,n,this.zt.tt);}Be(t,i,n){if(null===this.zt)return;const{context:s,horizontalPixelRatio:e,verticalPixelRatio:r}=t;let h="",l=Math.min(Math.floor(e),Math.floor(this.zt.he*e));l=Math.max(Math.floor(e),Math.min(l,this.le));const a=Math.floor(.5*l);let o=null;for(let t=n.from;t<n.to;t++){const n=i[t];n.Le!==h&&(s.fillStyle=n.Le,h=n.Le);const _=Math.round(Math.min(n.ve,n.pe)*r),u=Math.round(Math.max(n.ve,n.pe)*r),c=Math.round(n.ce*r),d=Math.round(n.de*r);let f=Math.round(e*n.nt)-a;const v=f+l-1;null!==o&&(f=Math.max(o+1,f),f=Math.min(f,v));const p=v-f+1;s.fillRect(f,c,p,_-c),s.fillRect(f,u+1,p,d-u),o=v;}}Ie(t){let i=Math.floor(1*t);this.le<=2*i&&(i=Math.floor(.5*(this.le-1)));const n=Math.max(Math.floor(t),i);return this.le<=2*n?Math.max(Math.floor(t),Math.floor(1*t)):n}Ve(t,i,n){if(null===this.zt)return;const{context:s,horizontalPixelRatio:e,verticalPixelRatio:r}=t;let h="";const l=this.Ie(e);let a=null;for(let t=n.from;t<n.to;t++){const n=i[t];n.Ee!==h&&(s.fillStyle=n.Ee,h=n.Ee);let o=Math.round(n.nt*e)-Math.floor(.5*this.le);const _=o+this.le-1,u=Math.round(Math.min(n.ve,n.pe)*r),c=Math.round(Math.max(n.ve,n.pe)*r);if(null!==a&&(o=Math.max(a+1,o),o=Math.min(o,_)),this.zt.he*e>2*l)K(s,o,u,_-o+1,c-u+1,l);else {const t=_-o+1;s.fillRect(o,u,t,c-u+1);}a=_;}}ze(t,i,n){if(null===this.zt)return;const{context:s,horizontalPixelRatio:e,verticalPixelRatio:r}=t;let h="";const l=this.Ie(e);for(let t=n.from;t<n.to;t++){const n=i[t];let a=Math.round(Math.min(n.ve,n.pe)*r),o=Math.round(Math.max(n.ve,n.pe)*r),_=Math.round(n.nt*e)-Math.floor(.5*this.le),u=_+this.le-1;if(n.ue!==h){const t=n.ue;s.fillStyle=t,h=t;}this.zt._i&&(_+=l,a+=l,u-=l,o-=l),a>o||s.fillRect(_,a,u-_+1,o-a+1);}}}class Yt extends Wt{constructor(){super(...arguments),this.Ws=new qt;}ne(t,i,n){return Object.assign(Object.assign({},this.be(t,i,n)),n.Hs(t))}Gs(){const t=this.Ls.W();this.Ws.J({In:this.Is,he:this.Es.St().he(),Ae:t.wickVisible,_i:t.borderVisible,tt:this.zs});}}class Xt{constructor(t,i){this.Ne=t,this.Li=i;}K(t,i,n){this.Ne.draw(t,this.Li,i,n);}}class Kt extends Lt{constructor(t,i,n){super(t,i,!1),this.wn=n,this.Ws=new Xt(this.wn.renderer(),(i=>{const n=t.Ct();return null===n?null:t.Dt().Rt(i,n.Ot)}));}Fe(t){return this.wn.priceValueBuilder(t)}We(t){return this.wn.isWhitespace(t)}qs(){const t=this.Ls.$s();this.Is=this.Ls.In().ie().map((i=>Object.assign(Object.assign({ot:i.se,nt:NaN},t.Hs(i.se)),{je:i.He})));}Zs(t,i){i.Js(this.Is,L(this.zs));}Gs(){this.wn.update({bars:this.Is.map(Zt),barSpacing:this.Es.St().he(),visibleRange:this.zs},this.Ls.W());}}function Zt(t){return {x:t.nt,time:t.ot,originalData:t.je,barColor:t.ue}}class Gt extends j{constructor(){super(...arguments),this.zt=null,this.$e=[];}J(t){this.zt=t,this.$e=[];}Z({context:t,horizontalPixelRatio:i,verticalPixelRatio:n}){if(null===this.zt||0===this.zt.it.length||null===this.zt.tt)return;this.$e.length||this.Ue(i);const s=Math.max(1,Math.floor(n)),e=Math.round(this.zt.qe*n)-Math.floor(s/2),r=e+s;for(let i=this.zt.tt.from;i<this.zt.tt.to;i++){const h=this.zt.it[i],l=this.$e[i-this.zt.tt.from],a=Math.round(h.st*n);let o,_;t.fillStyle=h.ue,a<=e?(o=a,_=r):(o=e,_=a-Math.floor(s/2)+s),t.fillRect(l.Os,o,l.ui-l.Os+1,_-o);}}Ue(t){if(null===this.zt||0===this.zt.it.length||null===this.zt.tt)return void(this.$e=[]);const i=Math.ceil(this.zt.he*t)<=1?0:Math.max(1,Math.floor(t)),n=Math.round(this.zt.he*t)-i;this.$e=new Array(this.zt.tt.to-this.zt.tt.from);for(let i=this.zt.tt.from;i<this.zt.tt.to;i++){const s=this.zt.it[i],e=Math.round(s.nt*t);let r,h;if(n%2){const t=(n-1)/2;r=e-t,h=e+t;}else {const t=n/2;r=e-t,h=e+t-1;}this.$e[i-this.zt.tt.from]={Os:r,ui:h,Ye:e,Xe:s.nt*t,ot:s.ot};}for(let t=this.zt.tt.from+1;t<this.zt.tt.to;t++){const n=this.$e[t-this.zt.tt.from],s=this.$e[t-this.zt.tt.from-1];n.ot===s.ot+1&&(n.Os-s.ui!==i+1&&(s.Ye>s.Xe?s.ui=n.Os-i-1:n.Os=s.ui+i+1));}let s=Math.ceil(this.zt.he*t);for(let t=this.zt.tt.from;t<this.zt.tt.to;t++){const i=this.$e[t-this.zt.tt.from];i.ui<i.Os&&(i.ui=i.Os);const n=i.ui-i.Os+1;s=Math.min(n,s);}if(i>0&&s<4)for(let t=this.zt.tt.from;t<this.zt.tt.to;t++){const i=this.$e[t-this.zt.tt.from];i.ui-i.Os+1>s&&(i.Ye>i.Xe?i.ui-=1:i.Os+=1);}}}class Jt extends Et{constructor(){super(...arguments),this.Ws=new Gt;}ne(t,i,n){return Object.assign(Object.assign({},this.te(t,i)),n.Hs(t))}Gs(){const t={it:this.Is,he:this.Es.St().he(),tt:this.zs,qe:this.Ls.Dt().Rt(this.Ls.W().base,b(this.Ls.Ct()).Ot)};this.Ws.J(t);}}class Qt extends Et{constructor(){super(...arguments),this.Ws=new Dt;}ne(t,i,n){return Object.assign(Object.assign({},this.te(t,i)),n.Hs(t))}Gs(){const t=this.Ls.W(),i={it:this.Is,Nt:t.lineStyle,ds:t.lineVisible?t.lineType:void 0,et:t.lineWidth,Rs:t.pointMarkersVisible?t.pointMarkersRadius||t.lineWidth/2+2:void 0,tt:this.zs,cs:this.Es.St().he()};this.Ws.J(i);}}const ti=/[2-9]/g;class ii{constructor(t=50){this.Ke=0,this.Ze=1,this.Ge=1,this.Je={},this.Qe=new Map,this.tr=t;}ir(){this.Ke=0,this.Qe.clear(),this.Ze=1,this.Ge=1,this.Je={};}xi(t,i,n){return this.nr(t,i,n).width}Mi(t,i,n){const s=this.nr(t,i,n);return ((s.actualBoundingBoxAscent||0)-(s.actualBoundingBoxDescent||0))/2}nr(t,i,n){const s=n||ti,e=String(i).replace(s,"0");if(this.Qe.has(e))return m(this.Qe.get(e)).sr;if(this.Ke===this.tr){const t=this.Je[this.Ge];delete this.Je[this.Ge],this.Qe.delete(t),this.Ge++,this.Ke--;}t.save(),t.textBaseline="middle";const r=t.measureText(e);return t.restore(),0===r.width&&i.length||(this.Qe.set(e,{sr:r,er:this.Ze}),this.Je[this.Ze]=e,this.Ke++,this.Ze++),r}}class ni{constructor(t){this.rr=null,this.k=null,this.hr="right",this.lr=t;}ar(t,i,n){this.rr=t,this.k=i,this.hr=n;}K(t){null!==this.k&&null!==this.rr&&this.rr.K(t,this.k,this.lr,this.hr);}}class si{constructor(t,i,n){this._r=t,this.lr=new ii(50),this.ur=i,this.F=n,this.j=-1,this.Wt=new ni(this.lr);}gt(){const t=this.F.cr(this.ur);if(null===t)return null;const i=t.dr(this.ur)?t.vr():this.ur.Dt();if(null===i)return null;const n=t.pr(i);if("overlay"===n)return null;const s=this.F.mr();return s.P!==this.j&&(this.j=s.P,this.lr.ir()),this.Wt.ar(this._r.Ii(),s,n),this.Wt}}class ei extends j{constructor(){super(...arguments),this.zt=null;}J(t){this.zt=t;}br(t,i){var n;if(!(null===(n=this.zt)||void 0===n?void 0:n.yt))return null;const{st:s,et:e,wr:r}=this.zt;return i>=s-e-7&&i<=s+e+7?{gr:this.zt,wr:r}:null}Z({context:t,bitmapSize:i,horizontalPixelRatio:n,verticalPixelRatio:s}){if(null===this.zt)return;if(!1===this.zt.yt)return;const e=Math.round(this.zt.st*s);e<0||e>i.height||(t.lineCap="butt",t.strokeStyle=this.zt.O,t.lineWidth=Math.floor(this.zt.et*n),f(t,this.zt.Nt),v(t,e,0,i.width));}}class ri{constructor(t){this.Mr={st:0,O:"rgba(0, 0, 0, 0)",et:1,Nt:0,yt:!1},this.Sr=new ei,this.ft=!0,this.Ls=t,this.Es=t.$t(),this.Sr.J(this.Mr);}bt(){this.ft=!0;}gt(){return this.Ls.yt()?(this.ft&&(this.kr(),this.ft=!1),this.Sr):null}}class hi extends ri{constructor(t){super(t);}kr(){this.Mr.yt=!1;const t=this.Ls.Dt(),i=t.yr().yr;if(2!==i&&3!==i)return;const n=this.Ls.W();if(!n.baseLineVisible||!this.Ls.yt())return;const s=this.Ls.Ct();null!==s&&(this.Mr.yt=!0,this.Mr.st=t.Rt(s.Ot,s.Ot),this.Mr.O=n.baseLineColor,this.Mr.et=n.baseLineWidth,this.Mr.Nt=n.baseLineStyle);}}class li extends j{constructor(){super(...arguments),this.zt=null;}J(t){this.zt=t;}He(){return this.zt}Z({context:t,horizontalPixelRatio:i,verticalPixelRatio:n}){const s=this.zt;if(null===s)return;const e=Math.max(1,Math.floor(i)),r=e%2/2,h=Math.round(s.Xe.x*i)+r,l=s.Xe.y*n;t.fillStyle=s.Cr,t.beginPath();const a=Math.max(2,1.5*s.Tr)*i;t.arc(h,l,a,0,2*Math.PI,!1),t.fill(),t.fillStyle=s.Pr,t.beginPath(),t.arc(h,l,s.ht*i,0,2*Math.PI,!1),t.fill(),t.lineWidth=e,t.strokeStyle=s.Rr,t.beginPath(),t.arc(h,l,s.ht*i+e/2,0,2*Math.PI,!1),t.stroke();}}const ai=[{Dr:0,Or:.25,Ar:4,Br:10,Vr:.25,Ir:0,zr:.4,Lr:.8},{Dr:.25,Or:.525,Ar:10,Br:14,Vr:0,Ir:0,zr:.8,Lr:0},{Dr:.525,Or:1,Ar:14,Br:14,Vr:0,Ir:0,zr:0,Lr:0}];function oi(t,i,n,s){return function(t,i){if("transparent"===t)return t;const n=T(t),s=n[3];return `rgba(${n[0]}, ${n[1]}, ${n[2]}, ${i*s})`}(t,n+(s-n)*i)}function _i(t,i){const n=t%2600/2600;let s;for(const t of ai)if(n>=t.Dr&&n<=t.Or){s=t;break}p(void 0!==s,"Last price animation internal logic error");const e=(n-s.Dr)/(s.Or-s.Dr);return {Pr:oi(i,e,s.Vr,s.Ir),Rr:oi(i,e,s.zr,s.Lr),ht:(r=e,h=s.Ar,l=s.Br,h+(l-h)*r)};var r,h,l;}class ui{constructor(t){this.Wt=new li,this.ft=!0,this.Er=!0,this.Nr=performance.now(),this.Fr=this.Nr-1,this.Wr=t;}jr(){this.Fr=this.Nr-1,this.bt();}Hr(){if(this.bt(),2===this.Wr.W().lastPriceAnimation){const t=performance.now(),i=this.Fr-t;if(i>0)return void(i<650&&(this.Fr+=2600));this.Nr=t,this.Fr=t+2600;}}bt(){this.ft=!0;}$r(){this.Er=!0;}yt(){return 0!==this.Wr.W().lastPriceAnimation}Ur(){switch(this.Wr.W().lastPriceAnimation){case 0:return !1;case 1:return !0;case 2:return performance.now()<=this.Fr}}gt(){return this.ft?(this.Mt(),this.ft=!1,this.Er=!1):this.Er&&(this.qr(),this.Er=!1),this.Wt}Mt(){this.Wt.J(null);const t=this.Wr.$t().St(),i=t.Xs(),n=this.Wr.Ct();if(null===i||null===n)return;const s=this.Wr.Yr(!0);if(s.Xr||!i.Kr(s.se))return;const e={x:t.It(s.se),y:this.Wr.Dt().Rt(s._t,n.Ot)},r=s.O,h=this.Wr.W().lineWidth,l=_i(this.Zr(),r);this.Wt.J({Cr:r,Tr:h,Pr:l.Pr,Rr:l.Rr,ht:l.ht,Xe:e});}qr(){const t=this.Wt.He();if(null!==t){const i=_i(this.Zr(),t.Cr);t.Pr=i.Pr,t.Rr=i.Rr,t.ht=i.ht;}}Zr(){return this.Ur()?performance.now()-this.Nr:2599}}function ci(t,i){return yt(Math.min(Math.max(t,12),30)*i)}function di(t,i){switch(t){case"arrowDown":case"arrowUp":return ci(i,1);case"circle":return ci(i,.8);case"square":return ci(i,.7)}}function fi(t){return function(t){const i=Math.ceil(t);return i%2!=0?i-1:i}(ci(t,1))}function vi(t){return Math.max(ci(t,.1),3)}function pi(t,i,n){return i?t:n?Math.ceil(t/2):0}function mi(t,i,n,s,e){const r=di("square",n),h=(r-1)/2,l=t-h,a=i-h;return s>=l&&s<=l+r&&e>=a&&e<=a+r}function bi(t,i,n,s){const e=(di("arrowUp",s)-1)/2*n.Gr,r=(yt(s/2)-1)/2*n.Gr;i.beginPath(),t?(i.moveTo(n.nt-e,n.st),i.lineTo(n.nt,n.st-e),i.lineTo(n.nt+e,n.st),i.lineTo(n.nt+r,n.st),i.lineTo(n.nt+r,n.st+e),i.lineTo(n.nt-r,n.st+e),i.lineTo(n.nt-r,n.st)):(i.moveTo(n.nt-e,n.st),i.lineTo(n.nt,n.st+e),i.lineTo(n.nt+e,n.st),i.lineTo(n.nt+r,n.st),i.lineTo(n.nt+r,n.st-e),i.lineTo(n.nt-r,n.st-e),i.lineTo(n.nt-r,n.st)),i.fill();}function wi(t,i,n,s,e,r){return mi(i,n,s,e,r)}class gi extends j{constructor(){super(...arguments),this.zt=null,this.lr=new ii,this.j=-1,this.H="",this.Jr="";}J(t){this.zt=t;}ar(t,i){this.j===t&&this.H===i||(this.j=t,this.H=i,this.Jr=N(t,i),this.lr.ir());}br(t,i){if(null===this.zt||null===this.zt.tt)return null;for(let n=this.zt.tt.from;n<this.zt.tt.to;n++){const s=this.zt.it[n];if(xi(s,t,i))return {gr:s.Qr,wr:s.wr}}return null}Z({context:t,horizontalPixelRatio:i,verticalPixelRatio:n},s,e){if(null!==this.zt&&null!==this.zt.tt){t.textBaseline="middle",t.font=this.Jr;for(let s=this.zt.tt.from;s<this.zt.tt.to;s++){const e=this.zt.it[s];void 0!==e.Zt&&(e.Zt.Hi=this.lr.xi(t,e.Zt.th),e.Zt.Vt=this.j,e.Zt.nt=e.nt-e.Zt.Hi/2),Mi(e,t,i,n);}}}}function Mi(t,i,n,s){i.fillStyle=t.O,void 0!==t.Zt&&function(t,i,n,s,e,r){t.save(),t.scale(e,r),t.fillText(i,n,s),t.restore();}(i,t.Zt.th,t.Zt.nt,t.Zt.st,n,s),function(t,i,n){if(0===t.Ks)return;switch(t.ih){case"arrowDown":return void bi(!1,i,n,t.Ks);case"arrowUp":return void bi(!0,i,n,t.Ks);case"circle":return void function(t,i,n){const s=(di("circle",n)-1)/2;t.beginPath(),t.arc(i.nt,i.st,s*i.Gr,0,2*Math.PI,!1),t.fill();}(i,n,t.Ks);case"square":return void function(t,i,n){const s=di("square",n),e=(s-1)*i.Gr/2,r=i.nt-e,h=i.st-e;t.fillRect(r,h,s*i.Gr,s*i.Gr);}(i,n,t.Ks)}t.ih;}(t,i,function(t,i,n){const s=Math.max(1,Math.floor(i))%2/2;return {nt:Math.round(t.nt*i)+s,st:t.st*n,Gr:i}}(t,n,s));}function xi(t,i,n){return !(void 0===t.Zt||!function(t,i,n,s,e,r){const h=s/2;return e>=t&&e<=t+n&&r>=i-h&&r<=i+h}(t.Zt.nt,t.Zt.st,t.Zt.Hi,t.Zt.Vt,i,n))||function(t,i,n){if(0===t.Ks)return !1;switch(t.ih){case"arrowDown":case"arrowUp":return wi(0,t.nt,t.st,t.Ks,i,n);case"circle":return function(t,i,n,s,e){const r=2+di("circle",n)/2,h=t-s,l=i-e;return Math.sqrt(h*h+l*l)<=r}(t.nt,t.st,t.Ks,i,n);case"square":return mi(t.nt,t.st,t.Ks,i,n)}}(t,i,n)}function Si(t,i,n,s,e,r,h,l,a){const o=O(n)?n:n.xe,_=O(n)?n:n.ge,u=O(n)?n:n.Me,c=O(i.size)?Math.max(i.size,0):1,d=fi(l.he())*c,f=d/2;switch(t.Ks=d,i.position){case"inBar":return t.st=h.Rt(o,a),void(void 0!==t.Zt&&(t.Zt.st=t.st+f+r+.6*e));case"aboveBar":return t.st=h.Rt(_,a)-f-s.nh,void 0!==t.Zt&&(t.Zt.st=t.st-f-.6*e,s.nh+=1.2*e),void(s.nh+=d+r);case"belowBar":return t.st=h.Rt(u,a)+f+s.sh,void 0!==t.Zt&&(t.Zt.st=t.st+f+r+.6*e,s.sh+=1.2*e),void(s.sh+=d+r)}i.position;}class ki{constructor(t,i){this.ft=!0,this.eh=!0,this.rh=!0,this.hh=null,this.ah=null,this.Wt=new gi,this.Wr=t,this.$i=i,this.zt={it:[],tt:null};}bt(t){this.ft=!0,this.rh=!0,"data"===t&&(this.eh=!0,this.ah=null);}gt(t){if(!this.Wr.yt())return null;this.ft&&this.oh();const i=this.$i.W().layout;return this.Wt.ar(i.fontSize,i.fontFamily),this.Wt.J(this.zt),this.Wt}_h(){if(this.rh){if(this.Wr.uh().length>0){const t=this.$i.St().he(),i=vi(t),n=1.5*fi(t)+2*i,s=this.dh();this.hh={above:pi(n,s.aboveBar,s.inBar),below:pi(n,s.belowBar,s.inBar)};}else this.hh=null;this.rh=!1;}return this.hh}dh(){return null===this.ah&&(this.ah=this.Wr.uh().reduce(((t,i)=>(t[i.position]||(t[i.position]=!0),t)),{inBar:!1,aboveBar:!1,belowBar:!1})),this.ah}oh(){const t=this.Wr.Dt(),i=this.$i.St(),n=this.Wr.uh();this.eh&&(this.zt.it=n.map((t=>({ot:t.time,nt:0,st:0,Ks:0,ih:t.shape,O:t.color,Qr:t.Qr,wr:t.id,Zt:void 0}))),this.eh=!1);const s=this.$i.W().layout;this.zt.tt=null;const e=i.Xs();if(null===e)return;const r=this.Wr.Ct();if(null===r)return;if(0===this.zt.it.length)return;let h=NaN;const l=vi(i.he()),a={nh:l,sh:l};this.zt.tt=zt(this.zt.it,e,!0);for(let e=this.zt.tt.from;e<this.zt.tt.to;e++){const o=n[e];o.time!==h&&(a.nh=l,a.sh=l,h=o.time);const _=this.zt.it[e];_.nt=i.It(o.time),void 0!==o.text&&o.text.length>0&&(_.Zt={th:o.text,nt:0,st:0,Hi:0,Vt:0});const u=this.Wr.fh(o.time);null!==u&&Si(_,o,u,a,s.fontSize,l,t,i,r.Ot);}this.ft=!1;}}class yi extends ri{constructor(t){super(t);}kr(){const t=this.Mr;t.yt=!1;const i=this.Ls.W();if(!i.priceLineVisible||!this.Ls.yt())return;const n=this.Ls.Yr(0===i.priceLineSource);n.Xr||(t.yt=!0,t.st=n.ki,t.O=this.Ls.ph(n.O),t.et=i.priceLineWidth,t.Nt=i.priceLineStyle);}}class Ci extends it{constructor(t){super(),this.jt=t;}zi(t,i,n){t.yt=!1,i.yt=!1;const s=this.jt;if(!s.yt())return;const e=s.W(),r=e.lastValueVisible,h=""!==s.mh(),l=0===e.seriesLastValueMode,a=s.Yr(!1);if(a.Xr)return;r&&(t.Zt=this.bh(a,r,l),t.yt=0!==t.Zt.length),(h||l)&&(i.Zt=this.wh(a,r,h,l),i.yt=i.Zt.length>0);const o=s.ph(a.O),_=P(o);n.t=_.t,n.ki=a.ki,i.At=s.$t().Bt(a.ki/s.Dt().Vt()),t.At=o,t.O=_.i,i.O=_.i;}wh(t,i,n,s){let e="";const r=this.jt.mh();return n&&0!==r.length&&(e+=`${r} `),i&&s&&(e+=this.jt.Dt().gh()?t.Mh:t.xh),e.trim()}bh(t,i,n){return i?n?this.jt.Dt().gh()?t.xh:t.Mh:t.Zt:""}}function Ti(t,i,n,s){const e=Number.isFinite(i),r=Number.isFinite(n);return e&&r?t(i,n):e||r?e?i:n:s}class Pi{constructor(t,i){this.Sh=t,this.kh=i;}yh(t){return null!==t&&(this.Sh===t.Sh&&this.kh===t.kh)}Ch(){return new Pi(this.Sh,this.kh)}Th(){return this.Sh}Ph(){return this.kh}Rh(){return this.kh-this.Sh}Ni(){return this.kh===this.Sh||Number.isNaN(this.kh)||Number.isNaN(this.Sh)}ts(t){return null===t?this:new Pi(Ti(Math.min,this.Th(),t.Th(),-1/0),Ti(Math.max,this.Ph(),t.Ph(),1/0))}Dh(t){if(!O(t))return;if(0===this.kh-this.Sh)return;const i=.5*(this.kh+this.Sh);let n=this.kh-i,s=this.Sh-i;n*=t,s*=t,this.kh=i+n,this.Sh=i+s;}Oh(t){O(t)&&(this.kh+=t,this.Sh+=t);}Ah(){return {minValue:this.Sh,maxValue:this.kh}}static Bh(t){return null===t?null:new Pi(t.minValue,t.maxValue)}}class Ri{constructor(t,i){this.Vh=t,this.Ih=i||null;}zh(){return this.Vh}Lh(){return this.Ih}Ah(){return null===this.Vh?null:{priceRange:this.Vh.Ah(),margins:this.Ih||void 0}}static Bh(t){return null===t?null:new Ri(Pi.Bh(t.priceRange),t.margins)}}class Di extends ri{constructor(t,i){super(t),this.Eh=i;}kr(){const t=this.Mr;t.yt=!1;const i=this.Eh.W();if(!this.Ls.yt()||!i.lineVisible)return;const n=this.Eh.Nh();null!==n&&(t.yt=!0,t.st=n,t.O=i.color,t.et=i.lineWidth,t.Nt=i.lineStyle,t.wr=this.Eh.W().id);}}class Oi extends it{constructor(t,i){super(),this.Wr=t,this.Eh=i;}zi(t,i,n){t.yt=!1,i.yt=!1;const s=this.Eh.W(),e=s.axisLabelVisible,r=""!==s.title,h=this.Wr;if(!e||!h.yt())return;const l=this.Eh.Nh();if(null===l)return;r&&(i.Zt=s.title,i.yt=!0),i.At=h.$t().Bt(l/h.Dt().Vt()),t.Zt=this.Fh(s.price),t.yt=!0;const a=P(s.axisLabelColor||s.color);n.t=a.t;const o=s.axisLabelTextColor||a.i;t.O=o,i.O=o,n.ki=l;}Fh(t){const i=this.Wr.Ct();return null===i?"":this.Wr.Dt().Fi(t,i.Ot)}}class Ai{constructor(t,i){this.Wr=t,this.cn=i,this.Wh=new Di(t,this),this._r=new Oi(t,this),this.jh=new si(this._r,t,t.$t());}Hh(t){D(this.cn,t),this.bt(),this.Wr.$t().$h();}W(){return this.cn}Uh(){return this.Wh}qh(){return this.jh}Yh(){return this._r}bt(){this.Wh.bt(),this._r.bt();}Nh(){const t=this.Wr,i=t.Dt();if(t.$t().St().Ni()||i.Ni())return null;const n=t.Ct();return null===n?null:i.Rt(this.cn.price,n.Ot)}}class Bi extends ht{constructor(t){super(),this.$i=t;}$t(){return this.$i}}const Vi={Bar:(t,i,n,s)=>{var e;const r=i.upColor,h=i.downColor,l=b(t(n,s)),a=w(l.Ot[0])<=w(l.Ot[3]);return {ue:null!==(e=l.O)&&void 0!==e?e:a?r:h}},Candlestick:(t,i,n,s)=>{var e,r,h;const l=i.upColor,a=i.downColor,o=i.borderUpColor,_=i.borderDownColor,u=i.wickUpColor,c=i.wickDownColor,d=b(t(n,s)),f=w(d.Ot[0])<=w(d.Ot[3]);return {ue:null!==(e=d.O)&&void 0!==e?e:f?l:a,Ee:null!==(r=d.At)&&void 0!==r?r:f?o:_,Le:null!==(h=d.Xh)&&void 0!==h?h:f?u:c}},Custom:(t,i,n,s)=>{var e;return {ue:null!==(e=b(t(n,s)).O)&&void 0!==e?e:i.color}},Area:(t,i,n,s)=>{var e,r,h,l;const a=b(t(n,s));return {ue:null!==(e=a.lt)&&void 0!==e?e:i.lineColor,lt:null!==(r=a.lt)&&void 0!==r?r:i.lineColor,Ts:null!==(h=a.Ts)&&void 0!==h?h:i.topColor,Ps:null!==(l=a.Ps)&&void 0!==l?l:i.bottomColor}},Baseline:(t,i,n,s)=>{var e,r,h,l,a,o;const _=b(t(n,s));return {ue:_.Ot[3]>=i.baseValue.price?i.topLineColor:i.bottomLineColor,Pe:null!==(e=_.Pe)&&void 0!==e?e:i.topLineColor,Re:null!==(r=_.Re)&&void 0!==r?r:i.bottomLineColor,Se:null!==(h=_.Se)&&void 0!==h?h:i.topFillColor1,ke:null!==(l=_.ke)&&void 0!==l?l:i.topFillColor2,ye:null!==(a=_.ye)&&void 0!==a?a:i.bottomFillColor1,Ce:null!==(o=_.Ce)&&void 0!==o?o:i.bottomFillColor2}},Line:(t,i,n,s)=>{var e,r;const h=b(t(n,s));return {ue:null!==(e=h.O)&&void 0!==e?e:i.color,lt:null!==(r=h.O)&&void 0!==r?r:i.color}},Histogram:(t,i,n,s)=>{var e;return {ue:null!==(e=b(t(n,s)).O)&&void 0!==e?e:i.color}}};class Ii{constructor(t){this.Kh=(t,i)=>void 0!==i?i.Ot:this.Wr.In().Zh(t),this.Wr=t,this.Gh=Vi[t.Jh()];}Hs(t,i){return this.Gh(this.Kh,this.Wr.W(),t,i)}}var zi;!function(t){t[t.NearestLeft=-1]="NearestLeft",t[t.None=0]="None",t[t.NearestRight=1]="NearestRight";}(zi||(zi={}));const Li=30;class Ei{constructor(){this.Qh=[],this.tl=new Map,this.il=new Map;}nl(){return this.Ks()>0?this.Qh[this.Qh.length-1]:null}sl(){return this.Ks()>0?this.el(0):null}Vn(){return this.Ks()>0?this.el(this.Qh.length-1):null}Ks(){return this.Qh.length}Ni(){return 0===this.Ks()}Kr(t){return null!==this.rl(t,0)}Zh(t){return this.hl(t)}hl(t,i=0){const n=this.rl(t,i);return null===n?null:Object.assign(Object.assign({},this.ll(n)),{se:this.el(n)})}ie(){return this.Qh}al(t,i,n){if(this.Ni())return null;let s=null;for(const e of n){s=Ni(s,this.ol(t,i,e));}return s}J(t){this.il.clear(),this.tl.clear(),this.Qh=t;}el(t){return this.Qh[t].se}ll(t){return this.Qh[t]}rl(t,i){const n=this._l(t);if(null===n&&0!==i)switch(i){case-1:return this.ul(t);case 1:return this.cl(t);default:throw new TypeError("Unknown search mode")}return n}ul(t){let i=this.dl(t);return i>0&&(i-=1),i!==this.Qh.length&&this.el(i)<t?i:null}cl(t){const i=this.fl(t);return i!==this.Qh.length&&t<this.el(i)?i:null}_l(t){const i=this.dl(t);return i===this.Qh.length||t<this.Qh[i].se?null:i}dl(t){return At(this.Qh,t,((t,i)=>t.se<i))}fl(t){return Bt(this.Qh,t,((t,i)=>t.se>i))}vl(t,i,n){let s=null;for(let e=t;e<i;e++){const t=this.Qh[e].Ot[n];Number.isNaN(t)||(null===s?s={pl:t,ml:t}:(t<s.pl&&(s.pl=t),t>s.ml&&(s.ml=t)));}return s}ol(t,i,n){if(this.Ni())return null;let s=null;const e=b(this.sl()),r=b(this.Vn()),h=Math.max(t,e),l=Math.min(i,r),a=Math.ceil(h/Li)*Li,o=Math.max(a,Math.floor(l/Li)*Li);{const t=this.dl(h),e=this.fl(Math.min(l,a,i));s=Ni(s,this.vl(t,e,n));}let _=this.tl.get(n);void 0===_&&(_=new Map,this.tl.set(n,_));for(let t=Math.max(a+1,h);t<o;t+=Li){const i=Math.floor(t/Li);let e=_.get(i);if(void 0===e){const t=this.dl(i*Li),s=this.fl((i+1)*Li-1);e=this.vl(t,s,n),_.set(i,e);}s=Ni(s,e);}{const t=this.dl(o),i=this.fl(l);s=Ni(s,this.vl(t,i,n));}return s}}function Ni(t,i){if(null===t)return i;if(null===i)return t;return {pl:Math.min(t.pl,i.pl),ml:Math.max(t.ml,i.ml)}}class Fi{constructor(t){this.bl=t;}K(t,i,n){this.bl.draw(t);}wl(t,i,n){var s,e;null===(e=(s=this.bl).drawBackground)||void 0===e||e.call(s,t);}}class Wi{constructor(t){this.Qe=null,this.wn=t;}gt(){var t;const i=this.wn.renderer();if(null===i)return null;if((null===(t=this.Qe)||void 0===t?void 0:t.gl)===i)return this.Qe.Ml;const n=new Fi(i);return this.Qe={gl:i,Ml:n},n}xl(){var t,i,n;return null!==(n=null===(i=(t=this.wn).zOrder)||void 0===i?void 0:i.call(t))&&void 0!==n?n:"normal"}}function ji(t){var i,n,s,e,r;return {Zt:t.text(),ki:t.coordinate(),Si:null===(i=t.fixedCoordinate)||void 0===i?void 0:i.call(t),O:t.textColor(),t:t.backColor(),yt:null===(s=null===(n=t.visible)||void 0===n?void 0:n.call(t))||void 0===s||s,hi:null===(r=null===(e=t.tickVisible)||void 0===e?void 0:e.call(t))||void 0===r||r}}class Hi{constructor(t,i){this.Wt=new et,this.Sl=t,this.kl=i;}gt(){return this.Wt.J(Object.assign({Hi:this.kl.Hi()},ji(this.Sl))),this.Wt}}class $i extends it{constructor(t,i){super(),this.Sl=t,this.Li=i;}zi(t,i,n){const s=ji(this.Sl);n.t=s.t,t.O=s.O;const e=2/12*this.Li.P();n.wi=e,n.gi=e,n.ki=s.ki,n.Si=s.Si,t.Zt=s.Zt,t.yt=s.yt,t.hi=s.hi;}}class Ui{constructor(t,i){this.yl=null,this.Cl=null,this.Tl=null,this.Pl=null,this.Rl=null,this.Dl=t,this.Wr=i;}Ol(){return this.Dl}On(){var t,i;null===(i=(t=this.Dl).updateAllViews)||void 0===i||i.call(t);}Pn(){var t,i,n,s;const e=null!==(n=null===(i=(t=this.Dl).paneViews)||void 0===i?void 0:i.call(t))&&void 0!==n?n:[];if((null===(s=this.yl)||void 0===s?void 0:s.gl)===e)return this.yl.Ml;const r=e.map((t=>new Wi(t)));return this.yl={gl:e,Ml:r},r}Qi(){var t,i,n,s;const e=null!==(n=null===(i=(t=this.Dl).timeAxisViews)||void 0===i?void 0:i.call(t))&&void 0!==n?n:[];if((null===(s=this.Cl)||void 0===s?void 0:s.gl)===e)return this.Cl.Ml;const r=this.Wr.$t().St(),h=e.map((t=>new Hi(t,r)));return this.Cl={gl:e,Ml:h},h}Rn(){var t,i,n,s;const e=null!==(n=null===(i=(t=this.Dl).priceAxisViews)||void 0===i?void 0:i.call(t))&&void 0!==n?n:[];if((null===(s=this.Tl)||void 0===s?void 0:s.gl)===e)return this.Tl.Ml;const r=this.Wr.Dt(),h=e.map((t=>new $i(t,r)));return this.Tl={gl:e,Ml:h},h}Al(){var t,i,n,s;const e=null!==(n=null===(i=(t=this.Dl).priceAxisPaneViews)||void 0===i?void 0:i.call(t))&&void 0!==n?n:[];if((null===(s=this.Pl)||void 0===s?void 0:s.gl)===e)return this.Pl.Ml;const r=e.map((t=>new Wi(t)));return this.Pl={gl:e,Ml:r},r}Bl(){var t,i,n,s;const e=null!==(n=null===(i=(t=this.Dl).timeAxisPaneViews)||void 0===i?void 0:i.call(t))&&void 0!==n?n:[];if((null===(s=this.Rl)||void 0===s?void 0:s.gl)===e)return this.Rl.Ml;const r=e.map((t=>new Wi(t)));return this.Rl={gl:e,Ml:r},r}Vl(t,i){var n,s,e;return null!==(e=null===(s=(n=this.Dl).autoscaleInfo)||void 0===s?void 0:s.call(n,t,i))&&void 0!==e?e:null}br(t,i){var n,s,e;return null!==(e=null===(s=(n=this.Dl).hitTest)||void 0===s?void 0:s.call(n,t,i))&&void 0!==e?e:null}}function qi(t,i,n,s){t.forEach((t=>{i(t).forEach((t=>{t.xl()===n&&s.push(t);}));}));}function Yi(t){return t.Pn()}function Xi(t){return t.Al()}function Ki(t){return t.Bl()}class Zi extends Bi{constructor(t,i,n,s,e){super(t),this.zt=new Ei,this.Wh=new yi(this),this.Il=[],this.zl=new hi(this),this.Ll=null,this.El=null,this.Nl=[],this.Fl=[],this.Wl=null,this.jl=[],this.cn=i,this.Hl=n;const r=new Ci(this);this.rn=[r],this.jh=new si(r,this,t),"Area"!==n&&"Line"!==n&&"Baseline"!==n||(this.Ll=new ui(this)),this.$l(),this.Ul(e);}S(){null!==this.Wl&&clearTimeout(this.Wl);}ph(t){return this.cn.priceLineColor||t}Yr(t){const i={Xr:!0},n=this.Dt();if(this.$t().St().Ni()||n.Ni()||this.zt.Ni())return i;const s=this.$t().St().Xs(),e=this.Ct();if(null===s||null===e)return i;let r,h;if(t){const t=this.zt.nl();if(null===t)return i;r=t,h=t.se;}else {const t=this.zt.hl(s.ui(),-1);if(null===t)return i;if(r=this.zt.Zh(t.se),null===r)return i;h=t.se;}const l=r.Ot[3],a=this.$s().Hs(h,{Ot:r}),o=n.Rt(l,e.Ot);return {Xr:!1,_t:l,Zt:n.Fi(l,e.Ot),Mh:n.ql(l),xh:n.Yl(l,e.Ot),O:a.ue,ki:o,se:h}}$s(){return null!==this.El||(this.El=new Ii(this)),this.El}W(){return this.cn}Hh(t){const i=t.priceScaleId;void 0!==i&&i!==this.cn.priceScaleId&&this.$t().Xl(this,i),D(this.cn,t),void 0!==t.priceFormat&&(this.$l(),this.$t().Kl()),this.$t().Zl(this),this.$t().Gl(),this.wn.bt("options");}J(t,i){this.zt.J(t),this.Jl(),this.wn.bt("data"),this.dn.bt("data"),null!==this.Ll&&(i&&i.Ql?this.Ll.Hr():0===t.length&&this.Ll.jr());const n=this.$t().cr(this);this.$t().ta(n),this.$t().Zl(this),this.$t().Gl(),this.$t().$h();}ia(t){this.Nl=t,this.Jl();const i=this.$t().cr(this);this.dn.bt("data"),this.$t().ta(i),this.$t().Zl(this),this.$t().Gl(),this.$t().$h();}na(){return this.Nl}uh(){return this.Fl}sa(t){const i=new Ai(this,t);return this.Il.push(i),this.$t().Zl(this),i}ea(t){const i=this.Il.indexOf(t);-1!==i&&this.Il.splice(i,1),this.$t().Zl(this);}Jh(){return this.Hl}Ct(){const t=this.ra();return null===t?null:{Ot:t.Ot[3],ha:t.ot}}ra(){const t=this.$t().St().Xs();if(null===t)return null;const i=t.Os();return this.zt.hl(i,1)}In(){return this.zt}fh(t){const i=this.zt.Zh(t);return null===i?null:"Bar"===this.Hl||"Candlestick"===this.Hl||"Custom"===this.Hl?{we:i.Ot[0],ge:i.Ot[1],Me:i.Ot[2],xe:i.Ot[3]}:i.Ot[3]}la(t){const i=[];qi(this.jl,Yi,"top",i);const n=this.Ll;return null!==n&&n.yt()?(null===this.Wl&&n.Ur()&&(this.Wl=setTimeout((()=>{this.Wl=null,this.$t().aa();}),0)),n.$r(),i.unshift(n),i):i}Pn(){const t=[];this.oa()||t.push(this.zl),t.push(this.wn,this.Wh,this.dn);const i=this.Il.map((t=>t.Uh()));return t.push(...i),qi(this.jl,Yi,"normal",t),t}_a(){return this.ua(Yi,"bottom")}ca(t){return this.ua(Xi,t)}da(t){return this.ua(Ki,t)}fa(t,i){return this.jl.map((n=>n.br(t,i))).filter((t=>null!==t))}Ji(t){return [this.jh,...this.Il.map((t=>t.qh()))]}Rn(t,i){if(i!==this.Yi&&!this.oa())return [];const n=[...this.rn];for(const t of this.Il)n.push(t.Yh());return this.jl.forEach((t=>{n.push(...t.Rn());})),n}Qi(){const t=[];return this.jl.forEach((i=>{t.push(...i.Qi());})),t}Vl(t,i){if(void 0!==this.cn.autoscaleInfoProvider){const n=this.cn.autoscaleInfoProvider((()=>{const n=this.va(t,i);return null===n?null:n.Ah()}));return Ri.Bh(n)}return this.va(t,i)}pa(){return this.cn.priceFormat.minMove}ma(){return this.ba}On(){var t;this.wn.bt(),this.dn.bt();for(const t of this.rn)t.bt();for(const t of this.Il)t.bt();this.Wh.bt(),this.zl.bt(),null===(t=this.Ll)||void 0===t||t.bt(),this.jl.forEach((t=>t.On()));}Dt(){return b(super.Dt())}kt(t){if(!(("Line"===this.Hl||"Area"===this.Hl||"Baseline"===this.Hl)&&this.cn.crosshairMarkerVisible))return null;const i=this.zt.Zh(t);if(null===i)return null;return {_t:i.Ot[3],ht:this.wa(),At:this.ga(),Pt:this.Ma(),Tt:this.xa(t)}}mh(){return this.cn.title}yt(){return this.cn.visible}Sa(t){this.jl.push(new Ui(t,this));}ka(t){this.jl=this.jl.filter((i=>i.Ol()!==t));}ya(){if(this.wn instanceof Kt!=!1)return t=>this.wn.Fe(t)}Ca(){if(this.wn instanceof Kt!=!1)return t=>this.wn.We(t)}oa(){return !ot(this.Dt().Ta())}va(t,i){if(!A(t)||!A(i)||this.zt.Ni())return null;const n="Line"===this.Hl||"Area"===this.Hl||"Baseline"===this.Hl||"Histogram"===this.Hl?[3]:[2,1],s=this.zt.al(t,i,n);let e=null!==s?new Pi(s.pl,s.ml):null;if("Histogram"===this.Jh()){const t=this.cn.base,i=new Pi(t,t);e=null!==e?e.ts(i):i;}let r=this.dn._h();return this.jl.forEach((n=>{const s=n.Vl(t,i);if(null==s?void 0:s.priceRange){const t=new Pi(s.priceRange.minValue,s.priceRange.maxValue);e=null!==e?e.ts(t):t;}var h,l,a,o;(null==s?void 0:s.margins)&&(h=r,l=s.margins,r={above:Math.max(null!==(a=null==h?void 0:h.above)&&void 0!==a?a:0,l.above),below:Math.max(null!==(o=null==h?void 0:h.below)&&void 0!==o?o:0,l.below)});})),new Ri(e,r)}wa(){switch(this.Hl){case"Line":case"Area":case"Baseline":return this.cn.crosshairMarkerRadius}return 0}ga(){switch(this.Hl){case"Line":case"Area":case"Baseline":{const t=this.cn.crosshairMarkerBorderColor;if(0!==t.length)return t}}return null}Ma(){switch(this.Hl){case"Line":case"Area":case"Baseline":return this.cn.crosshairMarkerBorderWidth}return 0}xa(t){switch(this.Hl){case"Line":case"Area":case"Baseline":{const t=this.cn.crosshairMarkerBackgroundColor;if(0!==t.length)return t}}return this.$s().Hs(t).ue}$l(){switch(this.cn.priceFormat.type){case"custom":this.ba={format:this.cn.priceFormat.formatter};break;case"volume":this.ba=new vt(this.cn.priceFormat.precision);break;case"percent":this.ba=new ft(this.cn.priceFormat.precision);break;default:{const t=Math.pow(10,this.cn.priceFormat.precision);this.ba=new dt(t,this.cn.priceFormat.minMove*t);}}null!==this.Yi&&this.Yi.Pa();}Jl(){const t=this.$t().St();if(!t.Ra()||this.zt.Ni())return void(this.Fl=[]);const i=b(this.zt.sl());this.Fl=this.Nl.map(((n,s)=>{const e=b(t.Da(n.time,!0)),r=e<i?1:-1;return {time:b(this.zt.hl(e,r)).se,position:n.position,shape:n.shape,color:n.color,id:n.id,Qr:s,text:n.text,size:n.size,originalTime:n.originalTime}}));}Ul(t){switch(this.dn=new ki(this,this.$t()),this.Hl){case"Bar":this.wn=new jt(this,this.$t());break;case"Candlestick":this.wn=new Yt(this,this.$t());break;case"Line":this.wn=new Qt(this,this.$t());break;case"Custom":this.wn=new Kt(this,this.$t(),m(t));break;case"Area":this.wn=new Nt(this,this.$t());break;case"Baseline":this.wn=new Ut(this,this.$t());break;case"Histogram":this.wn=new Jt(this,this.$t());break;default:throw Error("Unknown chart style assigned: "+this.Hl)}}ua(t,i){const n=[];return qi(this.jl,t,i,n),n}}class Gi{constructor(t){this.cn=t;}Oa(t,i,n){let s=t;if(0===this.cn.mode)return s;const e=n.vn(),r=e.Ct();if(null===r)return s;const h=e.Rt(t,r),l=n.Aa().filter((t=>t instanceof Zi)).reduce(((t,s)=>{if(n.dr(s)||!s.yt())return t;const e=s.Dt(),r=s.In();if(e.Ni()||!r.Kr(i))return t;const h=r.Zh(i);if(null===h)return t;const l=w(s.Ct());return t.concat([e.Rt(h.Ot[3],l.Ot)])}),[]);if(0===l.length)return s;l.sort(((t,i)=>Math.abs(t-h)-Math.abs(i-h)));const a=l[0];return s=e.pn(a,r),s}}class Ji extends j{constructor(){super(...arguments),this.zt=null;}J(t){this.zt=t;}Z({context:t,bitmapSize:i,horizontalPixelRatio:n,verticalPixelRatio:s}){if(null===this.zt)return;const e=Math.max(1,Math.floor(n));t.lineWidth=e,function(t,i){t.save(),t.lineWidth%2&&t.translate(.5,.5),i(),t.restore();}(t,(()=>{const r=b(this.zt);if(r.Ba){t.strokeStyle=r.Va,f(t,r.Ia),t.beginPath();for(const s of r.za){const r=Math.round(s.La*n);t.moveTo(r,-e),t.lineTo(r,i.height+e);}t.stroke();}if(r.Ea){t.strokeStyle=r.Na,f(t,r.Fa),t.beginPath();for(const n of r.Wa){const r=Math.round(n.La*s);t.moveTo(-e,r),t.lineTo(i.width+e,r);}t.stroke();}}));}}class Qi{constructor(t){this.Wt=new Ji,this.ft=!0,this.tn=t;}bt(){this.ft=!0;}gt(){if(this.ft){const t=this.tn.$t().W().grid,i={Ea:t.horzLines.visible,Ba:t.vertLines.visible,Na:t.horzLines.color,Va:t.vertLines.color,Fa:t.horzLines.style,Ia:t.vertLines.style,Wa:this.tn.vn().ja(),za:(this.tn.$t().St().ja()||[]).map((t=>({La:t.coord})))};this.Wt.J(i),this.ft=!1;}return this.Wt}}class tn{constructor(t){this.wn=new Qi(t);}Uh(){return this.wn}}const nn={Ha:4,$a:1e-4};function sn(t,i){const n=100*(t-i)/i;return i<0?-n:n}function en(t,i){const n=sn(t.Th(),i),s=sn(t.Ph(),i);return new Pi(n,s)}function rn(t,i){const n=100*(t-i)/i+100;return i<0?-n:n}function hn(t,i){const n=rn(t.Th(),i),s=rn(t.Ph(),i);return new Pi(n,s)}function ln(t,i){const n=Math.abs(t);if(n<1e-15)return 0;const s=Math.log10(n+i.$a)+i.Ha;return t<0?-s:s}function an(t,i){const n=Math.abs(t);if(n<1e-15)return 0;const s=Math.pow(10,n-i.Ha)-i.$a;return t<0?-s:s}function on(t,i){if(null===t)return null;const n=ln(t.Th(),i),s=ln(t.Ph(),i);return new Pi(n,s)}function _n(t,i){if(null===t)return null;const n=an(t.Th(),i),s=an(t.Ph(),i);return new Pi(n,s)}function un(t){if(null===t)return nn;const i=Math.abs(t.Ph()-t.Th());if(i>=1||i<1e-15)return nn;const n=Math.ceil(Math.abs(Math.log10(i))),s=nn.Ha+n;return {Ha:s,$a:1/Math.pow(10,s)}}class cn{constructor(t,i){if(this.Ua=t,this.qa=i,function(t){if(t<0)return !1;for(let i=t;i>1;i/=10)if(i%10!=0)return !1;return !0}(this.Ua))this.Ya=[2,2.5,2];else {this.Ya=[];for(let t=this.Ua;1!==t;){if(t%2==0)this.Ya.push(2),t/=2;else {if(t%5!=0)throw new Error("unexpected base");this.Ya.push(2,2.5),t/=5;}if(this.Ya.length>100)throw new Error("something wrong with base")}}}Xa(t,i,n){const s=0===this.Ua?0:1/this.Ua;let e=Math.pow(10,Math.max(0,Math.ceil(Math.log10(t-i)))),r=0,h=this.qa[0];for(;;){const t=kt(e,s,1e-14)&&e>s+1e-14,i=kt(e,n*h,1e-14),l=kt(e,1,1e-14);if(!(t&&i&&l))break;e/=h,h=this.qa[++r%this.qa.length];}if(e<=s+1e-14&&(e=s),e=Math.max(1,e),this.Ya.length>0&&(l=e,a=1,o=1e-14,Math.abs(l-a)<o))for(r=0,h=this.Ya[0];kt(e,n*h,1e-14)&&e>s+1e-14;)e/=h,h=this.Ya[++r%this.Ya.length];var l,a,o;return e}}class dn{constructor(t,i,n,s){this.Ka=[],this.Li=t,this.Ua=i,this.Za=n,this.Ga=s;}Xa(t,i){if(t<i)throw new Error("high < low");const n=this.Li.Vt(),s=(t-i)*this.Ja()/n,e=new cn(this.Ua,[2,2.5,2]),r=new cn(this.Ua,[2,2,2.5]),h=new cn(this.Ua,[2.5,2,2]),l=[];return l.push(e.Xa(t,i,s),r.Xa(t,i,s),h.Xa(t,i,s)),function(t){if(t.length<1)throw Error("array is empty");let i=t[0];for(let n=1;n<t.length;++n)t[n]<i&&(i=t[n]);return i}(l)}Qa(){const t=this.Li,i=t.Ct();if(null===i)return void(this.Ka=[]);const n=t.Vt(),s=this.Za(n-1,i),e=this.Za(0,i),r=this.Li.W().entireTextOnly?this.io()/2:0,h=r,l=n-1-r,a=Math.max(s,e),o=Math.min(s,e);if(a===o)return void(this.Ka=[]);let _=this.Xa(a,o),u=a%_;u+=u<0?_:0;const c=a>=o?1:-1;let d=null,f=0;for(let n=a-u;n>o;n-=_){const s=this.Ga(n,i,!0);null!==d&&Math.abs(s-d)<this.Ja()||(s<h||s>l||(f<this.Ka.length?(this.Ka[f].La=s,this.Ka[f].no=t.so(n)):this.Ka.push({La:s,no:t.so(n)}),f++,d=s,t.eo()&&(_=this.Xa(n*c,o))));}this.Ka.length=f;}ja(){return this.Ka}io(){return this.Li.P()}Ja(){return Math.ceil(2.5*this.io())}}function fn(t){return t.slice().sort(((t,i)=>b(t.Ki())-b(i.Ki())))}var vn;!function(t){t[t.Normal=0]="Normal",t[t.Logarithmic=1]="Logarithmic",t[t.Percentage=2]="Percentage",t[t.IndexedTo100=3]="IndexedTo100";}(vn||(vn={}));const pn=new ft,mn=new dt(100,1);class bn{constructor(t,i,n,s){this.ro=0,this.ho=null,this.Vh=null,this.lo=null,this.ao={oo:!1,_o:null},this.uo=0,this.co=0,this.do=new R,this.fo=new R,this.vo=[],this.po=null,this.mo=null,this.bo=null,this.wo=null,this.ba=mn,this.Mo=un(null),this.xo=t,this.cn=i,this.So=n,this.ko=s,this.yo=new dn(this,100,this.Co.bind(this),this.To.bind(this));}Ta(){return this.xo}W(){return this.cn}Hh(t){if(D(this.cn,t),this.Pa(),void 0!==t.mode&&this.Po({yr:t.mode}),void 0!==t.scaleMargins){const i=m(t.scaleMargins.top),n=m(t.scaleMargins.bottom);if(i<0||i>1)throw new Error(`Invalid top margin - expect value between 0 and 1, given=${i}`);if(n<0||n>1)throw new Error(`Invalid bottom margin - expect value between 0 and 1, given=${n}`);if(i+n>1)throw new Error(`Invalid margins - sum of margins must be less than 1, given=${i+n}`);this.Ro(),this.mo=null;}}Do(){return this.cn.autoScale}eo(){return 1===this.cn.mode}gh(){return 2===this.cn.mode}Oo(){return 3===this.cn.mode}yr(){return {Wn:this.cn.autoScale,Ao:this.cn.invertScale,yr:this.cn.mode}}Po(t){const i=this.yr();let n=null;void 0!==t.Wn&&(this.cn.autoScale=t.Wn),void 0!==t.yr&&(this.cn.mode=t.yr,2!==t.yr&&3!==t.yr||(this.cn.autoScale=!0),this.ao.oo=!1),1===i.yr&&t.yr!==i.yr&&(!function(t,i){if(null===t)return !1;const n=an(t.Th(),i),s=an(t.Ph(),i);return isFinite(n)&&isFinite(s)}(this.Vh,this.Mo)?this.cn.autoScale=!0:(n=_n(this.Vh,this.Mo),null!==n&&this.Bo(n))),1===t.yr&&t.yr!==i.yr&&(n=on(this.Vh,this.Mo),null!==n&&this.Bo(n));const s=i.yr!==this.cn.mode;s&&(2===i.yr||this.gh())&&this.Pa(),s&&(3===i.yr||this.Oo())&&this.Pa(),void 0!==t.Ao&&i.Ao!==t.Ao&&(this.cn.invertScale=t.Ao,this.Vo()),this.fo.m(i,this.yr());}Io(){return this.fo}P(){return this.So.fontSize}Vt(){return this.ro}zo(t){this.ro!==t&&(this.ro=t,this.Ro(),this.mo=null);}Lo(){if(this.ho)return this.ho;const t=this.Vt()-this.Eo()-this.No();return this.ho=t,t}zh(){return this.Fo(),this.Vh}Bo(t,i){const n=this.Vh;(i||null===n&&null!==t||null!==n&&!n.yh(t))&&(this.mo=null,this.Vh=t);}Ni(){return this.Fo(),0===this.ro||!this.Vh||this.Vh.Ni()}Wo(t){return this.Ao()?t:this.Vt()-1-t}Rt(t,i){return this.gh()?t=sn(t,i):this.Oo()&&(t=rn(t,i)),this.To(t,i)}Qs(t,i,n){this.Fo();const s=this.No(),e=b(this.zh()),r=e.Th(),h=e.Ph(),l=this.Lo()-1,a=this.Ao(),o=l/(h-r),_=void 0===n?0:n.from,u=void 0===n?t.length:n.to,c=this.jo();for(let n=_;n<u;n++){const e=t[n],h=e._t;if(isNaN(h))continue;let l=h;null!==c&&(l=c(e._t,i));const _=s+o*(l-r),u=a?_:this.ro-1-_;e.st=u;}}me(t,i,n){this.Fo();const s=this.No(),e=b(this.zh()),r=e.Th(),h=e.Ph(),l=this.Lo()-1,a=this.Ao(),o=l/(h-r),_=void 0===n?0:n.from,u=void 0===n?t.length:n.to,c=this.jo();for(let n=_;n<u;n++){const e=t[n];let h=e.we,l=e.ge,_=e.Me,u=e.xe;null!==c&&(h=c(e.we,i),l=c(e.ge,i),_=c(e.Me,i),u=c(e.xe,i));let d=s+o*(h-r),f=a?d:this.ro-1-d;e.ve=f,d=s+o*(l-r),f=a?d:this.ro-1-d,e.ce=f,d=s+o*(_-r),f=a?d:this.ro-1-d,e.de=f,d=s+o*(u-r),f=a?d:this.ro-1-d,e.pe=f;}}pn(t,i){const n=this.Co(t,i);return this.Ho(n,i)}Ho(t,i){let n=t;return this.gh()?n=function(t,i){return i<0&&(t=-t),t/100*i+i}(n,i):this.Oo()&&(n=function(t,i){return t-=100,i<0&&(t=-t),t/100*i+i}(n,i)),n}Aa(){return this.vo}$o(){if(this.po)return this.po;let t=[];for(let i=0;i<this.vo.length;i++){const n=this.vo[i];null===n.Ki()&&n.Zi(i+1),t.push(n);}return t=fn(t),this.po=t,this.po}Uo(t){-1===this.vo.indexOf(t)&&(this.vo.push(t),this.Pa(),this.qo());}Yo(t){const i=this.vo.indexOf(t);if(-1===i)throw new Error("source is not attached to scale");this.vo.splice(i,1),0===this.vo.length&&(this.Po({Wn:!0}),this.Bo(null)),this.Pa(),this.qo();}Ct(){let t=null;for(const i of this.vo){const n=i.Ct();null!==n&&((null===t||n.ha<t.ha)&&(t=n));}return null===t?null:t.Ot}Ao(){return this.cn.invertScale}ja(){const t=null===this.Ct();if(null!==this.mo&&(t||this.mo.Xo===t))return this.mo.ja;this.yo.Qa();const i=this.yo.ja();return this.mo={ja:i,Xo:t},this.do.m(),i}Ko(){return this.do}Zo(t){this.gh()||this.Oo()||null===this.bo&&null===this.lo&&(this.Ni()||(this.bo=this.ro-t,this.lo=b(this.zh()).Ch()));}Go(t){if(this.gh()||this.Oo())return;if(null===this.bo)return;this.Po({Wn:!1}),(t=this.ro-t)<0&&(t=0);let i=(this.bo+.2*(this.ro-1))/(t+.2*(this.ro-1));const n=b(this.lo).Ch();i=Math.max(i,.1),n.Dh(i),this.Bo(n);}Jo(){this.gh()||this.Oo()||(this.bo=null,this.lo=null);}Qo(t){this.Do()||null===this.wo&&null===this.lo&&(this.Ni()||(this.wo=t,this.lo=b(this.zh()).Ch()));}t_(t){if(this.Do())return;if(null===this.wo)return;const i=b(this.zh()).Rh()/(this.Lo()-1);let n=t-this.wo;this.Ao()&&(n*=-1);const s=n*i,e=b(this.lo).Ch();e.Oh(s),this.Bo(e,!0),this.mo=null;}i_(){this.Do()||null!==this.wo&&(this.wo=null,this.lo=null);}ma(){return this.ba||this.Pa(),this.ba}Fi(t,i){switch(this.cn.mode){case 2:return this.n_(sn(t,i));case 3:return this.ma().format(rn(t,i));default:return this.Fh(t)}}so(t){switch(this.cn.mode){case 2:return this.n_(t);case 3:return this.ma().format(t);default:return this.Fh(t)}}ql(t){return this.Fh(t,b(this.s_()).ma())}Yl(t,i){return t=sn(t,i),this.n_(t,pn)}e_(){return this.vo}r_(t){this.ao={_o:t,oo:!1};}On(){this.vo.forEach((t=>t.On()));}Pa(){this.mo=null;const t=this.s_();let i=100;null!==t&&(i=Math.round(1/t.pa())),this.ba=mn,this.gh()?(this.ba=pn,i=100):this.Oo()?(this.ba=new dt(100,1),i=100):null!==t&&(this.ba=t.ma()),this.yo=new dn(this,i,this.Co.bind(this),this.To.bind(this)),this.yo.Qa();}qo(){this.po=null;}s_(){return this.vo[0]||null}Eo(){return this.Ao()?this.cn.scaleMargins.bottom*this.Vt()+this.co:this.cn.scaleMargins.top*this.Vt()+this.uo}No(){return this.Ao()?this.cn.scaleMargins.top*this.Vt()+this.uo:this.cn.scaleMargins.bottom*this.Vt()+this.co}Fo(){this.ao.oo||(this.ao.oo=!0,this.h_());}Ro(){this.ho=null;}To(t,i){if(this.Fo(),this.Ni())return 0;t=this.eo()&&t?ln(t,this.Mo):t;const n=b(this.zh()),s=this.No()+(this.Lo()-1)*(t-n.Th())/n.Rh();return this.Wo(s)}Co(t,i){if(this.Fo(),this.Ni())return 0;const n=this.Wo(t),s=b(this.zh()),e=s.Th()+s.Rh()*((n-this.No())/(this.Lo()-1));return this.eo()?an(e,this.Mo):e}Vo(){this.mo=null,this.yo.Qa();}h_(){const t=this.ao._o;if(null===t)return;let i=null;const n=this.e_();let s=0,e=0;for(const r of n){if(!r.yt())continue;const n=r.Ct();if(null===n)continue;const h=r.Vl(t.Os(),t.ui());let l=h&&h.zh();if(null!==l){switch(this.cn.mode){case 1:l=on(l,this.Mo);break;case 2:l=en(l,n.Ot);break;case 3:l=hn(l,n.Ot);}if(i=null===i?l:i.ts(b(l)),null!==h){const t=h.Lh();null!==t&&(s=Math.max(s,t.above),e=Math.max(e,t.below));}}}if(s===this.uo&&e===this.co||(this.uo=s,this.co=e,this.mo=null,this.Ro()),null!==i){if(i.Th()===i.Ph()){const t=this.s_(),n=5*(null===t||this.gh()||this.Oo()?1:t.pa());this.eo()&&(i=_n(i,this.Mo)),i=new Pi(i.Th()-n,i.Ph()+n),this.eo()&&(i=on(i,this.Mo));}if(this.eo()){const t=_n(i,this.Mo),n=un(t);if(r=n,h=this.Mo,r.Ha!==h.Ha||r.$a!==h.$a){const s=null!==this.lo?_n(this.lo,this.Mo):null;this.Mo=n,i=on(t,n),null!==s&&(this.lo=on(s,n));}}this.Bo(i);}else null===this.Vh&&(this.Bo(new Pi(-.5,.5)),this.Mo=un(null));var r,h;this.ao.oo=!0;}jo(){return this.gh()?sn:this.Oo()?rn:this.eo()?t=>ln(t,this.Mo):null}l_(t,i,n){return void 0===i?(void 0===n&&(n=this.ma()),n.format(t)):i(t)}Fh(t,i){return this.l_(t,this.ko.priceFormatter,i)}n_(t,i){return this.l_(t,this.ko.percentageFormatter,i)}}class wn{constructor(t,i){this.vo=[],this.a_=new Map,this.ro=0,this.o_=0,this.__=1e3,this.po=null,this.u_=new R,this.kl=t,this.$i=i,this.c_=new tn(this);const n=i.W();this.d_=this.f_("left",n.leftPriceScale),this.v_=this.f_("right",n.rightPriceScale),this.d_.Io().l(this.p_.bind(this,this.d_),this),this.v_.Io().l(this.p_.bind(this,this.v_),this),this.m_(n);}m_(t){if(t.leftPriceScale&&this.d_.Hh(t.leftPriceScale),t.rightPriceScale&&this.v_.Hh(t.rightPriceScale),t.localization&&(this.d_.Pa(),this.v_.Pa()),t.overlayPriceScales){const i=Array.from(this.a_.values());for(const n of i){const i=b(n[0].Dt());i.Hh(t.overlayPriceScales),t.localization&&i.Pa();}}}b_(t){switch(t){case"left":return this.d_;case"right":return this.v_}return this.a_.has(t)?m(this.a_.get(t))[0].Dt():null}S(){this.$t().w_().p(this),this.d_.Io().p(this),this.v_.Io().p(this),this.vo.forEach((t=>{t.S&&t.S();})),this.u_.m();}g_(){return this.__}M_(t){this.__=t;}$t(){return this.$i}Hi(){return this.o_}Vt(){return this.ro}x_(t){this.o_=t,this.S_();}zo(t){this.ro=t,this.d_.zo(t),this.v_.zo(t),this.vo.forEach((i=>{if(this.dr(i)){const n=i.Dt();null!==n&&n.zo(t);}})),this.S_();}Aa(){return this.vo}dr(t){const i=t.Dt();return null===i||this.d_!==i&&this.v_!==i}Uo(t,i,n){const s=void 0!==n?n:this.y_().k_+1;this.C_(t,i,s);}Yo(t){const i=this.vo.indexOf(t);p(-1!==i,"removeDataSource: invalid data source"),this.vo.splice(i,1);const n=b(t.Dt()).Ta();if(this.a_.has(n)){const i=m(this.a_.get(n)),s=i.indexOf(t);-1!==s&&(i.splice(s,1),0===i.length&&this.a_.delete(n));}const s=t.Dt();s&&s.Aa().indexOf(t)>=0&&s.Yo(t),null!==s&&(s.qo(),this.T_(s)),this.po=null;}pr(t){return t===this.d_?"left":t===this.v_?"right":"overlay"}P_(){return this.d_}R_(){return this.v_}D_(t,i){t.Zo(i);}O_(t,i){t.Go(i),this.S_();}A_(t){t.Jo();}B_(t,i){t.Qo(i);}V_(t,i){t.t_(i),this.S_();}I_(t){t.i_();}S_(){this.vo.forEach((t=>{t.On();}));}vn(){let t=null;return this.$i.W().rightPriceScale.visible&&0!==this.v_.Aa().length?t=this.v_:this.$i.W().leftPriceScale.visible&&0!==this.d_.Aa().length?t=this.d_:0!==this.vo.length&&(t=this.vo[0].Dt()),null===t&&(t=this.v_),t}vr(){let t=null;return this.$i.W().rightPriceScale.visible?t=this.v_:this.$i.W().leftPriceScale.visible&&(t=this.d_),t}T_(t){null!==t&&t.Do()&&this.z_(t);}L_(t){const i=this.kl.Xs();t.Po({Wn:!0}),null!==i&&t.r_(i),this.S_();}E_(){this.z_(this.d_),this.z_(this.v_);}N_(){this.T_(this.d_),this.T_(this.v_),this.vo.forEach((t=>{this.dr(t)&&this.T_(t.Dt());})),this.S_(),this.$i.$h();}$o(){return null===this.po&&(this.po=fn(this.vo)),this.po}F_(){return this.u_}W_(){return this.c_}z_(t){const i=t.e_();if(i&&i.length>0&&!this.kl.Ni()){const i=this.kl.Xs();null!==i&&t.r_(i);}t.On();}y_(){const t=this.$o();if(0===t.length)return {j_:0,k_:0};let i=0,n=0;for(let s=0;s<t.length;s++){const e=t[s].Ki();null!==e&&(e<i&&(i=e),e>n&&(n=e));}return {j_:i,k_:n}}C_(t,i,n){let s=this.b_(i);if(null===s&&(s=this.f_(i,this.$i.W().overlayPriceScales)),this.vo.push(t),!ot(i)){const n=this.a_.get(i)||[];n.push(t),this.a_.set(i,n);}s.Uo(t),t.Gi(s),t.Zi(n),this.T_(s),this.po=null;}p_(t,i,n){i.yr!==n.yr&&this.z_(t);}f_(t,i){const n=Object.assign({visible:!0,autoScale:!0},I(i)),s=new bn(t,n,this.$i.W().layout,this.$i.W().localization);return s.zo(this.Vt()),s}}class gn{constructor(t,i,n=50){this.Ke=0,this.Ze=1,this.Ge=1,this.Qe=new Map,this.Je=new Map,this.H_=t,this.U_=i,this.tr=n;}q_(t){const i=t.time,n=this.U_.cacheKey(i),s=this.Qe.get(n);if(void 0!==s)return s.Y_;if(this.Ke===this.tr){const t=this.Je.get(this.Ge);this.Je.delete(this.Ge),this.Qe.delete(m(t)),this.Ge++,this.Ke--;}const e=this.H_(t);return this.Qe.set(n,{Y_:e,er:this.Ze}),this.Je.set(this.Ze,n),this.Ke++,this.Ze++,e}}class Mn{constructor(t,i){p(t<=i,"right should be >= left"),this.X_=t,this.K_=i;}Os(){return this.X_}ui(){return this.K_}Z_(){return this.K_-this.X_+1}Kr(t){return this.X_<=t&&t<=this.K_}yh(t){return this.X_===t.Os()&&this.K_===t.ui()}}function xn(t,i){return null===t||null===i?t===i:t.yh(i)}class Sn{constructor(){this.G_=new Map,this.Qe=null,this.J_=!1;}Q_(t){this.J_=t,this.Qe=null;}tu(t,i){this.iu(i),this.Qe=null;for(let n=i;n<t.length;++n){const i=t[n];let s=this.G_.get(i.timeWeight);void 0===s&&(s=[],this.G_.set(i.timeWeight,s)),s.push({index:n,time:i.time,weight:i.timeWeight,originalTime:i.originalTime});}}nu(t,i){const n=Math.ceil(i/t);return null!==this.Qe&&this.Qe.su===n||(this.Qe={ja:this.eu(n),su:n}),this.Qe.ja}iu(t){if(0===t)return void this.G_.clear();const i=[];this.G_.forEach(((n,s)=>{t<=n[0].index?i.push(s):n.splice(At(n,t,(i=>i.index<t)),1/0);}));for(const t of i)this.G_.delete(t);}eu(t){let i=[];for(const n of Array.from(this.G_.keys()).sort(((t,i)=>i-t))){if(!this.G_.get(n))continue;const s=i;i=[];const e=s.length;let r=0;const h=m(this.G_.get(n)),l=h.length;let a=1/0,o=-1/0;for(let n=0;n<l;n++){const l=h[n],_=l.index;for(;r<e;){const t=s[r],n=t.index;if(!(n<_)){a=n;break}r++,i.push(t),o=n,a=1/0;}if(a-_>=t&&_-o>=t)i.push(l),o=_;else if(this.J_)return s}for(;r<e;r++)i.push(s[r]);}return i}}class kn{constructor(t){this.ru=t;}hu(){return null===this.ru?null:new Mn(Math.floor(this.ru.Os()),Math.ceil(this.ru.ui()))}lu(){return this.ru}static au(){return new kn(null)}}function yn(t,i){return t.weight>i.weight?t:i}class Cn{constructor(t,i,n,s){this.o_=0,this.ou=null,this._u=[],this.wo=null,this.bo=null,this.uu=new Sn,this.cu=new Map,this.du=kn.au(),this.fu=!0,this.vu=new R,this.pu=new R,this.mu=new R,this.bu=null,this.wu=null,this.gu=[],this.cn=i,this.ko=n,this.Mu=i.rightOffset,this.xu=i.barSpacing,this.$i=t,this.U_=s,this.Su(),this.uu.Q_(i.uniformDistribution);}W(){return this.cn}ku(t){D(this.ko,t),this.yu(),this.Su();}Hh(t,i){var n;D(this.cn,t),this.cn.fixLeftEdge&&this.Cu(),this.cn.fixRightEdge&&this.Tu(),void 0!==t.barSpacing&&this.$i.Gn(t.barSpacing),void 0!==t.rightOffset&&this.$i.Jn(t.rightOffset),void 0!==t.minBarSpacing&&this.$i.Gn(null!==(n=t.barSpacing)&&void 0!==n?n:this.xu),this.yu(),this.Su(),this.mu.m();}mn(t){var i,n;return null!==(n=null===(i=this._u[t])||void 0===i?void 0:i.time)&&void 0!==n?n:null}Ui(t){var i;return null!==(i=this._u[t])&&void 0!==i?i:null}Da(t,i){if(this._u.length<1)return null;if(this.U_.key(t)>this.U_.key(this._u[this._u.length-1].time))return i?this._u.length-1:null;const n=At(this._u,this.U_.key(t),((t,i)=>this.U_.key(t.time)<i));return this.U_.key(t)<this.U_.key(this._u[n].time)?i?n:null:n}Ni(){return 0===this.o_||0===this._u.length||null===this.ou}Ra(){return this._u.length>0}Xs(){return this.Pu(),this.du.hu()}Ru(){return this.Pu(),this.du.lu()}Du(){const t=this.Xs();if(null===t)return null;const i={from:t.Os(),to:t.ui()};return this.Ou(i)}Ou(t){const i=Math.round(t.from),n=Math.round(t.to),s=b(this.Au()),e=b(this.Bu());return {from:b(this.Ui(Math.max(s,i))),to:b(this.Ui(Math.min(e,n)))}}Vu(t){return {from:b(this.Da(t.from,!0)),to:b(this.Da(t.to,!0))}}Hi(){return this.o_}x_(t){if(!isFinite(t)||t<=0)return;if(this.o_===t)return;const i=this.Ru(),n=this.o_;if(this.o_=t,this.fu=!0,this.cn.lockVisibleTimeRangeOnResize&&0!==n){const i=this.xu*t/n;this.xu=i;}if(this.cn.fixLeftEdge&&null!==i&&i.Os()<=0){const i=n-t;this.Mu-=Math.round(i/this.xu)+1,this.fu=!0;}this.Iu(),this.zu();}It(t){if(this.Ni()||!A(t))return 0;const i=this.Lu()+this.Mu-t;return this.o_-(i+.5)*this.xu-1}Js(t,i){const n=this.Lu(),s=void 0===i?0:i.from,e=void 0===i?t.length:i.to;for(let i=s;i<e;i++){const s=t[i].ot,e=n+this.Mu-s,r=this.o_-(e+.5)*this.xu-1;t[i].nt=r;}}Eu(t){return Math.ceil(this.Nu(t))}Jn(t){this.fu=!0,this.Mu=t,this.zu(),this.$i.Fu(),this.$i.$h();}he(){return this.xu}Gn(t){this.Wu(t),this.zu(),this.$i.Fu(),this.$i.$h();}ju(){return this.Mu}ja(){if(this.Ni())return null;if(null!==this.wu)return this.wu;const t=this.xu,i=5*(this.$i.W().layout.fontSize+4)/8*(this.cn.tickMarkMaxCharacterLength||8),n=Math.round(i/t),s=b(this.Xs()),e=Math.max(s.Os(),s.Os()-n),r=Math.max(s.ui(),s.ui()-n),h=this.uu.nu(t,i),l=this.Au()+n,a=this.Bu()-n,o=this.Hu(),_=this.cn.fixLeftEdge||o,u=this.cn.fixRightEdge||o;let c=0;for(const t of h){if(!(e<=t.index&&t.index<=r))continue;let n;c<this.gu.length?(n=this.gu[c],n.coord=this.It(t.index),n.label=this.$u(t),n.weight=t.weight):(n={needAlignCoordinate:!1,coord:this.It(t.index),label:this.$u(t),weight:t.weight},this.gu.push(n)),this.xu>i/2&&!o?n.needAlignCoordinate=!1:n.needAlignCoordinate=_&&t.index<=l||u&&t.index>=a,c++;}return this.gu.length=c,this.wu=this.gu,this.gu}Uu(){this.fu=!0,this.Gn(this.cn.barSpacing),this.Jn(this.cn.rightOffset);}qu(t){this.fu=!0,this.ou=t,this.zu(),this.Cu();}Yu(t,i){const n=this.Nu(t),s=this.he(),e=s+i*(s/10);this.Gn(e),this.cn.rightBarStaysOnScroll||this.Jn(this.ju()+(n-this.Nu(t)));}Zo(t){this.wo&&this.i_(),null===this.bo&&null===this.bu&&(this.Ni()||(this.bo=t,this.Xu()));}Go(t){if(null===this.bu)return;const i=St(this.o_-t,0,this.o_),n=St(this.o_-b(this.bo),0,this.o_);0!==i&&0!==n&&this.Gn(this.bu.he*i/n);}Jo(){null!==this.bo&&(this.bo=null,this.Ku());}Qo(t){null===this.wo&&null===this.bu&&(this.Ni()||(this.wo=t,this.Xu()));}t_(t){if(null===this.wo)return;const i=(this.wo-t)/this.he();this.Mu=b(this.bu).ju+i,this.fu=!0,this.zu();}i_(){null!==this.wo&&(this.wo=null,this.Ku());}Zu(){this.Gu(this.cn.rightOffset);}Gu(t,i=400){if(!isFinite(t))throw new RangeError("offset is required and must be finite number");if(!isFinite(i)||i<=0)throw new RangeError("animationDuration (optional) must be finite positive number");const n=this.Mu,s=performance.now();this.$i.Xn({Ju:t=>(t-s)/i>=1,Qu:e=>{const r=(e-s)/i;return r>=1?t:n+(t-n)*r}});}bt(t,i){this.fu=!0,this._u=t,this.uu.tu(t,i),this.zu();}tc(){return this.vu}nc(){return this.pu}sc(){return this.mu}Lu(){return this.ou||0}ec(t){const i=t.Z_();this.Wu(this.o_/i),this.Mu=t.ui()-this.Lu(),this.zu(),this.fu=!0,this.$i.Fu(),this.$i.$h();}rc(){const t=this.Au(),i=this.Bu();null!==t&&null!==i&&this.ec(new Mn(t,i+this.cn.rightOffset));}hc(t){const i=new Mn(t.from,t.to);this.ec(i);}qi(t){return void 0!==this.ko.timeFormatter?this.ko.timeFormatter(t.originalTime):this.U_.formatHorzItem(t.time)}Hu(){const{handleScroll:t,handleScale:i}=this.$i.W();return !(t.horzTouchDrag||t.mouseWheel||t.pressedMouseMove||t.vertTouchDrag||i.axisDoubleClickReset.time||i.axisPressedMouseMove.time||i.mouseWheel||i.pinch)}Au(){return 0===this._u.length?null:0}Bu(){return 0===this._u.length?null:this._u.length-1}lc(t){return (this.o_-1-t)/this.xu}Nu(t){const i=this.lc(t),n=this.Lu()+this.Mu-i;return Math.round(1e6*n)/1e6}Wu(t){const i=this.xu;this.xu=t,this.Iu(),i!==this.xu&&(this.fu=!0,this.ac());}Pu(){if(!this.fu)return;if(this.fu=!1,this.Ni())return void this.oc(kn.au());const t=this.Lu(),i=this.o_/this.xu,n=this.Mu+t,s=new Mn(n-i+1,n);this.oc(new kn(s));}Iu(){const t=this._c();if(this.xu<t&&(this.xu=t,this.fu=!0),0!==this.o_){const t=.5*this.o_;this.xu>t&&(this.xu=t,this.fu=!0);}}_c(){return this.cn.fixLeftEdge&&this.cn.fixRightEdge&&0!==this._u.length?this.o_/this._u.length:this.cn.minBarSpacing}zu(){const t=this.uc();this.Mu>t&&(this.Mu=t,this.fu=!0);const i=this.cc();null!==i&&this.Mu<i&&(this.Mu=i,this.fu=!0);}cc(){const t=this.Au(),i=this.ou;if(null===t||null===i)return null;return t-i-1+(this.cn.fixLeftEdge?this.o_/this.xu:Math.min(2,this._u.length))}uc(){return this.cn.fixRightEdge?0:this.o_/this.xu-Math.min(2,this._u.length)}Xu(){this.bu={he:this.he(),ju:this.ju()};}Ku(){this.bu=null;}$u(t){let i=this.cu.get(t.weight);return void 0===i&&(i=new gn((t=>this.dc(t)),this.U_),this.cu.set(t.weight,i)),i.q_(t)}dc(t){return this.U_.formatTickmark(t,this.ko)}oc(t){const i=this.du;this.du=t,xn(i.hu(),this.du.hu())||this.vu.m(),xn(i.lu(),this.du.lu())||this.pu.m(),this.ac();}ac(){this.wu=null;}yu(){this.ac(),this.cu.clear();}Su(){this.U_.updateFormatter(this.ko);}Cu(){if(!this.cn.fixLeftEdge)return;const t=this.Au();if(null===t)return;const i=this.Xs();if(null===i)return;const n=i.Os()-t;if(n<0){const t=this.Mu-n-1;this.Jn(t);}this.Iu();}Tu(){this.zu(),this.Iu();}}class Tn{K(t,i,n){t.useMediaCoordinateSpace((t=>this.Z(t,i,n)));}wl(t,i,n){t.useMediaCoordinateSpace((t=>this.fc(t,i,n)));}fc(t,i,n){}}class Pn extends Tn{constructor(t){super(),this.vc=new Map,this.zt=t;}Z(t){}fc(t){if(!this.zt.yt)return;const{context:i,mediaSize:n}=t;let s=0;for(const t of this.zt.mc){if(0===t.Zt.length)continue;i.font=t.R;const e=this.bc(i,t.Zt);e>n.width?t.Yu=n.width/e:t.Yu=1,s+=t.wc*t.Yu;}let e=0;switch(this.zt.gc){case"top":e=0;break;case"center":e=Math.max((n.height-s)/2,0);break;case"bottom":e=Math.max(n.height-s,0);}i.fillStyle=this.zt.O;for(const t of this.zt.mc){i.save();let s=0;switch(this.zt.Mc){case"left":i.textAlign="left",s=t.wc/2;break;case"center":i.textAlign="center",s=n.width/2;break;case"right":i.textAlign="right",s=n.width-1-t.wc/2;}i.translate(s,e),i.textBaseline="top",i.font=t.R,i.scale(t.Yu,t.Yu),i.fillText(t.Zt,0,t.xc),i.restore(),e+=t.wc*t.Yu;}}bc(t,i){const n=this.Sc(t.font);let s=n.get(i);return void 0===s&&(s=t.measureText(i).width,n.set(i,s)),s}Sc(t){let i=this.vc.get(t);return void 0===i&&(i=new Map,this.vc.set(t,i)),i}}class Rn{constructor(t){this.ft=!0,this.Ft={yt:!1,O:"",mc:[],gc:"center",Mc:"center"},this.Wt=new Pn(this.Ft),this.jt=t;}bt(){this.ft=!0;}gt(){return this.ft&&(this.Mt(),this.ft=!1),this.Wt}Mt(){const t=this.jt.W(),i=this.Ft;i.yt=t.visible,i.yt&&(i.O=t.color,i.Mc=t.horzAlign,i.gc=t.vertAlign,i.mc=[{Zt:t.text,R:N(t.fontSize,t.fontFamily,t.fontStyle),wc:1.2*t.fontSize,xc:0,Yu:0}]);}}class Dn extends ht{constructor(t,i){super(),this.cn=i,this.wn=new Rn(this);}Rn(){return []}Pn(){return [this.wn]}W(){return this.cn}On(){this.wn.bt();}}var On,An,Bn,Vn,In;!function(t){t[t.OnTouchEnd=0]="OnTouchEnd",t[t.OnNextTap=1]="OnNextTap";}(On||(On={}));class zn{constructor(t,i,n){this.kc=[],this.yc=[],this.o_=0,this.Cc=null,this.Tc=new R,this.Pc=new R,this.Rc=null,this.Dc=t,this.cn=i,this.U_=n,this.Oc=new F(this),this.kl=new Cn(this,i.timeScale,this.cn.localization,n),this.vt=new at(this,i.crosshair),this.Ac=new Gi(i.crosshair),this.Bc=new Dn(this,i.watermark),this.Vc(),this.kc[0].M_(2e3),this.Ic=this.zc(0),this.Lc=this.zc(1);}Kl(){this.Ec(_t.es());}$h(){this.Ec(_t.ss());}aa(){this.Ec(new _t(1));}Zl(t){const i=this.Nc(t);this.Ec(i);}Fc(){return this.Cc}Wc(t){const i=this.Cc;this.Cc=t,null!==i&&this.Zl(i.jc),null!==t&&this.Zl(t.jc);}W(){return this.cn}Hh(t){D(this.cn,t),this.kc.forEach((i=>i.m_(t))),void 0!==t.timeScale&&this.kl.Hh(t.timeScale),void 0!==t.localization&&this.kl.ku(t.localization),(t.leftPriceScale||t.rightPriceScale)&&this.Tc.m(),this.Ic=this.zc(0),this.Lc=this.zc(1),this.Kl();}Hc(t,i){if("left"===t)return void this.Hh({leftPriceScale:i});if("right"===t)return void this.Hh({rightPriceScale:i});const n=this.$c(t);null!==n&&(n.Dt.Hh(i),this.Tc.m());}$c(t){for(const i of this.kc){const n=i.b_(t);if(null!==n)return {Ht:i,Dt:n}}return null}St(){return this.kl}Uc(){return this.kc}qc(){return this.Bc}Yc(){return this.vt}Xc(){return this.Pc}Kc(t,i){t.zo(i),this.Fu();}x_(t){this.o_=t,this.kl.x_(this.o_),this.kc.forEach((i=>i.x_(t))),this.Fu();}Vc(t){const i=new wn(this.kl,this);void 0!==t?this.kc.splice(t,0,i):this.kc.push(i);const n=void 0===t?this.kc.length-1:t,s=_t.es();return s.Nn(n,{Fn:0,Wn:!0}),this.Ec(s),i}D_(t,i,n){t.D_(i,n);}O_(t,i,n){t.O_(i,n),this.Gl(),this.Ec(this.Zc(t,2));}A_(t,i){t.A_(i),this.Ec(this.Zc(t,2));}B_(t,i,n){i.Do()||t.B_(i,n);}V_(t,i,n){i.Do()||(t.V_(i,n),this.Gl(),this.Ec(this.Zc(t,2)));}I_(t,i){i.Do()||(t.I_(i),this.Ec(this.Zc(t,2)));}L_(t,i){t.L_(i),this.Ec(this.Zc(t,2));}Gc(t){this.kl.Zo(t);}Jc(t,i){const n=this.St();if(n.Ni()||0===i)return;const s=n.Hi();t=Math.max(1,Math.min(t,s)),n.Yu(t,i),this.Fu();}Qc(t){this.td(0),this.nd(t),this.sd();}ed(t){this.kl.Go(t),this.Fu();}rd(){this.kl.Jo(),this.$h();}td(t){this.kl.Qo(t);}nd(t){this.kl.t_(t),this.Fu();}sd(){this.kl.i_(),this.$h();}wt(){return this.yc}hd(t,i,n,s,e){this.vt.gn(t,i);let r=NaN,h=this.kl.Eu(t);const l=this.kl.Xs();null!==l&&(h=Math.min(Math.max(l.Os(),h),l.ui()));const a=s.vn(),o=a.Ct();null!==o&&(r=a.pn(i,o)),r=this.Ac.Oa(r,h,s),this.vt.kn(h,r,s),this.aa(),e||this.Pc.m(this.vt.xt(),{x:t,y:i},n);}ld(t,i,n){const s=n.vn(),e=s.Ct(),r=s.Rt(t,b(e)),h=this.kl.Da(i,!0),l=this.kl.It(b(h));this.hd(l,r,null,n,!0);}ad(t){this.Yc().Cn(),this.aa(),t||this.Pc.m(null,null,null);}Gl(){const t=this.vt.Ht();if(null!==t){const i=this.vt.xn(),n=this.vt.Sn();this.hd(i,n,null,t);}this.vt.On();}od(t,i,n){const s=this.kl.mn(0);void 0!==i&&void 0!==n&&this.kl.bt(i,n);const e=this.kl.mn(0),r=this.kl.Lu(),h=this.kl.Xs();if(null!==h&&null!==s&&null!==e){const i=h.Kr(r),l=this.U_.key(s)>this.U_.key(e),a=null!==t&&t>r&&!l,o=this.kl.W().allowShiftVisibleRangeOnWhitespaceReplacement,_=i&&(!(void 0===n)||o)&&this.kl.W().shiftVisibleRangeOnNewBar;if(a&&!_){const i=t-r;this.kl.Jn(this.kl.ju()-i);}}this.kl.qu(t);}ta(t){null!==t&&t.N_();}cr(t){const i=this.kc.find((i=>i.$o().includes(t)));return void 0===i?null:i}Fu(){this.Bc.On(),this.kc.forEach((t=>t.N_())),this.Gl();}S(){this.kc.forEach((t=>t.S())),this.kc.length=0,this.cn.localization.priceFormatter=void 0,this.cn.localization.percentageFormatter=void 0,this.cn.localization.timeFormatter=void 0;}_d(){return this.Oc}mr(){return this.Oc.W()}w_(){return this.Tc}ud(t,i,n){const s=this.kc[0],e=this.dd(i,t,s,n);return this.yc.push(e),1===this.yc.length?this.Kl():this.$h(),e}fd(t){const i=this.cr(t),n=this.yc.indexOf(t);p(-1!==n,"Series not found"),this.yc.splice(n,1),b(i).Yo(t),t.S&&t.S();}Xl(t,i){const n=b(this.cr(t));n.Yo(t);const s=this.$c(i);if(null===s){const s=t.Ki();n.Uo(t,i,s);}else {const e=s.Ht===n?t.Ki():void 0;s.Ht.Uo(t,i,e);}}rc(){const t=_t.ss();t.$n(),this.Ec(t);}vd(t){const i=_t.ss();i.Yn(t),this.Ec(i);}Zn(){const t=_t.ss();t.Zn(),this.Ec(t);}Gn(t){const i=_t.ss();i.Gn(t),this.Ec(i);}Jn(t){const i=_t.ss();i.Jn(t),this.Ec(i);}Xn(t){const i=_t.ss();i.Xn(t),this.Ec(i);}Un(){const t=_t.ss();t.Un(),this.Ec(t);}pd(){return this.cn.rightPriceScale.visible?"right":"left"}md(){return this.Lc}q(){return this.Ic}Bt(t){const i=this.Lc,n=this.Ic;if(i===n)return i;if(t=Math.max(0,Math.min(100,Math.round(100*t))),null===this.Rc||this.Rc.Ts!==n||this.Rc.Ps!==i)this.Rc={Ts:n,Ps:i,bd:new Map};else {const i=this.Rc.bd.get(t);if(void 0!==i)return i}const s=function(t,i,n){const[s,e,r,h]=T(t),[l,a,o,_]=T(i),u=[M(s+n*(l-s)),M(e+n*(a-e)),M(r+n*(o-r)),x(h+n*(_-h))];return `rgba(${u[0]}, ${u[1]}, ${u[2]}, ${u[3]})`}(n,i,t/100);return this.Rc.bd.set(t,s),s}Zc(t,i){const n=new _t(i);if(null!==t){const s=this.kc.indexOf(t);n.Nn(s,{Fn:i});}return n}Nc(t,i){return void 0===i&&(i=2),this.Zc(this.cr(t),i)}Ec(t){this.Dc&&this.Dc(t),this.kc.forEach((t=>t.W_().Uh().bt()));}dd(t,i,n,s){const e=new Zi(this,t,i,n,s),r=void 0!==t.priceScaleId?t.priceScaleId:this.pd();return n.Uo(e,r),ot(r)||e.Hh(t),e}zc(t){const i=this.cn.layout;return "gradient"===i.background.type?0===t?i.background.topColor:i.background.bottomColor:i.background.color}}function Ln(t){return !O(t)&&!B(t)}function En(t){return O(t)}!function(t){t[t.Disabled=0]="Disabled",t[t.Continuous=1]="Continuous",t[t.OnDataUpdate=2]="OnDataUpdate";}(An||(An={})),function(t){t[t.LastBar=0]="LastBar",t[t.LastVisible=1]="LastVisible";}(Bn||(Bn={})),function(t){t.Solid="solid",t.VerticalGradient="gradient";}(Vn||(Vn={})),function(t){t[t.Year=0]="Year",t[t.Month=1]="Month",t[t.DayOfMonth=2]="DayOfMonth",t[t.Time=3]="Time",t[t.TimeWithSeconds=4]="TimeWithSeconds";}(In||(In={}));const Nn=t=>t.getUTCFullYear();function Fn(t,i,n){return i.replace(/yyyy/g,(t=>ct(Nn(t),4))(t)).replace(/yy/g,(t=>ct(Nn(t)%100,2))(t)).replace(/MMMM/g,((t,i)=>new Date(t.getUTCFullYear(),t.getUTCMonth(),1).toLocaleString(i,{month:"long"}))(t,n)).replace(/MMM/g,((t,i)=>new Date(t.getUTCFullYear(),t.getUTCMonth(),1).toLocaleString(i,{month:"short"}))(t,n)).replace(/MM/g,(t=>ct((t=>t.getUTCMonth()+1)(t),2))(t)).replace(/dd/g,(t=>ct((t=>t.getUTCDate())(t),2))(t))}class Wn{constructor(t="yyyy-MM-dd",i="default"){this.wd=t,this.gd=i;}q_(t){return Fn(t,this.wd,this.gd)}}class jn{constructor(t){this.Md=t||"%h:%m:%s";}q_(t){return this.Md.replace("%h",ct(t.getUTCHours(),2)).replace("%m",ct(t.getUTCMinutes(),2)).replace("%s",ct(t.getUTCSeconds(),2))}}const Hn={xd:"yyyy-MM-dd",Sd:"%h:%m:%s",kd:" ",yd:"default"};class $n{constructor(t={}){const i=Object.assign(Object.assign({},Hn),t);this.Cd=new Wn(i.xd,i.yd),this.Td=new jn(i.Sd),this.Pd=i.kd;}q_(t){return `${this.Cd.q_(t)}${this.Pd}${this.Td.q_(t)}`}}function Un(t){return 60*t*60*1e3}function qn(t){return 60*t*1e3}const Yn=[{Rd:(Xn=1,1e3*Xn),Dd:10},{Rd:qn(1),Dd:20},{Rd:qn(5),Dd:21},{Rd:qn(30),Dd:22},{Rd:Un(1),Dd:30},{Rd:Un(3),Dd:31},{Rd:Un(6),Dd:32},{Rd:Un(12),Dd:33}];var Xn;function Kn(t,i){if(t.getUTCFullYear()!==i.getUTCFullYear())return 70;if(t.getUTCMonth()!==i.getUTCMonth())return 60;if(t.getUTCDate()!==i.getUTCDate())return 50;for(let n=Yn.length-1;n>=0;--n)if(Math.floor(i.getTime()/Yn[n].Rd)!==Math.floor(t.getTime()/Yn[n].Rd))return Yn[n].Dd;return 0}function Zn(t){let i=t;if(B(t)&&(i=Jn(t)),!Ln(i))throw new Error("time must be of type BusinessDay");const n=new Date(Date.UTC(i.year,i.month-1,i.day,0,0,0,0));return {Od:Math.round(n.getTime()/1e3),Ad:i}}function Gn(t){if(!En(t))throw new Error("time must be of type isUTCTimestamp");return {Od:t}}function Jn(t){const i=new Date(t);if(isNaN(i.getTime()))throw new Error(`Invalid date string=${t}, expected format=yyyy-mm-dd`);return {day:i.getUTCDate(),month:i.getUTCMonth()+1,year:i.getUTCFullYear()}}function Qn(t){B(t.time)&&(t.time=Jn(t.time));}class ts{options(){return this.cn}setOptions(t){this.cn=t,this.updateFormatter(t.localization);}preprocessData(t){Array.isArray(t)?function(t){t.forEach(Qn);}(t):Qn(t);}createConverterToInternalObj(t){return b(function(t){return 0===t.length?null:Ln(t[0].time)||B(t[0].time)?Zn:Gn}(t))}key(t){return "object"==typeof t&&"Od"in t?t.Od:this.key(this.convertHorzItemToInternal(t))}cacheKey(t){const i=t;return void 0===i.Ad?new Date(1e3*i.Od).getTime():new Date(Date.UTC(i.Ad.year,i.Ad.month-1,i.Ad.day)).getTime()}convertHorzItemToInternal(t){return En(i=t)?Gn(i):Ln(i)?Zn(i):Zn(Jn(i));var i;}updateFormatter(t){if(!this.cn)return;const i=t.dateFormat;this.cn.timeScale.timeVisible?this.Bd=new $n({xd:i,Sd:this.cn.timeScale.secondsVisible?"%h:%m:%s":"%h:%m",kd:"   ",yd:t.locale}):this.Bd=new Wn(i,t.locale);}formatHorzItem(t){const i=t;return this.Bd.q_(new Date(1e3*i.Od))}formatTickmark(t,i){const n=function(t,i,n){switch(t){case 0:case 10:return i?n?4:3:2;case 20:case 21:case 22:case 30:case 31:case 32:case 33:return i?3:2;case 50:return 2;case 60:return 1;case 70:return 0}}(t.weight,this.cn.timeScale.timeVisible,this.cn.timeScale.secondsVisible),s=this.cn.timeScale;if(void 0!==s.tickMarkFormatter){const e=s.tickMarkFormatter(t.originalTime,n,i.locale);if(null!==e)return e}return function(t,i,n){const s={};switch(i){case 0:s.year="numeric";break;case 1:s.month="short";break;case 2:s.day="numeric";break;case 3:s.hour12=!1,s.hour="2-digit",s.minute="2-digit";break;case 4:s.hour12=!1,s.hour="2-digit",s.minute="2-digit",s.second="2-digit";}const e=void 0===t.Ad?new Date(1e3*t.Od):new Date(Date.UTC(t.Ad.year,t.Ad.month-1,t.Ad.day));return new Date(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate(),e.getUTCHours(),e.getUTCMinutes(),e.getUTCSeconds(),e.getUTCMilliseconds()).toLocaleString(n,s)}(t.time,n,i.locale)}maxTickMarkWeight(t){let i=t.reduce(yn,t[0]).weight;return i>30&&i<50&&(i=30),i}fillWeightsForPoints(t,i){!function(t,i=0){if(0===t.length)return;let n=0===i?null:t[i-1].time.Od,s=null!==n?new Date(1e3*n):null,e=0;for(let r=i;r<t.length;++r){const i=t[r],h=new Date(1e3*i.time.Od);null!==s&&(i.timeWeight=Kn(h,s)),e+=i.time.Od-(n||i.time.Od),n=i.time.Od,s=h;}if(0===i&&t.length>1){const i=Math.ceil(e/(t.length-1)),n=new Date(1e3*(t[0].time.Od-i));t[0].timeWeight=Kn(new Date(1e3*t[0].time.Od),n);}}(t,i);}static Vd(t){return D({localization:{dateFormat:"dd MMM 'yy"}},null!=t?t:{})}}const is="undefined"!=typeof window;function ns(){return !!is&&window.navigator.userAgent.toLowerCase().indexOf("firefox")>-1}function ss(){return !!is&&/iPhone|iPad|iPod/.test(window.navigator.platform)}function es(t){return t+t%2}function rs(t,i){return t.Id-i.Id}function hs(t,i,n){const s=(t.Id-i.Id)/(t.ot-i.ot);return Math.sign(s)*Math.min(Math.abs(s),n)}class ls{constructor(t,i,n,s){this.zd=null,this.Ld=null,this.Ed=null,this.Nd=null,this.Fd=null,this.Wd=0,this.jd=0,this.Hd=t,this.$d=i,this.Ud=n,this.rs=s;}qd(t,i){if(null!==this.zd){if(this.zd.ot===i)return void(this.zd.Id=t);if(Math.abs(this.zd.Id-t)<this.rs)return}this.Nd=this.Ed,this.Ed=this.Ld,this.Ld=this.zd,this.zd={ot:i,Id:t};}Dr(t,i){if(null===this.zd||null===this.Ld)return;if(i-this.zd.ot>50)return;let n=0;const s=hs(this.zd,this.Ld,this.$d),e=rs(this.zd,this.Ld),r=[s],h=[e];if(n+=e,null!==this.Ed){const t=hs(this.Ld,this.Ed,this.$d);if(Math.sign(t)===Math.sign(s)){const i=rs(this.Ld,this.Ed);if(r.push(t),h.push(i),n+=i,null!==this.Nd){const t=hs(this.Ed,this.Nd,this.$d);if(Math.sign(t)===Math.sign(s)){const i=rs(this.Ed,this.Nd);r.push(t),h.push(i),n+=i;}}}}let l=0;for(let t=0;t<r.length;++t)l+=h[t]/n*r[t];Math.abs(l)<this.Hd||(this.Fd={Id:t,ot:i},this.jd=l,this.Wd=function(t,i){const n=Math.log(i);return Math.log(1*n/-t)/n}(Math.abs(l),this.Ud));}Qu(t){const i=b(this.Fd),n=t-i.ot;return i.Id+this.jd*(Math.pow(this.Ud,n)-1)/Math.log(this.Ud)}Ju(t){return null===this.Fd||this.Yd(t)===this.Wd}Yd(t){const i=t-b(this.Fd).ot;return Math.min(i,this.Wd)}}function as(t,n){const s=b(t.ownerDocument).createElement("canvas");t.appendChild(s);const e=bindTo(s,{type:"device-pixel-content-box",options:{allowResizeObserver:!1},transform:(t,i)=>({width:Math.max(t.width,i.width),height:Math.max(t.height,i.height)})});return e.resizeCanvasElement(n),e}function os(t){var i;t.width=1,t.height=1,null===(i=t.getContext("2d"))||void 0===i||i.clearRect(0,0,1,1);}function _s(t,i,n,s){t.wl&&t.wl(i,n,s);}function us(t,i,n,s){t.K(i,n,s);}function cs(t,i,n,s){const e=t(n,s);for(const t of e){const n=t.gt();null!==n&&i(n);}}function ds(t){is&&void 0!==window.chrome&&t.addEventListener("mousedown",(t=>{if(1===t.button)return t.preventDefault(),!1}));}class fs{constructor(t,i,n){this.Xd=0,this.Kd=null,this.Zd={nt:Number.NEGATIVE_INFINITY,st:Number.POSITIVE_INFINITY},this.Gd=0,this.Jd=null,this.Qd={nt:Number.NEGATIVE_INFINITY,st:Number.POSITIVE_INFINITY},this.tf=null,this.if=!1,this.nf=null,this.sf=null,this.ef=!1,this.rf=!1,this.hf=!1,this.lf=null,this.af=null,this._f=null,this.uf=null,this.cf=null,this.df=null,this.ff=null,this.vf=0,this.pf=!1,this.mf=!1,this.bf=!1,this.wf=0,this.gf=null,this.Mf=!ss(),this.xf=t=>{this.Sf(t);},this.kf=t=>{if(this.yf(t)){const i=this.Cf(t);if(++this.Gd,this.Jd&&this.Gd>1){const{Tf:n}=this.Pf(ms(t),this.Qd);n<30&&!this.hf&&this.Rf(i,this.Of.Df),this.Af();}}else {const i=this.Cf(t);if(++this.Xd,this.Kd&&this.Xd>1){const{Tf:n}=this.Pf(ms(t),this.Zd);n<5&&!this.rf&&this.Bf(i,this.Of.Vf),this.If();}}},this.zf=t,this.Of=i,this.cn=n,this.Lf();}S(){null!==this.lf&&(this.lf(),this.lf=null),null!==this.af&&(this.af(),this.af=null),null!==this.uf&&(this.uf(),this.uf=null),null!==this.cf&&(this.cf(),this.cf=null),null!==this.df&&(this.df(),this.df=null),null!==this._f&&(this._f(),this._f=null),this.Ef(),this.If();}Nf(t){this.uf&&this.uf();const i=this.Ff.bind(this);if(this.uf=()=>{this.zf.removeEventListener("mousemove",i);},this.zf.addEventListener("mousemove",i),this.yf(t))return;const n=this.Cf(t);this.Bf(n,this.Of.Wf),this.Mf=!0;}If(){null!==this.Kd&&clearTimeout(this.Kd),this.Xd=0,this.Kd=null,this.Zd={nt:Number.NEGATIVE_INFINITY,st:Number.POSITIVE_INFINITY};}Af(){null!==this.Jd&&clearTimeout(this.Jd),this.Gd=0,this.Jd=null,this.Qd={nt:Number.NEGATIVE_INFINITY,st:Number.POSITIVE_INFINITY};}Ff(t){if(this.bf||null!==this.sf)return;if(this.yf(t))return;const i=this.Cf(t);this.Bf(i,this.Of.jf),this.Mf=!0;}Hf(t){const i=ws(t.changedTouches,b(this.gf));if(null===i)return;if(this.wf=bs(t),null!==this.ff)return;if(this.mf)return;this.pf=!0;const n=this.Pf(ms(i),b(this.sf)),{$f:s,Uf:e,Tf:r}=n;if(this.ef||!(r<5)){if(!this.ef){const t=.5*s,i=e>=t&&!this.cn.qf(),n=t>e&&!this.cn.Yf();i||n||(this.mf=!0),this.ef=!0,this.hf=!0,this.Ef(),this.Af();}if(!this.mf){const n=this.Cf(t,i);this.Rf(n,this.Of.Xf),ps(t);}}}Kf(t){if(0!==t.button)return;const i=this.Pf(ms(t),b(this.nf)),{Tf:n}=i;if(n>=5&&(this.rf=!0,this.If()),this.rf){const i=this.Cf(t);this.Bf(i,this.Of.Zf);}}Pf(t,i){const n=Math.abs(i.nt-t.nt),s=Math.abs(i.st-t.st);return {$f:n,Uf:s,Tf:n+s}}Gf(t){let i=ws(t.changedTouches,b(this.gf));if(null===i&&0===t.touches.length&&(i=t.changedTouches[0]),null===i)return;this.gf=null,this.wf=bs(t),this.Ef(),this.sf=null,this.df&&(this.df(),this.df=null);const n=this.Cf(t,i);if(this.Rf(n,this.Of.Jf),++this.Gd,this.Jd&&this.Gd>1){const{Tf:t}=this.Pf(ms(i),this.Qd);t<30&&!this.hf&&this.Rf(n,this.Of.Df),this.Af();}else this.hf||(this.Rf(n,this.Of.Qf),this.Of.Qf&&ps(t));0===this.Gd&&ps(t),0===t.touches.length&&this.if&&(this.if=!1,ps(t));}Sf(t){if(0!==t.button)return;const i=this.Cf(t);if(this.nf=null,this.bf=!1,this.cf&&(this.cf(),this.cf=null),ns()){this.zf.ownerDocument.documentElement.removeEventListener("mouseleave",this.xf);}if(!this.yf(t))if(this.Bf(i,this.Of.tv),++this.Xd,this.Kd&&this.Xd>1){const{Tf:n}=this.Pf(ms(t),this.Zd);n<5&&!this.rf&&this.Bf(i,this.Of.Vf),this.If();}else this.rf||this.Bf(i,this.Of.iv);}Ef(){null!==this.tf&&(clearTimeout(this.tf),this.tf=null);}nv(t){if(null!==this.gf)return;const i=t.changedTouches[0];this.gf=i.identifier,this.wf=bs(t);const n=this.zf.ownerDocument.documentElement;this.hf=!1,this.ef=!1,this.mf=!1,this.sf=ms(i),this.df&&(this.df(),this.df=null);{const i=this.Hf.bind(this),s=this.Gf.bind(this);this.df=()=>{n.removeEventListener("touchmove",i),n.removeEventListener("touchend",s);},n.addEventListener("touchmove",i,{passive:!1}),n.addEventListener("touchend",s,{passive:!1}),this.Ef(),this.tf=setTimeout(this.sv.bind(this,t),240);}const s=this.Cf(t,i);this.Rf(s,this.Of.ev),this.Jd||(this.Gd=0,this.Jd=setTimeout(this.Af.bind(this),500),this.Qd=ms(i));}rv(t){if(0!==t.button)return;const i=this.zf.ownerDocument.documentElement;ns()&&i.addEventListener("mouseleave",this.xf),this.rf=!1,this.nf=ms(t),this.cf&&(this.cf(),this.cf=null);{const t=this.Kf.bind(this),n=this.Sf.bind(this);this.cf=()=>{i.removeEventListener("mousemove",t),i.removeEventListener("mouseup",n);},i.addEventListener("mousemove",t),i.addEventListener("mouseup",n);}if(this.bf=!0,this.yf(t))return;const n=this.Cf(t);this.Bf(n,this.Of.hv),this.Kd||(this.Xd=0,this.Kd=setTimeout(this.If.bind(this),500),this.Zd=ms(t));}Lf(){this.zf.addEventListener("mouseenter",this.Nf.bind(this)),this.zf.addEventListener("touchcancel",this.Ef.bind(this));{const t=this.zf.ownerDocument,i=t=>{this.Of.lv&&(t.composed&&this.zf.contains(t.composedPath()[0])||t.target&&this.zf.contains(t.target)||this.Of.lv());};this.af=()=>{t.removeEventListener("touchstart",i);},this.lf=()=>{t.removeEventListener("mousedown",i);},t.addEventListener("mousedown",i),t.addEventListener("touchstart",i,{passive:!0});}ss()&&(this._f=()=>{this.zf.removeEventListener("dblclick",this.kf);},this.zf.addEventListener("dblclick",this.kf)),this.zf.addEventListener("mouseleave",this.av.bind(this)),this.zf.addEventListener("touchstart",this.nv.bind(this),{passive:!0}),ds(this.zf),this.zf.addEventListener("mousedown",this.rv.bind(this)),this.ov(),this.zf.addEventListener("touchmove",(()=>{}),{passive:!1});}ov(){void 0===this.Of._v&&void 0===this.Of.uv&&void 0===this.Of.cv||(this.zf.addEventListener("touchstart",(t=>this.dv(t.touches)),{passive:!0}),this.zf.addEventListener("touchmove",(t=>{if(2===t.touches.length&&null!==this.ff&&void 0!==this.Of.uv){const i=vs(t.touches[0],t.touches[1])/this.vf;this.Of.uv(this.ff,i),ps(t);}}),{passive:!1}),this.zf.addEventListener("touchend",(t=>{this.dv(t.touches);})));}dv(t){1===t.length&&(this.pf=!1),2!==t.length||this.pf||this.if?this.fv():this.vv(t);}vv(t){const i=this.zf.getBoundingClientRect()||{left:0,top:0};this.ff={nt:(t[0].clientX-i.left+(t[1].clientX-i.left))/2,st:(t[0].clientY-i.top+(t[1].clientY-i.top))/2},this.vf=vs(t[0],t[1]),void 0!==this.Of._v&&this.Of._v(),this.Ef();}fv(){null!==this.ff&&(this.ff=null,void 0!==this.Of.cv&&this.Of.cv());}av(t){if(this.uf&&this.uf(),this.yf(t))return;if(!this.Mf)return;const i=this.Cf(t);this.Bf(i,this.Of.pv),this.Mf=!ss();}sv(t){const i=ws(t.touches,b(this.gf));if(null===i)return;const n=this.Cf(t,i);this.Rf(n,this.Of.mv),this.hf=!0,this.if=!0;}yf(t){return t.sourceCapabilities&&void 0!==t.sourceCapabilities.firesTouchEvents?t.sourceCapabilities.firesTouchEvents:bs(t)<this.wf+500}Rf(t,i){i&&i.call(this.Of,t);}Bf(t,i){i&&i.call(this.Of,t);}Cf(t,i){const n=i||t,s=this.zf.getBoundingClientRect()||{left:0,top:0};return {clientX:n.clientX,clientY:n.clientY,pageX:n.pageX,pageY:n.pageY,screenX:n.screenX,screenY:n.screenY,localX:n.clientX-s.left,localY:n.clientY-s.top,ctrlKey:t.ctrlKey,altKey:t.altKey,shiftKey:t.shiftKey,metaKey:t.metaKey,bv:!t.type.startsWith("mouse")&&"contextmenu"!==t.type&&"click"!==t.type,wv:t.type,gv:n.target,Mv:t.view,xv:()=>{"touchstart"!==t.type&&ps(t);}}}}function vs(t,i){const n=t.clientX-i.clientX,s=t.clientY-i.clientY;return Math.sqrt(n*n+s*s)}function ps(t){t.cancelable&&t.preventDefault();}function ms(t){return {nt:t.pageX,st:t.pageY}}function bs(t){return t.timeStamp||performance.now()}function ws(t,i){for(let n=0;n<t.length;++n)if(t[n].identifier===i)return t[n];return null}function gs(t){return {jc:t.jc,Sv:{wr:t.kv.externalId},yv:t.kv.cursorStyle}}function Ms(t,i,n){for(const s of t){const t=s.gt();if(null!==t&&t.br){const e=t.br(i,n);if(null!==e)return {Mv:s,Sv:e}}}return null}function xs(t,i){return n=>{var s,e,r,h;return (null!==(e=null===(s=n.Dt())||void 0===s?void 0:s.Ta())&&void 0!==e?e:"")!==i?[]:null!==(h=null===(r=n.ca)||void 0===r?void 0:r.call(n,t))&&void 0!==h?h:[]}}function Ss(t,i,n,s){if(!t.length)return;let e=0;const r=t[0].Vt(s,!0);let h=1===i?n/2-(t[0].Oi()-r/2):t[0].Oi()-r/2-n/2;h=Math.max(0,h);for(let r=1;r<t.length;r++){const l=t[r],a=t[r-1],o=a.Vt(s,!1),_=l.Oi(),u=a.Oi();if(1===i?_>u-o:_<u+o){const s=u-o*i;l.Ai(s);const r=s-i*o/2;if((1===i?r<0:r>n)&&h>0){const s=1===i?-1-r:r-n,l=Math.min(s,h);for(let n=e;n<t.length;n++)t[n].Ai(t[n].Oi()+i*l);h-=l;}}else e=r,h=1===i?u-o-_:_-(u+o);}}class ks{constructor(i,n,s,e){this.Li=null,this.Cv=null,this.Tv=!1,this.Pv=new ii(200),this.Jr=null,this.Rv=0,this.Dv=!1,this.Ov=()=>{this.Dv||this.tn.Av().$t().$h();},this.Bv=()=>{this.Dv||this.tn.Av().$t().$h();},this.tn=i,this.cn=n,this.So=n.layout,this.Oc=s,this.Vv="left"===e,this.Iv=xs("normal",e),this.zv=xs("top",e),this.Lv=xs("bottom",e),this.Ev=document.createElement("div"),this.Ev.style.height="100%",this.Ev.style.overflow="hidden",this.Ev.style.width="25px",this.Ev.style.left="0",this.Ev.style.position="relative",this.Nv=as(this.Ev,size({width:16,height:16})),this.Nv.subscribeSuggestedBitmapSizeChanged(this.Ov);const r=this.Nv.canvasElement;r.style.position="absolute",r.style.zIndex="1",r.style.left="0",r.style.top="0",this.Fv=as(this.Ev,size({width:16,height:16})),this.Fv.subscribeSuggestedBitmapSizeChanged(this.Bv);const h=this.Fv.canvasElement;h.style.position="absolute",h.style.zIndex="2",h.style.left="0",h.style.top="0";const l={hv:this.Wv.bind(this),ev:this.Wv.bind(this),Zf:this.jv.bind(this),Xf:this.jv.bind(this),lv:this.Hv.bind(this),tv:this.$v.bind(this),Jf:this.$v.bind(this),Vf:this.Uv.bind(this),Df:this.Uv.bind(this),Wf:this.qv.bind(this),pv:this.Yv.bind(this)};this.Xv=new fs(this.Fv.canvasElement,l,{qf:()=>!this.cn.handleScroll.vertTouchDrag,Yf:()=>!0});}S(){this.Xv.S(),this.Fv.unsubscribeSuggestedBitmapSizeChanged(this.Bv),os(this.Fv.canvasElement),this.Fv.dispose(),this.Nv.unsubscribeSuggestedBitmapSizeChanged(this.Ov),os(this.Nv.canvasElement),this.Nv.dispose(),null!==this.Li&&this.Li.Ko().p(this),this.Li=null;}Kv(){return this.Ev}P(){return this.So.fontSize}Zv(){const t=this.Oc.W();return this.Jr!==t.R&&(this.Pv.ir(),this.Jr=t.R),t}Gv(){if(null===this.Li)return 0;let t=0;const i=this.Zv(),n=b(this.Nv.canvasElement.getContext("2d"));n.save();const s=this.Li.ja();n.font=this.Jv(),s.length>0&&(t=Math.max(this.Pv.xi(n,s[0].no),this.Pv.xi(n,s[s.length-1].no)));const e=this.Qv();for(let i=e.length;i--;){const s=this.Pv.xi(n,e[i].Zt());s>t&&(t=s);}const r=this.Li.Ct();if(null!==r&&null!==this.Cv){const i=this.Li.pn(1,r),s=this.Li.pn(this.Cv.height-2,r);t=Math.max(t,this.Pv.xi(n,this.Li.Fi(Math.floor(Math.min(i,s))+.11111111111111,r)),this.Pv.xi(n,this.Li.Fi(Math.ceil(Math.max(i,s))-.11111111111111,r)));}n.restore();const h=t||34;return es(Math.ceil(i.C+i.T+i.V+i.I+5+h))}tp(t){null!==this.Cv&&equalSizes(this.Cv,t)||(this.Cv=t,this.Dv=!0,this.Nv.resizeCanvasElement(t),this.Fv.resizeCanvasElement(t),this.Dv=!1,this.Ev.style.width=`${t.width}px`,this.Ev.style.height=`${t.height}px`);}ip(){return b(this.Cv).width}Gi(t){this.Li!==t&&(null!==this.Li&&this.Li.Ko().p(this),this.Li=t,t.Ko().l(this.do.bind(this),this));}Dt(){return this.Li}ir(){const t=this.tn.np();this.tn.Av().$t().L_(t,b(this.Dt()));}sp(t){if(null===this.Cv)return;if(1!==t){this.ep(),this.Nv.applySuggestedBitmapSize();const t=tryCreateCanvasRenderingTarget2D(this.Nv);null!==t&&(t.useBitmapCoordinateSpace((t=>{this.rp(t),this.Ve(t);})),this.tn.hp(t,this.Lv),this.lp(t),this.tn.hp(t,this.Iv),this.ap(t));}this.Fv.applySuggestedBitmapSize();const i=tryCreateCanvasRenderingTarget2D(this.Fv);null!==i&&(i.useBitmapCoordinateSpace((({context:t,bitmapSize:i})=>{t.clearRect(0,0,i.width,i.height);})),this.op(i),this.tn.hp(i,this.zv));}_p(){return this.Nv.bitmapSize}up(t,i,n){const s=this._p();s.width>0&&s.height>0&&t.drawImage(this.Nv.canvasElement,i,n);}bt(){var t;null===(t=this.Li)||void 0===t||t.ja();}Wv(t){if(null===this.Li||this.Li.Ni()||!this.cn.handleScale.axisPressedMouseMove.price)return;const i=this.tn.Av().$t(),n=this.tn.np();this.Tv=!0,i.D_(n,this.Li,t.localY);}jv(t){if(null===this.Li||!this.cn.handleScale.axisPressedMouseMove.price)return;const i=this.tn.Av().$t(),n=this.tn.np(),s=this.Li;i.O_(n,s,t.localY);}Hv(){if(null===this.Li||!this.cn.handleScale.axisPressedMouseMove.price)return;const t=this.tn.Av().$t(),i=this.tn.np(),n=this.Li;this.Tv&&(this.Tv=!1,t.A_(i,n));}$v(t){if(null===this.Li||!this.cn.handleScale.axisPressedMouseMove.price)return;const i=this.tn.Av().$t(),n=this.tn.np();this.Tv=!1,i.A_(n,this.Li);}Uv(t){this.cn.handleScale.axisDoubleClickReset.price&&this.ir();}qv(t){if(null===this.Li)return;!this.tn.Av().$t().W().handleScale.axisPressedMouseMove.price||this.Li.gh()||this.Li.Oo()||this.cp(1);}Yv(t){this.cp(0);}Qv(){const t=[],i=null===this.Li?void 0:this.Li;return (n=>{for(let s=0;s<n.length;++s){const e=n[s].Rn(this.tn.np(),i);for(let i=0;i<e.length;i++)t.push(e[i]);}})(this.tn.np().$o()),t}rp({context:t,bitmapSize:i}){const{width:n,height:s}=i,e=this.tn.np().$t(),r=e.q(),h=e.md();r===h?Z(t,0,0,n,s,r):Q(t,0,0,n,s,r,h);}Ve({context:t,bitmapSize:i,horizontalPixelRatio:n}){if(null===this.Cv||null===this.Li||!this.Li.W().borderVisible)return;t.fillStyle=this.Li.W().borderColor;const s=Math.max(1,Math.floor(this.Zv().C*n));let e;e=this.Vv?i.width-s:0,t.fillRect(e,0,s,i.height);}lp(t){if(null===this.Cv||null===this.Li)return;const i=this.Li.ja(),n=this.Li.W(),s=this.Zv(),e=this.Vv?this.Cv.width-s.T:0;n.borderVisible&&n.ticksVisible&&t.useBitmapCoordinateSpace((({context:t,horizontalPixelRatio:r,verticalPixelRatio:h})=>{t.fillStyle=n.borderColor;const l=Math.max(1,Math.floor(h)),a=Math.floor(.5*h),o=Math.round(s.T*r);t.beginPath();for(const n of i)t.rect(Math.floor(e*r),Math.round(n.La*h)-a,o,l);t.fill();})),t.useMediaCoordinateSpace((({context:t})=>{var r;t.font=this.Jv(),t.fillStyle=null!==(r=n.textColor)&&void 0!==r?r:this.So.textColor,t.textAlign=this.Vv?"right":"left",t.textBaseline="middle";const h=this.Vv?Math.round(e-s.V):Math.round(e+s.T+s.V),l=i.map((i=>this.Pv.Mi(t,i.no)));for(let n=i.length;n--;){const s=i[n];t.fillText(s.no,h,s.La+l[n]);}}));}ep(){if(null===this.Cv||null===this.Li)return;let t=this.Cv.height/2;const i=[],n=this.Li.$o().slice(),s=this.tn.np(),e=this.Zv();this.Li===s.vr()&&this.tn.np().$o().forEach((t=>{s.dr(t)&&n.push(t);}));const r=this.Li.Aa()[0],h=this.Li;n.forEach((n=>{const e=n.Rn(s,h);e.forEach((t=>{t.Ai(null),t.Bi()&&i.push(t);})),r===n&&e.length>0&&(t=e[0].ki());})),i.forEach((t=>t.Ai(t.ki())));this.Li.W().alignLabels&&this.dp(i,e,t);}dp(t,i,n){if(null===this.Cv)return;const s=t.filter((t=>t.ki()<=n)),e=t.filter((t=>t.ki()>n));s.sort(((t,i)=>i.ki()-t.ki())),s.length&&e.length&&e.push(s[0]),e.sort(((t,i)=>t.ki()-i.ki()));for(const n of t){const t=Math.floor(n.Vt(i)/2),s=n.ki();s>-t&&s<t&&n.Ai(t),s>this.Cv.height-t&&s<this.Cv.height+t&&n.Ai(this.Cv.height-t);}Ss(s,1,this.Cv.height,i),Ss(e,-1,this.Cv.height,i);}ap(t){if(null===this.Cv)return;const i=this.Qv(),n=this.Zv(),s=this.Vv?"right":"left";i.forEach((i=>{if(i.Vi()){i.gt(b(this.Li)).K(t,n,this.Pv,s);}}));}op(t){if(null===this.Cv||null===this.Li)return;const i=this.tn.Av().$t(),n=[],s=this.tn.np(),e=i.Yc().Rn(s,this.Li);e.length&&n.push(e);const r=this.Zv(),h=this.Vv?"right":"left";n.forEach((i=>{i.forEach((i=>{i.gt(b(this.Li)).K(t,r,this.Pv,h);}));}));}cp(t){this.Ev.style.cursor=1===t?"ns-resize":"default";}do(){const t=this.Gv();this.Rv<t&&this.tn.Av().$t().Kl(),this.Rv=t;}Jv(){return N(this.So.fontSize,this.So.fontFamily)}}function ys(t,i){var n,s;return null!==(s=null===(n=t._a)||void 0===n?void 0:n.call(t,i))&&void 0!==s?s:[]}function Cs(t,i){var n,s;return null!==(s=null===(n=t.Pn)||void 0===n?void 0:n.call(t,i))&&void 0!==s?s:[]}function Ts(t,i){var n,s;return null!==(s=null===(n=t.Ji)||void 0===n?void 0:n.call(t,i))&&void 0!==s?s:[]}function Ps(t,i){var n,s;return null!==(s=null===(n=t.la)||void 0===n?void 0:n.call(t,i))&&void 0!==s?s:[]}class Rs{constructor(i,n){this.Cv=size({width:0,height:0}),this.fp=null,this.vp=null,this.pp=null,this.mp=!1,this.bp=new R,this.wp=new R,this.gp=0,this.Mp=!1,this.xp=null,this.Sp=!1,this.kp=null,this.yp=null,this.Dv=!1,this.Ov=()=>{this.Dv||null===this.Cp||this.$i().$h();},this.Bv=()=>{this.Dv||null===this.Cp||this.$i().$h();},this.Tp=i,this.Cp=n,this.Cp.F_().l(this.Pp.bind(this),this,!0),this.Rp=document.createElement("td"),this.Rp.style.padding="0",this.Rp.style.position="relative";const s=document.createElement("div");s.style.width="100%",s.style.height="100%",s.style.position="relative",s.style.overflow="hidden",this.Dp=document.createElement("td"),this.Dp.style.padding="0",this.Op=document.createElement("td"),this.Op.style.padding="0",this.Rp.appendChild(s),this.Nv=as(s,size({width:16,height:16})),this.Nv.subscribeSuggestedBitmapSizeChanged(this.Ov);const e=this.Nv.canvasElement;e.style.position="absolute",e.style.zIndex="1",e.style.left="0",e.style.top="0",this.Fv=as(s,size({width:16,height:16})),this.Fv.subscribeSuggestedBitmapSizeChanged(this.Bv);const r=this.Fv.canvasElement;r.style.position="absolute",r.style.zIndex="2",r.style.left="0",r.style.top="0",this.Ap=document.createElement("tr"),this.Ap.appendChild(this.Dp),this.Ap.appendChild(this.Rp),this.Ap.appendChild(this.Op),this.Bp(),this.Xv=new fs(this.Fv.canvasElement,this,{qf:()=>null===this.xp&&!this.Tp.W().handleScroll.vertTouchDrag,Yf:()=>null===this.xp&&!this.Tp.W().handleScroll.horzTouchDrag});}S(){null!==this.fp&&this.fp.S(),null!==this.vp&&this.vp.S(),this.Fv.unsubscribeSuggestedBitmapSizeChanged(this.Bv),os(this.Fv.canvasElement),this.Fv.dispose(),this.Nv.unsubscribeSuggestedBitmapSizeChanged(this.Ov),os(this.Nv.canvasElement),this.Nv.dispose(),null!==this.Cp&&this.Cp.F_().p(this),this.Xv.S();}np(){return b(this.Cp)}Vp(t){null!==this.Cp&&this.Cp.F_().p(this),this.Cp=t,null!==this.Cp&&this.Cp.F_().l(Rs.prototype.Pp.bind(this),this,!0),this.Bp();}Av(){return this.Tp}Kv(){return this.Ap}Bp(){if(null!==this.Cp&&(this.Ip(),0!==this.$i().wt().length)){if(null!==this.fp){const t=this.Cp.P_();this.fp.Gi(b(t));}if(null!==this.vp){const t=this.Cp.R_();this.vp.Gi(b(t));}}}zp(){null!==this.fp&&this.fp.bt(),null!==this.vp&&this.vp.bt();}g_(){return null!==this.Cp?this.Cp.g_():0}M_(t){this.Cp&&this.Cp.M_(t);}Wf(t){if(!this.Cp)return;this.Lp();const i=t.localX,n=t.localY;this.Ep(i,n,t);}hv(t){this.Lp(),this.Np(),this.Ep(t.localX,t.localY,t);}jf(t){var i;if(!this.Cp)return;this.Lp();const n=t.localX,s=t.localY;this.Ep(n,s,t);const e=this.br(n,s);this.Tp.Fp(null!==(i=null==e?void 0:e.yv)&&void 0!==i?i:null),this.$i().Wc(e&&{jc:e.jc,Sv:e.Sv});}iv(t){null!==this.Cp&&(this.Lp(),this.Wp(t));}Vf(t){null!==this.Cp&&this.jp(this.wp,t);}Df(t){this.Vf(t);}Zf(t){this.Lp(),this.Hp(t),this.Ep(t.localX,t.localY,t);}tv(t){null!==this.Cp&&(this.Lp(),this.Mp=!1,this.$p(t));}Qf(t){null!==this.Cp&&this.Wp(t);}mv(t){if(this.Mp=!0,null===this.xp){const i={x:t.localX,y:t.localY};this.Up(i,i,t);}}pv(t){null!==this.Cp&&(this.Lp(),this.Cp.$t().Wc(null),this.qp());}Yp(){return this.bp}Xp(){return this.wp}_v(){this.gp=1,this.$i().Un();}uv(t,i){if(!this.Tp.W().handleScale.pinch)return;const n=5*(i-this.gp);this.gp=i,this.$i().Jc(t.nt,n);}ev(t){this.Mp=!1,this.Sp=null!==this.xp,this.Np();const i=this.$i().Yc();null!==this.xp&&i.yt()&&(this.kp={x:i.Yt(),y:i.Xt()},this.xp={x:t.localX,y:t.localY});}Xf(t){if(null===this.Cp)return;const i=t.localX,n=t.localY;if(null===this.xp)this.Hp(t);else {this.Sp=!1;const s=b(this.kp),e=s.x+(i-this.xp.x),r=s.y+(n-this.xp.y);this.Ep(e,r,t);}}Jf(t){0===this.Av().W().trackingMode.exitMode&&(this.Sp=!0),this.Kp(),this.$p(t);}br(t,i){const n=this.Cp;return null===n?null:function(t,i,n){const s=t.$o(),e=function(t,i,n){var s,e;let r,h;for(const o of t){const t=null!==(e=null===(s=o.fa)||void 0===s?void 0:s.call(o,i,n))&&void 0!==e?e:[];for(const i of t)l=i.zOrder,(!(a=null==r?void 0:r.zOrder)||"top"===l&&"top"!==a||"normal"===l&&"bottom"===a)&&(r=i,h=o);}var l,a;return r&&h?{kv:r,jc:h}:null}(s,i,n);if("top"===(null==e?void 0:e.kv.zOrder))return gs(e);for(const r of s){if(e&&e.jc===r&&"bottom"!==e.kv.zOrder&&!e.kv.isBackground)return gs(e);const s=Ms(r.Pn(t),i,n);if(null!==s)return {jc:r,Mv:s.Mv,Sv:s.Sv};if(e&&e.jc===r&&"bottom"!==e.kv.zOrder&&e.kv.isBackground)return gs(e)}return (null==e?void 0:e.kv)?gs(e):null}(n,t,i)}Zp(i,n){b("left"===n?this.fp:this.vp).tp(size({width:i,height:this.Cv.height}));}Gp(){return this.Cv}tp(t){equalSizes(this.Cv,t)||(this.Cv=t,this.Dv=!0,this.Nv.resizeCanvasElement(t),this.Fv.resizeCanvasElement(t),this.Dv=!1,this.Rp.style.width=t.width+"px",this.Rp.style.height=t.height+"px");}Jp(){const t=b(this.Cp);t.T_(t.P_()),t.T_(t.R_());for(const i of t.Aa())if(t.dr(i)){const n=i.Dt();null!==n&&t.T_(n),i.On();}}_p(){return this.Nv.bitmapSize}up(t,i,n){const s=this._p();s.width>0&&s.height>0&&t.drawImage(this.Nv.canvasElement,i,n);}sp(t){if(0===t)return;if(null===this.Cp)return;if(t>1&&this.Jp(),null!==this.fp&&this.fp.sp(t),null!==this.vp&&this.vp.sp(t),1!==t){this.Nv.applySuggestedBitmapSize();const t=tryCreateCanvasRenderingTarget2D(this.Nv);null!==t&&(t.useBitmapCoordinateSpace((t=>{this.rp(t);})),this.Cp&&(this.Qp(t,ys),this.tm(t),this.im(t),this.Qp(t,Cs),this.Qp(t,Ts)));}this.Fv.applySuggestedBitmapSize();const i=tryCreateCanvasRenderingTarget2D(this.Fv);null!==i&&(i.useBitmapCoordinateSpace((({context:t,bitmapSize:i})=>{t.clearRect(0,0,i.width,i.height);})),this.nm(i),this.Qp(i,Ps));}sm(){return this.fp}rm(){return this.vp}hp(t,i){this.Qp(t,i);}Pp(){null!==this.Cp&&this.Cp.F_().p(this),this.Cp=null;}Wp(t){this.jp(this.bp,t);}jp(t,i){const n=i.localX,s=i.localY;t.M()&&t.m(this.$i().St().Eu(n),{x:n,y:s},i);}rp({context:t,bitmapSize:i}){const{width:n,height:s}=i,e=this.$i(),r=e.q(),h=e.md();r===h?Z(t,0,0,n,s,h):Q(t,0,0,n,s,r,h);}tm(t){const i=b(this.Cp).W_().Uh().gt();null!==i&&i.K(t,!1);}im(t){const i=this.$i().qc();this.hm(t,Cs,_s,i),this.hm(t,Cs,us,i);}nm(t){this.hm(t,Cs,us,this.$i().Yc());}Qp(t,i){const n=b(this.Cp).$o();for(const s of n)this.hm(t,i,_s,s);for(const s of n)this.hm(t,i,us,s);}hm(t,i,n,s){const e=b(this.Cp),r=e.$t().Fc(),h=null!==r&&r.jc===s,l=null!==r&&h&&void 0!==r.Sv?r.Sv.gr:void 0;cs(i,(i=>n(i,t,h,l)),s,e);}Ip(){if(null===this.Cp)return;const t=this.Tp,i=this.Cp.P_().W().visible,n=this.Cp.R_().W().visible;i||null===this.fp||(this.Dp.removeChild(this.fp.Kv()),this.fp.S(),this.fp=null),n||null===this.vp||(this.Op.removeChild(this.vp.Kv()),this.vp.S(),this.vp=null);const s=t.$t()._d();i&&null===this.fp&&(this.fp=new ks(this,t.W(),s,"left"),this.Dp.appendChild(this.fp.Kv())),n&&null===this.vp&&(this.vp=new ks(this,t.W(),s,"right"),this.Op.appendChild(this.vp.Kv()));}lm(t){return t.bv&&this.Mp||null!==this.xp}am(t){return Math.max(0,Math.min(t,this.Cv.width-1))}om(t){return Math.max(0,Math.min(t,this.Cv.height-1))}Ep(t,i,n){this.$i().hd(this.am(t),this.om(i),n,b(this.Cp));}qp(){this.$i().ad();}Kp(){this.Sp&&(this.xp=null,this.qp());}Up(t,i,n){this.xp=t,this.Sp=!1,this.Ep(i.x,i.y,n);const s=this.$i().Yc();this.kp={x:s.Yt(),y:s.Xt()};}$i(){return this.Tp.$t()}$p(t){if(!this.mp)return;const i=this.$i(),n=this.np();if(i.I_(n,n.vn()),this.pp=null,this.mp=!1,i.sd(),null!==this.yp){const t=performance.now(),n=i.St();this.yp.Dr(n.ju(),t),this.yp.Ju(t)||i.Xn(this.yp);}}Lp(){this.xp=null;}Np(){if(!this.Cp)return;if(this.$i().Un(),document.activeElement!==document.body&&document.activeElement!==document.documentElement)b(document.activeElement).blur();else {const t=document.getSelection();null!==t&&t.removeAllRanges();}!this.Cp.vn().Ni()&&this.$i().St().Ni();}Hp(t){if(null===this.Cp)return;const i=this.$i(),n=i.St();if(n.Ni())return;const s=this.Tp.W(),e=s.handleScroll,r=s.kineticScroll;if((!e.pressedMouseMove||t.bv)&&(!e.horzTouchDrag&&!e.vertTouchDrag||!t.bv))return;const h=this.Cp.vn(),l=performance.now();if(null!==this.pp||this.lm(t)||(this.pp={x:t.clientX,y:t.clientY,Od:l,_m:t.localX,um:t.localY}),null!==this.pp&&!this.mp&&(this.pp.x!==t.clientX||this.pp.y!==t.clientY)){if(t.bv&&r.touch||!t.bv&&r.mouse){const t=n.he();this.yp=new ls(.2/t,7/t,.997,15/t),this.yp.qd(n.ju(),this.pp.Od);}else this.yp=null;h.Ni()||i.B_(this.Cp,h,t.localY),i.td(t.localX),this.mp=!0;}this.mp&&(h.Ni()||i.V_(this.Cp,h,t.localY),i.nd(t.localX),null!==this.yp&&this.yp.qd(n.ju(),l));}}class Ds{constructor(i,n,s,e,r){this.ft=!0,this.Cv=size({width:0,height:0}),this.Ov=()=>this.sp(3),this.Vv="left"===i,this.Oc=s._d,this.cn=n,this.dm=e,this.fm=r,this.Ev=document.createElement("div"),this.Ev.style.width="25px",this.Ev.style.height="100%",this.Ev.style.overflow="hidden",this.Nv=as(this.Ev,size({width:16,height:16})),this.Nv.subscribeSuggestedBitmapSizeChanged(this.Ov);}S(){this.Nv.unsubscribeSuggestedBitmapSizeChanged(this.Ov),os(this.Nv.canvasElement),this.Nv.dispose();}Kv(){return this.Ev}Gp(){return this.Cv}tp(t){equalSizes(this.Cv,t)||(this.Cv=t,this.Nv.resizeCanvasElement(t),this.Ev.style.width=`${t.width}px`,this.Ev.style.height=`${t.height}px`,this.ft=!0);}sp(t){if(t<3&&!this.ft)return;if(0===this.Cv.width||0===this.Cv.height)return;this.ft=!1,this.Nv.applySuggestedBitmapSize();const i=tryCreateCanvasRenderingTarget2D(this.Nv);null!==i&&i.useBitmapCoordinateSpace((t=>{this.rp(t),this.Ve(t);}));}_p(){return this.Nv.bitmapSize}up(t,i,n){const s=this._p();s.width>0&&s.height>0&&t.drawImage(this.Nv.canvasElement,i,n);}Ve({context:t,bitmapSize:i,horizontalPixelRatio:n,verticalPixelRatio:s}){if(!this.dm())return;t.fillStyle=this.cn.timeScale.borderColor;const e=Math.floor(this.Oc.W().C*n),r=Math.floor(this.Oc.W().C*s),h=this.Vv?i.width-e:0;t.fillRect(h,0,e,r);}rp({context:t,bitmapSize:i}){Z(t,0,0,i.width,i.height,this.fm());}}function Os(t){return i=>{var n,s;return null!==(s=null===(n=i.da)||void 0===n?void 0:n.call(i,t))&&void 0!==s?s:[]}}const As=Os("normal"),Bs=Os("top"),Vs=Os("bottom");class Is{constructor(i,n){this.vm=null,this.pm=null,this.k=null,this.bm=!1,this.Cv=size({width:0,height:0}),this.wm=new R,this.Pv=new ii(5),this.Dv=!1,this.Ov=()=>{this.Dv||this.Tp.$t().$h();},this.Bv=()=>{this.Dv||this.Tp.$t().$h();},this.Tp=i,this.U_=n,this.cn=i.W().layout,this.gm=document.createElement("tr"),this.Mm=document.createElement("td"),this.Mm.style.padding="0",this.xm=document.createElement("td"),this.xm.style.padding="0",this.Ev=document.createElement("td"),this.Ev.style.height="25px",this.Ev.style.padding="0",this.Sm=document.createElement("div"),this.Sm.style.width="100%",this.Sm.style.height="100%",this.Sm.style.position="relative",this.Sm.style.overflow="hidden",this.Ev.appendChild(this.Sm),this.Nv=as(this.Sm,size({width:16,height:16})),this.Nv.subscribeSuggestedBitmapSizeChanged(this.Ov);const s=this.Nv.canvasElement;s.style.position="absolute",s.style.zIndex="1",s.style.left="0",s.style.top="0",this.Fv=as(this.Sm,size({width:16,height:16})),this.Fv.subscribeSuggestedBitmapSizeChanged(this.Bv);const e=this.Fv.canvasElement;e.style.position="absolute",e.style.zIndex="2",e.style.left="0",e.style.top="0",this.gm.appendChild(this.Mm),this.gm.appendChild(this.Ev),this.gm.appendChild(this.xm),this.km(),this.Tp.$t().w_().l(this.km.bind(this),this),this.Xv=new fs(this.Fv.canvasElement,this,{qf:()=>!0,Yf:()=>!this.Tp.W().handleScroll.horzTouchDrag});}S(){this.Xv.S(),null!==this.vm&&this.vm.S(),null!==this.pm&&this.pm.S(),this.Fv.unsubscribeSuggestedBitmapSizeChanged(this.Bv),os(this.Fv.canvasElement),this.Fv.dispose(),this.Nv.unsubscribeSuggestedBitmapSizeChanged(this.Ov),os(this.Nv.canvasElement),this.Nv.dispose();}Kv(){return this.gm}ym(){return this.vm}Cm(){return this.pm}hv(t){if(this.bm)return;this.bm=!0;const i=this.Tp.$t();!i.St().Ni()&&this.Tp.W().handleScale.axisPressedMouseMove.time&&i.Gc(t.localX);}ev(t){this.hv(t);}lv(){const t=this.Tp.$t();!t.St().Ni()&&this.bm&&(this.bm=!1,this.Tp.W().handleScale.axisPressedMouseMove.time&&t.rd());}Zf(t){const i=this.Tp.$t();!i.St().Ni()&&this.Tp.W().handleScale.axisPressedMouseMove.time&&i.ed(t.localX);}Xf(t){this.Zf(t);}tv(){this.bm=!1;const t=this.Tp.$t();t.St().Ni()&&!this.Tp.W().handleScale.axisPressedMouseMove.time||t.rd();}Jf(){this.tv();}Vf(){this.Tp.W().handleScale.axisDoubleClickReset.time&&this.Tp.$t().Zn();}Df(){this.Vf();}Wf(){this.Tp.$t().W().handleScale.axisPressedMouseMove.time&&this.cp(1);}pv(){this.cp(0);}Gp(){return this.Cv}Tm(){return this.wm}Pm(i,s,e){equalSizes(this.Cv,i)||(this.Cv=i,this.Dv=!0,this.Nv.resizeCanvasElement(i),this.Fv.resizeCanvasElement(i),this.Dv=!1,this.Ev.style.width=`${i.width}px`,this.Ev.style.height=`${i.height}px`,this.wm.m(i)),null!==this.vm&&this.vm.tp(size({width:s,height:i.height})),null!==this.pm&&this.pm.tp(size({width:e,height:i.height}));}Rm(){const t=this.Dm();return Math.ceil(t.C+t.T+t.P+t.L+t.B+t.Om)}bt(){this.Tp.$t().St().ja();}_p(){return this.Nv.bitmapSize}up(t,i,n){const s=this._p();s.width>0&&s.height>0&&t.drawImage(this.Nv.canvasElement,i,n);}sp(t){if(0===t)return;if(1!==t){this.Nv.applySuggestedBitmapSize();const i=tryCreateCanvasRenderingTarget2D(this.Nv);null!==i&&(i.useBitmapCoordinateSpace((t=>{this.rp(t),this.Ve(t),this.Am(i,Vs);})),this.lp(i),this.Am(i,As)),null!==this.vm&&this.vm.sp(t),null!==this.pm&&this.pm.sp(t);}this.Fv.applySuggestedBitmapSize();const i=tryCreateCanvasRenderingTarget2D(this.Fv);null!==i&&(i.useBitmapCoordinateSpace((({context:t,bitmapSize:i})=>{t.clearRect(0,0,i.width,i.height);})),this.Bm([...this.Tp.$t().wt(),this.Tp.$t().Yc()],i),this.Am(i,Bs));}Am(t,i){const n=this.Tp.$t().wt();for(const s of n)cs(i,(i=>_s(i,t,!1,void 0)),s,void 0);for(const s of n)cs(i,(i=>us(i,t,!1,void 0)),s,void 0);}rp({context:t,bitmapSize:i}){Z(t,0,0,i.width,i.height,this.Tp.$t().md());}Ve({context:t,bitmapSize:i,verticalPixelRatio:n}){if(this.Tp.W().timeScale.borderVisible){t.fillStyle=this.Vm();const s=Math.max(1,Math.floor(this.Dm().C*n));t.fillRect(0,0,i.width,s);}}lp(t){const i=this.Tp.$t().St(),n=i.ja();if(!n||0===n.length)return;const s=this.U_.maxTickMarkWeight(n),e=this.Dm(),r=i.W();r.borderVisible&&r.ticksVisible&&t.useBitmapCoordinateSpace((({context:t,horizontalPixelRatio:i,verticalPixelRatio:s})=>{t.strokeStyle=this.Vm(),t.fillStyle=this.Vm();const r=Math.max(1,Math.floor(i)),h=Math.floor(.5*i);t.beginPath();const l=Math.round(e.T*s);for(let s=n.length;s--;){const e=Math.round(n[s].coord*i);t.rect(e-h,0,r,l);}t.fill();})),t.useMediaCoordinateSpace((({context:t})=>{const i=e.C+e.T+e.L+e.P/2;t.textAlign="center",t.textBaseline="middle",t.fillStyle=this.$(),t.font=this.Jv();for(const e of n)if(e.weight<s){const n=e.needAlignCoordinate?this.Im(t,e.coord,e.label):e.coord;t.fillText(e.label,n,i);}this.Tp.W().timeScale.allowBoldLabels&&(t.font=this.zm());for(const e of n)if(e.weight>=s){const n=e.needAlignCoordinate?this.Im(t,e.coord,e.label):e.coord;t.fillText(e.label,n,i);}}));}Im(t,i,n){const s=this.Pv.xi(t,n),e=s/2,r=Math.floor(i-e)+.5;return r<0?i+=Math.abs(0-r):r+s>this.Cv.width&&(i-=Math.abs(this.Cv.width-(r+s))),i}Bm(t,i){const n=this.Dm();for(const s of t)for(const t of s.Qi())t.gt().K(i,n);}Vm(){return this.Tp.W().timeScale.borderColor}$(){return this.cn.textColor}j(){return this.cn.fontSize}Jv(){return N(this.j(),this.cn.fontFamily)}zm(){return N(this.j(),this.cn.fontFamily,"bold")}Dm(){null===this.k&&(this.k={C:1,N:NaN,L:NaN,B:NaN,ji:NaN,T:5,P:NaN,R:"",Wi:new ii,Om:0});const t=this.k,i=this.Jv();if(t.R!==i){const n=this.j();t.P=n,t.R=i,t.L=3*n/12,t.B=3*n/12,t.ji=9*n/12,t.N=0,t.Om=4*n/12,t.Wi.ir();}return this.k}cp(t){this.Ev.style.cursor=1===t?"ew-resize":"default";}km(){const t=this.Tp.$t(),i=t.W();i.leftPriceScale.visible||null===this.vm||(this.Mm.removeChild(this.vm.Kv()),this.vm.S(),this.vm=null),i.rightPriceScale.visible||null===this.pm||(this.xm.removeChild(this.pm.Kv()),this.pm.S(),this.pm=null);const n={_d:this.Tp.$t()._d()},s=()=>i.leftPriceScale.borderVisible&&t.St().W().borderVisible,e=()=>t.md();i.leftPriceScale.visible&&null===this.vm&&(this.vm=new Ds("left",i,n,s,e),this.Mm.appendChild(this.vm.Kv())),i.rightPriceScale.visible&&null===this.pm&&(this.pm=new Ds("right",i,n,s,e),this.xm.appendChild(this.pm.Kv()));}}const zs=!!is&&!!navigator.userAgentData&&navigator.userAgentData.brands.some((t=>t.brand.includes("Chromium")))&&!!is&&((null===(Ls=null===navigator||void 0===navigator?void 0:navigator.userAgentData)||void 0===Ls?void 0:Ls.platform)?"Windows"===navigator.userAgentData.platform:navigator.userAgent.toLowerCase().indexOf("win")>=0);var Ls;class Es{constructor(t,i,n){var s;this.Lm=[],this.Em=0,this.ro=0,this.o_=0,this.Nm=0,this.Fm=0,this.Wm=null,this.jm=!1,this.bp=new R,this.wp=new R,this.Pc=new R,this.Hm=null,this.$m=null,this.Um=t,this.cn=i,this.U_=n,this.gm=document.createElement("div"),this.gm.classList.add("tv-lightweight-charts"),this.gm.style.overflow="hidden",this.gm.style.direction="ltr",this.gm.style.width="100%",this.gm.style.height="100%",(s=this.gm).style.userSelect="none",s.style.webkitUserSelect="none",s.style.msUserSelect="none",s.style.MozUserSelect="none",s.style.webkitTapHighlightColor="transparent",this.qm=document.createElement("table"),this.qm.setAttribute("cellspacing","0"),this.gm.appendChild(this.qm),this.Ym=this.Xm.bind(this),Ns(this.cn)&&this.Km(!0),this.$i=new zn(this.Dc.bind(this),this.cn,n),this.$t().Xc().l(this.Zm.bind(this),this),this.Gm=new Is(this,this.U_),this.qm.appendChild(this.Gm.Kv());const e=i.autoSize&&this.Jm();let r=this.cn.width,h=this.cn.height;if(e||0===r||0===h){const i=t.getBoundingClientRect();r=r||i.width,h=h||i.height;}this.Qm(r,h),this.tb(),t.appendChild(this.gm),this.ib(),this.$i.St().sc().l(this.$i.Kl.bind(this.$i),this),this.$i.w_().l(this.$i.Kl.bind(this.$i),this);}$t(){return this.$i}W(){return this.cn}nb(){return this.Lm}sb(){return this.Gm}S(){this.Km(!1),0!==this.Em&&window.cancelAnimationFrame(this.Em),this.$i.Xc().p(this),this.$i.St().sc().p(this),this.$i.w_().p(this),this.$i.S();for(const t of this.Lm)this.qm.removeChild(t.Kv()),t.Yp().p(this),t.Xp().p(this),t.S();this.Lm=[],b(this.Gm).S(),null!==this.gm.parentElement&&this.gm.parentElement.removeChild(this.gm),this.Pc.S(),this.bp.S(),this.wp.S(),this.eb();}Qm(i,n,s=!1){if(this.ro===n&&this.o_===i)return;const e=function(i){const n=Math.floor(i.width),s=Math.floor(i.height);return size({width:n-n%2,height:s-s%2})}(size({width:i,height:n}));this.ro=e.height,this.o_=e.width;const r=this.ro+"px",h=this.o_+"px";b(this.gm).style.height=r,b(this.gm).style.width=h,this.qm.style.height=r,this.qm.style.width=h,s?this.rb(_t.es(),performance.now()):this.$i.Kl();}sp(t){void 0===t&&(t=_t.es());for(let i=0;i<this.Lm.length;i++)this.Lm[i].sp(t.Hn(i).Fn);this.cn.timeScale.visible&&this.Gm.sp(t.jn());}Hh(t){const i=Ns(this.cn);this.$i.Hh(t);const n=Ns(this.cn);n!==i&&this.Km(n),this.ib(),this.hb(t);}Yp(){return this.bp}Xp(){return this.wp}Xc(){return this.Pc}lb(){null!==this.Wm&&(this.rb(this.Wm,performance.now()),this.Wm=null);const t=this.ab(null),i=document.createElement("canvas");i.width=t.width,i.height=t.height;const n=b(i.getContext("2d"));return this.ab(n),i}ob(t){if("left"===t&&!this._b())return 0;if("right"===t&&!this.ub())return 0;if(0===this.Lm.length)return 0;return b("left"===t?this.Lm[0].sm():this.Lm[0].rm()).ip()}cb(){return this.cn.autoSize&&null!==this.Hm}fb(){return this.gm}Fp(t){this.$m=t,this.$m?this.fb().style.setProperty("cursor",t):this.fb().style.removeProperty("cursor");}pb(){return this.$m}mb(){return m(this.Lm[0]).Gp()}hb(t){(void 0!==t.autoSize||!this.Hm||void 0===t.width&&void 0===t.height)&&(t.autoSize&&!this.Hm&&this.Jm(),!1===t.autoSize&&null!==this.Hm&&this.eb(),t.autoSize||void 0===t.width&&void 0===t.height||this.Qm(t.width||this.o_,t.height||this.ro));}ab(i){let n=0,s=0;const e=this.Lm[0],r=(t,n)=>{let s=0;for(let e=0;e<this.Lm.length;e++){const r=this.Lm[e],h=b("left"===t?r.sm():r.rm()),l=h._p();null!==i&&h.up(i,n,s),s+=l.height;}};if(this._b()){r("left",0);n+=b(e.sm())._p().width;}for(let t=0;t<this.Lm.length;t++){const e=this.Lm[t],r=e._p();null!==i&&e.up(i,n,s),s+=r.height;}if(n+=e._p().width,this.ub()){r("right",n);n+=b(e.rm())._p().width;}const h=(t,n,s)=>{b("left"===t?this.Gm.ym():this.Gm.Cm()).up(b(i),n,s);};if(this.cn.timeScale.visible){const t=this.Gm._p();if(null!==i){let n=0;this._b()&&(h("left",n,s),n=b(e.sm())._p().width),this.Gm.up(i,n,s),n+=t.width,this.ub()&&h("right",n,s);}s+=t.height;}return size({width:n,height:s})}bb(){let i=0,n=0,s=0;for(const t of this.Lm)this._b()&&(n=Math.max(n,b(t.sm()).Gv(),this.cn.leftPriceScale.minimumWidth)),this.ub()&&(s=Math.max(s,b(t.rm()).Gv(),this.cn.rightPriceScale.minimumWidth)),i+=t.g_();n=es(n),s=es(s);const e=this.o_,r=this.ro,h=Math.max(e-n-s,0),l=this.cn.timeScale.visible;let a=l?Math.max(this.Gm.Rm(),this.cn.timeScale.minimumHeight):0;var o;a=(o=a)+o%2;const _=0+a,u=r<_?0:r-_,c=u/i;let d=0;for(let i=0;i<this.Lm.length;++i){const e=this.Lm[i];e.Vp(this.$i.Uc()[i]);let r=0,l=0;l=i===this.Lm.length-1?u-d:Math.round(e.g_()*c),r=Math.max(l,2),d+=r,e.tp(size({width:h,height:r})),this._b()&&e.Zp(n,"left"),this.ub()&&e.Zp(s,"right"),e.np()&&this.$i.Kc(e.np(),r);}this.Gm.Pm(size({width:l?h:0,height:a}),l?n:0,l?s:0),this.$i.x_(h),this.Nm!==n&&(this.Nm=n),this.Fm!==s&&(this.Fm=s);}Km(t){t?this.gm.addEventListener("wheel",this.Ym,{passive:!1}):this.gm.removeEventListener("wheel",this.Ym);}wb(t){switch(t.deltaMode){case t.DOM_DELTA_PAGE:return 120;case t.DOM_DELTA_LINE:return 32}return zs?1/window.devicePixelRatio:1}Xm(t){if(!(0!==t.deltaX&&this.cn.handleScroll.mouseWheel||0!==t.deltaY&&this.cn.handleScale.mouseWheel))return;const i=this.wb(t),n=i*t.deltaX/100,s=-i*t.deltaY/100;if(t.cancelable&&t.preventDefault(),0!==s&&this.cn.handleScale.mouseWheel){const i=Math.sign(s)*Math.min(1,Math.abs(s)),n=t.clientX-this.gm.getBoundingClientRect().left;this.$t().Jc(n,i);}0!==n&&this.cn.handleScroll.mouseWheel&&this.$t().Qc(-80*n);}rb(t,i){var n;const s=t.jn();3===s&&this.gb(),3!==s&&2!==s||(this.Mb(t),this.xb(t,i),this.Gm.bt(),this.Lm.forEach((t=>{t.zp();})),3===(null===(n=this.Wm)||void 0===n?void 0:n.jn())&&(this.Wm.ts(t),this.gb(),this.Mb(this.Wm),this.xb(this.Wm,i),t=this.Wm,this.Wm=null)),this.sp(t);}xb(t,i){for(const n of t.Qn())this.ns(n,i);}Mb(t){const i=this.$i.Uc();for(let n=0;n<i.length;n++)t.Hn(n).Wn&&i[n].E_();}ns(t,i){const n=this.$i.St();switch(t.qn){case 0:n.rc();break;case 1:n.hc(t.Ot);break;case 2:n.Gn(t.Ot);break;case 3:n.Jn(t.Ot);break;case 4:n.Uu();break;case 5:t.Ot.Ju(i)||n.Jn(t.Ot.Qu(i));}}Dc(t){null!==this.Wm?this.Wm.ts(t):this.Wm=t,this.jm||(this.jm=!0,this.Em=window.requestAnimationFrame((t=>{if(this.jm=!1,this.Em=0,null!==this.Wm){const i=this.Wm;this.Wm=null,this.rb(i,t);for(const n of i.Qn())if(5===n.qn&&!n.Ot.Ju(t)){this.$t().Xn(n.Ot);break}}})));}gb(){this.tb();}tb(){const t=this.$i.Uc(),i=t.length,n=this.Lm.length;for(let t=i;t<n;t++){const t=m(this.Lm.pop());this.qm.removeChild(t.Kv()),t.Yp().p(this),t.Xp().p(this),t.S();}for(let s=n;s<i;s++){const i=new Rs(this,t[s]);i.Yp().l(this.Sb.bind(this),this),i.Xp().l(this.kb.bind(this),this),this.Lm.push(i),this.qm.insertBefore(i.Kv(),this.Gm.Kv());}for(let n=0;n<i;n++){const i=t[n],s=this.Lm[n];s.np()!==i?s.Vp(i):s.Bp();}this.ib(),this.bb();}yb(t,i,n){var s;const e=new Map;if(null!==t){this.$i.wt().forEach((i=>{const n=i.In().hl(t);null!==n&&e.set(i,n);}));}let r;if(null!==t){const i=null===(s=this.$i.St().Ui(t))||void 0===s?void 0:s.originalTime;void 0!==i&&(r=i);}const h=this.$t().Fc(),l=null!==h&&h.jc instanceof Zi?h.jc:void 0,a=null!==h&&void 0!==h.Sv?h.Sv.wr:void 0;return {Cb:r,se:null!=t?t:void 0,Tb:null!=i?i:void 0,Pb:l,Rb:e,Db:a,Ob:null!=n?n:void 0}}Sb(t,i,n){this.bp.m((()=>this.yb(t,i,n)));}kb(t,i,n){this.wp.m((()=>this.yb(t,i,n)));}Zm(t,i,n){this.Pc.m((()=>this.yb(t,i,n)));}ib(){const t=this.cn.timeScale.visible?"":"none";this.Gm.Kv().style.display=t;}_b(){return this.Lm[0].np().P_().W().visible}ub(){return this.Lm[0].np().R_().W().visible}Jm(){return "ResizeObserver"in window&&(this.Hm=new ResizeObserver((t=>{const i=t.find((t=>t.target===this.Um));i&&this.Qm(i.contentRect.width,i.contentRect.height);})),this.Hm.observe(this.Um,{box:"border-box"}),!0)}eb(){null!==this.Hm&&this.Hm.disconnect(),this.Hm=null;}}function Ns(t){return Boolean(t.handleScroll.mouseWheel||t.handleScale.mouseWheel)}function Fs(t,i){var n={};for(var s in t)Object.prototype.hasOwnProperty.call(t,s)&&i.indexOf(s)<0&&(n[s]=t[s]);if(null!=t&&"function"==typeof Object.getOwnPropertySymbols){var e=0;for(s=Object.getOwnPropertySymbols(t);e<s.length;e++)i.indexOf(s[e])<0&&Object.prototype.propertyIsEnumerable.call(t,s[e])&&(n[s[e]]=t[s[e]]);}return n}function Ws(t,i,n,s){const e=n.value,r={se:i,ot:t,Ot:[e,e,e,e],Cb:s};return void 0!==n.color&&(r.O=n.color),r}function js(t,i,n,s){const e=n.value,r={se:i,ot:t,Ot:[e,e,e,e],Cb:s};return void 0!==n.lineColor&&(r.lt=n.lineColor),void 0!==n.topColor&&(r.Ts=n.topColor),void 0!==n.bottomColor&&(r.Ps=n.bottomColor),r}function Hs(t,i,n,s){const e=n.value,r={se:i,ot:t,Ot:[e,e,e,e],Cb:s};return void 0!==n.topLineColor&&(r.Pe=n.topLineColor),void 0!==n.bottomLineColor&&(r.Re=n.bottomLineColor),void 0!==n.topFillColor1&&(r.Se=n.topFillColor1),void 0!==n.topFillColor2&&(r.ke=n.topFillColor2),void 0!==n.bottomFillColor1&&(r.ye=n.bottomFillColor1),void 0!==n.bottomFillColor2&&(r.Ce=n.bottomFillColor2),r}function $s(t,i,n,s){const e={se:i,ot:t,Ot:[n.open,n.high,n.low,n.close],Cb:s};return void 0!==n.color&&(e.O=n.color),e}function Us(t,i,n,s){const e={se:i,ot:t,Ot:[n.open,n.high,n.low,n.close],Cb:s};return void 0!==n.color&&(e.O=n.color),void 0!==n.borderColor&&(e.At=n.borderColor),void 0!==n.wickColor&&(e.Xh=n.wickColor),e}function qs(t,i,n,s,e){const r=m(e)(n),h=Math.max(...r),l=Math.min(...r),a=r[r.length-1],o=[a,h,l,a],_=n,{time:u,color:c}=_;return {se:i,ot:t,Ot:o,Cb:s,He:Fs(_,["time","color"]),O:c}}function Ys(t){return void 0!==t.Ot}function Xs(t,i){return void 0!==i.customValues&&(t.Ab=i.customValues),t}function Ks(t){return (i,n,s,e,r,h)=>function(t,i){return i?i(t):void 0===(n=t).open&&void 0===n.value;var n;}(s,h)?Xs({ot:i,se:n,Cb:e},s):Xs(t(i,n,s,e,r),s)}function Zs(t){return {Candlestick:Ks(Us),Bar:Ks($s),Area:Ks(js),Baseline:Ks(Hs),Histogram:Ks(Ws),Line:Ks(Ws),Custom:Ks(qs)}[t]}function Gs(t){return {se:0,Bb:new Map,ha:t}}function Js(t,i){if(void 0!==t&&0!==t.length)return {Vb:i.key(t[0].ot),Ib:i.key(t[t.length-1].ot)}}function Qs(t){let i;return t.forEach((t=>{void 0===i&&(i=t.Cb);})),m(i)}class te{constructor(t){this.zb=new Map,this.Lb=new Map,this.Eb=new Map,this.Nb=[],this.U_=t;}S(){this.zb.clear(),this.Lb.clear(),this.Eb.clear(),this.Nb=[];}Fb(t,i){let n=0!==this.zb.size,s=!1;const e=this.Lb.get(t);if(void 0!==e)if(1===this.Lb.size)n=!1,s=!0,this.zb.clear();else for(const i of this.Nb)i.pointData.Bb.delete(t)&&(s=!0);let r=[];if(0!==i.length){const n=i.map((t=>t.time)),e=this.U_.createConverterToInternalObj(i),h=Zs(t.Jh()),l=t.ya(),a=t.Ca();r=i.map(((i,r)=>{const o=e(i.time),_=this.U_.key(o);let u=this.zb.get(_);void 0===u&&(u=Gs(o),this.zb.set(_,u),s=!0);const c=h(o,u.se,i,n[r],l,a);return u.Bb.set(t,c),c}));}n&&this.Wb(),this.jb(t,r);let h=-1;if(s){const t=[];this.zb.forEach((i=>{t.push({timeWeight:0,time:i.ha,pointData:i,originalTime:Qs(i.Bb)});})),t.sort(((t,i)=>this.U_.key(t.time)-this.U_.key(i.time))),h=this.Hb(t);}return this.$b(t,h,function(t,i,n){const s=Js(t,n),e=Js(i,n);if(void 0!==s&&void 0!==e)return {Ql:s.Ib>=e.Ib&&s.Vb>=e.Vb}}(this.Lb.get(t),e,this.U_))}fd(t){return this.Fb(t,[])}Ub(t,i){const n=i;!function(t){void 0===t.Cb&&(t.Cb=t.time);}(n),this.U_.preprocessData(i);const s=this.U_.createConverterToInternalObj([i])(i.time),e=this.Eb.get(t);if(void 0!==e&&this.U_.key(s)<this.U_.key(e))throw new Error(`Cannot update oldest data, last time=${e}, new time=${s}`);let r=this.zb.get(this.U_.key(s));const h=void 0===r;void 0===r&&(r=Gs(s),this.zb.set(this.U_.key(s),r));const l=Zs(t.Jh()),a=t.ya(),o=t.Ca(),_=l(s,r.se,i,n.Cb,a,o);r.Bb.set(t,_),this.qb(t,_);const u={Ql:Ys(_)};if(!h)return this.$b(t,-1,u);const c={timeWeight:0,time:r.ha,pointData:r,originalTime:Qs(r.Bb)},d=At(this.Nb,this.U_.key(c.time),((t,i)=>this.U_.key(t.time)<i));this.Nb.splice(d,0,c);for(let t=d;t<this.Nb.length;++t)ie(this.Nb[t].pointData,t);return this.U_.fillWeightsForPoints(this.Nb,d),this.$b(t,d,u)}qb(t,i){let n=this.Lb.get(t);void 0===n&&(n=[],this.Lb.set(t,n));const s=0!==n.length?n[n.length-1]:null;null===s||this.U_.key(i.ot)>this.U_.key(s.ot)?Ys(i)&&n.push(i):Ys(i)?n[n.length-1]=i:n.splice(-1,1),this.Eb.set(t,i.ot);}jb(t,i){0!==i.length?(this.Lb.set(t,i.filter(Ys)),this.Eb.set(t,i[i.length-1].ot)):(this.Lb.delete(t),this.Eb.delete(t));}Wb(){for(const t of this.Nb)0===t.pointData.Bb.size&&this.zb.delete(this.U_.key(t.time));}Hb(t){let i=-1;for(let n=0;n<this.Nb.length&&n<t.length;++n){const s=this.Nb[n],e=t[n];if(this.U_.key(s.time)!==this.U_.key(e.time)){i=n;break}e.timeWeight=s.timeWeight,ie(e.pointData,n);}if(-1===i&&this.Nb.length!==t.length&&(i=Math.min(this.Nb.length,t.length)),-1===i)return -1;for(let n=i;n<t.length;++n)ie(t[n].pointData,n);return this.U_.fillWeightsForPoints(t,i),this.Nb=t,i}Yb(){if(0===this.Lb.size)return null;let t=0;return this.Lb.forEach((i=>{0!==i.length&&(t=Math.max(t,i[i.length-1].se));})),t}$b(t,i,n){const s={Xb:new Map,St:{Lu:this.Yb()}};if(-1!==i)this.Lb.forEach(((i,e)=>{s.Xb.set(e,{He:i,Kb:e===t?n:void 0});})),this.Lb.has(t)||s.Xb.set(t,{He:[],Kb:n}),s.St.Zb=this.Nb,s.St.Gb=i;else {const i=this.Lb.get(t);s.Xb.set(t,{He:i||[],Kb:n});}return s}}function ie(t,i){t.se=i,t.Bb.forEach((t=>{t.se=i;}));}function ne(t){const i={value:t.Ot[3],time:t.Cb};return void 0!==t.Ab&&(i.customValues=t.Ab),i}function se(t){const i=ne(t);return void 0!==t.O&&(i.color=t.O),i}function ee(t){const i=ne(t);return void 0!==t.lt&&(i.lineColor=t.lt),void 0!==t.Ts&&(i.topColor=t.Ts),void 0!==t.Ps&&(i.bottomColor=t.Ps),i}function re(t){const i=ne(t);return void 0!==t.Pe&&(i.topLineColor=t.Pe),void 0!==t.Re&&(i.bottomLineColor=t.Re),void 0!==t.Se&&(i.topFillColor1=t.Se),void 0!==t.ke&&(i.topFillColor2=t.ke),void 0!==t.ye&&(i.bottomFillColor1=t.ye),void 0!==t.Ce&&(i.bottomFillColor2=t.Ce),i}function he(t){const i={open:t.Ot[0],high:t.Ot[1],low:t.Ot[2],close:t.Ot[3],time:t.Cb};return void 0!==t.Ab&&(i.customValues=t.Ab),i}function le(t){const i=he(t);return void 0!==t.O&&(i.color=t.O),i}function ae(t){const i=he(t),{O:n,At:s,Xh:e}=t;return void 0!==n&&(i.color=n),void 0!==s&&(i.borderColor=s),void 0!==e&&(i.wickColor=e),i}function oe(t){return {Area:ee,Line:se,Baseline:re,Histogram:se,Bar:le,Candlestick:ae,Custom:_e}[t]}function _e(t){const i=t.Cb;return Object.assign(Object.assign({},t.He),{time:i})}const ue={vertLine:{color:"#9598A1",width:1,style:3,visible:!0,labelVisible:!0,labelBackgroundColor:"#131722"},horzLine:{color:"#9598A1",width:1,style:3,visible:!0,labelVisible:!0,labelBackgroundColor:"#131722"},mode:1},ce={vertLines:{color:"#D6DCDE",style:0,visible:!0},horzLines:{color:"#D6DCDE",style:0,visible:!0}},de={background:{type:"solid",color:"#FFFFFF"},textColor:"#191919",fontSize:12,fontFamily:E},fe={autoScale:!0,mode:0,invertScale:!1,alignLabels:!0,borderVisible:!0,borderColor:"#2B2B43",entireTextOnly:!1,visible:!1,ticksVisible:!1,scaleMargins:{bottom:.1,top:.2},minimumWidth:0},ve={rightOffset:0,barSpacing:6,minBarSpacing:.5,fixLeftEdge:!1,fixRightEdge:!1,lockVisibleTimeRangeOnResize:!1,rightBarStaysOnScroll:!1,borderVisible:!0,borderColor:"#2B2B43",visible:!0,timeVisible:!1,secondsVisible:!0,shiftVisibleRangeOnNewBar:!0,allowShiftVisibleRangeOnWhitespaceReplacement:!1,ticksVisible:!1,uniformDistribution:!1,minimumHeight:0,allowBoldLabels:!0},pe={color:"rgba(0, 0, 0, 0)",visible:!1,fontSize:48,fontFamily:E,fontStyle:"",text:"",horzAlign:"center",vertAlign:"center"};function me(){return {width:0,height:0,autoSize:!1,layout:de,crosshair:ue,grid:ce,overlayPriceScales:Object.assign({},fe),leftPriceScale:Object.assign(Object.assign({},fe),{visible:!1}),rightPriceScale:Object.assign(Object.assign({},fe),{visible:!0}),timeScale:ve,watermark:pe,localization:{locale:is?navigator.language:"",dateFormat:"dd MMM 'yy"},handleScroll:{mouseWheel:!0,pressedMouseMove:!0,horzTouchDrag:!0,vertTouchDrag:!0},handleScale:{axisPressedMouseMove:{time:!0,price:!0},axisDoubleClickReset:{time:!0,price:!0},mouseWheel:!0,pinch:!0},kineticScroll:{mouse:!1,touch:!0},trackingMode:{exitMode:1}}}class be{constructor(t,i){this.Jb=t,this.Qb=i;}applyOptions(t){this.Jb.$t().Hc(this.Qb,t);}options(){return this.Li().W()}width(){return ot(this.Qb)?this.Jb.ob(this.Qb):0}Li(){return b(this.Jb.$t().$c(this.Qb)).Dt}}function we(t,i,n){const s=Fs(t,["time","originalTime"]),e=Object.assign({time:i},s);return void 0!==n&&(e.originalTime=n),e}const ge={color:"#FF0000",price:0,lineStyle:2,lineWidth:1,lineVisible:!0,axisLabelVisible:!0,title:"",axisLabelColor:"",axisLabelTextColor:""};class Me{constructor(t){this.Eh=t;}applyOptions(t){this.Eh.Hh(t);}options(){return this.Eh.W()}tw(){return this.Eh}}class xe{constructor(t,i,n,s,e){this.iw=new R,this.Ls=t,this.nw=i,this.sw=n,this.U_=e,this.ew=s;}S(){this.iw.S();}priceFormatter(){return this.Ls.ma()}priceToCoordinate(t){const i=this.Ls.Ct();return null===i?null:this.Ls.Dt().Rt(t,i.Ot)}coordinateToPrice(t){const i=this.Ls.Ct();return null===i?null:this.Ls.Dt().pn(t,i.Ot)}barsInLogicalRange(t){if(null===t)return null;const i=new kn(new Mn(t.from,t.to)).hu(),n=this.Ls.In();if(n.Ni())return null;const s=n.hl(i.Os(),1),e=n.hl(i.ui(),-1),r=b(n.sl()),h=b(n.Vn());if(null!==s&&null!==e&&s.se>e.se)return {barsBefore:t.from-r,barsAfter:h-t.to};const l={barsBefore:null===s||s.se===r?t.from-r:s.se-r,barsAfter:null===e||e.se===h?h-t.to:h-e.se};return null!==s&&null!==e&&(l.from=s.Cb,l.to=e.Cb),l}setData(t){this.U_,this.Ls.Jh(),this.nw.rw(this.Ls,t),this.hw("full");}update(t){this.Ls.Jh(),this.nw.lw(this.Ls,t),this.hw("update");}dataByIndex(t,i){const n=this.Ls.In().hl(t,i);if(null===n)return null;return oe(this.seriesType())(n)}data(){const t=oe(this.seriesType());return this.Ls.In().ie().map((i=>t(i)))}subscribeDataChanged(t){this.iw.l(t);}unsubscribeDataChanged(t){this.iw.v(t);}setMarkers(t){this.U_;const i=t.map((t=>we(t,this.U_.convertHorzItemToInternal(t.time),t.time)));this.Ls.ia(i);}markers(){return this.Ls.na().map((t=>we(t,t.originalTime,void 0)))}applyOptions(t){this.Ls.Hh(t);}options(){return I(this.Ls.W())}priceScale(){return this.sw.priceScale(this.Ls.Dt().Ta())}createPriceLine(t){const i=D(I(ge),t),n=this.Ls.sa(i);return new Me(n)}removePriceLine(t){this.Ls.ea(t.tw());}seriesType(){return this.Ls.Jh()}attachPrimitive(t){this.Ls.Sa(t),t.attached&&t.attached({chart:this.ew,series:this,requestUpdate:()=>this.Ls.$t().Kl()});}detachPrimitive(t){this.Ls.ka(t),t.detached&&t.detached();}hw(t){this.iw.M()&&this.iw.m(t);}}class Se{constructor(t,i,n){this.aw=new R,this.pu=new R,this.wm=new R,this.$i=t,this.kl=t.St(),this.Gm=i,this.kl.tc().l(this.ow.bind(this)),this.kl.nc().l(this._w.bind(this)),this.Gm.Tm().l(this.uw.bind(this)),this.U_=n;}S(){this.kl.tc().p(this),this.kl.nc().p(this),this.Gm.Tm().p(this),this.aw.S(),this.pu.S(),this.wm.S();}scrollPosition(){return this.kl.ju()}scrollToPosition(t,i){i?this.kl.Gu(t,1e3):this.$i.Jn(t);}scrollToRealTime(){this.kl.Zu();}getVisibleRange(){const t=this.kl.Du();return null===t?null:{from:t.from.originalTime,to:t.to.originalTime}}setVisibleRange(t){const i={from:this.U_.convertHorzItemToInternal(t.from),to:this.U_.convertHorzItemToInternal(t.to)},n=this.kl.Vu(i);this.$i.vd(n);}getVisibleLogicalRange(){const t=this.kl.Ru();return null===t?null:{from:t.Os(),to:t.ui()}}setVisibleLogicalRange(t){p(t.from<=t.to,"The from index cannot be after the to index."),this.$i.vd(t);}resetTimeScale(){this.$i.Zn();}fitContent(){this.$i.rc();}logicalToCoordinate(t){const i=this.$i.St();return i.Ni()?null:i.It(t)}coordinateToLogical(t){return this.kl.Ni()?null:this.kl.Eu(t)}timeToCoordinate(t){const i=this.U_.convertHorzItemToInternal(t),n=this.kl.Da(i,!1);return null===n?null:this.kl.It(n)}coordinateToTime(t){const i=this.$i.St(),n=i.Eu(t),s=i.Ui(n);return null===s?null:s.originalTime}width(){return this.Gm.Gp().width}height(){return this.Gm.Gp().height}subscribeVisibleTimeRangeChange(t){this.aw.l(t);}unsubscribeVisibleTimeRangeChange(t){this.aw.v(t);}subscribeVisibleLogicalRangeChange(t){this.pu.l(t);}unsubscribeVisibleLogicalRangeChange(t){this.pu.v(t);}subscribeSizeChange(t){this.wm.l(t);}unsubscribeSizeChange(t){this.wm.v(t);}applyOptions(t){this.kl.Hh(t);}options(){return Object.assign(Object.assign({},I(this.kl.W())),{barSpacing:this.kl.he()})}ow(){this.aw.M()&&this.aw.m(this.getVisibleRange());}_w(){this.pu.M()&&this.pu.m(this.getVisibleLogicalRange());}uw(t){this.wm.m(t.width,t.height);}}function ke(t){if(void 0===t||"custom"===t.type)return;const i=t;void 0!==i.minMove&&void 0===i.precision&&(i.precision=function(t){if(t>=1)return 0;let i=0;for(;i<8;i++){const n=Math.round(t);if(Math.abs(n-t)<1e-8)return i;t*=10;}return i}(i.minMove));}function ye(t){return function(t){if(V(t.handleScale)){const i=t.handleScale;t.handleScale={axisDoubleClickReset:{time:i,price:i},axisPressedMouseMove:{time:i,price:i},mouseWheel:i,pinch:i};}else if(void 0!==t.handleScale){const{axisPressedMouseMove:i,axisDoubleClickReset:n}=t.handleScale;V(i)&&(t.handleScale.axisPressedMouseMove={time:i,price:i}),V(n)&&(t.handleScale.axisDoubleClickReset={time:n,price:n});}const i=t.handleScroll;V(i)&&(t.handleScroll={horzTouchDrag:i,vertTouchDrag:i,mouseWheel:i,pressedMouseMove:i});}(t),t}class Ce{constructor(t,i,n){this.cw=new Map,this.dw=new Map,this.fw=new R,this.pw=new R,this.mw=new R,this.bw=new te(i);const s=void 0===n?I(me()):D(I(me()),ye(n));this.U_=i,this.Jb=new Es(t,s,i),this.Jb.Yp().l((t=>{this.fw.M()&&this.fw.m(this.ww(t()));}),this),this.Jb.Xp().l((t=>{this.pw.M()&&this.pw.m(this.ww(t()));}),this),this.Jb.Xc().l((t=>{this.mw.M()&&this.mw.m(this.ww(t()));}),this);const e=this.Jb.$t();this.gw=new Se(e,this.Jb.sb(),this.U_);}remove(){this.Jb.Yp().p(this),this.Jb.Xp().p(this),this.Jb.Xc().p(this),this.gw.S(),this.Jb.S(),this.cw.clear(),this.dw.clear(),this.fw.S(),this.pw.S(),this.mw.S(),this.bw.S();}resize(t,i,n){this.autoSizeActive()||this.Jb.Qm(t,i,n);}addCustomSeries(t,i){const n=w(t),s=Object.assign(Object.assign({},_),n.defaultOptions());return this.Mw("Custom",s,i,n)}addAreaSeries(t){return this.Mw("Area",l,t)}addBaselineSeries(t){return this.Mw("Baseline",a,t)}addBarSeries(t){return this.Mw("Bar",r,t)}addCandlestickSeries(t={}){return function(t){void 0!==t.borderColor&&(t.borderUpColor=t.borderColor,t.borderDownColor=t.borderColor),void 0!==t.wickColor&&(t.wickUpColor=t.wickColor,t.wickDownColor=t.wickColor);}(t),this.Mw("Candlestick",e,t)}addHistogramSeries(t){return this.Mw("Histogram",o,t)}addLineSeries(t){return this.Mw("Line",h,t)}removeSeries(t){const i=m(this.cw.get(t)),n=this.bw.fd(i);this.Jb.$t().fd(i),this.xw(n),this.cw.delete(t),this.dw.delete(i);}rw(t,i){this.xw(this.bw.Fb(t,i));}lw(t,i){this.xw(this.bw.Ub(t,i));}subscribeClick(t){this.fw.l(t);}unsubscribeClick(t){this.fw.v(t);}subscribeCrosshairMove(t){this.mw.l(t);}unsubscribeCrosshairMove(t){this.mw.v(t);}subscribeDblClick(t){this.pw.l(t);}unsubscribeDblClick(t){this.pw.v(t);}priceScale(t){return new be(this.Jb,t)}timeScale(){return this.gw}applyOptions(t){this.Jb.Hh(ye(t));}options(){return this.Jb.W()}takeScreenshot(){return this.Jb.lb()}autoSizeActive(){return this.Jb.cb()}chartElement(){return this.Jb.fb()}paneSize(){const t=this.Jb.mb();return {height:t.height,width:t.width}}setCrosshairPosition(t,i,n){const s=this.cw.get(n);if(void 0===s)return;const e=this.Jb.$t().cr(s);null!==e&&this.Jb.$t().ld(t,i,e);}clearCrosshairPosition(){this.Jb.$t().ad(!0);}Mw(t,i,n={},s){ke(n.priceFormat);const e=D(I(u),I(i),n),r=this.Jb.$t().ud(t,e,s),h=new xe(r,this,this,this,this.U_);return this.cw.set(h,r),this.dw.set(r,h),h}xw(t){const i=this.Jb.$t();i.od(t.St.Lu,t.St.Zb,t.St.Gb),t.Xb.forEach(((t,i)=>i.J(t.He,t.Kb))),i.Fu();}Sw(t){return m(this.dw.get(t))}ww(t){const i=new Map;t.Rb.forEach(((t,n)=>{const s=n.Jh(),e=oe(s)(t);if("Custom"!==s)p(function(t){return void 0!==t.open||void 0!==t.value}(e));else {const t=n.Ca();p(!t||!1===t(e));}i.set(this.Sw(n),e);}));const n=void 0!==t.Pb&&this.dw.has(t.Pb)?this.Sw(t.Pb):void 0;return {time:t.Cb,logical:t.se,point:t.Tb,hoveredSeries:n,hoveredObjectId:t.Db,seriesData:i,sourceEvent:t.Ob}}}function Te(t,i,n){let s;if(B(t)){const i=document.getElementById(t);p(null!==i,`Cannot find element in DOM with id=${t}`),s=i;}else s=t;const e=new Ce(s,i,n);return i.setOptions(e.options()),e}function Pe(t,i){return Te(t,new ts,ts.Vd(i))}const De=Object.assign(Object.assign({},u),_);

function ensureDefined(value) {
  if (value === void 0) {
    throw new Error("Value is undefined");
  }
  return value;
}

class PrimitiveBase {
  _chart = void 0;
  _series = void 0;
  _id = "";
  _type = "null";
  _autoscale = false;
  _requestUpdate;
  requestUpdate() {
    if (this._requestUpdate) this._requestUpdate();
  }
  constructor(_type, _id, _autoscale) {
    this._type = _type;
    this._id = _id;
    this._autoscale = _autoscale;
  }
  attached({
    chart,
    series,
    requestUpdate
  }) {
    this._chart = chart;
    this._series = series;
    if (this.onDataUpdate) {
      this._series.subscribeDataChanged(this._fireDataUpdated);
    }
    if (this.onClick) {
      this._chart.subscribeClick(this._fireClick);
    }
    if (this.onDblClick) {
      this._chart.subscribeDblClick(this._fireDblClick);
    }
    if (this.onCrosshairMove) {
      this._chart.subscribeCrosshairMove(this._fireCrosshairMove);
    }
    if (this.onMouseDown) {
      this._chart.chartElement().addEventListener("mousedown", this._fireMouseDown);
    }
    this._requestUpdate = requestUpdate;
    this.requestUpdate();
  }
  detached() {
    if (this.onDataUpdate) {
      this._series?.unsubscribeDataChanged(this._fireDataUpdated);
    }
    if (this.onClick) {
      this._chart?.unsubscribeClick(this._fireClick);
    }
    if (this.onDblClick) {
      this._chart?.unsubscribeDblClick(this._fireDblClick);
    }
    if (this.onCrosshairMove) {
      this._chart?.unsubscribeCrosshairMove(this._fireCrosshairMove);
    }
    this._chart = void 0;
    this._series = void 0;
    this._requestUpdate = void 0;
  }
  get chart() {
    return ensureDefined(this._chart);
  }
  get series() {
    return ensureDefined(this._series);
  }
  // These methods are a class property to maintain the
  // lexical 'this' scope (due to the use of the arrow function)
  // and to ensure its reference stays the same, so we can unsubscribe later.
  _fireDataUpdated = scope => {
    if (this.onDataUpdate) {
      this.onDataUpdate(scope);
    }
  };
  _fireMouseDown = e => {
    if (this.onMouseDown) {
      this.onMouseDown(this.makeMouseEventParams(e));
    }
  };
  // private _fireMouseUp = (e: MouseEventParams<Time>) => {
  //     if (this.onClick) { this.onClick(e); }
  // }
  _fireClick = e => {
    if (this.onClick) {
      this.onClick(e);
    }
  };
  _fireDblClick = e => {
    if (this.onDblClick) {
      this.onDblClick(e);
    }
  };
  _fireCrosshairMove = e => {
    if (this.onDblClick) {
      this.onDblClick(e);
    }
  };
  /**
   * Lightweight Charts get's the series data internally. We don't have that here. In order to get the Series Data, 
   * you would need to go back to the 'pane' object and manually retrieve the sources' data from the local series data
   * that's there. Totally doable, just need a method within pane to get the data and have the 'attach' function return
   * the current pane when it's called. That's just a task for another day.
   * 
   * ... you could also fulfil the hoveredSeries argument like that, ironically makeing it work via this method despite not working
   * when these params are given by the base lightweight-charts library.
   */
  makeMouseEventParams(e) {
    const rect = this._chart?.chartElement().getBoundingClientRect();
    let pt = void 0;
    if (rect && e.clientX - rect.left < rect.width && e.clientY - rect.top < rect.height) pt = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    return {
      time: this._chart?.timeScale().coordinateToTime(e.offsetX) ?? void 0,
      logical: this._chart?.timeScale().coordinateToLogical(e.offsetX) ?? void 0,
      point: pt,
      seriesData: /* @__PURE__ */new Map(),
      hoveredSeries: void 0,
      hoveredObjectId: this.hitTest && pt ? this.hitTest(pt.x, pt.y)?.externalId : void 0,
      sourceEvent: {
        clientX: e.clientX,
        clientY: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        screenX: e.screenX,
        screenY: e.screenY,
        localX: e.offsetX,
        localY: e.offsetY,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey
      }
    };
  }
  //Utility Function to tell where in the chart Div the event was fired from.
  getPane(params) {
    if (params.point && params.sourceEvent) if (params.point.x === params.sourceEvent.localX && params.point.y === params.sourceEvent.localY) return "ViewPane";else if (params.point.x === params.sourceEvent.localX && params.point.y !== params.sourceEvent.localY) return "TimePane";else if (params.point.x !== params.sourceEvent.localX && params.point.y === params.sourceEvent.localY) return "PricePane";else return "Bot_Right_Corner";
    return "";
  }
  //Utility function to move a SingleValueData Point
  movePoint(pt, dx, dy) {
    let x = this.chart.timeScale().timeToCoordinate(pt.time);
    let y = this.series.priceToCoordinate(pt.value);
    if (!x || !y) return null;
    let l = this.chart.timeScale().coordinateToLogical(x);
    if (!l) return null;
    x = this.chart.timeScale().logicalToCoordinate(l + dx);
    if (!x) return null;
    let px = this.chart.timeScale().coordinateToTime(x);
    let py = this.series.coordinateToPrice(y + dy);
    if (!px || !py) return null;
    return {
      time: px,
      value: py
    };
  }
}
const cssAccentColor = getComputedStyle(document.body).getPropertyValue("--layout-main-fill");
const cssBorderColor = getComputedStyle(document.body).getPropertyValue("--accent-color");
function draw_dot(ctx, p, sel = false, color = cssAccentColor, borderColor = cssBorderColor) {
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 6, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, sel ? 4 : 5, sel ? 4 : 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

const defaultOptions$1 = {
  lineColor: "rgb(255, 0, 0)",
  width: 1,
  autoscale: false,
  showLabels: true,
  labelBackgroundColor: "rgba(255, 255, 255, 0.85)",
  labelTextColor: "rgb(0, 0, 0)"
};
class TrendLine extends PrimitiveBase {
  _p1;
  _p2;
  _paneView;
  _options;
  constructor(params) {
    super("TrendLine", "id", false);
    this._p1 = params.p1;
    this._p2 = params.p2;
    this._options = {
      ...defaultOptions$1,
      ...params.options
    };
    this._paneView = new TrendLinePaneView(this);
  }
  //#region --------------- Util Functions --------------- //
  _pointIndex(p) {
    const timescale = this.chart.timeScale();
    return timescale.coordinateToLogical(timescale.timeToCoordinate(p.time) ?? -1);
  }
  updateData(params) {
    if (params.p1 !== null) this._p1 = params.p1;
    if (params.p2 !== null) this._p2 = params.p2;
    if (params.options !== void 0) this._options = {
      ...this._options,
      ...params.options
    };
    this.requestUpdate();
  }
  //#endregion 
  //#region --------------- Base Class / Interface Functions --------------- //
  paneViews() {
    return [this._paneView];
  }
  updateAllViews() {
    this._paneView.update();
  }
  autoscaleInfo(startTimePoint, endTimePoint) {
    if (!this._options.autoscale) return null;
    if (this._p1 === null || this._p2 === null) return null;
    const p1Index = this._pointIndex(this._p1);
    const p2Index = this._pointIndex(this._p2);
    if (p1Index === null || p2Index === null) return null;
    if (endTimePoint < p1Index || startTimePoint > p2Index) return null;
    return {
      priceRange: {
        minValue: Math.min(this._p1.value, this._p2.value),
        maxValue: Math.max(this._p1.value, this._p2.value)
      }
    };
  }
  hitTest(x, y) {
    return this._paneView.hitTest(x, y);
  }
  /**
   * Move line / Point on line Function
   */
  onMouseDown(param) {
    const id = param.hoveredObjectId;
    if (!id || !id.startsWith("line") || !param.sourceEvent || !param.logical) {
      this._paneView._selected = false;
      return;
    }
    const timescale = this.chart.timeScale();
    const series = this.series;
    const chart_rect = this.chart.chartElement().getBoundingClientRect();
    if (!chart_rect) return;
    let update_func;
    if (id === "line") {
      let x = param.logical;
      let y = param.sourceEvent.clientY;
      update_func = param2 => {
        if (!param2.logical || !param2.sourceEvent || !this._p1 || !this._p2) return;
        let dx = param2.logical - x;
        let dy = param2.sourceEvent.clientY - y;
        let p1 = this.movePoint(this._p1, dx, dy);
        let p2 = this.movePoint(this._p2, dx, dy);
        if (!p1 || !p2) return;
        this.updateData({
          p1,
          p2
        });
        x = param2.logical;
        y = param2.sourceEvent.clientY;
      };
    } else if (id === "line_p1" || id === "line_p2") {
      update_func = param2 => {
        if (!param2.sourceEvent) return;
        let t = timescale.coordinateToTime(param2.sourceEvent.clientX - chart_rect.left);
        let p = series.coordinateToPrice(param2.sourceEvent.clientY - chart_rect.top);
        if (t && p) {
          if (id === "line_p1") this.updateData({
            p1: {
              time: t,
              value: p
            },
            p2: null
          });else if (id === "line_p2") this.updateData({
            p1: null,
            p2: {
              time: t,
              value: p
            }
          });
        }
      };
    } else return;
    this._paneView._selected = true;
    const chart = this.chart;
    const pressedMove = chart.options().handleScroll.valueOf();
    let pressedMoveReEnable;
    if (typeof pressedMove == "boolean") {
      pressedMoveReEnable = pressedMove;
    } else {
      pressedMoveReEnable = pressedMove.pressedMouseMove;
    }
    chart.applyOptions({
      handleScroll: {
        pressedMouseMove: false
      }
    });
    update_func = update_func.bind(this);
    chart.subscribeCrosshairMove(update_func);
    document.addEventListener("mouseup", () => {
      chart.unsubscribeCrosshairMove(update_func);
      chart.applyOptions({
        handleScroll: {
          pressedMouseMove: pressedMoveReEnable
        }
      });
    });
  }
  onClick(param) {
    switch (param.hoveredObjectId) {
      case "line_p1":
        console.log("clicked p1");
        break;
      case "line_p2":
        console.log("clicked p2");
        break;
      case "line":
        console.log("clicked line");
        break;
    }
  }
  //#endregion
}
class TrendLinePaneView {
  _p1 = null;
  _p2 = null;
  _source;
  _hovered = false;
  _selected = false;
  _renderer;
  line = null;
  ctx = null;
  constructor(source) {
    this._source = source;
    this._renderer = new TrendLinePaneRenderer(this._source._options, this.passback.bind(this));
  }
  update() {
    if (this._source._p1 === null || this._source._p2 === null) return;
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();
    let y1 = series.priceToCoordinate(this._source._p1.value);
    let y2 = series.priceToCoordinate(this._source._p2.value);
    let x1 = timeScale.timeToCoordinate(this._source._p1.time);
    let x2 = timeScale.timeToCoordinate(this._source._p2.time);
    if (x1 === null || x2 === null || y1 === null || y2 === null) {
      this._p1 = null;
      this._p2 = null;
      return;
    }
    this._p1 = {
      x: Math.round(x1),
      y: Math.round(y1)
    };
    this._p2 = {
      x: Math.round(x2),
      y: Math.round(y2)
    };
  }
  //This is only called about 1/4 the amount that update() is
  renderer() {
    this._renderer._update(this._p1, this._p2, this._hovered, this._selected);
    return this._renderer;
  }
  //Passback of relevent objects to make hitdetection a LOT easier
  passback(ctx, line) {
    this.ctx = ctx;
    this.line = line;
  }
  /**
   * Implementation of a Hit test when you have access to the Canvas Target...
   * This function gets invoked a LOT. Need to make sure it's efficient.
   */
  hitTest(x, y) {
    if (this.line === null || this.ctx === null) return null;
    if (this._p1 === null || this._p2 === null) return null;
    this._hovered = false;
    if (!(
    //Course X range Check
    x + 10 > this._p1.x && x - 10 < this._p2.x || x - 10 < this._p1.x && x + 10 > this._p2.x)) return null;
    if (!(
    //Course Y range Check
    y + 10 > this._p1.y && y - 10 < this._p2.y || y - 10 < this._p1.y && y + 10 > this._p2.y)) return null;
    if (Math.abs(this._p1.x - x) < 10 && Math.abs(this._p1.y - y) < 10) {
      this._hovered = true;
      return {
        cursorStyle: "grab",
        externalId: "line_p1",
        zOrder: "normal"
      };
    }
    if (Math.abs(this._p2.x - x) < 10 && Math.abs(this._p2.y - y) < 10) {
      this._hovered = true;
      return {
        cursorStyle: "grab",
        externalId: "line_p2",
        zOrder: "normal"
      };
    }
    this.ctx.lineWidth = Math.max(this._source._options.width, 6);
    if (this.ctx.isPointInStroke(this.line, x, y)) {
      this._hovered = true;
      return {
        cursorStyle: "grab",
        externalId: "line",
        zOrder: "normal"
      };
    }
    return null;
  }
}
class TrendLinePaneRenderer {
  _p1 = null;
  _p2 = null;
  _hovered = false;
  _selected = false;
  _options;
  _passback;
  constructor(options, passback) {
    this._options = options;
    this._passback = passback;
  }
  draw(target) {
    target.useMediaCoordinateSpace(scope => {
      const ctx = scope.context;
      if (this._p1 === null || this._p2 === null) {
        this._passback(ctx, null);
      } else {
        let line = new Path2D();
        line.moveTo(this._p1.x, this._p1.y);
        line.lineTo(this._p2.x, this._p2.y);
        ctx.lineWidth = this._options.width;
        ctx.strokeStyle = this._options.lineColor;
        ctx.stroke(line);
        if (this._hovered || this._selected) {
          draw_dot(ctx, this._p1, this._selected);
          draw_dot(ctx, this._p2, this._selected);
        }
        this._passback(ctx, line);
      }
    });
  }
  _update(p1, p2, hovered, selected) {
    this._p1 = p1;
    this._p2 = p2;
    this._hovered = hovered;
    this._selected = selected;
  }
}

const primitives = /* @__PURE__ */new Map([["TrendLine", TrendLine]]);

function optimalCandlestickWidth(barSpacing, pixelRatio) {
  const barSpacingSpecialCaseFrom = 2.5;
  const barSpacingSpecialCaseTo = 4;
  const barSpacingSpecialCaseCoeff = 3;
  if (barSpacing >= barSpacingSpecialCaseFrom && barSpacing <= barSpacingSpecialCaseTo) {
    return Math.floor(barSpacingSpecialCaseCoeff * pixelRatio);
  }
  const barSpacingReducingCoeff = 0.2;
  const coeff = 1 - barSpacingReducingCoeff * Math.atan(Math.max(barSpacingSpecialCaseTo, barSpacing) - barSpacingSpecialCaseTo) / (Math.PI * 0.5);
  const res = Math.floor(barSpacing * coeff * pixelRatio);
  const scaledBarSpacing = Math.floor(barSpacing * pixelRatio);
  const optimal = Math.min(res, scaledBarSpacing);
  return Math.max(Math.floor(pixelRatio), optimal);
}
function candlestickWidth(barSpacing, horizontalPixelRatio) {
  let width = optimalCandlestickWidth(barSpacing, horizontalPixelRatio);
  if (width >= 2) {
    const wickWidth = Math.floor(horizontalPixelRatio);
    if (wickWidth % 2 !== width % 2) {
      width--;
    }
  }
  return width;
}

function gridAndCrosshairBitmapWidth(horizontalPixelRatio) {
  return Math.max(1, Math.floor(horizontalPixelRatio));
}
function gridAndCrosshairMediaWidth(horizontalPixelRatio) {
  return gridAndCrosshairBitmapWidth(horizontalPixelRatio) / horizontalPixelRatio;
}

function centreOffset(lineBitmapWidth) {
  return Math.floor(lineBitmapWidth * 0.5);
}
function positionsLine(positionMedia, pixelRatio, desiredWidthMedia = 1, widthIsBitmap) {
  const scaledPosition = Math.round(pixelRatio * positionMedia);
  const lineBitmapWidth = Math.round(desiredWidthMedia * pixelRatio);
  const offset = centreOffset(lineBitmapWidth);
  const position = scaledPosition - offset;
  return {
    position,
    length: lineBitmapWidth
  };
}
function positionsBox(position1Media, position2Media, pixelRatio) {
  const scaledPosition1 = Math.round(pixelRatio * position1Media);
  const scaledPosition2 = Math.round(pixelRatio * position2Media);
  return {
    position: Math.min(scaledPosition1, scaledPosition2),
    length: Math.abs(scaledPosition2 - scaledPosition1) + 1
  };
}

class RoundedCandleSeriesRenderer {
  _data = null;
  _options = null;
  draw(target, priceConverter) {
    target.useBitmapCoordinateSpace(scope => this._drawImpl(scope, priceConverter));
  }
  update(data, options) {
    this._data = data;
    this._options = options;
  }
  _drawImpl(renderingScope, priceToCoordinate) {
    if (this._data === null || this._data.bars.length === 0 || this._data.visibleRange === null || this._options === null) {
      return;
    }
    const bars = this._data.bars.map(bar => {
      const isUp = bar.originalData.close >= bar.originalData.open;
      const openY = priceToCoordinate(bar.originalData.open) ?? 0;
      const highY = priceToCoordinate(bar.originalData.high) ?? 0;
      const lowY = priceToCoordinate(bar.originalData.low) ?? 0;
      const closeY = priceToCoordinate(bar.originalData.close) ?? 0;
      return {
        openY,
        highY,
        lowY,
        closeY,
        x: bar.x,
        isUp
      };
    });
    const radius = this._options.radius(this._data.barSpacing);
    this._drawWicks(renderingScope, bars, this._data.visibleRange);
    this._drawCandles(renderingScope, bars, this._data.visibleRange, radius);
  }
  _drawWicks(renderingScope, bars, visibleRange) {
    if (this._data === null || this._options === null) {
      return;
    }
    const {
      context: ctx,
      horizontalPixelRatio,
      verticalPixelRatio
    } = renderingScope;
    const wickWidth = gridAndCrosshairMediaWidth(horizontalPixelRatio);
    for (let i = visibleRange.from; i < visibleRange.to; i++) {
      const bar = bars[i];
      ctx.fillStyle = bar.isUp ? this._options.wickUpColor : this._options.wickDownColor;
      const verticalPositions = positionsBox(bar.lowY, bar.highY, verticalPixelRatio);
      const linePositions = positionsLine(bar.x, horizontalPixelRatio, wickWidth);
      ctx.fillRect(linePositions.position, verticalPositions.position, linePositions.length, verticalPositions.length);
    }
  }
  _drawCandles(renderingScope, bars, visibleRange, radius) {
    if (this._data === null || this._options === null) {
      return;
    }
    const {
      context: ctx,
      horizontalPixelRatio,
      verticalPixelRatio
    } = renderingScope;
    const candleBodyWidth = candlestickWidth(this._data.barSpacing, 1);
    for (let i = visibleRange.from; i < visibleRange.to; i++) {
      const bar = bars[i];
      const verticalPositions = positionsBox(Math.min(bar.openY, bar.closeY), Math.max(bar.openY, bar.closeY), verticalPixelRatio);
      const linePositions = positionsLine(bar.x, horizontalPixelRatio, candleBodyWidth);
      ctx.fillStyle = bar.isUp ? this._options.upColor : this._options.downColor;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(linePositions.position, verticalPositions.position, linePositions.length, verticalPositions.length, radius);
        ctx.fill();
      } else {
        ctx.fillRect(linePositions.position, verticalPositions.position, linePositions.length, verticalPositions.length);
      }
    }
  }
}

const defaultOptions = {
  ...De,
  upColor: "#26a69a",
  downColor: "#ef5350",
  wickVisible: true,
  borderVisible: true,
  borderColor: "#378658",
  borderUpColor: "#26a69a",
  borderDownColor: "#ef5350",
  wickColor: "#737375",
  wickUpColor: "#26a69a",
  wickDownColor: "#ef5350",
  radius: function (bs) {
    if (bs < 4) return 0;
    return bs / 3;
  }
};
class RoundedCandleSeries {
  _renderer;
  constructor() {
    this._renderer = new RoundedCandleSeriesRenderer();
  }
  priceValueBuilder(plotRow) {
    return [plotRow.high, plotRow.low, plotRow.close];
  }
  renderer() {
    return this._renderer;
  }
  isWhitespace(data) {
    return data.close === void 0;
  }
  update(data, options) {
    this._renderer.update(data, options);
  }
  defaultOptions() {
    return defaultOptions;
  }
}

var Series_Type = /* @__PURE__ */(Series_Type2 => {
  Series_Type2[Series_Type2["WhitespaceData"] = 0] = "WhitespaceData";
  Series_Type2[Series_Type2["SingleValueData"] = 1] = "SingleValueData";
  Series_Type2[Series_Type2["LINE"] = 2] = "LINE";
  Series_Type2[Series_Type2["AREA"] = 3] = "AREA";
  Series_Type2[Series_Type2["BASELINE"] = 4] = "BASELINE";
  Series_Type2[Series_Type2["HISTOGRAM"] = 5] = "HISTOGRAM";
  Series_Type2[Series_Type2["OHLC"] = 6] = "OHLC";
  Series_Type2[Series_Type2["BAR"] = 7] = "BAR";
  Series_Type2[Series_Type2["CANDLESTICK"] = 8] = "CANDLESTICK";
  Series_Type2[Series_Type2["ROUNDED_CANDLE"] = 9] = "ROUNDED_CANDLE";
  return Series_Type2;
})(Series_Type || {});
const interval_list = ["s", "m", "h", "D", "W", "M", "Y"];
const interval_val_map = {
  "s": 1,
  "m": 60,
  "h": 3600,
  "D": 86400,
  "W": 604800,
  "M": 18396e3,
  "Y": 220752e3,
  "E": 1
};
const interval_map = {
  "s": "Second",
  "m": "Minute",
  "h": "Hour",
  "D": "Day",
  "W": "Week",
  "M": "Month",
  "Y": "Year",
  "E": "Error"
};
class tf {
  multiplier;
  period;
  constructor(mult, period) {
    this.multiplier = Math.floor(mult);
    this.period = period;
  }
  /**
   * Create a Timeframe Object from a string
   */
  static from_str(str_in) {
    let interval_str = str_in.charAt(str_in.length - 1);
    if (!interval_list.includes(interval_str)) return new tf(-1, "E");
    let mult_str = str_in.split(interval_str)[0];
    let mult_num = mult_str === "" ? 1 : parseFloat(mult_str);
    return new tf(mult_num, interval_str);
  }
  /**
   * Create a Timeframe object from the given number. This is the inverse operation of .toValue(), 
   * i.e tf.from_value(new tf(1, 'D').toValue()) === new tf(1, 'D')
   * 
   * The value given is rounded down to the nearest integer multiple timeframe. e.g. (tf.from_value(new tf(1, 'D').toValue() - 1) === new tf(23, 'h'))
   * @param val The number of seconds within the given timeframe.
   */
  static from_value(val) {
    for (let i = interval_list.length - 1; i >= 0; i--) {
      let mult = val / interval_val_map[interval_list[i]];
      if (mult >= 1) {
        return new tf(mult, interval_list[i]);
      }
    }
    return new tf(-1, "E");
  }
  static is_equal(a, b) {
    return a.toValue() === b.toValue();
  }
  //Trim_unit can be set to True when displaying the timeframe. Should be set to false when transmitting the TF as a string.
  toString(trim_unit = false) {
    return `${trim_unit && this.multiplier === 1 ? "" : this.multiplier}${this.period}`;
  }
  toLabel() {
    return `${this.multiplier} ${interval_map[this.period]}${this.multiplier > 1 ? "s" : ""}`;
  }
  toValue() {
    return this.multiplier * interval_val_map[this.period];
  }
}
const ID_LEN = 4;
function makeid(id_list, prefix = "") {
  let result = prefix;
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < ID_LEN) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  if (id_list.includes(result)) return makeid(id_list, prefix);else {
    return result;
  }
}

class indicator {
  id;
  type;
  pane;
  series = /* @__PURE__ */new Map();
  primitives_left = /* @__PURE__ */new Map();
  primitives_right = /* @__PURE__ */new Map();
  primitives_overlay = /* @__PURE__ */new Map();
  constructor(id, type, pane2) {
    this.id = id;
    this.pane = pane2;
    this.type = type;
  }
  //Clear All Sub-objects
  delete() {
    this.series.forEach((ser, key) => {
      this.pane.chart.removeSeries(ser);
    });
    this.primitives_left.forEach((prim, key) => {
      this.pane.primitive_left.detachPrimitive(prim);
    });
    this.primitives_right.forEach((prim, key) => {
      this.pane.primitive_right.detachPrimitive(prim);
    });
    this.primitives_overlay.forEach((prim, key) => {
      this.pane.whitespace_series.detachPrimitive(prim);
    });
  }
  _create_series_(series_type) {
    switch (series_type) {
      case Series_Type.LINE:
        return this.pane.chart.addLineSeries();
      case Series_Type.AREA:
        return this.pane.chart.addAreaSeries();
      case Series_Type.HISTOGRAM:
        return this.pane.chart.addHistogramSeries();
      case Series_Type.BASELINE:
        return this.pane.chart.addBaselineSeries();
      case Series_Type.BAR:
        return this.pane.chart.addBarSeries();
      case Series_Type.CANDLESTICK:
        return this.pane.chart.addCandlestickSeries();
      case Series_Type.ROUNDED_CANDLE:
        return this.pane.chart.addCustomSeries(new RoundedCandleSeries());
      default:
        return this.pane.chart.addLineSeries();
    }
  }
  get_legend() {}
  set_legend() {}
  edit_legend() {}
  add_series(_id, series_type) {
    this.series.set(_id, this._create_series_(series_type));
  }
  remove_series(_id) {
    let series = this.series.get(_id);
    if (series === void 0) return;
    this.pane.chart.removeSeries(series);
    this.series.delete(_id);
  }
  set_series_data(_id, data) {
    let series = this.series.get(_id);
    if (series === void 0) return;
    series.setData(data);
    this.pane.autoscale_time_axis();
  }
  update_series_data(_id, data) {
    let series = this.series.get(_id);
    if (series === void 0) return;
    series.update(data);
  }
  /**
   * Unfortunately, change_series_type changes the draw order of the Series on screen.
   * This is the result of deleteing the old series and creating a new one. The draw order
   * appears to be determined by the order in which the series objects are added to the screen.
   * After some trial testing it appears the chart object has an 'rw' property. This is a map
   * w/ the series objects as keys. I do not know the type of the value. This 'rw' map gets
   * reordered when adding/removing series objects. I already tried to reorder this map
   * to change the display order, but that had no effect on the display. of note: it did not
   * break anything.
   */
  change_series_type(_id, series_type, data) {
    let series = this.series.get(_id);
    if (series === void 0) {
      this.add_series(_id, series_type);
      this.series.get(_id)?.setData(data);
      return;
    }
    let new_series = this._create_series_(series_type);
    let timescale = this.pane.chart.timeScale();
    let current_range = timescale.getVisibleRange();
    new_series.setData(data);
    this.series.set(_id, new_series);
    this.pane.chart.removeSeries(series);
    if (current_range !== null) timescale.setVisibleRange(current_range);
  }
  update_series_opts(_id, opts) {
    let series = this.series.get(_id);
    if (series === void 0) return;
    series.applyOptions(opts);
  }
  update_scale_opts(_id, opts) {
    let series = this.series.get(_id);
    if (series === void 0) return;
    series.priceScale().applyOptions(opts);
  }
  add_primitive(_id, _type, params) {
    let primitive_type = primitives.get(_type);
    if (primitive_type === void 0) return;
    let new_obj = new primitive_type(params);
    this.primitives_right.set(_id, new_obj);
    this.pane.primitive_right.attachPrimitive(new_obj);
  }
  remove_primitive(_id) {
    let _obj = this.primitives_right.get(_id);
    if (_obj === void 0) return;
    this.pane.primitive_right.detachPrimitive(_obj);
    this.primitives_right.delete(_id);
  }
  update_primitive(_id, params) {
    let _obj = this.primitives_right.get(_id);
    if (_obj === void 0) return;
    _obj.updateData(params);
  }
}

class pane {
  static _special_id_ = "main";
  // Must match Python Pane Special ID
  id = "";
  div;
  flex_width;
  flex_height;
  chart;
  indicators = /* @__PURE__ */new Map();
  primitives_left = /* @__PURE__ */new Map();
  primitives_right = /* @__PURE__ */new Map();
  primitives_overlay = /* @__PURE__ */new Map();
  primitive_left;
  primitive_right;
  primitive_overlay;
  whitespace_series;
  chart_div;
  constructor(id, div, flex_width = 1, flex_height = 1, chart_opts = DEFAULT_PYCHART_OPTS) {
    this.id = id;
    this.div = div;
    this.flex_width = flex_width;
    this.flex_height = flex_height;
    this.chart = Pe(this.div, chart_opts);
    this.chart_div = this.chart.chartElement();
    this.whitespace_series = this.chart.addLineSeries();
    this.primitive_left = this.chart.addLineSeries({
      priceScaleId: "left",
      visible: false,
      autoscaleInfoProvider: void 0
    });
    this.primitive_right = this.chart.addLineSeries({
      priceScaleId: "right",
      visible: false,
      autoscaleInfoProvider: void 0
    });
    this.primitive_overlay = this.chart.addLineSeries({
      visible: false,
      priceScaleId: "",
      autoscaleInfoProvider: () => ({
        priceRange: {
          //Set visible range regardless of data
          minValue: 0,
          maxValue: 100
        }
      })
    });
    this.assign_active_pane = this.assign_active_pane.bind(this);
    this.chart_div.addEventListener("mousedown", () => {
      this.assign_active_pane();
      this.chart.timeScale().applyOptions({
        "shiftVisibleRangeOnNewBar": false,
        "allowShiftVisibleRangeOnWhitespaceReplacement": false,
        "rightBarStaysOnScroll": false
      });
    });
    window.document.addEventListener("mouseup", () => {
      this.chart.timeScale().applyOptions({
        "shiftVisibleRangeOnNewBar": true,
        "allowShiftVisibleRangeOnWhitespaceReplacement": true,
        "rightBarStaysOnScroll": true
      });
    });
  }
  /**
   * Update Global 'active_pane' reference to this instance. 
   */
  assign_active_pane() {
    if (window.active_pane) window.active_pane.div.removeAttribute("active");
    window.active_pane = this;
    window.active_pane.div.setAttribute("active", "");
  }
  set_whitespace_data(data, primitive_data) {
    this.whitespace_series.setData(data);
    this.primitive_left.setData([primitive_data]);
    this.primitive_right.setData([primitive_data]);
    this.primitive_overlay.setData([primitive_data]);
  }
  update_whitespace_data(data, primitive_data) {
    this.whitespace_series.update(data);
    this.primitive_left.setData([primitive_data]);
    this.primitive_right.setData([primitive_data]);
    this.primitive_overlay.setData([primitive_data]);
  }
  add_indicator(_id, type) {
    this.indicators.set(_id, new indicator(_id, type, this));
  }
  remove_indicator(_id) {
    let indicator2 = this.indicators.get(_id);
    if (indicator2 === void 0) return;
    indicator2.delete();
    this.indicators.delete(_id);
  }
  add_primitive(_id, _type, params) {
    let primitive_type = primitives.get(_type);
    if (primitive_type === void 0) return;
    let new_obj = new primitive_type(params);
    this.primitives_right.set(_id, new_obj);
    this.primitive_right.attachPrimitive(new_obj);
  }
  remove_primitive(_id) {
    let _obj = this.primitives_right.get(_id);
    if (_obj === void 0) return;
    this.primitive_right.detachPrimitive(_obj);
    this.primitives_right.delete(_id);
  }
  update_primitive(_id, params) {
    let _obj = this.primitives_right.get(_id);
    if (_obj === void 0) return;
    _obj.updateData(params);
  }
  /**
   * Resize the Pane given the Pane's flex size
   * @param width Total Frame Width in px
   * @param height Total Frame Height in px
   */
  resize(width, height) {
    let this_width = width * this.flex_width;
    let this_height = height * this.flex_height;
    this.div.style.width = `${this_width}px`;
    this.div.style.height = `${this_height}px`;
    this.chart.resize(this_width, this_height, false);
  }
  create_line(point1, point2) {
    const trend = new TrendLine({
      p1: point1,
      p2: point2
    });
    this.primitive_right.attachPrimitive(trend);
  }
  fitcontent() {
    this.chart.timeScale().fitContent();
  }
  autoscale_time_axis() {
    this.chart.timeScale().resetTimeScale();
  }
  update_timescale_opts(newOpts) {
    this.chart.timeScale().applyOptions(newOpts);
  }
}
const DEFAULT_PYCHART_OPTS = {
  layout: {
    // ---- Layout Options ----
    background: {
      type: Vn.VerticalGradient,
      topColor: "#171c27",
      bottomColor: "#131722"
    },
    textColor: "#b2b5be"
  },
  grid: {
    vertLines: {
      color: "#222631"
    },
    horzLines: {
      color: "#222631"
    }
  },
  rightPriceScale: {
    // ---- VisiblePriceScaleOptions ---- 
    mode: vn.Logarithmic
    // borderColor: '#161a25',
  },
  crosshair: {
    // ---- Crosshair Options ---- 
    mode: lt.Normal
  },
  kineticScroll: {
    // ---- Kinetic Scroll ---- 
    touch: true
  },
  timeScale: {
    shiftVisibleRangeOnNewBar: true,
    allowShiftVisibleRangeOnWhitespaceReplacement: true,
    rightBarStaysOnScroll: true,
    rightOffset: 20
  }
};

class frame {
  id;
  update_tab;
  element;
  active;
  setActive;
  target;
  setTarget;
  timeframe = void 0;
  symbol = void 0;
  constructor(id, tab_update_func) {
    this.id = id;
    this.update_tab = tab_update_func;
    const [target, setTarget] = createSignal(false);
    this.target = target;
    this.setTarget = setTarget;
    const [active, setActive] = createSignal(false);
    this.active = active;
    this.setActive = setActive;
  }
  resize() {}
  onShow() {}
  //{console.log(`Show ${this.id}`)}
  onHide() {}
  //{console.log(`Hide ${this.id}`)}
  onActivation() {}
  //{console.log(`Activate ${this.id}`)}
  onDeactivation() {}
  //{console.log(`Deactivate ${this.id}`)}
  /**
   * Update Global 'active_frame' reference to this instance. 
   */
  assign_active_frame() {
    if (window.active_frame === this) return;
    if (window.active_frame) {
      window.active_frame.setActive(false);
      window.active_frame.onDeactivation();
    }
    window.active_frame = this;
    this.setActive(true);
    this.onActivation();
  }
}
class chart_frame extends frame {
  element;
  timeframe;
  symbol;
  series_type;
  panes = [];
  main_pane = void 0;
  constructor(id, tab_update_func) {
    super(id, tab_update_func);
    this.element = document.createElement("div");
    this.element.classList.add("chart_frame");
    this.symbol = {
      ticker: "LWPC"
    };
    this.timeframe = new tf(1, "D");
    this.series_type = Series_Type.CANDLESTICK;
  }
  onActivation() {
    if (this.panes[0]) this.panes[0].assign_active_pane();
    this.update_tab(this.symbol.ticker);
    window.topbar.setSeries(this.series_type);
    window.topbar.setTimeframe(this.timeframe);
    window.topbar.setTicker(this.symbol.ticker);
  }
  // #region -------------- Python API Functions ------------------ //
  set_whitespace_data(data, Primitive_data) {
    if (Primitive_data === void 0) Primitive_data = {
      time: "1970-01-01",
      value: 0
    };
    this.main_pane?.set_whitespace_data(data, Primitive_data);
    this.panes.forEach(pane2 => {
      pane2.set_whitespace_data(data, Primitive_data);
    });
  }
  update_whitespace_data(data, Primitive_data) {
    this.main_pane?.update_whitespace_data(data, Primitive_data);
    this.panes.forEach(pane2 => {
      pane2.update_whitespace_data(data, Primitive_data);
    });
  }
  set_symbol(new_symbol) {
    this.symbol = new_symbol;
    this.update_tab(this.symbol.ticker);
    if (this == window.active_frame) window.topbar.setTicker(this.symbol.ticker);
  }
  set_timeframe(new_tf_str) {
    this.timeframe = tf.from_str(new_tf_str);
    if (this == window.active_frame) window.topbar.setTimeframe(this.timeframe);
    let newOpts = {
      timeVisible: false,
      secondsVisible: false
    };
    if (this.timeframe.period === "s") {
      newOpts.timeVisible = true;
      newOpts.secondsVisible = true;
    } else if (this.timeframe.period === "m" || this.timeframe.period === "h") {
      newOpts.timeVisible = true;
    }
    this.main_pane?.update_timescale_opts(newOpts);
    this.panes.forEach(pane2 => {
      pane2.update_timescale_opts(newOpts);
    });
  }
  set_series_type(new_type) {
    this.series_type = new_type;
    if (this == window.active_frame) window.topbar.setSeries(this.series_type);
  }
  add_pane(id) {
    let child_div = document.createElement("div");
    child_div.classList.add("chart_pane");
    this.element.appendChild(child_div);
    let new_pane = new pane(id, child_div);
    if (this.main_pane === void 0) this.main_pane = new_pane;else this.panes.push(new_pane);
    this.resize();
    return new_pane;
  }
  // #endregion
  resize() {
    let this_width = this.element.clientWidth - 2;
    let this_height = this.element.clientHeight - 2;
    this.main_pane?.resize(this_width, this_height);
    this.panes.forEach(pane2 => {
      pane2.resize(this_width, this_height);
    });
  }
  fitcontent() {
    this.main_pane?.fitcontent();
    this.panes.forEach(pane2 => {
      pane2.fitcontent();
    });
  }
  autoscale_content() {
    this.main_pane?.autoscale_time_axis();
    this.panes.forEach(pane2 => {
      pane2.autoscale_time_axis();
    });
  }
}

class container {
  id;
  div;
  style;
  layout;
  frames = [];
  flex_frames = [];
  setDisplay;
  derender;
  update_tab;
  constructor(id, parent_div, update_tab_func) {
    this.id = id;
    this.layout = Container_Layouts.SINGLE;
    this.update_tab = update_tab_func;
    this.div = document.createElement("div");
    this.div.classList.add("container");
    this.div.setAttribute("c-id", id);
    parent_div.appendChild(this.div);
    this.style = document.createElement("style");
    this.div.appendChild(this.style);
    const [display, setDisplay] = createStore([]);
    this.setDisplay = setDisplay;
    const container_props = {
      displays: display
    };
    this.derender = render(() => Container(container_props), this.div);
    this.set_layout(Container_Layouts.SINGLE);
  }
  onShow() {
    window.topbar.setLayout(this.layout);
    for (let i = 0; i < num_frames(this.layout); i++) this.frames[i].onShow();
  }
  onHide() {
    for (let i = 0; i < num_frames(this.layout); i++) this.frames[i].onHide();
  }
  remove() {
    this.derender();
  }
  /**
   * Resize all the child Elements based on the size of the container's Div. 
   */
  resize() {
    resize_frames(this.div.clientWidth, this.div.clientHeight, this.flex_frames);
    let style = "";
    this.flex_frames.forEach((frame2, i) => {
      style += `
            div[c-id=${this.id}] div:nth-child(${i + 2})
            ${frame2.style}`;
    });
    this.style.innerHTML = style;
    for (let i = 0; i < num_frames(this.layout); i++) this.frames[i].resize();
  }
  /**
   * Called by Python when creating a Frame. Returns either a new or an anonymous Frame.
   * 
   * *Anonymous Frames are those created by a layout change, (to fill the frame count)
   *  but have yet to be assigned a proper ID. 
   */
  add_frame(new_id) {
    let rtn_frame = void 0;
    this.frames.some(frame2 => {
      if (frame2.id == "") {
        frame2.id = new_id;
        rtn_frame = frame2;
        return true;
      }
    });
    if (rtn_frame !== void 0) return rtn_frame;else return this._create_frame(new_id);
  }
  /** 
   * Create and configure all the necessary frames & separators for a given layout.
   * protected => should only be called from python
   */
  set_layout(layout) {
    this.flex_frames = layout_switch(layout, this.div, this.resize.bind(this));
    let layout_displays = [];
    let frame_ind = 0;
    this.flex_frames.forEach(flex_frame2 => {
      if (flex_frame2.orientation === Orientation.null) {
        if (frame_ind < this.frames.length) {
          let frame2 = this.frames[frame_ind];
          flex_frame2.mouseDown = frame2.assign_active_frame.bind(frame2);
          layout_displays.push({
            orientation: flex_frame2.orientation,
            mouseDown: flex_frame2.mouseDown,
            element: frame2.element,
            el_active: frame2.active,
            el_target: frame2.target
          });
        } else {
          let new_frame = this._create_frame("");
          flex_frame2.mouseDown = new_frame.assign_active_frame.bind(new_frame);
          layout_displays.push({
            orientation: flex_frame2.orientation,
            mouseDown: flex_frame2.mouseDown,
            element: new_frame.element,
            el_active: new_frame.active,
            el_target: new_frame.target
          });
        }
        frame_ind += 1;
      } else {
        layout_displays.push({
          orientation: flex_frame2.orientation,
          mouseDown: flex_frame2.mouseDown,
          element: void 0,
          el_active: () => false,
          el_target: () => false
        });
      }
    });
    this.setDisplay(layout_displays);
    this.layout = layout;
    setTimeout(() => window.container_manager.set_active_container(this.id), 50);
    this.resize();
    window.topbar.setLayout(layout);
  }
  /**
   * Creates a new Frame that's tied to the DIV element given in specs.
   */
  _create_frame(id = "") {
    let new_frame = new chart_frame(id, this.update_tab);
    this.frames.push(new_frame);
    return new_frame;
  }
}

const Draggabilly = (vitePluginRequire_1722615218630_97351255);
const defaultTabProperties = {
  title: "LWPC",
  favicon: null
};
let container_manager$1 = class container_manager {
  container_el;
  containers = /* @__PURE__ */new Map();
  tab_els = /* @__PURE__ */new Map();
  constructor(container_el, tabs_el) {
    this.tab_manager.init(tabs_el);
    this.container_el = container_el;
  }
  /**
   * Generate a new container and makes it the window's active container 
   * Protected to indicate it should only be called from Python
   */
  add_container(id) {
    const new_tab_el = this.tab_manager.addTab(id);
    const tmp_ref = new container(id, this.container_el, this.tab_manager.updateTab.bind(void 0, new_tab_el));
    this.tab_els.set(id, new_tab_el);
    this.containers.set(id, tmp_ref);
    this.set_active_container(id);
    return tmp_ref;
  }
  /**
   * Removes a Container, and all its children, from the entire interface.
   * Protected method that should only be called from Python
   */
  remove_container(id) {
    const tab_el = this.tab_els.get(id);
    const container_obj = this.containers.get(id);
    if (container_obj) {
      container_obj.remove();
      container_obj.div.remove();
    }
    if (tab_el) this.tab_manager.removeTab(tab_el);
    this.tab_els.delete(id);
    this.containers.delete(id);
  }
  /**
   * Changes which container is displayed by the app.
   */
  set_active_container(id) {
    const container_obj = this.containers.get(id);
    if (container_obj === void 0 || container_obj === window.active_container) return;
    const tab_el = this.tab_els.get(id);
    if (tab_el) this.tab_manager.setCurrentTab(tab_el);
    if (window.active_container) {
      window.active_container.div.removeAttribute("active");
      window.active_container.onHide();
    }
    window.active_container = container_obj;
    container_obj.div.setAttribute("active", "");
    container_obj.onShow();
    container_obj.resize();
  }
  /**
   * Private Inner Class to separate the responsibility of animating, sizing, and updating
   * Each tab Object. This is an immediately invoked class that requires initialization before use.
   */
  tab_manager = new class {
    el;
    styleEl;
    isDragging;
    //@ts-ignore
    draggabillies;
    //@ts-ignore
    draggabillyDragging = null;
    constructor() {
      this.draggabillies = [];
      this.isDragging = false;
      this.el = document.createElement("div");
      this.styleEl = document.createElement("style");
    }
    init(tabs_el) {
      this.el = tabs_el;
      this.el.style.setProperty("--tab-content-margin", `${TAB_CONTENT_MARGIN}px`);
      this.el.appendChild(this.styleEl);
      window.addEventListener("resize", () => {
        this.cleanUpPreviouslyDraggedTabs();
        this.layoutTabs();
      });
      this.el.addEventListener("dblclick", event => {
        if (event.target === this.el || event.target === this.tabContentEl) window.api.add_container();
      });
      this.layoutTabs();
      this.setupDraggabilly();
    }
    get activeTabEl() {
      return this.el.querySelector(".tab[active]");
    }
    get tabContentEl() {
      return this.el.querySelector(".tabs-content");
    }
    get tabEls() {
      return Array.prototype.slice.call(this.el.querySelectorAll(".tab"));
    }
    get tabContentWidths() {
      const numberOfTabs = this.tabEls.length;
      const tabsContentWidth = this.tabContentEl.clientWidth;
      const tabsCumulativeOverlappedWidth = (numberOfTabs - 1) * TAB_CONTENT_OVERLAP_DISTANCE;
      const targetWidth = (tabsContentWidth - 2 * TAB_CONTENT_MARGIN + tabsCumulativeOverlappedWidth) / numberOfTabs;
      const clampedTargetWidth = Math.floor(Math.max(TAB_CONTENT_MIN_WIDTH, Math.min(TAB_CONTENT_MAX_WIDTH, targetWidth)));
      const totalTabsWidthUsingTarget = clampedTargetWidth * numberOfTabs + 2 * TAB_CONTENT_MARGIN - tabsCumulativeOverlappedWidth;
      const totalExtraWidthDueToFlooring = tabsContentWidth - totalTabsWidthUsingTarget;
      const widths = [];
      let extraWidthRemaining = totalExtraWidthDueToFlooring;
      for (let i = 0; i < numberOfTabs; i += 1) {
        const extraWidth = clampedTargetWidth < TAB_CONTENT_MAX_WIDTH && extraWidthRemaining > 0 ? 1 : 0;
        widths.push(clampedTargetWidth + extraWidth);
        if (extraWidthRemaining > 0) extraWidthRemaining -= 1;
      }
      return widths;
    }
    get tabContentPositions() {
      const positions = [];
      const tabContentWidths = this.tabContentWidths;
      let position = TAB_CONTENT_MARGIN;
      tabContentWidths.forEach((width, i) => {
        const offset = i * TAB_CONTENT_OVERLAP_DISTANCE;
        positions.push(position - offset);
        position += width;
      });
      return positions;
    }
    get tabPositions() {
      const positions = [];
      this.tabContentPositions.forEach(contentPosition => {
        positions.push(contentPosition - TAB_CONTENT_MARGIN);
      });
      return positions;
    }
    layoutTabs() {
      const tabContentWidths = this.tabContentWidths;
      this.tabEls.forEach((tabEl, i) => {
        const contentWidth = tabContentWidths[i];
        const width = contentWidth + 2 * TAB_CONTENT_MARGIN;
        tabEl.style.width = width + "px";
        tabEl.removeAttribute("is-mini");
        tabEl.removeAttribute("is-small");
        tabEl.removeAttribute("is-smaller");
        if (contentWidth < TAB_SIZE_MINI) tabEl.setAttribute("is-mini", "");
        if (contentWidth < TAB_SIZE_SMALL) tabEl.setAttribute("is-small", "");
        if (contentWidth < TAB_SIZE_SMALLER) tabEl.setAttribute("is-smaller", "");
      });
      let styleHTML = "";
      this.tabPositions.forEach((position, i) => {
        styleHTML += `.tabs .tab:nth-child(${i + 1}) {transform: translate3d(${position}px, 0, 0)} `;
      });
      this.styleEl.innerHTML = styleHTML;
    }
    createNewTabEl() {
      const div = document.createElement("div");
      div.innerHTML = tabTemplate;
      return div.firstElementChild;
    }
    addTab(container_id, {
      animate = true,
      background = false
    } = {}) {
      const tabEl = this.createNewTabEl();
      tabEl.setAttribute("data-id", container_id);
      if (animate) {
        tabEl.classList.add("tab-was-just-added");
        setTimeout(() => tabEl.classList.remove("tab-was-just-added"), 500);
      }
      this.tabContentEl.appendChild(tabEl);
      this.updateTab(tabEl, defaultTabProperties.title, defaultTabProperties.price, defaultTabProperties.favicon);
      if (!background) this.setCurrentTab(tabEl);
      this.cleanUpPreviouslyDraggedTabs();
      this.layoutTabs();
      this.setupDraggabilly();
      let close_div = tabEl.querySelector(".tab-close");
      close_div.addEventListener("click", () => {
        window.api.remove_container(container_id);
      });
      return tabEl;
    }
    hasActiveTab() {
      return !!this.activeTabEl;
    }
    setCurrentTab(tabEl) {
      const activeTabEl = this.activeTabEl;
      if (activeTabEl === tabEl) return;
      if (activeTabEl) activeTabEl.removeAttribute("active");
      tabEl.setAttribute("active", "");
    }
    removeTab(tabEl) {
      if (tabEl === this.activeTabEl) {
        if (tabEl.nextElementSibling) {
          window.container_manager.set_active_container(tabEl.nextElementSibling.getAttribute("data-id"));
        } else if (tabEl.previousElementSibling) {
          window.container_manager.set_active_container(tabEl.previousElementSibling.getAttribute("data-id"));
        }
      }
      tabEl.remove();
      this.cleanUpPreviouslyDraggedTabs();
      this.layoutTabs();
      this.setupDraggabilly();
    }
    updateTab(tabEl, title, price, favicon) {
      const tab_title = tabEl.querySelector(".tab-title");
      const tab_price = tabEl.querySelector(".tab-price");
      tab_title.textContent = title ?? "";
      if (price) {
        tab_price.textContent = price;
        tab_price.removeAttribute("empty");
      } else {
        tab_price.setAttribute("empty", "");
      }
      const faviconEl = tabEl.querySelector(".tab-favicon");
      if (favicon) {
        faviconEl.style.backgroundImage = `url('${favicon}')`;
        faviconEl.removeAttribute("hidden");
      } else {
        faviconEl.setAttribute("hidden", "");
        faviconEl.removeAttribute("style");
      }
    }
    cleanUpPreviouslyDraggedTabs() {
      this.tabEls.forEach(tabEl => tabEl.classList.remove("tab-was-just-dragged"));
    }
    setupDraggabilly() {
      const tabEls = this.tabEls;
      const tabPositions = this.tabPositions;
      if (this.isDragging) {
        this.isDragging = false;
        this.el.classList.remove("tabs-is-sorting");
        this.draggabillyDragging.element.classList.remove("tab-is-dragging");
        this.draggabillyDragging.element.style.transform = "";
        this.draggabillyDragging.dragEnd();
        this.draggabillyDragging.isDragging = false;
        this.draggabillyDragging.positionDrag = () => {};
        this.draggabillyDragging.destroy();
        this.draggabillyDragging = null;
      }
      this.draggabillies.forEach(d => d.destroy());
      tabEls.forEach((tabEl, originalIndex) => {
        const originalTabPositionX = tabPositions[originalIndex];
        const draggabilly = new Draggabilly(tabEl, {
          axis: "x",
          handle: ".tab-drag-handle",
          containment: this.tabContentEl
        });
        this.draggabillies.push(draggabilly);
        draggabilly.on("pointerDown", () => {
          window.container_manager.set_active_container(tabEl.getAttribute("data-id"));
        });
        draggabilly.on("dragStart", () => {
          this.isDragging = true;
          this.draggabillyDragging = draggabilly;
          tabEl.classList.add("tab-is-dragging");
          this.el.classList.add("tabs-is-sorting");
        });
        draggabilly.on("dragEnd", () => {
          this.isDragging = false;
          const finalTranslateX = parseFloat(tabEl.style.left);
          tabEl.style.transform = `translate3d(0, 0, 0)`;
          requestAnimationFrame(() => {
            tabEl.style.left = "0";
            tabEl.style.transform = `translate3d(${finalTranslateX}px, 0, 0)`;
            requestAnimationFrame(() => {
              tabEl.classList.remove("tab-is-dragging");
              this.el.classList.remove("tabs-is-sorting");
              tabEl.classList.add("tab-was-just-dragged");
              requestAnimationFrame(() => {
                tabEl.style.transform = "";
                this.layoutTabs();
                this.setupDraggabilly();
              });
            });
          });
        });
        draggabilly.on("dragMove", (event, pointer, moveVector) => {
          const tabEls2 = this.tabEls;
          const currentIndex = tabEls2.indexOf(tabEl);
          const currentTabPositionX = originalTabPositionX + moveVector.x;
          const destinationIndexTarget = closest(currentTabPositionX, tabPositions);
          const destinationIndex = Math.max(0, Math.min(tabEls2.length, destinationIndexTarget));
          if (currentIndex !== destinationIndex) {
            this.animateTabMove(tabEl, currentIndex, destinationIndex);
          }
        });
      });
    }
    animateTabMove(tabEl, originIndex, destinationIndex) {
      if (destinationIndex < originIndex) {
        if (tabEl.parentNode) tabEl.parentNode.insertBefore(tabEl, this.tabEls[destinationIndex]);
      } else {
        if (tabEl.parentNode) tabEl.parentNode.insertBefore(tabEl, this.tabEls[destinationIndex + 1]);
      }
      window.api.reorder_containers(originIndex, destinationIndex);
      this.layoutTabs();
    }
  }();
};
const TAB_SIZE_MINI = 28;
const TAB_SIZE_SMALL = 110;
const TAB_SIZE_SMALLER = 54;
const TAB_CONTENT_MARGIN = 9;
const TAB_CONTENT_OVERLAP_DISTANCE = 1;
const TAB_CONTENT_MIN_WIDTH = 24;
const TAB_CONTENT_MAX_WIDTH = 180;
function closest(value, array) {
  let closest2 = Infinity;
  let closestIndex = -1;
  array.forEach((v, i) => {
    if (Math.abs(value - v) < closest2) {
      closest2 = Math.abs(value - v);
      closestIndex = i;
    }
  });
  return closestIndex;
}
const tabTemplate = `
    <div class="tab">
        <div class="tab-dividers"></div>
        <div class="tab-background">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <symbol id="tab-geometry-left" viewBox="0 0 214 36"><path d="M17 0h197v36H0v-2c4.5 0 9-3.5 9-8V8c0-4.5 3.5-8 8-8z"/></symbol>
                    <symbol id="tab-geometry-right" viewBox="0 0 214 36"><use xlink:href="#tab-geometry-left"/></symbol>
                    <clipPath id="crop"><rect class="mask" width="100%" height="100%" x="0"/></clipPath>
                </defs>
                <svg width="52%" height="100%"><use xlink:href="#tab-geometry-left" width="214" height="36" class="tab-geometry"/></svg>
                <g transform="scale(-1, 1)"><svg width="52%" height="100%" x="-100%" y="0"><use xlink:href="#tab-geometry-right" width="214" height="36" class="tab-geometry"/></svg></g>
            </svg>
        </div>
        <div class="tab-content">
            <div class="tab-favicon"></div>
            <div class="tab-title"></div>
            <div class="tab-price"></div>
            <div class="tab-drag-handle"></div>
            <div class="tab-close"></div>
        </div>
    </div>
`;

var _tmpl$$b = /* @__PURE__ */template(`<svg>`),
  _tmpl$2$6 = /* @__PURE__ */template(`<div>`);
const [SVG_DOC] = createResource(async () => await fetch("./svg-defs.svg").then(resp => resp.text().then(svg_file_text => {
  let parser = new DOMParser();
  return parser.parseFromString(svg_file_text, "text/html");
})));
const DEFAULT_PROPS = {
  icon: "close_small",
  hover: true,
  activated: void 0
};
function Icon(props) {
  let icon_el;
  const merged = mergeProps(DEFAULT_PROPS, props);
  merged.classList = {
    icon: merged.hover,
    icon_no_hover: !merged.hover,
    ...merged.classList
  };
  const [iconProps, svgProps] = splitProps(merged, ["icon", "hover", "activated"]);
  let propKeys = Object.keys({
    ...svgProps,
    "class": "",
    "active": ""
  });
  createEffect(() => {
    let svg_ref = SVG_DOC()?.querySelector(`#${iconProps.icon}`);
    if (icon_el && svg_ref) {
      svg_ref = svg_ref.cloneNode(true);
      icon_el.replaceChildren(...Array.from(svg_ref.children));
      let static_keys = 0;
      while (icon_el.attributes.length > static_keys) if (propKeys.includes(icon_el.attributes[static_keys].name)) static_keys += 1;else icon_el.removeAttribute(icon_el.attributes[static_keys].name);
      let attrs = svg_ref.attributes;
      for (let i = 0; i < attrs.length; i++) if (!propKeys.includes(attrs[i].name)) icon_el.setAttribute(attrs[i].name, attrs[i].value);
    }
  });
  return (() => {
    var _el$ = _tmpl$$b();
    var _ref$ = icon_el;
    typeof _ref$ === "function" ? use(_ref$, _el$) : icon_el = _el$;
    spread(_el$, svgProps, true, false);
    createRenderEffect(() => setAttribute(_el$, "active", iconProps.activated ? "" : void 0));
    return _el$;
  })();
}
const DEFAULT_TEXT_PROPS = {
  text: "",
  activated: void 0
};
function TextIcon(props) {
  const merged = mergeProps(DEFAULT_TEXT_PROPS, props);
  merged.classList = mergeProps({
    icon_text: true
  }, props.classList);
  const [iconProps, divProps] = splitProps(merged, ["text", "activated"]);
  return (() => {
    var _el$2 = _tmpl$2$6();
    spread(_el$2, divProps, false, true);
    insert(_el$2, () => iconProps.text);
    createRenderEffect(() => setAttribute(_el$2, "active", iconProps.activated ? "" : void 0));
    return _el$2;
  })();
}
var icons = /* @__PURE__ */(icons2 => {
  icons2["blank"] = "blank";
  icons2["menu"] = "menu";
  icons2["menu_add"] = "menu_add";
  icons2["menu_ext"] = "menu_ext";
  icons2["menu_ext_small"] = "menu_ext_small";
  icons2["menu_search"] = "menu_search";
  icons2["menu_search_quick"] = "menu_search_quick";
  icons2["menu_arrow_we"] = "menu_arrow_we";
  icons2["menu_arrow_ew"] = "menu_arrow_ew";
  icons2["menu_arrow_ns"] = "menu_arrow_ns";
  icons2["menu_arrow_sn"] = "menu_arrow_sn";
  icons2["menu_arrow_up_down"] = "menu_arrow_up_down";
  icons2["menu_dragable"] = "menu_dragable";
  icons2["panel_top"] = "panel_top";
  icons2["panel_left"] = "panel_left";
  icons2["panel_right"] = "panel_right";
  icons2["panel_bottom"] = "panel_bottom";
  icons2["cursor_cross"] = "cursor_cross";
  icons2["cursor_dot"] = "cursor_dot";
  icons2["cursor_arrow"] = "cursor_arrow";
  icons2["cursor_erase"] = "cursor_erase";
  icons2["candle_heiken_ashi"] = "candle_heiken_ashi";
  icons2["candle_regular"] = "candle_regular";
  icons2["candle_bar"] = "candle_bar";
  icons2["candle_hollow"] = "candle_hollow";
  icons2["candle_volume"] = "candle_volume";
  icons2["candle_rounded"] = "candle_rounded";
  icons2["series_line"] = "series_line";
  icons2["series_line_markers"] = "series_line_markers";
  icons2["series_step_line"] = "series_step_line";
  icons2["series_area"] = "series_area";
  icons2["series_baseline"] = "series_baseline";
  icons2["series_histogram"] = "series_histogram";
  icons2["indicator"] = "indicator";
  icons2["indicator_template"] = "indicator_template";
  icons2["indicator_on_stratagy"] = "indicator_on_stratagy";
  icons2["eye_normal"] = "eye_normal";
  icons2["eye_crossed"] = "eye_crossed";
  icons2["eye_loading"] = "eye_loading";
  icons2["eye_loading_animated"] = "eye_loading_animated";
  icons2["undo"] = "undo";
  icons2["redo"] = "redo";
  icons2["copy"] = "copy";
  icons2["edit"] = "edit";
  icons2["close"] = "close";
  icons2["reset"] = "reset";
  icons2["close_small"] = "close_small";
  icons2["settings"] = "settings";
  icons2["settings_small"] = "settings_small";
  icons2["add_section"] = "add_section";
  icons2["maximize"] = "maximize";
  icons2["minimize"] = "minimize";
  icons2["restore"] = "restore";
  icons2["window_add"] = "window_add";
  icons2["fib_retrace"] = "fib_retrace";
  icons2["fib_extend"] = "fib_extend";
  icons2["trend_line"] = "trend_line";
  icons2["trend_ray"] = "trend_ray";
  icons2["trend_extended"] = "trend_extended";
  icons2["horiz_line"] = "horiz_line";
  icons2["horiz_ray"] = "horiz_ray";
  icons2["vert_line"] = "vert_line";
  icons2["channel_parallel"] = "channel_parallel";
  icons2["channel_disjoint"] = "channel_disjoint";
  icons2["brush"] = "brush";
  icons2["highlighter"] = "highlighter";
  icons2["polyline"] = "polyline";
  icons2["magnet"] = "magnet";
  icons2["magnet_strong"] = "magnet_strong";
  icons2["anchored_vwap"] = "anchored_vwap";
  icons2["link"] = "link";
  icons2["star"] = "star";
  icons2["star_filled"] = "star_filled";
  icons2["trash"] = "trash";
  icons2["snapshot"] = "snapshot";
  icons2["text_note"] = "text_note";
  icons2["lock_unlocked"] = "lock_unlocked";
  icons2["lock_locked"] = "lock_locked";
  icons2["ruler"] = "ruler";
  icons2["bar_pattern"] = "bar_pattern";
  icons2["bar_ghost_feed"] = "bar_ghost_feed";
  icons2["vol_profile_fixed"] = "vol_profile_fixed";
  icons2["vol_profile_anchored"] = "vol_profile_anchored";
  icons2["range_price"] = "range_price";
  icons2["range_date"] = "range_date";
  icons2["range_price_date"] = "range_price_date";
  icons2["watchlist"] = "watchlist";
  icons2["data_window"] = "data_window";
  icons2["calendar"] = "calendar";
  icons2["calendar_to_date"] = "calendar_to_date";
  icons2["alert"] = "alert";
  icons2["alert_large"] = "alert_large";
  icons2["alert_add"] = "alert_add";
  icons2["alert_notification"] = "alert_notification";
  icons2["replay"] = "replay";
  icons2["object_tree"] = "object_tree";
  icons2["hotlist"] = "hotlist";
  icons2["light_bulb_off"] = "light_bulb_off";
  icons2["light_bulb_on"] = "light_bulb_on";
  icons2["question_mark"] = "question_mark";
  icons2["pie_chart"] = "pie_chart";
  icons2["box_fullscreen"] = "box_fullscreen";
  icons2["layout_single"] = "layout_single";
  icons2["layout_double_vert"] = "layout_double_vert";
  icons2["layout_double_horiz"] = "layout_double_horiz";
  icons2["layout_triple_horiz"] = "layout_triple_horiz";
  icons2["layout_triple_top"] = "layout_triple_top";
  icons2["layout_triple_vert"] = "layout_triple_vert";
  icons2["layout_triple_left"] = "layout_triple_left";
  icons2["layout_triple_right"] = "layout_triple_right";
  icons2["layout_triple_bottom"] = "layout_triple_bottom";
  icons2["layout_quad_sq_v"] = "layout_quad_v";
  icons2["layout_quad_sq_h"] = "layout_quad_h";
  icons2["layout_quad_vert"] = "layout_quad_vert";
  icons2["layout_quad_horiz"] = "layout_quad_horiz";
  icons2["layout_quad_top"] = "layout_quad_top";
  icons2["layout_quad_left"] = "layout_quad_left";
  icons2["layout_quad_right"] = "layout_quad_right";
  icons2["layout_quad_bottom"] = "layout_quad_bottom";
  return icons2;
})(icons || {});

const default_togglebtn = {
  icon: "",
  activated: false,
  onAct: () => {
    console.log("Button Activated!");
  },
  onDeact: () => {
    console.log("Button Deactivated!");
  }
};
function ToggleBtn(props) {
  const merged = mergeProps(default_togglebtn, props);
  const [activated, setActivated] = createSignal(merged.activated);
  const [, iconProps] = splitProps(merged, ["onAct", "onDeact"]);
  iconProps.onClick = () => {
    setActivated(!activated());
    if (activated() && merged.onAct) merged.onAct();else if (!activated() && merged.onDeact) merged.onDeact();
  };
  if (activated() && merged.onAct) merged.onAct();else if (!activated() && merged.onDeact) merged.onDeact();
  return createComponent(Icon, mergeProps(iconProps, {
    get activated() {
      return activated();
    }
  }));
}

var _tmpl$$a = /* @__PURE__ */template(`<div class=titlebar_separator>`),
  _tmpl$2$5 = /* @__PURE__ */template(`<div id=layout_title class="layout_title layout_flex"><div class="titlebar titlebar_grab tabs drag-region"><div class=tabs-content></div></div><div class="titlebar titlebar_btns drag-region"><div class=titlebar_separator>`);
function TitleBar(props) {
  let tab_div;
  const [frameless, setFrameless] = createSignal(false);
  const [fullscreen, setFullscreen] = createSignal(false);
  window.api.setFrameless = setFrameless;
  onMount(() => {
    if (tab_div) window.container_manager = new container_manager$1(props.container_el, tab_div);
  });
  return (() => {
    var _el$ = _tmpl$2$5(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling,
      _el$4 = _el$3.firstChild;
    var _ref$ = tab_div;
    typeof _ref$ === "function" ? use(_ref$, _el$2) : tab_div = _el$2;
    insert(_el$3, createComponent(Icon, {
      get icon() {
        return icons.window_add;
      },
      classList: {
        window_btn: true
      },
      style: {
        padding: "1px 3px"
      },
      onClick: () => {
        window.api.add_container();
      }
    }), _el$4);
    insert(_el$3, createComponent(ToggleBtn, {
      get icon() {
        return icons.panel_left;
      },
      classList: {
        layout_btn: true
      },
      activated: true,
      onAct: () => {
        props.show_section(LAYOUT_SECTIONS.TOOL_BAR);
      },
      onDeact: () => {
        props.hide_section(LAYOUT_SECTIONS.TOOL_BAR);
      }
    }), null);
    insert(_el$3, createComponent(ToggleBtn, {
      get icon() {
        return icons.panel_right;
      },
      classList: {
        layout_btn: true
      },
      onAct: () => {
        props.show_section(LAYOUT_SECTIONS.NAV_BAR);
      },
      onDeact: () => {
        props.hide_section(LAYOUT_SECTIONS.NAV_BAR);
      }
    }), null);
    insert(_el$3, createComponent(ToggleBtn, {
      get icon() {
        return icons.panel_top;
      },
      classList: {
        layout_btn: true
      },
      activated: true,
      onAct: () => {
        props.show_section(LAYOUT_SECTIONS.TOP_BAR);
      },
      onDeact: () => {
        props.hide_section(LAYOUT_SECTIONS.TOP_BAR);
      }
    }), null);
    insert(_el$3, createComponent(ToggleBtn, {
      get icon() {
        return icons.panel_bottom;
      },
      classList: {
        layout_btn: true
      },
      onAct: () => {
        props.show_section(LAYOUT_SECTIONS.UTIL_BAR);
      },
      onDeact: () => {
        props.hide_section(LAYOUT_SECTIONS.UTIL_BAR);
      }
    }), null);
    insert(_el$3, createComponent(Show, {
      get when() {
        return frameless();
      },
      get children() {
        return [_tmpl$$a(), createComponent(Icon, {
          get icon() {
            return icons.minimize;
          },
          classList: {
            window_btn: true
          },
          style: {
            padding: "3px"
          },
          width: 16,
          height: 16,
          onClick: () => {
            window.api.minimize();
          }
        }), createComponent(Show, {
          get when() {
            return fullscreen();
          },
          get children() {
            return [createComponent(Icon, {
              get icon() {
                return icons.restore;
              },
              classList: {
                window_btn: true
              },
              onClick: () => {
                setFullscreen(false);
                window.api.restore();
              }
            }), " "];
          }
        }), createComponent(Show, {
          get when() {
            return !fullscreen();
          },
          get children() {
            return [" ", createComponent(Icon, {
              get icon() {
                return icons.maximize;
              },
              classList: {
                window_btn: true
              },
              style: {
                padding: "2px"
              },
              onClick: () => {
                setFullscreen(true);
                window.api.maximize();
              }
            }), " "];
          }
        }), createComponent(Icon, {
          get icon() {
            return icons.close;
          },
          classList: {
            window_btn: true
          },
          style: {
            padding: "3px"
          },
          width: 16,
          height: 16,
          onClick: () => {
            window.api.close();
          }
        })];
      }
    }), null);
    createRenderEffect(_$p => style(_el$, props.style, _$p));
    return _el$;
  })();
}

const TOOL_FUNC_MAP = /* @__PURE__ */new Map([[icons.trend_line, trend_line]]);
function trend_line() {}

var _tmpl$$9 = /* @__PURE__ */template(`<div>`),
  _tmpl$2$4 = /* @__PURE__ */template(`<div class=menu_section_titlebox><span class="menu_section_text text">`),
  _tmpl$3$1 = /* @__PURE__ */template(`<div class=menu_section>`),
  _tmpl$4$1 = /* @__PURE__ */template(`<span class=menu_text>`),
  _tmpl$5$1 = /* @__PURE__ */template(`<div><span class=menu_selectable>`);
function ShowMenuButton(props) {
  let el = document.createElement("div");
  const [, divProps] = splitProps(props, ["id", "style", "icon_act", "icon_deact"]);
  const display = OverlayCTX().getDisplayAccessor(props.id);
  const setDisplay = OverlayCTX().getDisplaySetter(props.id);
  onMount(() => {
    el.addEventListener("mousedown", e => {
      if (e.button === 0) {
        setDisplay(!display());
        e.stopPropagation();
      }
    });
  });
  return (() => {
    var _el$ = _tmpl$$9();
    var _ref$ = el;
    typeof _ref$ === "function" ? use(_ref$, _el$) : el = _el$;
    spread(_el$, divProps, false, true);
    insert(_el$, createComponent(Icon, {
      get icon() {
        return display() ? props.icon_act : props.icon_deact;
      }
    }));
    return _el$;
  })();
}
function MenuSection(props) {
  const [display, setDisplay] = createSignal(props.showByDefault);
  return [(() => {
    var _el$2 = _tmpl$2$4(),
      _el$3 = _el$2.firstChild;
    _el$2.$$click = () => setDisplay(!display());
    insert(_el$3, () => props.label.toUpperCase());
    insert(_el$2, createComponent(Icon, {
      get icon() {
        return display() ? icons.menu_arrow_sn : icons.menu_arrow_ns;
      }
    }), null);
    return _el$2;
  })(), createComponent(Show, {
    get when() {
      return display();
    },
    get children() {
      var _el$4 = _tmpl$3$1();
      insert(_el$4, () => props.children);
      createRenderEffect(_$p => style(_el$4, props.style, _$p));
      return _el$4;
    }
  })];
}
const menuItemPropNames = ["label", "icon", "data", "onSel", "expand", "star", "starAct", "starDeact", "starStyle"];
function MenuItem(props) {
  const [showStar, setShowStar] = createSignal(false);
  props.classList = mergeProps(props.classList, {
    menu_item: true
  });
  if (props.expand === void 0) props.expand = false;
  const [menuProps, divProps] = splitProps(props, menuItemPropNames);
  return (() => {
    var _el$5 = _tmpl$5$1(),
      _el$6 = _el$5.firstChild;
    spread(_el$5, mergeProps(divProps, {
      "onmouseenter": () => setShowStar(true),
      "onMouseLeave": () => setShowStar(false)
    }), false, true);
    _el$6.$$click = e => {
      if (e.button === 0 && props.onSel) props.onSel();
    };
    insert(_el$6, createComponent(Show, {
      get when() {
        return menuProps.icon;
      },
      get children() {
        return createComponent(Icon, {
          get icon() {
            return menuProps.icon ?? "";
          }
        });
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return menuProps.label;
      },
      get children() {
        var _el$7 = _tmpl$4$1();
        insert(_el$7, () => menuProps.label);
        return _el$7;
      }
    }), null);
    insert(_el$5, createComponent(Show, {
      get when() {
        return menuProps.star !== void 0;
      },
      get children() {
        return createComponent(MenuItemStar, {
          get visible() {
            return showStar();
          },
          get selected() {
            return menuProps.star ?? false;
          },
          get starAct() {
            return menuProps.starAct;
          },
          get starDeact() {
            return menuProps.starDeact;
          },
          get style() {
            return props.starStyle ?? {};
          }
        });
      }
    }), null);
    createRenderEffect(_$p => (_$p = menuProps.expand ? "-webkit-fill-available" : void 0) != null ? _el$6.style.setProperty("width", _$p) : _el$6.style.removeProperty("width"));
    return _el$5;
  })();
}
function MenuItemStar(props) {
  const [selected, setSelected] = createSignal(props.selected);
  function toggleState() {
    setSelected(!selected());
    if (selected() && props.starAct) props.starAct();else if (props.starDeact) props.starDeact();
  }
  return createComponent(Icon, {
    "class": "menu_item_star",
    onClick: e => {
      if (e.button === 0) toggleState();
    },
    get icon() {
      return selected() ? icons.star_filled : icons.star;
    },
    get style() {
      return {
        color: selected() ? "var(--second-accent-color)" : props.visible ? void 0 : "#0000",
        ...props.style
      };
    }
  });
}
delegateEvents(["click"]);

var _tmpl$$8 = /* @__PURE__ */template(`<div class=toolbar_container>`),
  _tmpl$2$3 = /* @__PURE__ */template(`<div class=menu_section_titlebox>`);
function ToolBarMenuButton(props) {
  let el = document.createElement("div");
  const [location, setLocation] = createSignal({
    x: 0,
    y: 0
  });
  const [iconDeact, seticonDeact] = createSignal(icons.blank);
  const [displayIcon, setDisplayIcon] = createSignal(props.default_icon);
  const updateLocation = () => {
    setLocation({
      x: el.getBoundingClientRect().right,
      y: el.getBoundingClientRect().top
    });
  };
  OverlayCTX().attachOverlay(props.id, createComponent(ToolBarOverlay, {
    get id() {
      return props.id;
    },
    get location() {
      return location();
    },
    updateLocation,
    get tools() {
      return props.tools;
    },
    setIcon: setDisplayIcon
  }));
  return (() => {
    var _el$ = _tmpl$$8();
    _el$.addEventListener("mouseleave", () => seticonDeact(icons.blank));
    _el$.addEventListener("mouseenter", () => seticonDeact(icons.menu_arrow_ew));
    var _ref$ = el;
    typeof _ref$ === "function" ? use(_ref$, _el$) : el = _el$;
    insert(_el$, createComponent(Icon, {
      get icon() {
        return displayIcon();
      },
      classList: {
        toolbar_icon_btn: true
      }
    }), null);
    insert(_el$, createComponent(ShowMenuButton, {
      get id() {
        return props.id;
      },
      classList: {
        toolbar_menu_button: true
      },
      get icon_act() {
        return icons.menu_arrow_we;
      },
      get icon_deact() {
        return iconDeact();
      }
    }), null);
    return _el$;
  })();
}
function ToolBarOverlay(props) {
  const tools = ToolBoxCTX().tools;
  const setTools = ToolBoxCTX().setTools;
  const [, overlayDivProps] = splitProps(props, ["tools", "setIcon"]);
  function addFavorite(tool) {
    if (!tools().includes(tool)) setTools([...tools(), tool]);
  }
  function removeFavorite(tool) {
    if (tools().includes(tool)) setTools(tools().filter(fav => fav != tool));
  }
  function onSel(tool) {
    props.setIcon(tool);
    const tool_func = TOOL_FUNC_MAP.get(tool);
    if (tool_func) tool_func();else console.log("invalid tool");
  }
  return createComponent(OverlayDiv, mergeProps(overlayDivProps, {
    get location_ref() {
      return location_reference.TOP_LEFT;
    },
    get children() {
      return createComponent(For, {
        get each() {
          return props.tools;
        },
        children: tools_sublist => [_tmpl$2$3(), createComponent(For, {
          each: tools_sublist,
          children: tool => createComponent(MenuItem, {
            expand: true,
            icon: tool,
            get label() {
              return TOOL_LABEL_MAP.get(tool) ?? "";
            },
            onSel: () => onSel(tool),
            get star() {
              return tools().includes(tool);
            },
            starAct: () => addFavorite(tool),
            starDeact: () => removeFavorite(tool),
            starStyle: {
              width: "20px",
              height: "20px"
            }
          })
        })]
      });
    }
  }));
}
const TOOL_LABEL_MAP = /* @__PURE__ */new Map([[icons.cursor_cross, "Cross"], [icons.cursor_dot, "Dot"], [icons.cursor_arrow, "Arrow"], [icons.cursor_erase, "Erase"], [icons.trend_line, "Trend Line"], [icons.horiz_ray, "Horiz. Ray"], [icons.horiz_line, "Horiz. Line"], [icons.vert_line, "Vert. Line"], [icons.polyline, "Polyline"], [icons.channel_parallel, "Parallel Channel"], [icons.channel_disjoint, "Disjoint Channel"], [icons.fib_retrace, "Fib. Retrace"], [icons.fib_extend, "Fib. Extention"], [icons.range_price, "Price Range"], [icons.range_date, "Date Range"], [icons.range_price_date, "Price & Date Range"]
// [icons., ""],
]);

var _tmpl$$7 = /* @__PURE__ */template(`<div id=layout_left class="layout_main layout_flex"><div class=toolbar><div class=toolbar_separator></div></div><div class=toolbar><div class=toolbar_separator>`),
  _tmpl$2$2 = /* @__PURE__ */template(`<div class=toolbox_btn_wrap>`);
function ToolBar(props) {
  return (() => {
    var _el$ = _tmpl$$7(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild,
      _el$4 = _el$2.nextSibling;
      _el$4.firstChild;
    spread(_el$, props, false, true);
    _el$2.style.setProperty("justify-content", "flex-start");
    insert(_el$2, createComponent(ToolBarMenuButton, crosshair_menu_props), _el$3);
    insert(_el$2, createComponent(ToolBarMenuButton, trend_menu_props), _el$3);
    insert(_el$2, createComponent(ToolBarMenuButton, fib_menu_props), _el$3);
    insert(_el$2, createComponent(ToolBarMenuButton, measure_menu_props), _el$3);
    _el$4.style.setProperty("justify-content", "flex-end");
    insert(_el$4, createComponent(ToolBoxToggle, {}), null);
    return _el$;
  })();
}
function ToolBoxToggle() {
  const id = "toolbox";
  let visibility = OverlayCTX().getDisplayAccessor(id);
  let setVisibility = OverlayCTX().getDisplaySetter(id);
  onMount(() => {
    visibility = OverlayCTX().getDisplayAccessor(id);
    setVisibility = OverlayCTX().getDisplaySetter(id);
  });
  OverlayCTX().attachOverlay(id, createComponent(ToolBoxOverlay, {
    id
  }), false
  // Don't Auto Hide. Only Toggle Btn Should change visibility
  );
  return (() => {
    var _el$6 = _tmpl$2$2();
    _el$6.$$mousedown = () => setVisibility(!visibility());
    insert(_el$6, createComponent(Icon, {
      get icon() {
        return visibility() ? icons.star_filled : icons.star;
      },
      width: 26,
      height: 26,
      classList: {
        toolbox_btn: true
      }
    }));
    return _el$6;
  })();
}
const default_toolbox_props = {
  tools: () => [],
  setTools: () => {},
  location: () => {
    return {
      x: 0,
      y: 0
    };
  },
  setLocation: () => {}
};
const ToolboxContext = createContext(default_toolbox_props);
function ToolBoxCTX() {
  return useContext(ToolboxContext);
}
function ToolBoxContext(props) {
  const [tools, setTools] = createSignal([]);
  const [location, setLocation] = createSignal({
    x: 60,
    y: window.innerHeight - 50
  });
  const ToolboxCTX = {
    tools,
    setTools,
    location,
    setLocation
  };
  return createComponent(ToolboxContext.Provider, {
    value: ToolboxCTX,
    get children() {
      return props.children;
    }
  });
}
function ToolBoxOverlay(props) {
  const tools = ToolBoxCTX().tools;
  const location = ToolBoxCTX().location;
  const setLocation = ToolBoxCTX().setLocation;
  const move = e => {
    if (e.target !== document.documentElement) setLocation({
      x: location().x + e.movementX,
      y: location().y + e.movementY
    });
  };
  const mouseup = e => {
    if (e.button === 0) {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", mouseup);
    }
  };
  return createComponent(OverlayDiv, {
    get id() {
      return props.id;
    },
    get location() {
      return location();
    },
    get location_ref() {
      return location_reference.TOP_LEFT;
    },
    get children() {
      return [createComponent(Icon, {
        hover: false,
        get icon() {
          return icons.menu_dragable;
        },
        onMouseDown: e => {
          if (e.button === 0) {
            document.addEventListener("mousemove", move);
            document.addEventListener("mouseup", mouseup);
          }
        }
      }), createComponent(For, {
        get each() {
          return tools();
        },
        children: tool => createComponent(Icon, {
          icon: tool,
          get onClick() {
            return TOOL_FUNC_MAP.get(tool);
          }
        })
      })];
    }
  });
}
const crosshair_menu_props = {
  id: "crosshair_menu",
  default_icon: icons.cursor_cross,
  tools: [[icons.cursor_cross, icons.cursor_dot, icons.cursor_arrow]]
};
const trend_menu_props = {
  id: "trend_menu",
  default_icon: icons.trend_line,
  tools: [[icons.trend_line, icons.horiz_line, icons.vert_line, icons.horiz_ray], [icons.polyline], [icons.channel_parallel, icons.channel_disjoint]]
};
const fib_menu_props = {
  id: "fibonacci_menu",
  default_icon: icons.fib_retrace,
  tools: [[icons.fib_retrace, icons.fib_extend]]
};
const measure_menu_props = {
  id: "measure_menu",
  default_icon: icons.range_price,
  tools: [[icons.range_price, icons.range_date, icons.range_price_date]]
};
delegateEvents(["mousedown"]);

var _tmpl$$6 = /* @__PURE__ */template(`<div class=topbar_container><div class="menu_selectable indicator_btn"><div class=text>Indicators`);
function IndicatorsBox() {
  return (() => {
    var _el$ = _tmpl$$6(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild;
    insert(_el$2, createComponent(Icon, {
      get icon() {
        return icons.indicator;
      }
    }), _el$3);
    _el$3.style.setProperty("padding", "0px 2px");
    insert(_el$, createComponent(Icon, {
      get icon() {
        return icons.indicator_template;
      }
    }), null);
    return _el$;
  })();
}

var _tmpl$$5 = /* @__PURE__ */template(`<div class=topbar_container><div id=symbol_box class=sel_highlight><div id=search_text class="topbar_containers text"></div></div><div>`),
  _tmpl$2$1 = /* @__PURE__ */template(`<div class=symbol_title_bar><h1 class=text>Symbol Search</h1><div>`),
  _tmpl$3 = /* @__PURE__ */template(`<div class=symbol_input><input class="search_input text"type=text><input class="search_submit text"type=submit value=Submit>`),
  _tmpl$4 = /* @__PURE__ */template(`<div class=symbol_list><table id=symbols_table><thead><tr class="symbol_list_item text"><th>Symbol</th><th>Name</th><th>Exchange</th><th>Type</th><th>Data Broker</th></tr></thead><tbody>`),
  _tmpl$5 = /* @__PURE__ */template(`<tr class="symbol_list_item text"><td></td><td></td><td></td><td></td><td>`),
  _tmpl$6 = /* @__PURE__ */template(`<div class="symbol_select_filter text"><div id=any class=bubble_item>Any`),
  _tmpl$7 = /* @__PURE__ */template(`<div class=bubble_item>`);
const default_sel_filters = {
  exchange: ["NYSE", "NASDAQ"],
  data_broker: ["Local", "Alpaca"],
  security_type: ["Crypto", "Equity"]
};
function SymbolSearchBox() {
  const id = "symbol_search";
  let box_el = document.createElement("div");
  let replace_el = document.createElement("div");
  const [ticker, setTicker] = createSignal("LWPC");
  const [replace, setReplace] = createSignal(true);
  const [menuLocation, setMenuLocation] = createSignal({
    x: 0,
    y: 0
  });
  let display = OverlayCTX().getDisplayAccessor(id);
  let setDisplay = OverlayCTX().getDisplaySetter(id);
  window.topbar.setTicker = setTicker;
  function onClk(e, replace_symbol) {
    setReplace(replace_symbol);
    setDisplay(!display());
    e.stopPropagation();
  }
  const position_menu = () => {
    setMenuLocation({
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.45
    });
  };
  onMount(() => {
    display = OverlayCTX().getDisplayAccessor(id);
    setDisplay = OverlayCTX().getDisplaySetter(id);
    box_el.addEventListener("mousedown", e => onClk(e, true));
    replace_el.addEventListener("mousedown", e => onClk(e, false));
    window.addEventListener("resize", position_menu);
  });
  onCleanup(() => {
    window.removeEventListener("resize", position_menu);
  });
  const [symbols, setSymbols] = createSignal([]);
  const [filters, setFilters] = createStore(default_sel_filters);
  window.api.set_search_filters = setFilters;
  OverlayCTX().attachOverlay(id, createComponent(SymbolSearchMenu, {
    id,
    get symbols() {
      return symbols();
    },
    filters,
    setFilters,
    get replace() {
      return replace();
    },
    setReplace,
    get location() {
      return menuLocation();
    },
    updateLocation: position_menu
  }));
  window.api.set_search_filters = setFilters;
  window.api.populate_search_symbols = setSymbols;
  return (() => {
    var _el$ = _tmpl$$5(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild,
      _el$4 = _el$2.nextSibling;
    var _ref$ = box_el;
    typeof _ref$ === "function" ? use(_ref$, _el$2) : box_el = _el$2;
    insert(_el$2, createComponent(Icon, {
      get icon() {
        return icons.menu_search;
      },
      style: {
        margin: "5px"
      },
      width: 20,
      height: 20
    }), _el$3);
    insert(_el$3, ticker);
    var _ref$2 = replace_el;
    typeof _ref$2 === "function" ? use(_ref$2, _el$4) : replace_el = _el$4;
    _el$4.style.setProperty("display", "flex");
    _el$4.style.setProperty("align-items", "center");
    insert(_el$4, createComponent(Icon, {
      get icon() {
        return icons.menu_add;
      }
    }));
    return _el$;
  })();
}
const label_map = /* @__PURE__ */new Map([["exchange", "Exchange:"], ["data_broker", "Data Broker:"], ["security_type", "Security Type:"]]);
function SymbolSearchMenu(props) {
  let setDisplay = OverlayCTX().getDisplaySetter(props.id);
  const [, overlayDivProps] = splitProps(props, ["replace", "setReplace", "symbols", "filters", "setFilters"]);
  onMount(() => {
    setDisplay = OverlayCTX().getDisplaySetter(props.id);
  });
  function fetch(symbol) {
    if (window.active_frame?.timeframe) window.api.data_request(window.active_container?.id, window.active_frame?.id, symbol, window.active_frame?.timeframe.toString());
    setDisplay(false);
  }
  function search(confirmed) {
    const symbol_menu = document.querySelector(`#${props.id}`);
    if (!symbol_menu) return;
    const symbol = symbol_menu.querySelector("input.search_input").value;
    const exchanges = Array.from(symbol_menu.querySelectorAll("#exchange > .bubble_item[active]"), node => node?.textContent ?? "");
    const brokers = Array.from(symbol_menu.querySelectorAll("#data_broker > .bubble_item[active]"), node => node?.textContent ?? "");
    const types = Array.from(symbol_menu.querySelectorAll("#security_type > .bubble_item[active]"), node => node?.textContent ?? "");
    window.api.symbol_search(symbol, types, brokers, exchanges, confirmed);
  }
  function update_filter(e) {
    let target = e.target;
    if (target.hasAttribute("active")) {
      target.removeAttribute("active");
      if (target.parentElement?.querySelectorAll(".bubble_item[active]").length === 0) target.parentElement.querySelector("#any")?.setAttribute("active", "");
    } else {
      if (target.parentElement?.querySelectorAll("#any[active]").length === 1) target.parentElement.querySelector("#any")?.removeAttribute("active");
      target.setAttribute("active", "");
    }
    search(false);
  }
  function update_filter_any(e) {
    let target = e.target;
    let bubbles = target.parentElement?.querySelectorAll(".bubble_item[active]");
    for (let i = 0; i < bubbles?.length; i++) bubbles[i].removeAttribute("active");
    target.setAttribute("active", "");
    search(false);
  }
  return createComponent(OverlayDiv, mergeProps(overlayDivProps, {
    classList: {
      symbol_menu: true
    },
    get location_ref() {
      return location_reference.CENTER;
    },
    get children() {
      return [(() => {
        var _el$5 = _tmpl$2$1(),
          _el$6 = _el$5.firstChild,
          _el$7 = _el$6.nextSibling;
        insert(_el$5, createComponent(Icon, {
          get icon() {
            return icons.menu_search;
          },
          width: 28,
          height: 28,
          classList: {
            icon: false,
            symbol_search_icon: true
          }
        }), _el$6);
        _el$6.style.setProperty("margin", "8px 10px");
        _el$7.style.setProperty("flex-grow", "1");
        insert(_el$5, createComponent(Icon, {
          get icon() {
            return icons.close;
          },
          style: {
            "margin-right": "15px",
            padding: "5px"
          },
          onClick: () => setDisplay(false)
        }), null);
        return _el$5;
      })(), (() => {
        var _el$8 = _tmpl$3(),
          _el$9 = _el$8.firstChild,
          _el$10 = _el$9.nextSibling;
        _el$9.addEventListener("keypress", e => {
          if (e.key === "Enter") search(true);
        });
        _el$9.$$input = () => search(false);
        _el$10.$$click = () => search(true);
        return _el$8;
      })(), (() => {
        var _el$11 = _tmpl$4(),
          _el$12 = _el$11.firstChild,
          _el$13 = _el$12.firstChild,
          _el$14 = _el$13.nextSibling;
        insert(_el$14, createComponent(For, {
          get each() {
            return props.symbols;
          },
          children: symbol => (() => {
            var _el$15 = _tmpl$5(),
              _el$16 = _el$15.firstChild,
              _el$17 = _el$16.nextSibling,
              _el$18 = _el$17.nextSibling,
              _el$19 = _el$18.nextSibling,
              _el$20 = _el$19.nextSibling;
            _el$15.$$click = () => fetch(symbol);
            insert(_el$16, () => symbol.ticker);
            insert(_el$17, () => symbol.name ?? "-");
            insert(_el$18, () => symbol.exchange ?? "-");
            insert(_el$19, () => symbol.sec_type ?? "-");
            insert(_el$20, () => symbol.broker ?? "-");
            return _el$15;
          })()
        }));
        return _el$11;
      })(), createComponent(For, {
        get each() {
          return Object.keys(props.filters);
        },
        children: filter => (() => {
          var _el$21 = _tmpl$6(),
            _el$22 = _el$21.firstChild;
          setAttribute(_el$21, "id", filter);
          insert(_el$21, () => label_map.get(filter), _el$22);
          _el$22.$$mousedown = update_filter_any;
          setAttribute(_el$22, "active", "");
          insert(_el$21, createComponent(For, {
            get each() {
              return props.filters[filter];
            },
            children: opt => (() => {
              var _el$23 = _tmpl$7();
              _el$23.$$mousedown = update_filter;
              insert(_el$23, opt);
              return _el$23;
            })()
          }), null);
          return _el$21;
        })()
      })];
    }
  }));
}
delegateEvents(["input", "click", "mousedown"]);

var _tmpl$$4 = /* @__PURE__ */template(`<div class=topbar_container>`);
const default_layout_opts = {
  menu_listings: {
    simple: [Container_Layouts.SINGLE, Container_Layouts.DOUBLE_HORIZ, Container_Layouts.DOUBLE_VERT],
    triple: [Container_Layouts.TRIPLE_VERT, Container_Layouts.TRIPLE_HORIZ, Container_Layouts.TRIPLE_VERT_LEFT, Container_Layouts.TRIPLE_VERT_RIGHT, Container_Layouts.TRIPLE_HORIZ_TOP, Container_Layouts.TRIPLE_HORIZ_BOTTOM],
    quadruple: [Container_Layouts.QUAD_SQ_V, Container_Layouts.QUAD_SQ_H, Container_Layouts.QUAD_VERT, Container_Layouts.QUAD_HORIZ, Container_Layouts.QUAD_LEFT, Container_Layouts.QUAD_RIGHT, Container_Layouts.QUAD_TOP, Container_Layouts.QUAD_BOTTOM]
  },
  favorites: [Container_Layouts.SINGLE, Container_Layouts.DOUBLE_HORIZ, Container_Layouts.DOUBLE_VERT]
};
function LayoutSwitcher() {
  const id = "layout_selector";
  let el = document.createElement("div");
  const [selectedLayout, setSelectedLayout] = createSignal(Container_Layouts.SINGLE);
  const [menuLocation, setMenuLocation] = createSignal({
    x: 0,
    y: 0
  });
  const [LayoutOpts, setLayoutOpts] = createStore(default_layout_opts);
  const ordered_favorites = () => {
    return Array.from(LayoutOpts.favorites).sort((a, b) => a - b);
  };
  const updateLocation = () => {
    setMenuLocation({
      x: el.getBoundingClientRect().right,
      y: el.getBoundingClientRect().bottom
    });
  };
  window.topbar.setLayout = setSelectedLayout;
  window.api.update_layout_opts = setLayoutOpts;
  function onSel(layout) {
    window.api.layout_change(window.active_container?.id ?? "", layout);
  }
  OverlayCTX().attachOverlay(id, createComponent(LayoutMenu, {
    id,
    onSel,
    opts: LayoutOpts,
    setOpts: setLayoutOpts,
    get location() {
      return menuLocation();
    },
    updateLocation
  }));
  return (() => {
    var _el$ = _tmpl$$4();
    var _ref$ = el;
    typeof _ref$ === "function" ? use(_ref$, _el$) : el = _el$;
    _el$.style.setProperty("margin-right", "4px");
    insert(_el$, createComponent(Show, {
      get when() {
        return !LayoutOpts.favorites.includes(selectedLayout());
      },
      get children() {
        return createComponent(Icon, {
          get icon() {
            return layout_icon_map[selectedLayout()];
          },
          classList: {
            topbar_icon_btn: true
          },
          activated: true
        });
      }
    }), null);
    insert(_el$, createComponent(For, {
      get each() {
        return ordered_favorites();
      },
      children: fav => createComponent(Icon, {
        get icon() {
          return layout_icon_map[fav];
        },
        classList: {
          topbar_icon_btn: true
        },
        get activated() {
          return selectedLayout() === fav;
        },
        onClick: () => onSel(fav)
      })
    }), null);
    insert(_el$, createComponent(ShowMenuButton, {
      id,
      "class": "topbar_menu_button",
      get icon_act() {
        return icons.menu_arrow_sn;
      },
      get icon_deact() {
        return icons.menu_arrow_ns;
      }
    }), null);
    return _el$;
  })();
}
const layout_icon_map = {
  0: icons.layout_single,
  1: icons.layout_double_vert,
  2: icons.layout_double_horiz,
  3: icons.layout_triple_vert,
  4: icons.layout_triple_left,
  5: icons.layout_triple_right,
  6: icons.layout_triple_horiz,
  7: icons.layout_triple_top,
  8: icons.layout_triple_bottom,
  9: icons.layout_quad_sq_v,
  10: icons.layout_quad_sq_h,
  11: icons.layout_quad_vert,
  12: icons.layout_quad_horiz,
  13: icons.layout_quad_left,
  14: icons.layout_quad_right,
  15: icons.layout_quad_top,
  16: icons.layout_quad_bottom
};
const default_display$1 = /* @__PURE__ */new Map([["simple", true], ["triple", false], ["quadruple", false]]);
function LayoutMenu(props) {
  const [, overlayDivProps] = splitProps(props, ["opts", "setOpts"]);
  const accessor = str => props.opts.menu_listings[str];
  function addFavorite(series) {
    if (!props.opts.favorites.includes(series)) props.setOpts("favorites", [...props.opts.favorites, series]);
  }
  function removeFavorite(series) {
    if (props.opts.favorites.includes(series)) props.setOpts("favorites", props.opts.favorites.filter(fav => fav != series));
  }
  return createComponent(OverlayDiv, mergeProps(overlayDivProps, {
    get location_ref() {
      return location_reference.TOP_RIGHT;
    },
    get children() {
      return createComponent(For, {
        get each() {
          return Object.keys(props.opts.menu_listings);
        },
        children: section => createComponent(MenuSection, {
          get label() {
            return section.toLocaleUpperCase();
          },
          get showByDefault() {
            return default_display$1.get(section) ?? false;
          },
          style: {
            display: "flex",
            "flex-direction": "row"
          },
          get children() {
            return createComponent(For, {
              get each() {
                return accessor(section);
              },
              children: type => createComponent(MenuItem, {
                expand: false,
                get icon() {
                  return layout_icon_map[type];
                },
                onSel: () => props.onSel(type),
                get star() {
                  return props.opts.favorites.includes(type);
                },
                starAct: () => addFavorite(type),
                starDeact: () => removeFavorite(type)
              })
            });
          }
        })
      });
    }
  }));
}

var _tmpl$$3 = /* @__PURE__ */template(`<div class=topbar_container>`),
  _tmpl$2 = /* @__PURE__ */template(`<div class=menu_section_titlebox>`);
const default_series_select_opts = {
  menu_listings: {
    ohlc: [Series_Type.CANDLESTICK, Series_Type.BAR, Series_Type.ROUNDED_CANDLE],
    line: [Series_Type.LINE],
    area: [Series_Type.AREA, Series_Type.BASELINE],
    hist: [Series_Type.HISTOGRAM]
  },
  favorites: [Series_Type.ROUNDED_CANDLE]
};
function SeriesSwitcher() {
  const id = "series_selector";
  let el = document.createElement("div");
  const [selectedSeries, setSelectedSeries] = createSignal(Series_Type.CANDLESTICK);
  const [menuLocation, setMenuLocation] = createSignal({
    x: 0,
    y: 0
  });
  const [SeriesOpts, setSeriesOpts] = createStore(default_series_select_opts);
  const ordered_favorites = () => {
    return Array.from(SeriesOpts.favorites).sort((a, b) => a - b);
  };
  const updateLocation = () => {
    setMenuLocation({
      x: el.getBoundingClientRect().right,
      y: el.getBoundingClientRect().bottom
    });
  };
  window.topbar.setSeries = setSelectedSeries;
  window.api.update_series_opts = setSeriesOpts;
  function onSel(series) {
    window.api.series_change(window.active_container?.id ?? "", window.active_frame?.id ?? "", series);
  }
  OverlayCTX().attachOverlay(id, createComponent(SeriesMenu, {
    id,
    onSel,
    opts: SeriesOpts,
    setOpts: setSeriesOpts,
    get location() {
      return menuLocation();
    },
    updateLocation
  }));
  return (() => {
    var _el$ = _tmpl$$3();
    var _ref$ = el;
    typeof _ref$ === "function" ? use(_ref$, _el$) : el = _el$;
    insert(_el$, createComponent(Show, {
      get when() {
        return !SeriesOpts.favorites.includes(selectedSeries());
      },
      get children() {
        return createComponent(Icon, {
          get icon() {
            return series_icon_map[selectedSeries()];
          },
          classList: {
            topbar_icon_btn: true
          },
          activated: true
        });
      }
    }), null);
    insert(_el$, createComponent(For, {
      get each() {
        return ordered_favorites();
      },
      children: fav => createComponent(Icon, {
        get icon() {
          return series_icon_map[fav];
        },
        classList: {
          topbar_icon_btn: true
        },
        get activated() {
          return selectedSeries() === fav;
        },
        onClick: () => onSel(fav)
      })
    }), null);
    insert(_el$, createComponent(ShowMenuButton, {
      id,
      "class": "topbar_menu_button",
      get icon_act() {
        return icons.menu_arrow_sn;
      },
      get icon_deact() {
        return icons.menu_arrow_ns;
      }
    }), null);
    return _el$;
  })();
}
const series_icon_map = {
  0: icons.close_small,
  //Whitespace Data -> No Icon
  1: icons.close_small,
  //Single Value Data -> No Icon
  2: icons.series_line,
  3: icons.series_area,
  4: icons.series_baseline,
  5: icons.series_histogram,
  6: icons.close_small,
  //OHLC Data -> No Icon
  7: icons.candle_bar,
  8: icons.candle_regular,
  // 9: icons.series_step_line,
  9: icons.candle_rounded
};
const series_label_map = {
  0: "Whitespace Data",
  1: "Single Value Data",
  2: "Line",
  3: "Area",
  4: "Baseline",
  5: "Histogram",
  6: "OHLC Data",
  7: "Bar",
  8: "Candlestick",
  // 9: "HLC Area",
  9: "Rounded Candlestick"
};
function SeriesMenu(props) {
  const [, overlayDivProps] = splitProps(props, ["opts", "setOpts"]);
  const accessor = str => props.opts.menu_listings[str];
  function addFavorite(series) {
    if (!props.opts.favorites.includes(series)) props.setOpts("favorites", [...props.opts.favorites, series]);
  }
  function removeFavorite(series) {
    if (props.opts.favorites.includes(series)) props.setOpts("favorites", props.opts.favorites.filter(fav => fav != series));
  }
  return createComponent(OverlayDiv, mergeProps(overlayDivProps, {
    get location_ref() {
      return location_reference.TOP_RIGHT;
    },
    get children() {
      return createComponent(For, {
        get each() {
          return Object.keys(props.opts.menu_listings);
        },
        children: section => [_tmpl$2(), createComponent(For, {
          get each() {
            return accessor(section);
          },
          children: type => createComponent(MenuItem, {
            expand: true,
            get icon() {
              return series_icon_map[type];
            },
            get label() {
              return series_label_map[type];
            },
            onSel: () => props.onSel(type),
            get star() {
              return props.opts.favorites.includes(type);
            },
            starAct: () => addFavorite(type),
            starDeact: () => removeFavorite(type)
          })
        })]
      });
    }
  }));
}

var _tmpl$$2 = /* @__PURE__ */template(`<div class=topbar_container>`);
const default_timeframe_select_opts = {
  menu_listings: {
    "s": [1, 2, 5, 15, 30],
    "m": [1, 2, 5, 15, 30],
    "h": [1, 2, 4],
    "D": [1],
    "W": [1]
  },
  favorites: ["1D"]
};
function TimeframeSwitcher() {
  const id = "timeframe_selector";
  let el = document.createElement("div");
  const [selectedTF, setSelectedTF] = createSignal(new tf(1, "E"));
  const [menuLocation, setMenuLocation] = createSignal({
    x: 0,
    y: 0
  });
  const [TimeframeOpts, setTimeframeOpts] = createStore(default_timeframe_select_opts);
  const ordered_favorites = () => {
    return Array.from(TimeframeOpts.favorites, tf_str => tf.from_str(tf_str)).sort((a, b) => a.toValue() - b.toValue());
  };
  const updateLocation = () => {
    setMenuLocation({
      x: el.getBoundingClientRect().right,
      y: el.getBoundingClientRect().bottom
    });
  };
  window.topbar.setTimeframe = setSelectedTF;
  window.api.update_timeframe_opts = setTimeframeOpts;
  function onSel(timeframe) {
    if (window.active_frame?.symbol !== void 0) window.api.data_request(window.active_container?.id ?? "", window.active_frame?.id ?? "", window.active_frame?.symbol ?? "", timeframe.toString());
  }
  OverlayCTX().attachOverlay(id, createComponent(TimeframeMenu, {
    id,
    onSel,
    opts: TimeframeOpts,
    setOpts: setTimeframeOpts,
    get location() {
      return menuLocation();
    },
    updateLocation
  }));
  return (() => {
    var _el$ = _tmpl$$2();
    var _ref$ = el;
    typeof _ref$ === "function" ? use(_ref$, _el$) : el = _el$;
    insert(_el$, createComponent(Show, {
      get when() {
        return createMemo(() => !!!tf.is_equal(selectedTF(), new tf(1, "E")))() && !TimeframeOpts.favorites.includes(selectedTF().toString());
      },
      get children() {
        return createComponent(TextIcon, {
          get text() {
            return selectedTF().toString(selectedTF().toValue() >= 86400);
          },
          classList: {
            timeframe_btn: true
          },
          activated: true
        });
      }
    }), null);
    insert(_el$, createComponent(For, {
      get each() {
        return ordered_favorites();
      },
      children: fav => createComponent(TextIcon, {
        get text() {
          return fav.toString(fav.toValue() >= 86400);
        },
        classList: {
          timeframe_btn: true
        },
        get activated() {
          return tf.is_equal(selectedTF(), fav);
        },
        onClick: () => onSel(fav)
      })
    }), null);
    insert(_el$, createComponent(ShowMenuButton, {
      id,
      "class": "topbar_menu_button",
      get icon_act() {
        return icons.menu_arrow_sn;
      },
      get icon_deact() {
        return icons.menu_arrow_ns;
      }
    }), null);
    return _el$;
  })();
}
const default_display = /* @__PURE__ */new Map([["s", false], ["m", true], ["h", true], ["D", true], ["W", false], ["M", false], ["Y", false]]);
function TimeframeMenu(props) {
  const [, overlayDivProps] = splitProps(props, ["opts", "setOpts"]);
  const accessor = str => props.opts.menu_listings[str];
  function addFavorite(tf_str) {
    if (!props.opts.favorites.includes(tf_str)) props.setOpts("favorites", [...props.opts.favorites, tf_str]);
  }
  function removeFavorite(tf_str) {
    if (props.opts.favorites.includes(tf_str)) props.setOpts("favorites", props.opts.favorites.filter(fav => fav != tf_str));
  }
  return createComponent(OverlayDiv, mergeProps(overlayDivProps, {
    get location_ref() {
      return location_reference.TOP_RIGHT;
    },
    get children() {
      return createComponent(For, {
        get each() {
          return Object.keys(props.opts.menu_listings);
        },
        children: tf_period => createComponent(MenuSection, {
          get label() {
            return interval_map[tf_period] + "s";
          },
          get showByDefault() {
            return default_display.get(tf_period) ?? false;
          },
          get children() {
            return createComponent(For, {
              get each() {
                return accessor(tf_period);
              },
              children: tf_mult => {
                const _tf_obj = new tf(tf_mult, tf_period);
                const _tf_str = _tf_obj.toString();
                return createComponent(MenuItem, {
                  expand: true,
                  get label() {
                    return _tf_obj.toLabel();
                  },
                  onSel: () => props.onSel(_tf_obj),
                  get star() {
                    return props.opts.favorites.includes(_tf_str);
                  },
                  starAct: () => addFavorite(_tf_str),
                  starDeact: () => removeFavorite(_tf_str)
                });
              }
            });
          }
        })
      });
    }
  }));
}

var _tmpl$$1 = /* @__PURE__ */template(`<div id=layout_top class="layout_main layout_flex"><div class=topbar><div class=topbar_separator></div><div class=topbar_separator></div><div class=topbar_separator></div><div class=topbar_separator></div></div><div class=topbar><div class=topbar_separator>`);
function TopBar(props) {
  return (() => {
    var _el$ = _tmpl$$1(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild,
      _el$4 = _el$3.nextSibling,
      _el$5 = _el$4.nextSibling,
      _el$6 = _el$5.nextSibling,
      _el$7 = _el$2.nextSibling;
      _el$7.firstChild;
    spread(_el$, props, false, true);
    _el$2.style.setProperty("justify-content", "flex-start");
    insert(_el$2, createComponent(SymbolSearchBox, {}), _el$3);
    insert(_el$2, createComponent(TimeframeSwitcher, {}), _el$4);
    insert(_el$2, createComponent(SeriesSwitcher, {}), _el$5);
    insert(_el$2, createComponent(IndicatorsBox, {}), _el$6);
    _el$7.style.setProperty("justify-content", "flex-end");
    insert(_el$7, createComponent(LayoutSwitcher, {}), null);
    return _el$;
  })();
}

var _tmpl$ = /* @__PURE__ */template(`<div id=layout_wrapper class=wrapper><div id=layout_center class="layout_main layout_flex"></div><div id=layout_right class="layout_main layout_flex"></div><div id=layout_bottom class=layout_main>`);
const MARGIN = 5;
const TOP_HEIGHT = 38;
const TITLE_HEIGHT = 38;
const NAVBAR_WIDTH = 52;
const TOOLBAR_WIDTH = 46;
const UTILBAR_WIDTH = 38;
const layout_default = {
  center: {
    width: "-1px",
    height: "-1px",
    top: `${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`,
    left: `${TOOLBAR_WIDTH + MARGIN}px`
  },
  titlebar: {
    width: "100vw",
    height: "38px",
    top: "0px",
    left: "0px"
  },
  topbar: {
    display: "flex",
    width: "100vw",
    height: "38px",
    top: `${TITLE_HEIGHT}px`,
    left: "0px"
  },
  toolbar: {
    display: "flex",
    width: `${TOOLBAR_WIDTH}px`,
    height: "-1px",
    top: `${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`,
    left: "0px"
  },
  navbar: {
    display: "flex",
    width: `${NAVBAR_WIDTH}px`,
    height: "-1px",
    top: `${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`,
    right: "0px"
  },
  utilbar: {
    display: "flex",
    width: "-1px",
    height: `${UTILBAR_WIDTH}px`,
    bottom: "0px",
    left: `${TOOLBAR_WIDTH + MARGIN}px`
  }
};
var LAYOUT_SECTIONS = /* @__PURE__ */(LAYOUT_SECTIONS2 => {
  LAYOUT_SECTIONS2["TITLE_BAR"] = "div_title";
  LAYOUT_SECTIONS2["TOP_BAR"] = "div_top";
  LAYOUT_SECTIONS2["TOOL_BAR"] = "div_left";
  LAYOUT_SECTIONS2["NAV_BAR"] = "div_right";
  LAYOUT_SECTIONS2["UTIL_BAR"] = "div_bottom";
  LAYOUT_SECTIONS2["CENTER"] = "div_center";
  return LAYOUT_SECTIONS2;
})(LAYOUT_SECTIONS || {});
function Wrapper() {
  let container_el = document.createElement("div");
  const [layout, set_layout] = createStore(layout_default);
  onMount(() => {
    window.addEventListener("resize", () => resize(window.innerWidth, window.innerHeight, layout, set_layout));
    resize(window.innerWidth, window.innerHeight, layout, set_layout);
  });
  createEffect(() => resize(window.innerWidth, window.innerHeight, layout, set_layout));
  const title_bar_props = {
    show_section: show_section_unbound.bind(void 0, set_layout),
    hide_section: hide_section_unbound.bind(void 0, set_layout)
  };
  return createComponent(GlobalContexts, {
    get children() {
      var _el$ = _tmpl$(),
        _el$2 = _el$.firstChild,
        _el$3 = _el$2.nextSibling,
        _el$4 = _el$3.nextSibling;
      var _ref$ = container_el;
      typeof _ref$ === "function" ? use(_ref$, _el$2) : container_el = _el$2;
      insert(_el$, createComponent(TitleBar, mergeProps({
        get style() {
          return layout.titlebar;
        },
        container_el
      }, title_bar_props)), _el$3);
      insert(_el$, createComponent(TopBar, {
        get style() {
          return layout.topbar;
        }
      }), _el$3);
      insert(_el$, createComponent(ToolBar, {
        get style() {
          return layout.toolbar;
        }
      }), _el$3);
      createRenderEffect(_p$ => {
        var _v$ = layout.center,
          _v$2 = layout.navbar,
          _v$3 = layout.utilbar;
        _p$.e = style(_el$2, _v$, _p$.e);
        _p$.t = style(_el$3, _v$2, _p$.t);
        _p$.a = style(_el$4, _v$3, _p$.a);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      });
      return _el$;
    }
  });
}
function GlobalContexts(props) {
  return createComponent(ToolBoxContext, {
    get children() {
      return createComponent(OverlayContextProvider, {
        get children() {
          return props.children;
        }
      });
    }
  });
}
function resize(width, height, layout, set_layout) {
  let side_bar_height = height - TITLE_HEIGHT;
  let center_height = height - TITLE_HEIGHT;
  let center_width = width;
  if (layout.topbar.display === "flex") {
    side_bar_height -= TOP_HEIGHT + MARGIN;
    center_height -= TOP_HEIGHT + MARGIN;
  }
  if (layout.toolbar.display === "flex") center_width -= TOOLBAR_WIDTH + MARGIN;
  if (layout.navbar.display === "flex") center_width -= NAVBAR_WIDTH + MARGIN;
  if (layout.utilbar.display === "flex") center_height -= UTILBAR_WIDTH + MARGIN;
  set_layout("toolbar", "height", `${side_bar_height}px`);
  set_layout("navbar", "height", `${side_bar_height}px`);
  set_layout("center", "height", `${center_height}px`);
  set_layout("center", "width", `${center_width}px`);
  set_layout("utilbar", "width", `${center_width}px`);
  if (window.active_container) {
    window.active_container.resize();
  }
}
function show_section_unbound(set_layout, section) {
  switch (section) {
    case "div_left" /* TOOL_BAR */:
      set_layout("center", "left", `${TOOLBAR_WIDTH + MARGIN}px`);
      set_layout("utilbar", "left", `${TOOLBAR_WIDTH + MARGIN}px`);
      set_layout("toolbar", "display", "flex");
      break;
    case "div_right" /* NAV_BAR */:
      set_layout("navbar", "display", "flex");
      break;
    case "div_top" /* TOP_BAR */:
      set_layout("toolbar", "top", `${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`);
      set_layout("navbar", "top", `${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`);
      set_layout("center", "top", `${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`);
      set_layout("topbar", "display", "flex");
      break;
    case "div_bottom" /* UTIL_BAR */:
      set_layout("utilbar", "display", "flex");
  }
  if (window.active_container) {
    window.active_container.resize();
  }
}
function hide_section_unbound(set_layout, section) {
  switch (section) {
    case "div_left" /* TOOL_BAR */:
      set_layout("center", "left", `0px`);
      set_layout("utilbar", "left", `0px`);
      set_layout("toolbar", "display", "none");
      break;
    case "div_right" /* NAV_BAR */:
      set_layout("navbar", "display", "none");
      break;
    case "div_top" /* TOP_BAR */:
      set_layout("toolbar", "top", `${TITLE_HEIGHT}px`);
      set_layout("navbar", "top", `${TITLE_HEIGHT}px`);
      set_layout("center", "top", `${TITLE_HEIGHT}px`);
      set_layout("topbar", "display", "none");
      break;
    case "div_bottom" /* UTIL_BAR */:
      set_layout("utilbar", "display", "none");
  }
  if (window.active_container) {
    window.active_container.resize();
  }
}

class py_api {
  close;
  maximize;
  minimize;
  restore;
  /* ---------------- Javascript >>> Python ---------------- */
  // The following functions are called by JS and hook to functions implemented in python.
  // These functions have default commands so functionality is maintained when launched on a local dev server.
  // These are over written (re-routed) at start-up by the Python View Class so they execute their respective python functions
  // @ts-ignore                                    
  add_container = () => window.container_manager.add_container(makeid(Array.from(container_manager.containers.keys()), "c_"));
  // @ts-ignore
  remove_container = id => window.container_manager.remove_container(id);
  reorder_containers = (from, to) => {
    console.log(`reorder containers from: ${from} to: ${to} `);
  };
  layout_change = (container_id, layout) => {
    console.log(`Layout Change: ${container_id},${layout}`);
    window.container_manager.containers.get(container_id)?.set_layout(layout);
  };
  series_change = (container_id, frame_id, series_type) => {
    console.log(`Series Change: ${container_id},${frame_id},${series_type}`);
  };
  data_request = (container_id, frame_id, symbol, tf) => {
    console.log(`Data Request: ${container_id},${frame_id},${symbol},${tf}`);
  };
  symbol_search = (symbol, types, brokers, exchanges, confirmed) => {
    console.log(`Search Request: ${symbol},${types},${brokers},${exchanges},${confirmed}`);
  };
  callback = msg => {
    console.log(msg);
  };
  /* ---------------- Python >>> Javascript ---------------- */
  // The following functions are called by Python. They are set by JS as the window is rendered
  setFrameless = arg => {};
  populate_search_symbols = items => {};
  set_search_filters = (category, opts) => {};
  update_series_opts = opts => console.log(opts);
  update_layout_opts = opts => console.log(opts);
  update_timeframe_opts = opts => console.log(opts, window.topbar);
}

window.api = new py_api();
window.Container_Layouts = Container_Layouts;
window.topbar = {
  setSeries: _ => {},
  setTimeframe: _ => {},
  setLayout: _ => {},
  setTicker: _ => {}
};
render(Wrapper, document.body);
