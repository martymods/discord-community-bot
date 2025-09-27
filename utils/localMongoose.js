const path = require('path');
const { randomUUID } = require('crypto');
const { isDeepStrictEqual } = require('util');
const LocalDatabase = require('./localDatabase');

const database = new LocalDatabase(path.join(__dirname, '..', 'data', 'localdb.json'));
const models = {};
const documentStore = new WeakMap();

class Schema {
  constructor(definition = {}) {
    this.definition = definition;
  }

  index() {
    return this;
  }
}

Schema.Types = { Map };

function cloneValue(value, { convertMap = false } = {}) {
  if (value instanceof Map) {
    if (convertMap) {
      const obj = {};
      for (const [k, v] of value.entries()) {
        obj[k] = cloneValue(v, { convertMap });
      }
      return obj;
    }
    const map = new Map();
    for (const [k, v] of value.entries()) {
      map.set(k, cloneValue(v, { convertMap }));
    }
    return map;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (Array.isArray(value)) {
    return value.map(v => cloneValue(v, { convertMap }));
  }
  if (value && typeof value === 'object') {
    const obj = {};
    for (const key of Object.keys(value)) {
      obj[key] = cloneValue(value[key], { convertMap });
    }
    return obj;
  }
  return value;
}

function getByPath(target, path) {
  if (!path || typeof path !== 'string') return undefined;
  const segments = path.split('.');
  let current = target;
  for (const segment of segments) {
    if (current === undefined || current === null) return undefined;
    if (current instanceof Map) {
      current = current.get(segment);
    } else {
      current = current[segment];
    }
  }
  return current;
}

function setByPath(target, path, value) {
  const segments = path.split('.');
  let current = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    let next;
    if (current instanceof Map) {
      next = current.get(segment);
      if (next === undefined) {
        next = {};
        current.set(segment, next);
      }
    } else {
      next = current[segment];
      if (next === undefined) {
        next = {};
        current[segment] = next;
      }
    }
    current = next;
  }
  const last = segments[segments.length - 1];
  if (current instanceof Map) {
    current.set(last, value);
  } else {
    current[last] = value;
  }
}

function matchesQuery(doc, query = {}) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const [key, condition] of Object.entries(query)) {
    if (key === '$or') {
      if (!Array.isArray(condition) || !condition.some(sub => matchesQuery(doc, sub))) {
        return false;
      }
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(condition) || !condition.every(sub => matchesQuery(doc, sub))) {
        return false;
      }
      continue;
    }

    const value = condition;
    const docValue = getByPath(doc, key);

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      if ('$ne' in value) {
        if (isDeepStrictEqual(docValue, value.$ne)) return false;
        continue;
      }
      if ('$exists' in value) {
        const exists = docValue !== undefined;
        if (value.$exists && !exists) return false;
        if (!value.$exists && exists) return false;
        continue;
      }
      if ('$in' in value) {
        const arr = Array.isArray(value.$in) ? value.$in : [];
        if (!arr.some(val => isDeepStrictEqual(val, docValue))) return false;
        continue;
      }
      if ('$eq' in value) {
        if (!isDeepStrictEqual(docValue, value.$eq)) return false;
        continue;
      }
      // Unsupported operator: treat as nested object comparison
      if (!isDeepStrictEqual(docValue, value)) return false;
      continue;
    }

    if (!isDeepStrictEqual(docValue, value)) return false;
  }
  return true;
}

function resolveDefault(val) {
  if (val === undefined) return undefined;
  if (typeof val === 'function') {
    return val();
  }
  return cloneValue(val, { convertMap: true });
}

