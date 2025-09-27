const REFRESH_INTERVAL = 5000;

const statusIndicator = document.getElementById('bot-status-indicator');
const lastUpdatedEl = document.getElementById('last-updated');
const botUptimeEl = document.getElementById('bot-uptime');
const botPingEl = document.getElementById('bot-ping');
const botAvatarEl = document.getElementById('bot-avatar');
const botNameEl = document.getElementById('bot-name');
const botIdEl = document.getElementById('bot-id');
const botReadyEl = document.getElementById('bot-ready');
const guildListEl = document.getElementById('guild-list');
const activityLogEl = document.getElementById('activity-log');
const activityCountEl = document.getElementById('activity-count');
const mapsContainerEl = document.getElementById('maps-container');
const mapCountEl = document.getElementById('map-count');
const datasetContainerEl = document.getElementById('dataset-container');
const datasetCountEl = document.getElementById('dataset-count');
const assetContainerEl = document.getElementById('asset-container');
const commandListEl = document.getElementById('command-list');
const commandCountEl = document.getElementById('command-count');
const commandSearchEl = document.getElementById('command-search');

const activityTemplate = document.getElementById('activity-template');
const commandTemplate = document.getElementById('command-template');

let commandCache = [];
let pollingHandle;

function start() {
  fetchAndRender();
  if (commandSearchEl) {
    commandSearchEl.addEventListener('input', () => updateCommandList(commandSearchEl.value));
  }
}

