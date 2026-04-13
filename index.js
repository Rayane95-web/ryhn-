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

// ── Weekly Points Reset ────────────────────────────────────────
function scheduleWeeklyReset() {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  const msUntilReset = nextSunday - now;
  console.log(`📅 Weekly points reset scheduled: ${nextSunday.toLocaleString()}`);
  setTimeout(async () => {
    await runWeeklyReset();
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
      if (config.ticketLogChannelId) {
        const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
          logChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle('🔄 إعادة تعيين النقاط الأسبوعية')
              .setDescription('تم إعادة تعيين جميع نقاط الأعضاء إلى **0** تلقائياً.\nابدأ من جديد وتنافس للوصول إلى القمة! 🏆')
              .setFooter({ text: 'تتم إعادة التعيين كل أسبوع — يوم الأحد منتصف الليل' })
              .setTimestamp()]
          }).catch(() => {});
        }
      }
    } catch (err) { console.error(`❌ Weekly reset failed for ${guild.name}:`, err); }
  }
}

// ── Helper: Send Rating DM ─────────────────────────────────────
async function sendRatingDM(db, ticketOwner, ticketData, channelName, guildId, guildName) {
  try {
    const ratingRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rate_1_${guildId}`).setLabel('⭐ 1').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`rate_2_${guildId}`).setLabel('⭐⭐ 2').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`rate_3_${guildId}`).setLabel('⭐⭐⭐ 3').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rate_4_${guildId}`).setLabel('⭐⭐⭐⭐ 4').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`rate_5_${guildId}`).setLabel('⭐⭐⭐⭐⭐ 5').setStyle(ButtonStyle.Success),
    );

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('⭐ قيّم تجربتك مع فريق الدعم')
      .setDescription(
        `شكراً لتواصلك مع دعم **${guildName}**!\n\n` +
        `كيف تقيّم جودة الدعم الذي تلقيته؟\n` +
        `اضغط على أحد الأزرار أدناه لإرسال تقييمك.\n\n` +
        `📋 **التذكرة:** ${channelName}\n` +
        (ticketData.claimedBy ? `👤 **المسؤول:** <@${ticketData.claimedBy}>` : '')
      )
      .setFooter({ text: 'مجتمع A7MED | رأيك يهمنا 💙 — لديك 24 ساعة للتقييم' })
      .setTimestamp();

    const dmMsg = await ticketOwner.send({ embeds: [dmEmbed], components: [ratingRow] });

    // Save pending rating so we can reference it when they click
    await db.setPendingRating(ticketOwner.id, {
      guildId,
      guildName,
      channelName,
      claimedBy: ticketData.claimedBy ?? null,
      openedAt: ticketData.openedAt,
      dmMessageId: dmMsg.id,
    });

    // Auto-expire after 24 hours
    setTimeout(async () => {
      const pending = await db.getPendingRating(ticketOwner.id);
      if (pending && pending.dmMessageId === dmMsg.id) {
        await db.deletePendingRating(ticketOwner.id);
        const expiredRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('rate_expired').setLabel('انتهت صلاحية التقييم').setStyle(ButtonStyle.Secondary).setDisabled(true),
        );
        dmMsg.edit({ components: [expiredRow] }).catch(() => {});
      }
    }, 24 * 60 * 60 * 1000);

  } catch {
    // User has DMs closed — skip silently
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

  // Message points
  const lastPts = ptsCooldown.get(message.author.id) ?? 0;
  if (now - lastPts > 10_000) {
    ptsCooldown.set(message.author.id, now);
    db.addMessagePoints(message.guild.id, message.author.id, config.points.perMessage).catch(() => {});
  }

  // Ticket channel monitoring
  if (message.channel.topic?.startsWith('ticket:')) {
    const ticketData = await db.getTicket(message.guild.id, message.channel.id).catch(() => null);
    if (ticketData) {
      const isTicketOwner  = message.author.id === ticketData.userId;
      const isAdmin        = message.member.permissions.has(PermissionFlagsBits.Administrator);
      const hasSupportRole = config.supportRoleId && message.member.roles.cache.has(config.supportRoleId);
      const isDev          = message.author.id === config.devId;
      const isAddedUser    = (ticketData.addedUsers ?? []).includes(message.author.id);

      if (!isTicketOwner && !isAdmin && !hasSupportRole && !isDev && !isAddedUser) {
        await message.delete().catch(() => {});
        await db.addMessagePoints(message.guild.id, message.author.id, -6);
        const newTotal = await db.getTotalPoints(message.guild.id, message.author.id);

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
                )
                .setFooter({ text: 'التحذير الأول — المرة القادمة: تحذير رسمي' })
                .setTimestamp()]
            }).catch(() => {});
          }
        }

        if (config.penaltyLogChannelId) {
          const penaltyChannel = message.guild.channels.cache.get(config.penaltyLogChannelId);
          if (penaltyChannel) {
            penaltyChannel.send({
              embeds: [new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('📉 عقوبة نقاط — كتابة في تذكرة غير مخصصة')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setDescription(`تم خصم **6 نقاط** من ${message.author} بسبب الكتابة في تذكرة لا تخصه.`)
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
        return;
      }
    }
  }

  // Command handling
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

  // ── Ticket Rating buttons (sent via DM) ────────────────────
  if (customId.startsWith('rate_') && !guild) {
    const parts = customId.split('_'); // rate_5_guildId
    const stars = parseInt(parts[1]);
    const guildId = parts[2];

    if (isNaN(stars) || stars < 1 || stars > 5) return;

    const pending = await db.getPendingRating(user.id);
    if (!pending || pending.guildId !== guildId) {
      return interaction.reply({ content: '❌ لم يتم العثور على تذكرة معلقة للتقييم.', ephemeral: true });
    }

    // Save rating
    const starEmojis = { 1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐' };
    const starLabel  = { 1: 'سيئ جداً', 2: 'سيئ', 3: 'مقبول', 4: 'جيد', 5: 'ممتاز!' };

    await db.saveRating(guildId, {
      stars,
      userId: user.id,
      userTag: user.tag,
      claimedBy: pending.claimedBy,
      channelName: pending.channelName,
      openedAt: pending.openedAt,
    });
    await db.deletePendingRating(user.id);

    // Disable all buttons in the DM
    const disabledRow = new ActionRowBuilder().addComponents(
      [1, 2, 3, 4, 5].map(n =>
        new ButtonBuilder()
          .setCustomId(`rate_${n}_done`)
          .setLabel(n === stars ? `${starEmojis[n]} تم اختياره` : `${n}`)
          .setStyle(n === stars ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(true)
      )
    );

    await interaction.update({
      embeds: [new EmbedBuilder()
        .setColor(stars >= 4 ? config.colors.success : stars >= 3 ? config.colors.warning : config.colors.danger)
        .setTitle('✅ شكراً على تقييمك!')
        .setDescription(
          `لقد قيّمت تجربتك بـ **${starEmojis[stars]} ${stars}/5** — ${starLabel[stars]}\n\n` +
          `رأيك يساعدنا على تحسين خدمة الدعم في **${pending.guildName}**. 💙`
        )
        .setFooter({ text: 'مجتمع A7MED | شكراً لك!' })
        .setTimestamp()],
      components: [disabledRow],
    });

    // Send rating to ticket log channel
    const targetGuild = client.guilds.cache.get(guildId);
    if (targetGuild && config.ticketLogChannelId) {
      const logChannel = targetGuild.channels.cache.get(config.ticketLogChannelId);
      if (logChannel) {
        const claimedUser = pending.claimedBy
          ? await client.users.fetch(pending.claimedBy).catch(() => null)
          : null;

        logChannel.send({
          embeds: [new EmbedBuilder()
            .setColor(stars >= 4 ? config.colors.success : stars >= 3 ? config.colors.warning : config.colors.danger)
            .setTitle(`${starEmojis[stars]} تقييم تذكرة جديد`)
            .addFields(
              { name: '⭐ التقييم', value: `**${starEmojis[stars]} ${stars}/5** — ${starLabel[stars]}`, inline: false },
              { name: '👤 المُقيِّم', value: `${user.tag}`, inline: true },
              { name: '🎫 التذكرة', value: pending.channelName, inline: true },
              { name: '👨‍💼 المسؤول', value: claimedUser ? claimedUser.tag : 'لم يُستلم', inline: true },
              { name: '📅 وقت فتح التذكرة', value: `<t:${Math.floor(pending.openedAt / 1000)}:R>`, inline: true },
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'مجتمع A7MED | نظام تقييم التذاكر' })
            .setTimestamp()]
        }).catch(() => {});
      }
    }
    return;
  }

  // ── Ticket: Create ─────────────────────────────────────────
  if (customId === 'ticket_create') {
    await interaction.deferReply({ ephemeral: true });
    const existing = guild.channels.cache.find(ch => ch.topic === `ticket:${user.id}`);
    if (existing) return interaction.editReply(`❌ لديك تذكرة مفتوحة بالفعل: ${existing}`);
    try {
      const overwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
      ];
      if (config.supportRoleId) {
        overwrites.push({ id: config.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
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
        .setDescription(`مرحباً ${user}! 👋\n\nاشرح مشكلتك وسيرد عليك فريق الدعم قريباً.\n\n⏰ أوقات الرد: متاح على مدار الساعة`)
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

      const supportPing = config.supportRoleId ? `<@&${config.supportRoleId}>` : '';
      await ticketChannel.send({ content: `${user} ${supportPing}`.trim(), embeds: [ticketEmbed], components: [ticketRow] });

      if (config.ticketLogChannelId) {
        const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
          logChannel.send({
            embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🎫 تذكرة جديدة')
              .addFields({ name: 'القناة', value: `${ticketChannel}`, inline: true }, { name: 'فُتحت بواسطة', value: user.tag, inline: true })
              .setTimestamp()]
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
      return interaction.reply({ content: `❌ هذه التذكرة تم استلامها بواسطة <@${ticketData.claimedBy}>`, ephemeral: true });
    }

    await db.claimTicket(guild.id, channel.id, user.id);
    await db.addTicketClaim(guild.id, user.id);

    const updatedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_claim').setLabel(`✅ مُستلمة بواسطة ${user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
      new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 إغلاق التذكرة').setStyle(ButtonStyle.Danger),
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

    // ✅ Send rating DM to ticket owner
    const ticketOwner = await client.users.fetch(ticketData.userId).catch(() => null);
    if (ticketOwner) {
      await sendRatingDM(db, ticketOwner, ticketData, channel.name, guild.id, guild.name);
    }

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
              { name: '⭐ التقييم', value: 'تم إرسال طلب التقييم للعضو', inline: true },
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
