// ============================================================
//  utils/db.js — Database helper using quick.db
//  Wraps QuickDB with convenience methods for economy & XP.
// ============================================================

const { QuickDB } = require('quick.db');
const db = new QuickDB();

// ── Economy ──────────────────────────────────────────────────

/**
 * Get a member's coin balance. Returns 0 if not set.
 */
async function getBalance(guildId, userId) {
  return (await db.get(`balance_${guildId}_${userId}`)) ?? 0;
}

/**
 * Set a member's coin balance to an exact amount.
 */
async function setBalance(guildId, userId, amount) {
  await db.set(`balance_${guildId}_${userId}`, Math.max(0, amount));
}

/**
 * Add coins to a member's balance.
 */
async function addBalance(guildId, userId, amount) {
  const current = await getBalance(guildId, userId);
  await setBalance(guildId, userId, current + amount);
}

/**
 * Remove coins from a member's balance (floor at 0).
 */
async function removeBalance(guildId, userId, amount) {
  const current = await getBalance(guildId, userId);
  await setBalance(guildId, userId, Math.max(0, current - amount));
}

/**
 * Get all balances for a guild, sorted descending.
 * Returns an array of { userId, balance } objects.
 */
async function getAllBalances(guildId) {
  const all = (await db.all()) ?? [];
  return all
    .filter(entry => entry.id.startsWith(`balance_${guildId}_`))
    .map(entry => ({
      userId:  entry.id.replace(`balance_${guildId}_`, ''),
      balance: entry.value,
    }))
    .sort((a, b) => b.balance - a.balance);
}

// ── XP / Levels ──────────────────────────────────────────────

/**
 * Get a member's XP. Returns 0 if not set.
 */
async function getXP(guildId, userId) {
  return (await db.get(`xp_${guildId}_${userId}`)) ?? 0;
}

/**
 * Add XP to a member and return { newXP, newLevel, leveledUp }.
 */
async function addXP(guildId, userId, amount) {
  const currentXP    = await getXP(guildId, userId);
  const currentLevel = await getLevel(guildId, userId);
  const newXP        = currentXP + amount;

  await db.set(`xp_${guildId}_${userId}`, newXP);

  const newLevel  = Math.floor(0.1 * Math.sqrt(newXP));
  const leveledUp = newLevel > currentLevel;
  if (leveledUp) await db.set(`level_${guildId}_${userId}`, newLevel);

  return { newXP, newLevel, leveledUp };
}

/**
 * Get a member's level. Returns 0 if not set.
 */
async function getLevel(guildId, userId) {
  return (await db.get(`level_${guildId}_${userId}`)) ?? 0;
}

/**
 * Get all XP entries for a guild, sorted descending.
 */
async function getAllXP(guildId) {
  const all = (await db.all()) ?? [];
  return all
    .filter(entry => entry.id.startsWith(`xp_${guildId}_`))
    .map(entry => ({
      userId: entry.id.replace(`xp_${guildId}_`, ''),
      xp:     entry.value,
      level:  Math.floor(0.1 * Math.sqrt(entry.value)),
    }))
    .sort((a, b) => b.xp - a.xp);
}

// ── Daily cooldown ────────────────────────────────────────────

/**
 * Get the timestamp of a member's last daily claim. Returns null if never.
 */
async function getLastDaily(guildId, userId) {
  return (await db.get(`daily_${guildId}_${userId}`)) ?? null;
}

/**
 * Set the timestamp of a member's last daily claim to now.
 */
async function setLastDaily(guildId, userId) {
  await db.set(`daily_${guildId}_${userId}`, Date.now());
}

// ── Warnings ─────────────────────────────────────────────────

/**
 * Get a member's warnings array.
 */
async function getWarns(guildId, userId) {
  return (await db.get(`warns_${guildId}_${userId}`)) ?? [];
}

/**
 * Add a warning to a member.
 */
async function addWarn(guildId, userId, warn) {
  const warns = await getWarns(guildId, userId);
  warns.push(warn);
  await db.set(`warns_${guildId}_${userId}`, warns);
  return warns;
}

/**
 * Clear all warnings for a member.
 */
async function clearWarns(guildId, userId) {
  await db.set(`warns_${guildId}_${userId}`, []);
}

// ── Points System ─────────────────────────────────────────────

/**
 * Get a member's message points (1 per message).
 */
async function getMessagePoints(guildId, userId) {
  return (await db.get(`msgpts_${guildId}_${userId}`)) ?? 0;
}

/**
 * Add message points to a member.
 */
async function addMessagePoints(guildId, userId, amount = 1) {
  const current = await getMessagePoints(guildId, userId);
  await db.set(`msgpts_${guildId}_${userId}`, current + amount);
}

/**
 * Get a member's invite points (25 per invite).
 */