function applyUpdate(target, update = {}, { insertMode = false } = {}) {
  const operations = Object.entries(update);
  for (const [op, value] of operations) {
    if (op === '$inc') {
      for (const [path, amount] of Object.entries(value || {})) {
        const current = getByPath(target, path);
        const base = typeof current === 'number' ? current : 0;
        setByPath(target, path, base + amount);
      }
      continue;
    }
    if (op === '$set') {
      for (const [path, val] of Object.entries(value || {})) {
        setByPath(target, path, cloneValue(val, { convertMap: true }));
      }
      continue;
    }
    if (op === '$setOnInsert') {
      if (!insertMode) continue;
      for (const [path, val] of Object.entries(value || {})) {
        if (getByPath(target, path) === undefined) {
          setByPath(target, path, cloneValue(val, { convertMap: true }));
        }
      }
      continue;
    }
    if (op === '$push') {
      for (const [path, val] of Object.entries(value || {})) {
        const current = getByPath(target, path);
        if (Array.isArray(current)) {
          current.push(cloneValue(val, { convertMap: true }));
        } else {
          setByPath(target, path, [cloneValue(val, { convertMap: true })]);
        }
      }
      continue;
    }
    if (op.startsWith('$')) {
      continue;
    }
    setByPath(target, op, cloneValue(value, { convertMap: true }));
  }
}

function extractQueryValues(query = {}) {
  const target = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('$')) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$eq' in value) {
        setByPath(target, key, cloneValue(value.$eq, { convertMap: true }));
      }
      continue;
    }
    setByPath(target, key, cloneValue(value, { convertMap: true }));
  }
  return target;
}

function analyzeDefinition(def, info, prefix = '') {
  if (!def) return;
  for (const [rawKey, rawValue] of Object.entries(def)) {
    const path = prefix ? `${prefix}.${rawKey}` : rawKey;
    let descriptor = rawValue;

    if (descriptor instanceof Schema) {
      analyzeDefinition(descriptor.definition, info, path);
      continue;
    }

    if (Array.isArray(descriptor)) {
      if (!info.defaults.has(path)) {
        info.defaults.set(path, () => []);
      }
      const [sub] = descriptor;
      if (sub instanceof Schema) {
        // Nested schema inside array – track for hydration if needed
        info.arraySchemas.set(path, sub.definition);
      }
      continue;
    }

    if (descriptor && typeof descriptor === 'object') {
      const type = descriptor.type;
      if (type instanceof Schema) {
        analyzeDefinition(type.definition, info, path);
      } else if (type === Map) {
        info.mapPaths.add(path);
        if (descriptor.default !== undefined) {
          info.defaults.set(path, descriptor.default);
        } else if (!info.defaults.has(path)) {
          info.defaults.set(path, () => ({}));
        }
      } else if (type === Date) {
        info.datePaths.add(path);
        if (descriptor.default !== undefined) {
          info.defaults.set(path, descriptor.default);
        }
      } else if (type === Array) {
        if (descriptor.default !== undefined) {
          info.defaults.set(path, descriptor.default);
        } else if (!info.defaults.has(path)) {
          info.defaults.set(path, () => []);
        }
      } else if (type === Object || !type) {
        if (descriptor.default !== undefined) {
          info.defaults.set(path, descriptor.default);
        }
        analyzeDefinition(descriptor, info, path);
      } else {
        if (descriptor.default !== undefined) {
          info.defaults.set(path, descriptor.default);
        }
      }
      continue;
    }

    if (descriptor === Map) {
      info.mapPaths.add(path);
      if (!info.defaults.has(path)) {
        info.defaults.set(path, () => ({}));
      }
      continue;
    }

    if (descriptor === Date) {
      info.datePaths.add(path);
    }
  }
}

class LocalQuery {
  constructor(helper, docsPromise) {
    this.helper = helper;
    this.docsPromise = Promise.resolve(docsPromise);
    this.sortSpec = null;
    this.limitValue = null;
  }

  sort(sortSpec = {}) {
    this.sortSpec = sortSpec;
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }

