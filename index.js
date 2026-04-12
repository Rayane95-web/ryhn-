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
const fs     = require('fs');
const path   = require('path');
const config = require('./config.js');

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

client.commands      = new Collection();
client.aliases       = new Collection();
client.cooldowns     = new Collection();
client.activeQuizzes = new Collection();
client.inviteCache   = new Map();

// ── Load commands ─────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
for (const dir of fs.readdirSync(commandsPath)) {
  const dirPath = path.join(commandsPath, dir);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  for (const file of fs.readdirSync(dirPath).filter(f => f.endsWith('.js'))) {
    try {
      const command = require(path.join(dirPath, file));
      if (!command.name) continue;
      client.commands.set(command.name, command);
      if (command.aliases) {
        for (const alias of command.aliases) client.aliases.set(alias, command.name);
      }
      console.log(`✅ Loaded command: ${command.name}`);
    } catch (err) {
      console.error(`❌ Failed to load ${file}:`, err.message);
    }
  }
}

// ── Weekly Points Reset Scheduler ────────────────────────────
// Runs every Sunday at 00:00 (midnight) automatically
function scheduleWeeklyReset() {
  const now = new Date();
  // Days until next Sunday (0 = Sunday)
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);

  const msUntilReset = nextSunday - now;

  console.log(`📅 Weekly points reset scheduled: ${nextSunday.toLocaleString()}`);

  setTimeout(async () => {
    await runWeeklyReset();
    // After first run, repeat every 7 days
    setInterval(runWeeklyReset, 7 * 24 * 60 * 60 * 1000);
  }, msUntilReset);
}

async function runWeeklyReset() {
  const db = require('./utils/db.js');
  console.log('🔄 Running weekly points reset...');

  for (const guild of client.guilds.cache.values()) {
    try {
      await db.resetAllPoints(guild.id);
      console.log(`✅ Points reset for guild: ${guild.name}`);

      // Announce reset in log channel if configured
      if (config.ticketLogChannelId) {
        const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
          logChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle('🔄 إعادة تعيين النقاط الأسبوعية')
              .setDescription(
                'تم إعادة تعيين جميع نقاط الأعضاء إلى **0** تلقائياً.\n' +
                'ابدأ من جديد وتنافس للوصول إلى القمة! 🏆'
              )
              .setFooter({ text: 'تتم إعادة التعيين كل أسبوع — يوم الأحد منتصف الليل' })
              .setTimestamp()]
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error(`❌ Weekly reset failed for guild ${guild.name}:`, err);
    }
  }
}

// ── Ready ──────────────────────────────────────────────────────
client.once('clientReady', async () => {
  console.log(`\n🤖 Bot online: ${client.user.tag}`);
  console.log(`📦 Commands loaded: ${client.commands.size}`);
  console.log(`🌐 Servers: ${client.guilds.cache.size}\n`);
  client.user.setActivity(`${config.prefix}help | مجتمع A7MED`, { type: 3 });

  for (const guild of client.guilds.cache.values()) {
    try {
      const invites = await guild.invites.fetch();
      const map = new Map();
      for (const inv of invites.values()) map.set(inv.code, { inviterId: inv.inviter?.id, uses: inv.uses ?? 0 });
      client.inviteCache.set(guild.id, map);
    } catch {}
  }

  // Start weekly reset scheduler
  scheduleWeeklyReset();
});

