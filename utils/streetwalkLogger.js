const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'streetwalk.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function serializeValue(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (value === undefined) {
    return null;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === 'object') {
    const serialized = {};
    for (const [key, val] of Object.entries(value)) {
      serialized[key] = serializeValue(val);
    }
    return serialized;
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }

  return value;
}

function logStreetwalkEvent(event, payload = {}) {
  try {
    ensureLogDir();
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      payload: serializeValue(payload)
    };

    fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.error('[streetwalk] failed to write log entry', {
      event,
      error
    });
  }
}

module.exports = {
  logStreetwalkEvent,
  STREETWALK_LOG_FILE_PATH: LOG_FILE
};
