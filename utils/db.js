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
};
