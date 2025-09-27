const fs = require('fs');
const path = require('path');

const DATE_TOKEN = '__localdb_date__';

function replacer(key, value) {
  if (value instanceof Date) {
    return { [DATE_TOKEN]: value.toISOString() };
  }
  return value;
}

function reviver(key, value) {
  if (value && typeof value === 'object' && value[DATE_TOKEN]) {
    return new Date(value[DATE_TOKEN]);
  }
  return value;
}

class LocalDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {};
    this.loaded = false;
    this.writeQueue = Promise.resolve();
  }

  async init() {
    if (this.loaded) return;
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.promises.readFile(this.filePath, 'utf8');
      if (raw.trim().length === 0) {
        this.data = {};
      } else {
        this.data = JSON.parse(raw, reviver);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.data = {};
        await fs.promises.writeFile(this.filePath, '{}', 'utf8');
      } else {
        throw err;
      }
    }
    this.loaded = true;
  }

  async getCollection(name) {
    await this.init();
    if (!Array.isArray(this.data[name])) {
      this.data[name] = [];
    }
    return this.data[name];
  }

  async save() {
    await this.init();
    const payload = JSON.stringify(this.data, replacer, 2);
    await fs.promises.writeFile(this.filePath, payload, 'utf8');
  }

  async persist() {
    this.writeQueue = this.writeQueue.then(() => this.save());
    return this.writeQueue;
  }
}

module.exports = LocalDatabase;