  async exec() {
    let docs = await this.docsPromise;
    if (this.sortSpec && Object.keys(this.sortSpec).length) {
      const entries = Object.entries(this.sortSpec);
      docs = [...docs].sort((a, b) => {
        for (const [field, direction] of entries) {
          const dir = direction < 0 ? -1 : 1;
          const aVal = getByPath(a, field);
          const bVal = getByPath(b, field);
          if (aVal === bVal) continue;
          if (aVal === undefined) return dir;
          if (bVal === undefined) return -dir;
          if (aVal < bVal) return -dir;
          if (aVal > bVal) return dir;
        }
        return 0;
      });
    }

    if (typeof this.limitValue === 'number') {
      docs = docs.slice(0, this.limitValue);
    }

    return docs.map(doc => this.helper._wrapDocument(doc));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class ModelHelper {
  constructor(name, schema) {
    this.name = name;
    this.schema = schema instanceof Schema ? schema : new Schema(schema);
    this.definition = this.schema.definition || {};
    this.mapPaths = new Set();
    this.datePaths = new Set();
    this.defaults = new Map();
    this.arraySchemas = new Map();
    analyzeDefinition(this.definition, this, '');
  }

  _cloneRaw(doc) {
    return cloneValue(doc, { convertMap: true });
  }

  _hydrateDoc(raw) {
    const data = cloneValue(raw, { convertMap: false });
    for (const path of this.mapPaths) {
      const current = getByPath(data, path);
      if (current instanceof Map) continue;
      if (current === undefined || current === null) {
        setByPath(data, path, new Map());
      } else {
        setByPath(data, path, new Map(Object.entries(current)));
      }
    }
    for (const path of this.datePaths) {
      const current = getByPath(data, path);
      if (current !== undefined && current !== null && !(current instanceof Date)) {
        setByPath(data, path, new Date(current));
      }
    }
    return data;
  }

  _applyDefaults(data) {
    const doc = this._cloneRaw(data);
    for (const [path, def] of this.defaults.entries()) {
      if (getByPath(doc, path) !== undefined) continue;
      const resolved = resolveDefault(def);
      if (resolved !== undefined) {
        setByPath(doc, path, resolved);
      }
    }
    return doc;
  }

  _prepareForStorage(data) {
    const plain = cloneValue(data, { convertMap: true });
    for (const path of this.mapPaths) {
      const current = getByPath(plain, path);
      if (current instanceof Map) {
        setByPath(plain, path, Object.fromEntries(current));
      }
    }
    return plain;
  }

  _wrapDocument(raw) {
    const hydrated = this._hydrateDoc(raw);
    const proxy = createDocumentProxy(this, hydrated);
    return proxy;
  }

  _getDataFromDoc(doc) {
    return documentStore.get(doc);
  }

  async _saveDocument(doc) {
    const data = this._getDataFromDoc(doc);
    if (!data) throw new Error('Document not managed by local database');
    if (!data._id) data._id = randomUUID();
    const plain = this._prepareForStorage(data);
    const collection = await database.getCollection(this.name);
    const index = collection.findIndex(item => item._id === plain._id);
    if (index === -1) {
      collection.push(plain);
    } else {
      collection[index] = plain;
    }
    await database.persist();
    return doc;
  }

  async _deleteDocument(doc) {
    const data = this._getDataFromDoc(doc);
    if (!data || !data._id) {
      return { acknowledged: true, deletedCount: 0 };
    }
    return this.deleteOne({ _id: data._id });
  }

  async create(doc) {
    if (Array.isArray(doc)) {
      const inserted = [];
      for (const item of doc) {
        const created = await this.create(item);
        inserted.push(created);
      }
      return inserted;
    }
    const base = this._applyDefaults(doc || {});
    if (!base._id) base._id = randomUUID();
    const plain = this._prepareForStorage(base);
    const collection = await database.getCollection(this.name);
    collection.push(plain);
    await database.persist();
    return this._wrapDocument(plain);
  }

  instantiate(doc = {}) {
    const base = this._applyDefaults(doc || {});
    if (!base._id) base._id = randomUUID();
    return this._wrapDocument(base);
  }

  async insertMany(docs) {
    if (!Array.isArray(docs)) throw new Error('insertMany requires an array');
    const collection = await database.getCollection(this.name);
    const inserted = [];
    for (const entry of docs) {
      let data = entry;
      if (entry && entry.__isLocalDocument) {
        data = cloneValue(this._getDataFromDoc(entry), { convertMap: true });
      }
      const base = this._applyDefaults(data || {});
      if (!base._id) base._id = randomUUID();
      const plain = this._prepareForStorage(base);
      collection.push(plain);
      inserted.push(this._wrapDocument(plain));
    }
    await database.persist();
    return inserted;
  }

  find(query = {}) {
    const docsPromise = (async () => {
      const collection = await database.getCollection(this.name);
      return collection
        .filter(doc => matchesQuery(doc, query))
        .map(doc => cloneValue(doc, { convertMap: true }));
    })();
    return new LocalQuery(this, docsPromise);
  }

  async findOne(query = {}) {
    const collection = await database.getCollection(this.name);
    const found = collection.find(doc => matchesQuery(doc, query));
    if (!found) return null;
    return this._wrapDocument(cloneValue(found, { convertMap: true }));
  }

  async findOneAndUpdate(query, update, options = {}) {
    const collection = await database.getCollection(this.name);
    for (let i = 0; i < collection.length; i++) {
      const doc = collection[i];
      if (!matchesQuery(doc, query)) continue;
      const before = cloneValue(doc, { convertMap: true });
      applyUpdate(doc, update, { insertMode: false });
      collection[i] = doc;
      await database.persist();
      const updatedDoc = this._wrapDocument(cloneValue(doc, { convertMap: true }));
      if (options.new) return updatedDoc;
      return this._wrapDocument(before);
    }

    if (options.upsert) {
      const base = this._applyDefaults(extractQueryValues(query));
      applyUpdate(base, update, { insertMode: true });
      if (!base._id) base._id = randomUUID();
      const plain = this._prepareForStorage(base);
      collection.push(plain);
      await database.persist();
      if (options.new === false) return null;
      return this._wrapDocument(plain);
    }

    return null;
  }

  async updateOne(query, update, options = {}) {
    const collection = await database.getCollection(this.name);
    for (let i = 0; i < collection.length; i++) {
      const doc = collection[i];
      if (!matchesQuery(doc, query)) continue;
      applyUpdate(doc, update, { insertMode: false });
      collection[i] = doc;
      await database.persist();
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedId: null };
    }

    if (options.upsert) {
      const base = this._applyDefaults(extractQueryValues(query));
      applyUpdate(base, update, { insertMode: true });
      if (!base._id) base._id = randomUUID();
      const plain = this._prepareForStorage(base);
      collection.push(plain);
      await database.persist();
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: plain._id };
    }

    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: null };
  }

  async deleteOne(query) {
    const collection = await database.getCollection(this.name);
    const index = collection.findIndex(doc => matchesQuery(doc, query));
    if (index === -1) {
      return { acknowledged: true, deletedCount: 0 };
    }
    collection.splice(index, 1);
    await database.persist();
    return { acknowledged: true, deletedCount: 1 };
  }

  async findOneAndDelete(query) {
    const collection = await database.getCollection(this.name);
    for (let i = 0; i < collection.length; i++) {
      const doc = collection[i];
      if (!matchesQuery(doc, query)) continue;
      collection.splice(i, 1);
      await database.persist();
      return this._wrapDocument(cloneValue(doc, { convertMap: true }));
    }
    return null;
  }

  async aggregate(pipeline = []) {
    let docs = (await database.getCollection(this.name)).map(doc => cloneValue(doc, { convertMap: true }));

    for (const stage of pipeline) {
      if (stage.$match) {
        docs = docs.filter(doc => matchesQuery(doc, stage.$match));
        continue;
      }
      if (stage.$group) {
        const groups = new Map();
        const { _id: idExpr, ...rest } = stage.$group;
        for (const doc of docs) {
          const idValue = computeExpression(idExpr, doc);
          const key = JSON.stringify(idValue);
          if (!groups.has(key)) {
            groups.set(key, { _id: idValue });
            for (const field of Object.keys(rest)) {
              groups.get(key)[field] = 0;
            }
          }
          const group = groups.get(key);
          for (const [field, expr] of Object.entries(rest)) {
            if (expr && typeof expr === 'object' && '$sum' in expr) {
              const sumVal = computeExpression(expr.$sum, doc);
              group[field] += typeof sumVal === 'number' ? sumVal : 0;
            }
          }
        }
        docs = Array.from(groups.values());
        continue;
      }
      if (stage.$sort) {
        const entries = Object.entries(stage.$sort);
        docs.sort((a, b) => {
          for (const [field, direction] of entries) {
            const dir = direction < 0 ? -1 : 1;
            const aVal = getByPath(a, field);
            const bVal = getByPath(b, field);
            if (aVal === bVal) continue;
            if (aVal === undefined) return dir;
            if (bVal === undefined) return -dir;
            if (aVal < bVal) return -dir;
            if (aVal > bVal) return dir;
          }
          return 0;
        });
        continue;
      }
      if (stage.$limit) {
        docs = docs.slice(0, stage.$limit);
        continue;
      }
    }

    return docs.map(doc => cloneValue(doc, { convertMap: true }));
  }

  async countDocuments(query = {}) {
    const collection = await database.getCollection(this.name);
    return collection.reduce((count, doc) => count + (matchesQuery(doc, query) ? 1 : 0), 0);
  }

  async distinct(field, query = {}) {
    const collection = await database.getCollection(this.name);
    const values = new Set();
    for (const doc of collection) {
      if (!matchesQuery(doc, query)) continue;
      const value = getByPath(doc, field);
      if (value !== undefined) {
        if (Array.isArray(value)) {
          for (const entry of value) values.add(entry);
        } else {
          values.add(value);
        }
      }
    }
    return Array.from(values.values());
  }
}

