require('dotenv').config();

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is not set.');
  process.exit(1);
}

module.exports = {
  token:    process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId:  process.env.GUILD_ID          || '',
  devId:    process.env.DEV_ID            || '',

  // Roles
  autoRoleId:    process.env.AUTO_ROLE_ID    || '',
  supportRoleId: process.env.SUPPORT_ROLE_ID || '',

  // Channels
  welcomeChannelId:    process.env.WELCOME_CHANNEL_ID    || '',
  ticketCategoryId:    process.env.TICKET_CATEGORY_ID    || '',
  ticketLogChannelId:  process.env.TICKET_LOG_CHANNEL_ID || '',
  penaltyLogChannelId: process.env.PENALTY_LOG_CHANNEL_ID || '', // ← قناة سجل العقوبات (-6 نقاط)

  prefix: process.env.PREFIX || '!',

  economy: {
    startingBalance:  parseInt(process.env.STARTING_BALANCE,  10) || 1000,
    dailyReward:      parseInt(process.env.DAILY_REWARD,       10) || 500,
    quizWrongPenalty: parseInt(process.env.QUIZ_WRONG_PENALTY, 10) || 50,
  },

  points: {
    perMessage:     1,
    perInvite:      25,
    perTicketClaim: 5,
  },

  colors: {
    primary: 0x5865F2,
    success: 0x57F287,
    danger:  0xED4245,
    warning: 0xFEE75C,
    info:    0x5865F2,
    gold:    0xF1C40F,
  },
};
