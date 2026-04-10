// ============================================================
//  config.js — إعدادات بوت مجتمع A7MED
//  All sensitive values are read from environment variables.
//  On Railway: set these in Settings → Variables.
//  Locally: copy .env.example → .env and fill in your values.
// ============================================================

require('dotenv').config();

// Validate that the critical token is present before anything starts
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is not set. Please add it to your environment variables.');
  process.exit(1);
}

module.exports = {
  // ── Core ──────────────────────────────────────────────────
  token:    process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId:  process.env.GUILD_ID          || '',

  // ── Users ─────────────────────────────────────────────────
  ownerId: process.env.OWNER_ID || '',
  devId:   process.env.DEV_ID   || '',

  // ── Roles ─────────────────────────────────────────────────
  adminRoleId: process.env.ADMIN_ROLE_ID || '',
  autoRoleId:  process.env.AUTO_ROLE_ID  || '',

  // ── Channels ──────────────────────────────────────────────
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',

  // ── Bot behaviour ─────────────────────────────────────────
  prefix: process.env.PREFIX || '!',

  // ── Economy ───────────────────────────────────────────────
  economy: {
    startingBalance:   parseInt(process.env.STARTING_BALANCE,    10) || 1000,
    dailyReward:       parseInt(process.env.DAILY_REWARD,         10) || 500,
    quizWrongPenalty:  parseInt(process.env.QUIZ_WRONG_PENALTY,   10) || 50,
    levelUpReward:     parseInt(process.env.LEVEL_UP_REWARD,      10) || 300,
  },

  // ── XP System ─────────────────────────────────────────────
  xp: {
    perMessageMin: parseInt(process.env.XP_PER_MESSAGE_MIN, 10) || 5,
    perMessageMax: parseInt(process.env.XP_PER_MESSAGE_MAX, 10) || 15,
  },

  // ── Embed colours ─────────────────────────────────────────
  colors: {
    primary: 0x5865F2,  // Discord Blurple
    success: 0x57F287,  // Green
    danger:  0xED4245,  // Red
    warning: 0xFEE75C,  // Yellow
    info:    0x5865F2,  // Blurple
    gold:    0xF1C40F,  // Gold
  },
};
