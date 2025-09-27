const router = require('express').Router();
const fetch = require('node-fetch');
const { addCash } = require('../../economy/currency');
const Levels = require('../../economy/xpRewards');
const ActivityProgress = require('../../models/ActivityProgress');

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const MAX_CASH_AWARD = 1_000_000;
const MAX_XP_AWARD = 250_000;

async function validateAccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    return null;
  }

  try {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to verify Discord access token:', error);
    return null;
  }
}

function sanitizeNumber(value, max) {
  if (typeof value !== 'number') {
    value = Number(value);
  }
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 0;
  }
  if (!max) return value;
  return Math.max(-max, Math.min(max, value));
}

router.post('/award', async (req, res) => {
  const {
    userId,
    guildId,
    cash = 0,
    xp = 0,
    unlocks = [],
    accessToken,
    username: claimedUsername,
    avatar: claimedAvatar
  } = req.body || {};

  if (!userId || !guildId) {
    return res.status(400).json({ error: 'missing ids' });
  }

  const profile = await validateAccessToken(accessToken);
  if (!profile || profile.id !== userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const safeCash = Math.trunc(sanitizeNumber(cash, MAX_CASH_AWARD));
  const safeXp = Math.trunc(sanitizeNumber(xp, MAX_XP_AWARD));

  try {
    let balance;
    let xpState;

    if (safeCash) {
      balance = await addCash(userId, guildId, safeCash);
    }

    if (safeXp) {
      xpState = await Levels.appendXp(userId, guildId, safeXp);
    }

    const displayName = claimedUsername || profile.global_name || profile.username || '';
    const avatarUrl = (claimedAvatar && typeof claimedAvatar === 'string' && claimedAvatar.startsWith('http'))
      ? claimedAvatar
      : (profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : '');

    await ActivityProgress.recordAward({
      userId,
      guildId,
      cash: safeCash,
      xp: safeXp,
      unlocks: Array.isArray(unlocks) ? unlocks : [],
      username: displayName,
      avatar: avatarUrl
    });

    return res.json({
      ok: true,
      balance,
      xp: xpState?.xp,
      level: xpState?.level
    });
  } catch (error) {
    console.error('Embedded activity award failed:', error);
    return res.status(500).json({ error: 'server' });
  }
});

router.get('/leaderboard/:guildId', async (req, res) => {
  const { guildId } = req.params;
  if (!guildId) {
    return res.status(400).json({ error: 'missing guild id' });
  }

  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(req.query.limit || '10', 10) || 10)
  );

  try {
    const docs = await ActivityProgress.find({ guildId })
      .sort({ totalCashAwarded: -1, totalXpAwarded: -1 })
      .limit(limit)
      .exec();

    const leaderboard = docs.map(doc => ({
      userId: doc.userId,
      guildId: doc.guildId,
      totalCashAwarded: doc.totalCashAwarded || 0,
      totalXpAwarded: doc.totalXpAwarded || 0,
      unlocks: Array.isArray(doc.unlocks) ? [...doc.unlocks] : [],
      lastAwardAt: doc.lastAwardAt ? new Date(doc.lastAwardAt).toISOString() : null,
      username: doc.username || null,
      avatar: doc.avatar || null
    }));

    return res.json({ ok: true, leaderboard });
  } catch (error) {
    console.error('Failed to read activity leaderboard:', error);
    return res.status(500).json({ error: 'server' });
  }
});

module.exports = router;