function computeExpression(expr, doc) {
  if (expr === null || expr === undefined) {
    return expr;
  }
  if (typeof expr === 'string') {
    if (expr.startsWith('$')) {
      return getByPath(doc, expr.slice(1));
    }
    return expr;
  }
  if (typeof expr === 'number') {
    return expr;
  }
  if (expr && typeof expr === 'object' && '$sum' in expr) {
    return computeExpression(expr.$sum, doc);
  }
  return 0;
}

function createDocumentProxy(helper, data) {
  const proxy = new Proxy({}, {
    get(target, prop) {
      if (prop === 'save') {
        return () => helper._saveDocument(proxy);
      }
      if (prop === 'deleteOne') {
        return (filter) => {
          if (filter && typeof filter === 'object') {
            return helper.deleteOne(filter);
          }
          return helper._deleteDocument(proxy);
        };
      }
      if (prop === 'markModified') {
        return () => {};
      }
      if (prop === 'toObject' || prop === 'toJSON') {
        return () => cloneValue(data, { convertMap: true });
      }
      if (prop === '__isLocalDocument') {
        return true;
      }
      if (prop === 'constructor') {
        return helper.modelClass;
      }
      if (prop === Symbol.toStringTag) {
        return 'LocalDocument';
      }
      if (prop === 'id' && data._id) {
        return data._id;
      }
      return data[prop];
    },
    set(target, prop, value) {
      data[prop] = value;
      return true;
    },
    ownKeys() {
      return Reflect.ownKeys(data);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (Object.prototype.hasOwnProperty.call(data, prop)) {
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: data[prop]
        };
      }
      return undefined;
    },
    has(target, prop) {
      return prop in data;
    }
  });
  documentStore.set(proxy, data);
  return proxy;
}