async function getInvitePoints(guildId, userId) {
  return (await db.get(`invpts_${guildId}_${userId}`)) ?? 0;
}

/**
 * Add invite points to a member.
 */
async function addInvitePoints(guildId, userId, amount = 25) {
  const current = await getInvitePoints(guildId, userId);
  await db.set(`invpts_${guildId}_${userId}`, current + amount);
}

/**
 * Get a member's raw invite count (number of people they invited).
 */
async function getInviteCount(guildId, userId) {
  return (await db.get(`invcnt_${guildId}_${userId}`)) ?? 0;
}

/**
 * Increment a member's invite count by 1 and award 25 invite points.
 */
async function addInvite(guildId, userId) {
  const count = await getInviteCount(guildId, userId);
  await db.set(`invcnt_${guildId}_${userId}`, count + 1);
  await addInvitePoints(guildId, userId, 25);
}

/**
 * Get a member's ticket claim points (5 per claim).
 */
async function getTicketPoints(guildId, userId) {
  return (await db.get(`tktpts_${guildId}_${userId}`)) ?? 0;
}

/**
 * Add ticket claim points to a member.
 */
async function addTicketPoints(guildId, userId, amount = 5) {
  const current = await getTicketPoints(guildId, userId);
  await db.set(`tktpts_${guildId}_${userId}`, current + amount);
}

/**
 * Get a member's ticket claim count.
 */
async function getTicketClaimCount(guildId, userId) {
  return (await db.get(`tktcnt_${guildId}_${userId}`)) ?? 0;
}

/**
 * Record a ticket claim (increments count + awards 5 points).
 */
async function addTicketClaim(guildId, userId) {
  const count = await getTicketClaimCount(guildId, userId);
  await db.set(`tktcnt_${guildId}_${userId}`, count + 1);
  await addTicketPoints(guildId, userId, 5);
}

/**
 * Get total leaderboard points for a member.
 * Total = messagePoints + invitePoints + ticketPoints
 */
async function getTotalPoints(guildId, userId) {
  const [msg, inv, tkt] = await Promise.all([
    getMessagePoints(guildId, userId),
    getInvitePoints(guildId, userId),
    getTicketPoints(guildId, userId),
  ]);
  return msg + inv + tkt;
}

/**
 * Get all members' total points for a guild, sorted descending.
 * Returns array of { userId, total, messagePoints, invitePoints, ticketPoints }.
 */
async function getAllPoints(guildId) {
  const all = (await db.all()) ?? [];

  // Collect all unique userIds that have any points key for this guild
  const userIds = new Set();
  const prefixes = [`msgpts_${guildId}_`, `invpts_${guildId}_`, `tktpts_${guildId}_`];
  for (const entry of all) {
    for (const prefix of prefixes) {
      if (entry.id.startsWith(prefix)) {
        userIds.add(entry.id.replace(prefix, ''));
      }
    }
  }

  const results = [];
  for (const userId of userIds) {
    const [msg, inv, tkt] = await Promise.all([
      getMessagePoints(guildId, userId),
      getInvitePoints(guildId, userId),
      getTicketPoints(guildId, userId),
    ]);
    results.push({
      userId,
      messagePoints: msg,
      invitePoints:  inv,
      ticketPoints:  tkt,
      total:         msg + inv + tkt,
    });
  }

  return results.sort((a, b) => b.total - a.total);
}

// ── Tickets ───────────────────────────────────────────────────

/**
 * Save an open ticket's channel ID mapped to the opener's userId.
 */
async function setTicket(guildId, channelId, userId) {
  await db.set(`ticket_${guildId}_${channelId}`, { userId, openedAt: Date.now() });
}

/**
 * Get ticket data for a channel. Returns null if not a ticket channel.
 */
async function getTicket(guildId, channelId) {
  return (await db.get(`ticket_${guildId}_${channelId}`)) ?? null;
}

/**
 * Delete ticket record when closed.
 */
async function deleteTicket(guildId, channelId) {
  await db.delete(`ticket_${guildId}_${channelId}`);
}

module.exports = {
  // Economy
  getBalance,
  setBalance,
  addBalance,
  removeBalance,
  getAllBalances,
  // XP / Levels
  getXP,
  addXP,
  getLevel,
  getAllXP,
  // Daily
  getLastDaily,
  setLastDaily,
  // Warnings
  getWarns,
  addWarn,
  clearWarns,
  // Points
  getMessagePoints,
  addMessagePoints,
  getInvitePoints,
  addInvitePoints,
  getInviteCount,
  addInvite,
  getTicketPoints,
  addTicketPoints,
  getTicketClaimCount,
  addTicketClaim,
  getTotalPoints,
  getAllPoints,
  // Tickets
  setTicket,
  getTicket,
  deleteTicket,
};