// ── Member join ────────────────────────────────────────────────
client.on('guildMemberAdd', async member => {
  const db = require('./utils/db.js');
  try {
    if (config.autoRoleId) {
      const role = member.guild.roles.cache.get(config.autoRoleId);
      if (role) await member.roles.add(role).catch(() => {});
    }
    let inviterId = null;
    try {
      const cached     = client.inviteCache.get(member.guild.id) ?? new Map();
      const newInvites = await member.guild.invites.fetch();
      for (const [code, inv] of newInvites) {
        const c = cached.get(code);
        if (c && inv.uses > c.uses && inv.inviter) { inviterId = inv.inviter.id; break; }
      }
      const updated = new Map();
      for (const inv of newInvites.values()) updated.set(inv.code, { inviterId: inv.inviter?.id, uses: inv.uses ?? 0 });
      client.inviteCache.set(member.guild.id, updated);
      if (inviterId && inviterId !== member.id) await db.addInvite(member.guild.id, inviterId);
    } catch {}
    if (config.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(config.welcomeChannelId);
      if (channel) {
        await db.addBalance(member.guild.id, member.id, config.economy.startingBalance);
        const inviterLine = inviterId ? `\n✉️ دعاك: <@${inviterId}>` : '';
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`🎉 مرحباً بك في ${member.guild.name}!`)
          .setDescription(
            `أهلاً وسهلاً ${member} في **مجتمع A7MED**!\n\n` +
            `🎁 حصلت على **${config.economy.startingBalance.toLocaleString()} عملة** كهدية ترحيب!` +
            inviterLine + `\n📖 اكتب \`${config.prefix}help\` لعرض جميع الأوامر.`
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
  } catch (err) { console.error('guildMemberAdd error:', err); }
});

// ── Messages ───────────────────────────────────────────────────
const ptsCooldown = new Map();

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const db  = require('./utils/db.js');
  const now = Date.now();

  // ── 1. Message points (10s cooldown) ──────────────────────
  const lastPts = ptsCooldown.get(message.author.id) ?? 0;
  if (now - lastPts > 10_000) {
    ptsCooldown.set(message.author.id, now);
    db.addMessagePoints(message.guild.id, message.author.id, config.points.perMessage).catch(() => {});
  }

  // ── 2. Ticket channel monitoring ──────────────────────────
  // If the channel is a ticket and the sender shouldn't be here
  if (message.channel.topic?.startsWith('ticket:')) {
    const ticketData = await db.getTicket(message.guild.id, message.channel.id).catch(() => null);

    if (ticketData) {
      const isTicketOwner   = message.author.id === ticketData.userId;
      const isAdmin         = message.member.permissions.has(PermissionFlagsBits.Administrator);
      const hasSupportRole  = config.supportRoleId && message.member.roles.cache.has(config.supportRoleId);
      const isDev           = message.author.id === config.devId;

      // Someone who shouldn't be here is typing
      if (!isTicketOwner && !isAdmin && !hasSupportRole && !isDev) {
        // Delete their message
        await message.delete().catch(() => {});

        // Deduct 6 points
        await db.addMessagePoints(message.guild.id, message.author.id, -6);
        const newTotal = await db.getTotalPoints(message.guild.id, message.author.id);

        // ✅ Send DM warning with 9ATTOS name
        message.author.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('⚠️ تحذير من إدارة مجتمع A7MED')
            .setDescription(
              `مرحباً ${message.author.username}،\n\n` +
              `تم اكتشافك تكتب في قناة تذكرة **لا تخصك** في سيرفر **${message.guild.name}**.\n\n` +
              `🚫 هذا مخالف لقواعد السيرفر.\n` +
              `📉 تم خصم **6 نقاط** من رصيدك.\n` +
              `🏆 نقاطك الحالية: **${newTotal}**\n\n` +
              `⚠️ في المرة القادمة ستتلقى **تحذيراً رسمياً** في السيرفر.\n\n` +
              `— **9ATTOS** | مطور بوت مجتمع A7MED`
            )
            .setFooter({ text: 'مجتمع A7MED | احترم قواعد السيرفر 💙' })
            .setTimestamp()]
        }).catch(() => {});

        // ✅ Send log to ticket log channel
        if (config.ticketLogChannelId) {
          const logChannel = message.guild.channels.cache.get(config.ticketLogChannelId);
          if (logChannel) {
            logChannel.send({
              embeds: [new EmbedBuilder()
                .setColor(config.colors.danger)
                .setTitle('🚨 محاولة كتابة في تذكرة غير مخصصة')
                .addFields(
                  { name: '👤 العضو', value: `${message.author} (${message.author.tag})`, inline: true },
                  { name: '🎫 قناة التذكرة', value: `${message.channel}`, inline: true },
                  { name: '👑 صاحب التذكرة', value: `<@${ticketData.userId}>`, inline: true },
                  { name: '📝 الرسالة المحذوفة', value: message.content.slice(0, 200) || '(لا يوجد نص)', inline: false },
                  { name: '📉 النقاط المخصومة', value: '6 نقاط', inline: true },
                  { name: '🏆 نقاطه الآن', value: `${newTotal}`, inline: true },
                  { name: '⚠️ الإجراء', value: 'تم حذف الرسالة + إرسال تحذير DM + خصم 6 نقاط', inline: false },
                )
                .setFooter({ text: 'التحذير الأول — المرة القادمة: تحذير رسمي' })
                .setTimestamp()]
            }).catch(() => {});
          }
        }

        // ✅ Send to separate penalty log channel
        if (config.penaltyLogChannelId) {
          const penaltyChannel = message.guild.channels.cache.get(config.penaltyLogChannelId);
          if (penaltyChannel) {
            penaltyChannel.send({
              embeds: [new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('📉 عقوبة نقاط — كتابة في تذكرة غير مخصصة')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setDescription(
                  `تم خصم **6 نقاط** من ${message.author} بسبب الكتابة في تذكرة لا تخصه.`
                )
                .addFields(
                  { name: '👤 العضو', value: `${message.author}\n${message.author.tag}`, inline: true },
                  { name: '🎫 التذكرة', value: `${message.channel}`, inline: true },
                  { name: '👑 صاحب التذكرة', value: `<@${ticketData.userId}>`, inline: true },
                  { name: '📉 النقاط المخصومة', value: '**-6 نقاط**', inline: true },
                  { name: '🏆 نقاطه الآن', value: `**${newTotal}**`, inline: true },
                  { name: '📱 تم إرسال DM', value: '✅ نعم', inline: true },
                )
                .setFooter({ text: '⚠️ المرة القادمة: تحذير رسمي | مجتمع A7MED' })
                .setTimestamp()]
            }).catch(() => {});
          }
        }

        return; // Stop processing this message further
      }
    }
  }

  // ── 3. Command handling ────────────────────────────────────
  if (!message.content.startsWith(config.prefix)) return;
  const args        = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  const resolved    = client.aliases.get(commandName) ?? commandName;
  const command     = client.commands.get(resolved);
  if (!command) return;

  if (!client.cooldowns.has(command.name)) client.cooldowns.set(command.name, new Collection());
  const timestamps     = client.cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown ?? 3) * 1000;
  const userId         = message.author.id;

  if (timestamps.has(userId)) {
    const exp = timestamps.get(userId) + cooldownAmount;
    if (now < exp) {
      const left = ((exp - now) / 1000).toFixed(1);
      return message.reply(`⏳ انتظر **${left} ثانية** قبل استخدام \`${config.prefix}${command.name}\` مجدداً.`);
    }
  }
  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  try {
    await command.execute(message, args, client);
  } catch (err) {
    console.error(`Command error [${command.name}]:`, err);
    message.reply('❌ حدث خطأ أثناء تنفيذ الأمر.').catch(() => {});
  }
});