function model(name, schema) {
  if (models[name]) return models[name];
  const helper = new ModelHelper(name, schema);
  function Model(doc) {
    const instance = helper.instantiate(doc);
    return instance;
  }
  helper.modelClass = Model;
  Model.create = (doc) => helper.create(doc);
  Model.insertMany = (docs) => helper.insertMany(docs);
  Model.find = (query) => helper.find(query);
  Model.findOne = (query) => helper.findOne(query);
  Model.findOneAndUpdate = (query, update, options = {}) => helper.findOneAndUpdate(query, update, options);
  Model.updateOne = (query, update, options = {}) => helper.updateOne(query, update, options);
  Model.deleteOne = (query) => helper.deleteOne(query);
  Model.aggregate = (pipeline = []) => helper.aggregate(pipeline);
  Model.countDocuments = (query = {}) => helper.countDocuments(query);
  Model.distinct = (field, query = {}) => helper.distinct(field, query);
  Model.findById = (id) => helper.findOne({ _id: id });
  Model.findOneAndDelete = (query) => helper.findOneAndDelete(query);
  Model.prototype.save = function save() {
    return helper._saveDocument(this);
  };
  Model.prototype.deleteOne = function deleteOne(filter) {
    if (filter && typeof filter === 'object') {
      return helper.deleteOne(filter);
    }
    return helper._deleteDocument(this);
  };
  models[name] = Model;
  return Model;
}

async function connect() {
  await database.init();
  return connection;
}

const connection = {
  readyState: 1,
  close: async () => {
    await database.persist();
    return true;
  }
};

function disconnect() {
  return connection.close();
}

module.exports = {
  Schema,
  model,
  models,
  connect,
  connection,
  disconnect
};