async function fetchAndRender() {
  try {
    const response = await fetch('/dashboard/state', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    const state = await response.json();
    renderState(state);
    statusIndicator.classList.add('is-online');
  } catch (error) {
    console.error('Failed to fetch dashboard state:', error);
    statusIndicator.classList.remove('is-online');
    lastUpdatedEl.textContent = 'Connection lost';
  } finally {
    pollingHandle = setTimeout(fetchAndRender, REFRESH_INTERVAL);
  }
}

function renderState(state) {
  if (!state) return;
  const timestamp = state.generatedAt ? new Date(state.generatedAt) : new Date();
  lastUpdatedEl.textContent = timestamp.toLocaleTimeString();

  renderBot(state.bot ?? {});
  renderGuilds(state.guilds ?? []);
  renderActivity(state.activity ?? []);
  renderMaps(state.maps ?? {});
  renderDatasets(state.datasets ?? {});
  renderCommands(state.commands ?? { entries: [] });
}

function renderBot(bot) {
  botUptimeEl.textContent = bot.uptime ?? '—';
  botPingEl.textContent = bot.ping != null ? `${Math.round(bot.ping)} ms` : '—';

  if (botAvatarEl) {
    if (bot.avatar) {
      botAvatarEl.src = bot.avatar;
    } else {
      botAvatarEl.removeAttribute('src');
    }
  }

  botNameEl.textContent = bot.tag || bot.username || 'Unknown Bot';
  botIdEl.textContent = bot.id ? `ID: ${bot.id}` : 'ID unavailable';
  botReadyEl.textContent = bot.ready ? 'Status: Online' : 'Status: Offline';
}

function renderGuilds(guilds) {
  guildListEl.innerHTML = '';
  if (!guilds.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No guilds connected.';
    guildListEl.appendChild(empty);
    return;
  }

  for (const guild of guilds) {
    const item = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = guild.name || guild.id;
    const meta = document.createElement('span');
    meta.textContent = `${guild.memberCount ?? '—'} members`;
    item.appendChild(name);
    item.appendChild(meta);
    guildListEl.appendChild(item);
  }
}

function renderActivity(activity) {
  activityLogEl.innerHTML = '';
  activityCountEl.textContent = activity.length;

  const fragment = document.createDocumentFragment();
  const maxEntries = 60;

  for (const entry of activity.slice(0, maxEntries)) {
    const node = activityTemplate.content.cloneNode(true);
    const typeEl = node.querySelector('.activity__type');
    const timeEl = node.querySelector('.activity__time');
    const bodyEl = node.querySelector('.activity__body');

    typeEl.textContent = formatActivityType(entry.type);
    timeEl.textContent = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '—';
    bodyEl.appendChild(buildActivityBody(entry));

    fragment.appendChild(node);
  }

  if (!fragment.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No activity recorded yet.';
    activityLogEl.appendChild(empty);
  } else {
    activityLogEl.appendChild(fragment);
  }
}

function buildActivityBody(entry) {
  const fragment = document.createDocumentFragment();
  if (entry.type === 'command' || entry.type === 'command_error') {
    const commandLine = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = `!${entry.command}`;
    commandLine.appendChild(strong);
    if (entry.args && entry.args.length) {
      const argsSpan = document.createElement('span');
      argsSpan.textContent = ` ${entry.args.join(' ')}`;
      commandLine.appendChild(argsSpan);
    }
    fragment.appendChild(commandLine);

    const context = [];
    if (entry.user) {
      const userId = entry.user.tag || entry.user.username || entry.user.id;
      if (userId) context.push(`👤 ${userId}`);
    }
    if (entry.guild) {
      context.push(`🏠 ${entry.guild.name || entry.guild.id}`);
    }
    if (entry.channel) {
      context.push(`#${entry.channel.name || entry.channel.id}`);
    }
    if (context.length) {
      const meta = document.createElement('div');
      meta.className = 'muted';
      meta.textContent = context.join(' • ');
      fragment.appendChild(meta);
    }
    if (entry.error) {
      const errorLine = document.createElement('div');
      errorLine.className = 'error-line';
      errorLine.textContent = `⚠️ ${entry.error.message || entry.error}`;
      fragment.appendChild(errorLine);
    }
  } else {
    const payload = entry.payload ?? entry;
    const pre = document.createElement('pre');
    pre.textContent = stringify(payload);
    fragment.appendChild(pre);
  }
  return fragment;
}

function formatActivityType(type) {
  if (!type) return 'EVENT';
  switch (type) {
    case 'command':
      return 'COMMAND';
    case 'command_error':
      return 'COMMAND ⚠️';
    case 'unknownCommand':
      return 'UNKNOWN CMD';
    default:
      return type.replace(/_/g, ' ').toUpperCase();
  }
}

function renderMaps(maps) {
  mapsContainerEl.innerHTML = '';
  const entries = Object.entries(maps);
  mapCountEl.textContent = entries.length;

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No live maps registered.';
    mapsContainerEl.appendChild(empty);
    return;
  }

  for (const [name, info] of entries) {
    const card = document.createElement('div');
    card.className = 'map-card';
    const title = document.createElement('h3');
    title.textContent = `${formatKey(name)} (${info.size ?? 0})`;
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = `Type: ${info.type || 'Unknown'}`;
    card.appendChild(meta);

    if (info.sample && info.sample.length) {
      const pre = document.createElement('pre');
      pre.textContent = stringify(info.sample);
      card.appendChild(pre);
    } else {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No active entries yet.';
      card.appendChild(empty);
    }

    mapsContainerEl.appendChild(card);
  }
}

function renderDatasets(datasets) {
  datasetContainerEl.innerHTML = '';
  const entries = Object.entries(datasets);
  const datasetEntries = [];
  const assetEntries = [];

  for (const [name, value] of entries) {
    if (value && typeof value === 'object' && Array.isArray(value.files)) {
      assetEntries.push([name, value]);
    } else {
      datasetEntries.push([name, value]);
    }
  }

  datasetCountEl.textContent = datasetEntries.length;

  if (!datasetEntries.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No live datasets available.';
    datasetContainerEl.appendChild(empty);
  } else {
    for (const [name, value] of datasetEntries) {
      const card = document.createElement('div');
      card.className = 'dataset-card';
      const title = document.createElement('h3');
      title.textContent = formatKey(name);
      card.appendChild(title);
      const pre = document.createElement('pre');
      pre.textContent = stringify(value);
      card.appendChild(pre);
      datasetContainerEl.appendChild(card);
    }
  }

  renderAssets(assetEntries);
}

