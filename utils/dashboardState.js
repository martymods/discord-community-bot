const fs = require('fs');
const path = require('path');

const MAX_ACTIVITY = 200;

const registeredMaps = new Map();
const registeredAccessors = new Map();
const activityLog = [];

function registerMap(name, map) {
  if (!name) return;
  registeredMaps.set(name, map);
}

function registerAccessor(name, getter) {
  if (!name || typeof getter !== 'function') return;
  registeredAccessors.set(name, getter);
}

function recordEvent(type, payload = {}) {
  const entry = {
    type,
    payload: sanitize(payload),
    timestamp: new Date().toISOString()
  };
  activityLog.unshift(entry);
  if (activityLog.length > MAX_ACTIVITY) {
    activityLog.length = MAX_ACTIVITY;
  }
  return entry;
}

function recordCommandEvent(details) {
  if (!details || !details.command) return;
  const entry = {
    type: details.error ? 'command_error' : 'command',
    command: details.command,
    user: details.user ? sanitize(details.user) : null,
    guild: details.guild ? sanitize(details.guild) : null,
    channel: details.channel ? sanitize(details.channel) : null,
    args: Array.isArray(details.args) ? details.args.slice(0, 25) : [],
    messageId: details.messageId,
    error: details.error ? sanitize(details.error) : null,
    timestamp: new Date().toISOString()
  };
  activityLog.unshift(entry);
  if (activityLog.length > MAX_ACTIVITY) {
    activityLog.length = MAX_ACTIVITY;
  }
  return entry;
}

function sanitize(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 3) return '[MaxDepth]';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Map) {
    return {
      type: 'Map',
      size: value.size
    };
  }

  if (value instanceof Set) {
    return {
      type: 'Set',
      size: value.size,
      values: Array.from(value).slice(0, 10).map((item) => sanitize(item, depth + 1))
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitize(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'function' || typeof val === 'symbol') continue;
      output[key] = sanitize(val, depth + 1);
    }
    return output;
  }

  return value;
}

function summarizeMap(map) {
  if (!map) {
    return { type: 'unknown', size: 0, sample: [] };
  }

  if (map instanceof Map) {
    const sample = [];
    let index = 0;
    for (const [key, value] of map.entries()) {
      if (index++ >= 10) break;
      sample.push({ key, value: sanitize(value) });
    }
    return {
      type: 'Map',
      size: map.size,
      sample
    };
  }

  if (map instanceof Set) {
    const values = Array.from(map).slice(0, 10).map((value) => sanitize(value));
    return {
      type: 'Set',
      size: map.size,
      sample: values
    };
  }

  if (Array.isArray(map)) {
    return {
      type: 'Array',
      size: map.length,
      sample: map.slice(0, 10).map((value) => sanitize(value))
    };
  }

  if (typeof map === 'object') {
    const entries = Object.entries(map).slice(0, 10).map(([key, value]) => ({
      key,
      value: sanitize(value)
    }));
    return {
      type: 'Object',
      size: Object.keys(map).length,
      sample: entries
    };
  }

  return {
    type: typeof map,
    size: 0,
    sample: []
  };
}

function formatDuration(ms = 0) {
  if (!ms || Number.isNaN(ms)) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function buildCommandSummary(commandsCollection) {
  const entries = [];
  if (!commandsCollection || typeof commandsCollection.entries !== 'function') {
    return { total: 0, entries };
  }

  for (const [name, config] of commandsCollection.entries()) {
    const entry = {
      name,
      description: null,
      usage: null,
      category: null,
      cooldown: null,
      aliases: [],
      metadata: {}
    };

    if (config) {
      if (typeof config.description === 'string') entry.description = config.description;
      else if (typeof config.desc === 'string') entry.description = config.desc;
      else if (typeof config.details === 'string') entry.description = config.details;
      else if (config.help && typeof config.help.description === 'string') entry.description = config.help.description;

      if (typeof config.usage === 'string') entry.usage = config.usage;
      else if (config.help && typeof config.help.usage === 'string') entry.usage = config.help.usage;

      if (typeof config.category === 'string') entry.category = config.category;
      else if (typeof config.type === 'string') entry.category = config.type;

      if (config.cooldown || config.coolDown) entry.cooldown = config.cooldown || config.coolDown;

      if (Array.isArray(config.aliases)) entry.aliases = config.aliases;
      else if (typeof config.alias === 'string') entry.aliases = [config.alias];

      const extraKeys = ['permissions', 'requires', 'level', 'tier', 'cost', 'unlock'];
      for (const key of extraKeys) {
        if (config[key] !== undefined) {
          entry.metadata[key] = sanitize(config[key]);
        }
      }

      if (config?.name && config.name !== name) {
        entry.metadata.exportedName = config.name;
      }
    }

    entries.push(entry);
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return {
    total: entries.length,
    entries
  };
}

function getState(client) {
  const now = Date.now();
  const bot = {};
  if (client && client.user) {
    bot.id = client.user.id;
    bot.username = client.user.username;
    bot.tag = client.user.tag;
    bot.avatar = client.user.displayAvatarURL?.() || null;
    bot.ready = client.isReady?.() ?? true;
    bot.uptimeMs = client.uptime ?? 0;
    bot.uptime = formatDuration(client.uptime ?? 0);
    bot.ping = client.ws?.ping ?? null;
    bot.presence = sanitize(client.user.presence ?? {});
  } else {
    bot.ready = false;
  }

  const guilds = [];
  if (client?.guilds?.cache) {
    for (const guild of client.guilds.cache.values()) {
      guilds.push({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        description: guild.description ?? null,
        icon: guild.iconURL?.() || null
      });
    }
    guilds.sort((a, b) => a.name.localeCompare(b.name));
  }

  const maps = {};
  for (const [name, map] of registeredMaps.entries()) {
    maps[name] = summarizeMap(map);
  }

  const datasets = {};
  for (const [name, getter] of registeredAccessors.entries()) {
    try {
      datasets[name] = sanitize(getter());
    } catch (error) {
      datasets[name] = { error: error.message };
    }
  }

  return {
    generatedAt: now,
    bot,
    guilds,
    commands: buildCommandSummary(client?.commands),
    maps,
    datasets,
    activity: activityLog.slice(0, 100)
  };
}

function listStaticFiles(rootDir, publicPrefix = '/') {
  const results = [];
  if (!rootDir || !fs.existsSync(rootDir)) return results;

  const stack = [{ dir: rootDir, rel: '' }];

  while (stack.length) {
    const { dir, rel } = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(rel, entry.name);
      if (entry.isDirectory()) {
        stack.push({ dir: fullPath, rel: relativePath });
      } else {
        results.push({
          path: relativePath.replace(/\\/g, '/'),
          url: path.posix.join(publicPrefix, relativePath.replace(/\\/g, '/'))
        });
      }
    }
  }

  results.sort((a, b) => a.path.localeCompare(b.path));
  return results;
}

function registerStaticDirectory(name, rootDir, publicPrefix = '/') {
  registerAccessor(name, () => {
    const files = listStaticFiles(rootDir, publicPrefix);
    return {
      total: files.length,
      files: files.slice(0, 100)
    };
  });
}

module.exports = {
  registerMap,
  registerAccessor,
  recordEvent,
  recordCommandEvent,
  getState,
  listStaticFiles,
  registerStaticDirectory
};
