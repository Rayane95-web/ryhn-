const { QuickDB } = require('quick.db');
const db = new QuickDB();

// ── Economy ───────────────────────────────────────────────────
async function getBalance(guildId, userId) { return (await db.get(`balance_${guildId}_${userId}`)) ?? 0; }
async function setBalance(guildId, userId, amount) { await db.set(`balance_${guildId}_${userId}`, Math.max(0, amount)); }
async function addBalance(guildId, userId, amount) { const c = await getBalance(guildId, userId); await setBalance(guildId, userId, c + amount); }
async function removeBalance(guildId, userId, amount) { const c = await getBalance(guildId, userId); await setBalance(guildId, userId, Math.max(0, c - amount)); }
async function getAllBalances(guildId) {
  const all = (await db.all()) ?? [];
  return all
    .filter(e => e.id.startsWith(`balance_${guildId}_`))
    .map(e => ({ userId: e.id.replace(`balance_${guildId}_`, ''), balance: e.value }))
    .sort((a, b) => b.balance - a.balance);
}

// ── XP / Levels ───────────────────────────────────────────────
async function getXP(guildId, userId) { return (await db.get(`xp_${guildId}_${userId}`)) ?? 0; }
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
async function getLevel(guildId, userId) { return (await db.get(`level_${guildId}_${userId}`)) ?? 0; }
async function getAllXP(guildId) {
  const all = (await db.all()) ?? [];
  return all
    .filter(e => e.id.startsWith(`xp_${guildId}_`))
    .map(e => ({ userId: e.id.replace(`xp_${guildId}_`, ''), xp: e.value, level: Math.floor(0.1 * Math.sqrt(e.value)) }))
    .sort((a, b) => b.xp - a.xp);
}

// ── Daily ─────────────────────────────────────────────────────
async function getLastDaily(guildId, userId) { return (await db.get(`daily_${guildId}_${userId}`)) ?? null; }
async function setLastDaily(guildId, userId) { await db.set(`daily_${guildId}_${userId}`, Date.now()); }

// ── Warnings ──────────────────────────────────────────────────
async function getWarns(guildId, userId) { return (await db.get(`warns_${guildId}_${userId}`)) ?? []; }
async function addWarn(guildId, userId, warn) {
  const warns = await getWarns(guildId, userId);
  warns.push(warn);
  await db.set(`warns_${guildId}_${userId}`, warns);
  return warns;
}
async function clearWarns(guildId, userId) { await db.set(`warns_${guildId}_${userId}`, []); }

// ── Points ────────────────────────────────────────────────────
async function getMessagePoints(guildId, userId) { return (await db.get(`msgpts_${guildId}_${userId}`)) ?? 0; }
async function addMessagePoints(guildId, userId, amount = 1) {
  const c = await getMessagePoints(guildId, userId);
  const newVal = Math.max(0, c + amount); // prevent going below 0
  await db.set(`msgpts_${guildId}_${userId}`, newVal);
}
async function getInvitePoints(guildId, userId) { return (await db.get(`invpts_${guildId}_${userId}`)) ?? 0; }
async function addInvitePoints(guildId, userId, amount = 25) { const c = await getInvitePoints(guildId, userId); await db.set(`invpts_${guildId}_${userId}`, c + amount); }
async function getInviteCount(guildId, userId) { return (await db.get(`invcnt_${guildId}_${userId}`)) ?? 0; }
async function addInvite(guildId, userId) {
  const count = await getInviteCount(guildId, userId);
  await db.set(`invcnt_${guildId}_${userId}`, count + 1);
  await addInvitePoints(guildId, userId, 25);
}
async function getTicketPoints(guildId, userId) { return (await db.get(`tktpts_${guildId}_${userId}`)) ?? 0; }
async function addTicketPoints(guildId, userId, amount = 5) { const c = await getTicketPoints(guildId, userId); await db.set(`tktpts_${guildId}_${userId}`, c + amount); }
async function getTicketClaimCount(guildId, userId) { return (await db.get(`tktcnt_${guildId}_${userId}`)) ?? 0; }
async function addTicketClaim(guildId, userId) {
  const count = await getTicketClaimCount(guildId, userId);
  await db.set(`tktcnt_${guildId}_${userId}`, count + 1);
  await addTicketPoints(guildId, userId, 5);
}
async function getTotalPoints(guildId, userId) {
  const [msg, inv, tkt] = await Promise.all([getMessagePoints(guildId, userId), getInvitePoints(guildId, userId), getTicketPoints(guildId, userId)]);
  return msg + inv + tkt;
}
async function getAllPoints(guildId) {
  const all = (await db.all()) ?? [];
  const userIds = new Set();
  const prefixes = [`msgpts_${guildId}_`, `invpts_${guildId}_`, `tktpts_${guildId}_`];
  for (const entry of all) {
    for (const prefix of prefixes) {
      if (entry.id.startsWith(prefix)) userIds.add(entry.id.replace(prefix, ''));
    }
  }
  const results = [];
  for (const userId of userIds) {
    const [msg, inv, tkt] = await Promise.all([getMessagePoints(guildId, userId), getInvitePoints(guildId, userId), getTicketPoints(guildId, userId)]);
    results.push({ userId, messagePoints: msg, invitePoints: inv, ticketPoints: tkt, total: msg + inv + tkt });
  }
  return results.sort((a, b) => b.total - a.total);
}

// ── Weekly Points Reset ───────────────────────────────────────
/**
 * Resets ALL points (message, invite, ticket) for ALL users in a guild to 0.
 * Called every Sunday at midnight automatically.
 */
async function resetAllPoints(guildId) {
  const all = (await db.all()) ?? [];
  const prefixes = [`msgpts_${guildId}_`, `invpts_${guildId}_`, `tktpts_${guildId}_`, `tktcnt_${guildId}_`, `invcnt_${guildId}_`];
  for (const entry of all) {
    for (const prefix of prefixes) {
      if (entry.id.startsWith(prefix)) {
        await db.set(entry.id, 0);
      }
    }
  }
}

// ── Tickets ───────────────────────────────────────────────────
async function setTicket(guildId, channelId, userId) {
  await db.set(`ticket_${guildId}_${channelId}`, { userId, openedAt: Date.now(), claimedBy: null });
}
async function getTicket(guildId, channelId) {
  return (await db.get(`ticket_${guildId}_${channelId}`)) ?? null;
}
async function claimTicket(guildId, channelId, userId) {
  const data = await getTicket(guildId, channelId);
  if (!data) return;
  await db.set(`ticket_${guildId}_${channelId}`, { ...data, claimedBy: userId });
}
async function deleteTicket(guildId, channelId) {
  await db.delete(`ticket_${guildId}_${channelId}`);
}

module.exports = {
  getBalance, setBalance, addBalance, removeBalance, getAllBalances,
  getXP, addXP, getLevel, getAllXP,
  getLastDaily, setLastDaily,
  getWarns, addWarn, clearWarns,
  getMessagePoints, addMessagePoints,
  getInvitePoints, addInvitePoints,
  getInviteCount, addInvite,
  getTicketPoints, addTicketPoints,
  getTicketClaimCount, addTicketClaim,
  getTotalPoints, getAllPoints,
  resetAllPoints,
  setTicket, getTicket, claimTicket, deleteTicket,
};