function renderAssets(assetEntries) {
  assetContainerEl.innerHTML = '';
  if (!assetEntries.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No asset manifests registered yet.';
    assetContainerEl.appendChild(empty);
    return;
  }

  for (const [name, info] of assetEntries) {
    const wrapper = document.createElement('div');
    wrapper.className = 'asset-group';

    const title = document.createElement('h3');
    title.textContent = `${formatKey(name)} (${info.total ?? 0})`;
    wrapper.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'asset-group__grid';

    const files = (info.files || []).slice(0, 24);
    for (const file of files) {
      const card = document.createElement('div');
      card.className = 'asset';
      if (file.url && /\.(png|jpg|jpeg|gif|webp)$/i.test(file.url)) {
        const img = document.createElement('img');
        img.src = file.url;
        img.alt = file.path;
        card.appendChild(img);
      }
      const pathEl = document.createElement('div');
      pathEl.className = 'asset__path';
      pathEl.textContent = file.path;
      card.appendChild(pathEl);
      grid.appendChild(card);
    }

    if (!grid.childElementCount) {
      const note = document.createElement('p');
      note.className = 'muted';
      note.textContent = 'No previewable files found.';
      wrapper.appendChild(note);
    } else {
      wrapper.appendChild(grid);
    }

    assetContainerEl.appendChild(wrapper);
  }
}

function renderCommands(commands) {
  commandCache = Array.isArray(commands.entries) ? commands.entries : [];
  commandCountEl.textContent = commandCache.length;
  updateCommandList(commandSearchEl?.value || '');
}

function updateCommandList(filterTerm) {
  const term = (filterTerm || '').trim().toLowerCase();
  commandListEl.innerHTML = '';

  const filtered = !term
    ? commandCache
    : commandCache.filter((entry) =>
        entry.name.toLowerCase().includes(term) ||
        (entry.description && entry.description.toLowerCase().includes(term)) ||
        (entry.aliases || []).some((alias) => alias.toLowerCase().includes(term))
      );

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No commands match your search.';
    commandListEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const entry of filtered) {
    const node = commandTemplate.content.cloneNode(true);
    const nameEl = node.querySelector('.command__name');
    const descriptionEl = node.querySelector('.command__description');
    const metaEl = node.querySelector('.command__meta');
    const detailsEl = node.querySelector('.command__details');

    nameEl.textContent = `!${entry.name}`;
    descriptionEl.textContent = entry.description || 'No description provided yet.';

    metaEl.innerHTML = '';
    if (entry.category) metaEl.appendChild(createBadge(`Category: ${formatKey(entry.category)}`));
    if (entry.cooldown) metaEl.appendChild(createBadge(`Cooldown: ${entry.cooldown}`));
    if (entry.aliases && entry.aliases.length) {
      metaEl.appendChild(createBadge(`Aliases: ${entry.aliases.join(', ')}`));
    }

    detailsEl.innerHTML = '';
    if (entry.usage) {
      const usage = document.createElement('span');
      usage.textContent = `Usage: ${entry.usage}`;
      detailsEl.appendChild(usage);
    }

    const metaEntries = Object.entries(entry.metadata || {});
    for (const [key, value] of metaEntries) {
      const span = document.createElement('span');
      span.textContent = `${formatKey(key)}: ${formatMetadataValue(value)}`;
      detailsEl.appendChild(span);
    }

    fragment.appendChild(node);
  }

  commandListEl.appendChild(fragment);
}

function createBadge(text) {
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = text;
  return badge;
}

function stringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function formatKey(key) {
  if (!key) return '';
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatMetadataValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return stringify(value);
  return String(value);
}

window.addEventListener('beforeunload', () => {
  if (pollingHandle) clearTimeout(pollingHandle);
});

start();