// ── Button interactions ────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  const db = require('./utils/db.js');
  const { customId, guild, member, user, channel } = interaction;

  // ── Ticket: Create ─────────────────────────────────────────
  if (customId === 'ticket_create') {
    await interaction.deferReply({ ephemeral: true });
    const existing = guild.channels.cache.find(ch => ch.topic === `ticket:${user.id}`);
    if (existing) return interaction.editReply(`❌ لديك تذكرة مفتوحة بالفعل: ${existing}`);
    try {
      const overwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: guild.members.me.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory],
        },
      ];
      if (config.supportRoleId) {
        overwrites.push({
          id: config.supportRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
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

      const ticketEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎫 تذكرة دعم جديدة')
        .setDescription(
          `مرحباً ${user}! 👋\n\n` +
          `اشرح مشكلتك وسيرد عليك فريق الدعم قريباً.\n\n` +
          `⏰ أوقات الرد: متاح على مدار الساعة`
        )
        .addFields(
          { name: '👤 فُتحت بواسطة', value: `${user}`, inline: true },
          { name: '📅 وقت الفتح', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        )
        .setFooter({ text: 'مجتمع A7MED | فريق الدعم 💙' })
        .setTimestamp();

      const ticketRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('✅ استلام التذكرة').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 إغلاق التذكرة').setStyle(ButtonStyle.Danger),
      );

      // Ping support role + ticket owner
      const supportPing = config.supportRoleId ? `<@&${config.supportRoleId}>` : '';
      await ticketChannel.send({
        content: `${user} ${supportPing}`.trim(),
        embeds: [ticketEmbed],
        components: [ticketRow],
      });

      if (config.ticketLogChannelId) {
        const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
          logChannel.send({
            embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🎫 تذكرة جديدة')
              .addFields(
                { name: 'القناة', value: `${ticketChannel}`, inline: true },
                { name: 'فُتحت بواسطة', value: user.tag, inline: true },
              ).setTimestamp()]
          }).catch(() => {});
        }
      }
      await interaction.editReply(`✅ تم إنشاء تذكرتك: ${ticketChannel}`);
    } catch (err) {
      console.error('Ticket create error:', err);
      await interaction.editReply('❌ حدث خطأ. تأكد من صلاحيات البوت.');
    }
    return;
  }

  // ── Ticket: Claim ──────────────────────────────────────────
  if (customId === 'ticket_claim') {
    const hasSupportRole = config.supportRoleId && member.roles.cache.has(config.supportRoleId);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin && !hasSupportRole && user.id !== config.devId)
      return interaction.reply({ content: '❌ فقط فريق الدعم يمكنه استلام التذاكر.', ephemeral: true });

    const ticketData = await db.getTicket(guild.id, channel.id);
    if (!ticketData) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', ephemeral: true });

    if (ticketData.claimedBy) {
      if (ticketData.claimedBy === user.id)
        return interaction.reply({ content: '❌ لقد استلمت هذه التذكرة بالفعل!', ephemeral: true });
      return interaction.reply({
        content: `❌ هذه التذكرة تم استلامها بالفعل بواسطة <@${ticketData.claimedBy}>`,
        ephemeral: true,
      });
    }

    await db.claimTicket(guild.id, channel.id, user.id);
    await db.addTicketClaim(guild.id, user.id);

    const updatedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel(`✅ مُستلمة بواسطة ${user.username}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('🔒 إغلاق التذكرة')
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.update({ components: [updatedRow] });
    await channel.send({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('✅ تم استلام التذكرة')
        .setDescription(`${user} استلم هذه التذكرة وسيتولى المساعدة.`)
        .addFields({ name: '🏆 النقاط', value: `+${config.points.perTicketClaim} نقاط`, inline: true })
        .setTimestamp()]
    });
    return;
  }

  // ── Ticket: Close ──────────────────────────────────────────
  if (customId === 'ticket_close') {
    const ticketData = await db.getTicket(guild.id, channel.id);
    if (!ticketData) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', ephemeral: true });

    const hasSupportRole = config.supportRoleId && member.roles.cache.has(config.supportRoleId);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = user.id === ticketData.userId;

    if (!isAdmin && !hasSupportRole && !isOwner && user.id !== config.devId)
      return interaction.reply({ content: '❌ فقط صاحب التذكرة أو فريق الدعم يمكنه إغلاقها.', ephemeral: true });

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle('🔒 إغلاق التذكرة')
        .setDescription(`سيتم إغلاق التذكرة خلال **5 ثوانٍ**.\nبواسطة: ${user}`)
        .setTimestamp()]
    });

    if (config.ticketLogChannelId) {
      const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
      if (logChannel) {
        const opener = await client.users.fetch(ticketData.userId).catch(() => null);
        logChannel.send({
          embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle('🎫 تذكرة مغلقة')
            .addFields(
              { name: 'القناة', value: channel.name, inline: true },
              { name: 'فُتحت بواسطة', value: opener ? opener.tag : ticketData.userId, inline: true },
              { name: 'أُغلقت بواسطة', value: user.tag, inline: true },
              { name: 'مُستلمة بواسطة', value: ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : 'لم تُستلم', inline: true },
              { name: 'مدة التذكرة', value: `<t:${Math.floor(ticketData.openedAt / 1000)}:R>`, inline: true },
            ).setTimestamp()]
        }).catch(() => {});
      }
    }

    await db.deleteTicket(guild.id, channel.id);
    setTimeout(() => channel.delete().catch(() => {}), 5000);
    return;
  }
});

// ── Invite cache ───────────────────────────────────────────────
client.on('inviteCreate', invite => {
  try {
    const map = client.inviteCache.get(invite.guild.id) ?? new Map();
    map.set(invite.code, { inviterId: invite.inviter?.id, uses: invite.uses ?? 0 });
    client.inviteCache.set(invite.guild.id, map);
  } catch {}
});

client.on('inviteDelete', invite => {
  try {
    const map = client.inviteCache.get(invite.guild.id);
    if (map) map.delete(invite.code);
  } catch {}
});

client.on('error', err => console.error('Discord client error:', err));
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));

client.login(config.token).catch(err => {
  console.error('❌ Login failed:', err.message);
  process.exit(1);
});
