// ============================================================
//  index.js — بوت مجتمع A7MED | Entry Point
// ============================================================

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  EmbedBuilder,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const config = require('./config.js');

// ── Client setup ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// ── Collections ──────────────────────────────────────────────
client.commands     = new Collection(); // name → command module
client.aliases      = new Collection(); // alias → command name
client.cooldowns    = new Collection(); // userId → Map<commandName, timestamp>
client.activeQuizzes = new Collection(); // channelId → true

// ── Load commands ────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
const categoryDirs = fs.readdirSync(commandsPath);

for (const dir of categoryDirs) {
  const dirPath = path.join(commandsPath, dir);
  if (!fs.statSync(dirPath).isDirectory()) continue;

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const command = require(path.join(dirPath, file));
      if (!command.name) continue;

      client.commands.set(command.name, command);
      if (command.aliases) {
        for (const alias of command.aliases) {
          client.aliases.set(alias, command.name);
        }
      }
      console.log(`✅ Loaded command: ${command.name}`);
    } catch (err) {
      console.error(`❌ Failed to load ${file}:`, err.message);
    }
  }
}

// ── Ready ─────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`\n🤖 Bot online: ${client.user.tag}`);
  console.log(`📦 Commands loaded: ${client.commands.size}`);
  console.log(`🌐 Servers: ${client.guilds.cache.size}\n`);

  client.user.setActivity(`${config.prefix}help | مجتمع A7MED`, { type: 3 /* Watching */ });
});

// ── Guild member add — auto-role & welcome ────────────────────
client.on('guildMemberAdd', async member => {
  try {
    // Auto-role
    if (config.autoRoleId) {
      const role = member.guild.roles.cache.get(config.autoRoleId);
      if (role) await member.roles.add(role).catch(() => {});
    }

    // Welcome message
    if (config.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(config.welcomeChannelId);
      if (channel) {
        const db = require('./utils/db.js');
        await db.addBalance(member.guild.id, member.id, config.economy.startingBalance);

        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`🎉 مرحباً بك في ${member.guild.name}!`)
          .setDescription(
            `أهلاً وسهلاً ${member} في **مجتمع A7MED**!\n\n` +
            `🎁 حصلت على **${config.economy.startingBalance.toLocaleString()} عملة** كهدية ترحيب!\n` +
            `📖 اكتب \`${config.prefix}help\` لعرض جميع الأوامر.`
          )
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '👥 عدد الأعضاء', value: `${member.guild.memberCount}`, inline: true },
            { name: '📅 انضم في', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
          )
          .setFooter({ text: 'مجتمع A7MED | نسعد بوجودك معنا 💙' })
          .setTimestamp();

        channel.send({ content: `${member}`, embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('guildMemberAdd error:', err);
  }
});

// ── XP on message ─────────────────────────────────────────────
const xpCooldown = new Map(); // userId → timestamp

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // XP gain (with 60-second cooldown per user)
  const now = Date.now();
  const lastXP = xpCooldown.get(message.author.id) ?? 0;
  if (now - lastXP > 60_000) {
    xpCooldown.set(message.author.id, now);
    try {
      const db = require('./utils/db.js');
      const xpGain = Math.floor(
        Math.random() * (config.xp.perMessageMax - config.xp.perMessageMin + 1) +
        config.xp.perMessageMin
      );
      const { leveledUp, newLevel } = await db.addXP(message.guild.id, message.author.id, xpGain);

      if (leveledUp) {
        await db.addBalance(message.guild.id, message.author.id, config.economy.levelUpReward);
        message.channel.send(
          `🎊 تهانينا ${message.author}! وصلت إلى **المستوى ${newLevel}** 🏆\n` +
          `🎁 حصلت على **${config.economy.levelUpReward.toLocaleString()} عملة** كمكافأة!`
        ).catch(() => {});
      }
    } catch (err) {
      console.error('XP error:', err);
    }
  }

  // Command handling
  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  // Resolve command by name or alias
  const resolvedName = client.aliases.get(commandName) ?? commandName;
  const command = client.commands.get(resolvedName);
  if (!command) return;

  // Cooldown check
  if (!client.cooldowns.has(command.name)) {
    client.cooldowns.set(command.name, new Collection());
  }
  const timestamps = client.cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown ?? 3) * 1000;
  const userId = message.author.id;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
      return message.reply(`⏳ انتظر **${timeLeft} ثانية** قبل استخدام \`${config.prefix}${command.name}\` مجدداً.`);
    }
  }
  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  // Execute
  try {
    await command.execute(message, args, client);
  } catch (err) {
    console.error(`Command error [${command.name}]:`, err);
    message.reply('❌ حدث خطأ أثناء تنفيذ الأمر. حاول مرة أخرى.').catch(() => {});
  }
});

// ── Error handling ────────────────────────────────────────────
client.on('error', err => console.error('Discord client error:', err));
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));

// ── Login ─────────────────────────────────────────────────────
client.login(config.token).catch(err => {
  console.error('❌ Failed to login. Check your DISCORD_TOKEN:', err.message);
  process.exit(1);
});
