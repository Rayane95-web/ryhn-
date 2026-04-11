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
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
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
    GatewayIntentBits.GuildInvites,
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

// ── Invite cache (userId → uses count) per guild ──────────────
client.inviteCache = new Map(); // guildId → Map<inviteCode, { inviterId, uses }>

// ── Ready ─────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`\n🤖 Bot online: ${client.user.tag}`);
  console.log(`📦 Commands loaded: ${client.commands.size}`);
  console.log(`🌐 Servers: ${client.guilds.cache.size}\n`);

  client.user.setActivity(`${config.prefix}help | مجتمع A7MED`, { type: 3 /* Watching */ });

  // Cache current invites for all guilds
  for (const guild of client.guilds.cache.values()) {
    try {
      const invites = await guild.invites.fetch();
      const map = new Map();
      for (const inv of invites.values()) {
        map.set(inv.code, { inviterId: inv.inviter?.id, uses: inv.uses ?? 0 });
      }
      client.inviteCache.set(guild.id, map);
    } catch {
      // Missing MANAGE_GUILD permission — invite tracking disabled for this guild
    }
  }
});

// ── Guild member add — auto-role, welcome & invite tracking ───
client.on('guildMemberAdd', async member => {
  const db = require('./utils/db.js');
  try {
    // Auto-role
    if (config.autoRoleId) {
      const role = member.guild.roles.cache.get(config.autoRoleId);
      if (role) await member.roles.add(role).catch(() => {});
    }

    // ── Invite tracking ──────────────────────────────────────
    let inviterId = null;
    try {
      const cachedInvites = client.inviteCache.get(member.guild.id) ?? new Map();
      const newInvites    = await member.guild.invites.fetch();

      // Find the invite whose use count increased
      for (const [code, inv] of newInvites) {
        const cached = cachedInvites.get(code);
        if (cached && inv.uses > cached.uses && inv.inviter) {
          inviterId = inv.inviter.id;
          break;
        }
      }

      // Update cache
      const updatedMap = new Map();
      for (const inv of newInvites.values()) {
        updatedMap.set(inv.code, { inviterId: inv.inviter?.id, uses: inv.uses ?? 0 });
      }
      client.inviteCache.set(member.guild.id, updatedMap);

      // Award invite points
      if (inviterId && inviterId !== member.id) {
        await db.addInvite(member.guild.id, inviterId);
        console.log(`✉️ Invite tracked: ${inviterId} invited ${member.user.tag} (+25 pts)`);
      }
    } catch {
      // MANAGE_GUILD permission missing — skip invite tracking
    }

    // ── Welcome message ──────────────────────────────────────
    if (config.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(config.welcomeChannelId);
      if (channel) {
        await db.addBalance(member.guild.id, member.id, config.economy.startingBalance);

        const inviterLine = inviterId
          ? `\n✉️ دعاك: <@${inviterId}>`
          : '';

        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`🎉 مرحباً بك في ${member.guild.name}!`)
          .setDescription(
            `أهلاً وسهلاً ${member} في **مجتمع A7MED**!\n\n` +
            `🎁 حصلت على **${config.economy.startingBalance.toLocaleString()} عملة** كهدية ترحيب!` +
            inviterLine + `\n` +
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

// ── XP & points on message ────────────────────────────────────
const xpCooldown  = new Map(); // userId → timestamp (XP cooldown)
const ptsCooldown = new Map(); // userId → timestamp (points cooldown)

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const db  = require('./utils/db.js');
  const now = Date.now();

  // Message points (1 per message, 10-second cooldown to prevent spam)
  const lastPts = ptsCooldown.get(message.author.id) ?? 0;
  if (now - lastPts > 10_000) {
    ptsCooldown.set(message.author.id, now);
    db.addMessagePoints(message.guild.id, message.author.id, config.points.perMessage).catch(() => {});
  }

  // XP gain (with 60-second cooldown per user)
  const lastXP = xpCooldown.get(message.author.id) ?? 0;
  if (now - lastXP > 60_000) {
    xpCooldown.set(message.author.id, now);
    try {
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

// ── Button / interaction handler ─────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const db = require('./utils/db.js');
  const { customId, guild, member, user, channel } = interaction;

  // ── Ticket: Create ────────────────────────────────────────
  if (customId === 'ticket_create') {
    await interaction.deferReply({ ephemeral: true });

    // Check if user already has an open ticket
    const existing = guild.channels.cache.find(
      ch => ch.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}` ||
            ch.topic === `ticket:${user.id}`
    );
    if (existing) {
      return interaction.editReply(`❌ لديك تذكرة مفتوحة بالفعل: ${existing}`);
    }

    try {
      // Permission overwrites: private to the user + admins
      const overwrites = [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: guild.members.me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ];

      // Also allow all admins to see the ticket
      const adminMembers = guild.members.cache.filter(m =>
        m.permissions.has(PermissionFlagsBits.Administrator) && !m.user.bot
      );
      for (const [, adminMember] of adminMembers) {
        overwrites.push({
          id: adminMember.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      }

      const ticketChannel = await guild.channels.create({
        name: `🎫-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`,
        type: ChannelType.GuildText,
        topic: `ticket:${user.id}`,
        parent: config.ticketCategoryId || null,
        permissionOverwrites: overwrites,
        reason: `Ticket opened by ${user.tag}`,
      });

      await db.setTicket(guild.id, ticketChannel.id, user.id);

      // Send welcome message in ticket channel
      const ticketEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎫 تذكرة دعم جديدة')
        .setDescription(
          `مرحباً ${user}! 👋\n\n` +
          `شكراً لتواصلك مع فريق دعم **مجتمع A7MED**.\n` +
          `اشرح مشكلتك أو استفسارك وسيرد عليك أحد أعضاء الفريق قريباً.\n\n` +
          `⏰ أوقات الرد: متاح على مدار الساعة`
        )
        .addFields(
          { name: '👤 فُتحت بواسطة', value: `${user}`, inline: true },
          { name: '📅 وقت الفتح', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        )
        .setFooter({ text: 'مجتمع A7MED | فريق الدعم 💙' })
        .setTimestamp();

      const ticketRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_claim')
          .setLabel('✅ استلام التذكرة')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('🔒 إغلاق التذكرة')
          .setStyle(ButtonStyle.Danger),
      );

      await ticketChannel.send({ content: `${user}`, embeds: [ticketEmbed], components: [ticketRow] });

      // Log to ticket log channel
      if (config.ticketLogChannelId) {
        const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🎫 تذكرة جديدة مفتوحة')
            .addFields(
              { name: 'القناة', value: `${ticketChannel}`, inline: true },
              { name: 'فُتحت بواسطة', value: `${user.tag}`, inline: true },
            )
            .setTimestamp();
          logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      await interaction.editReply(`✅ تم إنشاء تذكرتك: ${ticketChannel}`);
    } catch (err) {
      console.error('Ticket create error:', err);
      await interaction.editReply('❌ حدث خطأ أثناء إنشاء التذكرة. تأكد من صلاحيات البوت.');
    }
    return;
  }

  // ── Ticket: Claim ─────────────────────────────────────────
  if (customId === 'ticket_claim') {
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && user.id !== config.devId) {
      return interaction.reply({ content: '❌ فقط الأدمن يمكنه استلام التذاكر.', ephemeral: true });
    }

    const ticketData = await db.getTicket(guild.id, channel.id);
    if (!ticketData) {
      return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', ephemeral: true });
    }

    await db.addTicketClaim(guild.id, user.id);

    const claimEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✅ تم استلام التذكرة')
      .setDescription(`${user} استلم هذه التذكرة وسيتولى المساعدة.`)
      .addFields({ name: '🏆 النقاط', value: `+${config.points.perTicketClaim} نقاط لـ ${user.username}`, inline: true })
      .setTimestamp();

    await interaction.reply({ embeds: [claimEmbed] });
    return;
  }

  // ── Ticket: Close ─────────────────────────────────────────
  if (customId === 'ticket_close') {
    const ticketData = await db.getTicket(guild.id, channel.id);
    if (!ticketData) {
      return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', ephemeral: true });
    }

    const canClose = member.permissions.has(PermissionFlagsBits.Administrator) ||
      user.id === config.devId ||
      user.id === ticketData.userId;

    if (!canClose) {
      return interaction.reply({ content: '❌ فقط صاحب التذكرة أو الأدمن يمكنه إغلاقها.', ephemeral: true });
    }

    const closeEmbed = new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('🔒 إغلاق التذكرة')
      .setDescription(`سيتم إغلاق هذه التذكرة خلال **5 ثوانٍ**.\nبواسطة: ${user}`)
      .setTimestamp();

    await interaction.reply({ embeds: [closeEmbed] });

    // Log
    if (config.ticketLogChannelId) {
      const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
      if (logChannel) {
        const opener = await client.users.fetch(ticketData.userId).catch(() => null);
        const logEmbed = new EmbedBuilder()
          .setColor(config.colors.danger)
          .setTitle('🎫 تذكرة مغلقة')
          .addFields(
            { name: 'القناة', value: channel.name, inline: true },
            { name: 'فُتحت بواسطة', value: opener ? opener.tag : ticketData.userId, inline: true },
            { name: 'أُغلقت بواسطة', value: user.tag, inline: true },
            { name: 'مدة التذكرة', value: `<t:${Math.floor(ticketData.openedAt / 1000)}:R>`, inline: true },
          )
          .setTimestamp();
        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }

    await db.deleteTicket(guild.id, channel.id);
    setTimeout(() => channel.delete().catch(() => {}), 5000);
    return;
  }
});

// ── Invite update cache ───────────────────────────────────────
client.on('inviteCreate', async invite => {
  try {
    const map = client.inviteCache.get(invite.guild.id) ?? new Map();
    map.set(invite.code, { inviterId: invite.inviter?.id, uses: invite.uses ?? 0 });
    client.inviteCache.set(invite.guild.id, map);
  } catch {}
});

client.on('inviteDelete', async invite => {
  try {
    const map = client.inviteCache.get(invite.guild.id);
    if (map) map.delete(invite.code);
  } catch {}
});

// ── Error handling ────────────────────────────────────────────
client.on('error', err => console.error('Discord client error:', err));
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));

// ── Login ─────────────────────────────────────────────────────
client.login(config.token).catch(err => {
  console.error('❌ Failed to login. Check your DISCORD_TOKEN:', err.message);
  process.exit(1);
});
