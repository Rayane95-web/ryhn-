const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

const isAdmin = (message) =>
  message.member.permissions.has(PermissionFlagsBits.Administrator) ||
  message.author.id === config.devId;

const isDev = (message) => message.author.id === config.devId;

module.exports = {
  name: 'admin', aliases: ['ادمن', 'لوحة-التحكم'],
  description: 'لوحة تحكم الأدمن',
  usage: '!admin [أمر]',
  category: '⚙️ الإدارة',

  async execute(message, args, client) {
    if (!isAdmin(message)) return message.reply('❌ هذا الأمر للأدمن فقط.');

    const sub = args[0]?.toLowerCase();

    // ── Help panel ─────────────────────────────────────────
    if (!sub || sub === 'help' || sub === 'مساعدة') {
      const adminFields = [
        {
          name: '📢 الإعلانات',
          value:
            '`!admin announce #قناة [رسالة]`\n' +
            '`!admin dm @عضو [رسالة]` — رسالة لعضو واحد\n' +
            '`!admin dm role @رتبة [رسالة]` — رسالة لكل أعضاء رتبة',
        },
        { name: '⚠️ التحذيرات', value: '`!admin clearwarns @عضو`\n`!admin warns @عضو`' },
        { name: '🎭 الرتب', value: '`!admin addrole @عضو @رتبة`\n`!admin removerole @عضو @رتبة`' },
        { name: '🔧 معلومات', value: '`!admin botinfo`' },
      ];

      if (isDev(message)) {
        adminFields.unshift({
          name: '💰 الاقتصاد — للمطور فقط 👑',
          value:
            '`!admin addmoney @عضو [مبلغ]`\n' +
            '`!admin removemoney @عضو [مبلغ]`\n' +
            '`!admin setmoney @عضو [مبلغ]`\n' +
            '`!admin resetmoney @عضو`\n' +
            '`!admin addpoints @عضو [مبلغ]`\n' +
            '`!admin removepoints @عضو [مبلغ]`\n' +
            '`!admin resetall @عضو`',
        });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('⚙️ لوحة تحكم الأدمن — مجتمع A7MED')
        .addFields(...adminFields)
        .addFields(
          { name: '👑 المالك', value: 'A7MED', inline: true },
          { name: '🛠️ المطور', value: '9ATTOS', inline: true },
        )
        .setFooter({ text: 'لوحة تحكم مجتمع A7MED' })
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    // ── DEV ONLY block ─────────────────────────────────────
    const devOnlyCommands = [
      'addmoney', 'removemoney', 'setmoney', 'resetmoney',
      'addpoints', 'removepoints', 'resetall',
    ];
    if (devOnlyCommands.includes(sub) && !isDev(message)) {
      return message.reply('❌ هذا الأمر **للمطور فقط** 👑 ولا يمكن لأحد آخر استخدامه حتى لو كان أدمن.');
    }

    // ── addmoney (DEV) ──────────────────────────────────────
    if (sub === 'addmoney') {
      const member = message.mentions.members.first();
      const amount = parseInt(args[2]);
      if (!member || isNaN(amount) || amount <= 0) return message.reply('❌ `!admin addmoney @عضو [مبلغ]`');
      await db.addBalance(message.guild.id, member.id, amount);
      const bal = await db.getBalance(message.guild.id, member.id);
      return message.reply(`✅ تم إضافة **${amount.toLocaleString()} عملة** لـ ${member}.\n💰 رصيده الآن: **${bal.toLocaleString()}**`);
    }

    // ── removemoney (DEV) ───────────────────────────────────
    if (sub === 'removemoney') {
      const member = message.mentions.members.first();
      const amount = parseInt(args[2]);
      if (!member || isNaN(amount) || amount <= 0) return message.reply('❌ `!admin removemoney @عضو [مبلغ]`');
      await db.removeBalance(message.guild.id, member.id, amount);
      const bal = await db.getBalance(message.guild.id, member.id);
      return message.reply(`✅ تم خصم **${amount.toLocaleString()} عملة** من ${member}.\n💰 رصيده الآن: **${bal.toLocaleString()}**`);
    }

    // ── setmoney (DEV) ──────────────────────────────────────
    if (sub === 'setmoney') {
      const member = message.mentions.members.first();
      const amount = parseInt(args[2]);
      if (!member || isNaN(amount) || amount < 0) return message.reply('❌ `!admin setmoney @عضو [مبلغ]`');
      await db.setBalance(message.guild.id, member.id, amount);
      return message.reply(`✅ تم تعيين رصيد ${member} إلى **${amount.toLocaleString()} عملة**.`);
    }

    // ── resetmoney (DEV) ────────────────────────────────────
    if (sub === 'resetmoney') {
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ `!admin resetmoney @عضو`');
      await db.setBalance(message.guild.id, member.id, config.economy.startingBalance);
      return message.reply(`✅ تم إعادة تعيين رصيد ${member} إلى **${config.economy.startingBalance.toLocaleString()} عملة**.`);
    }

    // ── addpoints (DEV) ─────────────────────────────────────
    if (sub === 'addpoints') {
      const member = message.mentions.members.first();
      const amount = parseInt(args[2]);
      if (!member || isNaN(amount) || amount <= 0) return message.reply('❌ `!admin addpoints @عضو [مبلغ]`');
      await db.addMessagePoints(message.guild.id, member.id, amount);
      const total = await db.getTotalPoints(message.guild.id, member.id);
      return message.reply(`✅ تم إضافة **${amount.toLocaleString()} نقطة** لـ ${member}.\n🏆 إجمالي نقاطه: **${total.toLocaleString()}**`);
    }

    // ── removepoints (DEV) ──────────────────────────────────
    if (sub === 'removepoints') {
      const member = message.mentions.members.first();
      const amount = parseInt(args[2]);
      if (!member || isNaN(amount) || amount <= 0) return message.reply('❌ `!admin removepoints @عضو [مبلغ]`');
      const current = await db.getMessagePoints(message.guild.id, member.id);
      await db.addMessagePoints(message.guild.id, member.id, -Math.min(amount, current));
      const total = await db.getTotalPoints(message.guild.id, member.id);
      return message.reply(`✅ تم خصم **${amount.toLocaleString()} نقطة** من ${member}.\n🏆 إجمالي نقاطه: **${total.toLocaleString()}**`);
    }

    // ── resetall (DEV) ──────────────────────────────────────
    if (sub === 'resetall') {
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ `!admin resetall @عضو`');
      await Promise.all([
        db.setBalance(message.guild.id, member.id, config.economy.startingBalance),
        db.addMessagePoints(message.guild.id, member.id, -(await db.getMessagePoints(message.guild.id, member.id))),
      ]);
      return message.reply(`✅ تم إعادة تعيين رصيد ونقاط ${member} بالكامل.`);
    }

    // ── clearwarns ──────────────────────────────────────────
    if (sub === 'clearwarns') {
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ `!admin clearwarns @عضو`');
      await db.clearWarns(message.guild.id, member.id);
      return message.reply(`✅ تم مسح جميع تحذيرات ${member}.`);
    }

    // ── warns ───────────────────────────────────────────────
    if (sub === 'warns') {
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ `!admin warns @عضو`');
      const warns = await db.getWarns(message.guild.id, member.id);
      const embed = new EmbedBuilder().setColor(config.colors.warning)
        .setTitle(`⚠️ تحذيرات ${member.user.username}`)
        .setDescription(
          warns.length === 0
            ? '✅ لا توجد تحذيرات.'
            : warns.map((w, i) => `**${i + 1}.** ${w.reason} — بواسطة ${w.by} (${w.date})`).join('\n')
        )
        .setFooter({ text: `إجمالي التحذيرات: ${warns.length}` }).setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    // ── announce ────────────────────────────────────────────
    if (sub === 'announce') {
      const channel = message.mentions.channels.first();
      const msg = args.slice(2).join(' ');
      if (!channel || !msg) return message.reply('❌ `!admin announce #قناة [رسالة]`');
      const embed = new EmbedBuilder().setColor(config.colors.primary)
        .setTitle('📢 إعلان رسمي')
        .setDescription(msg)
        .addFields({ name: 'بواسطة', value: message.author.tag })
        .setTimestamp();
      await channel.send({ embeds: [embed] });
      return message.reply(`✅ تم إرسال الإعلان إلى ${channel}.`);
    }

    // ── dm ──────────────────────────────────────────────────
    if (sub === 'dm') {
      const second = args[1]?.toLowerCase();

      // !admin dm role @رتبة [رسالة] — DM all members with a role
      if (second === 'role' || second === 'رتبة') {
        const role = message.mentions.roles.first();
        const msg  = args.slice(3).join(' ');
        if (!role || !msg)
          return message.reply('❌ `!admin dm role @رتبة [رسالة]`');

        // Fetch all members to make sure cache is full
        await message.guild.members.fetch();
        const members = role.members.filter(m => !m.user.bot);

        if (members.size === 0)
          return message.reply(`❌ لا يوجد أعضاء يملكون رتبة ${role}.`);

        const progressMsg = await message.reply(
          `📤 جاري إرسال الرسائل لـ **${members.size}** عضو يملكون رتبة **${role.name}**...`
        );

        let sent = 0;
        let failed = 0;

        for (const [, m] of members) {
          try {
            await m.send(
              `📩 **رسالة من إدارة مجتمع ${message.guild.name}:**\n\n${msg}`
            );
            sent++;
          } catch {
            failed++;
          }
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 500));
        }

        const resultEmbed = new EmbedBuilder()
          .setColor(sent > 0 ? config.colors.success : config.colors.danger)
          .setTitle('📩 نتيجة الإرسال الجماعي')
          .addFields(
            { name: '🎭 الرتبة', value: `${role}`, inline: true },
            { name: '✅ تم الإرسال', value: `${sent} عضو`, inline: true },
            { name: '❌ فشل الإرسال', value: `${failed} عضو`, inline: true },
            { name: '📝 الرسالة', value: msg.length > 200 ? msg.slice(0, 200) + '...' : msg },
          )
          .setFooter({ text: `بواسطة: ${message.author.tag}` })
          .setTimestamp();

        return progressMsg.edit({ content: '', embeds: [resultEmbed] });
      }

      // !admin dm @عضو [رسالة] — DM single member
      const member = message.mentions.members.first();
      const msg    = args.slice(2).join(' ');
      if (!member || !msg)
        return message.reply('❌ `!admin dm @عضو [رسالة]`\nأو لإرسال لكل أعضاء رتبة: `!admin dm role @رتبة [رسالة]`');

      try {
        await member.send(`📩 **رسالة من إدارة مجتمع ${message.guild.name}:**\n\n${msg}`);
        return message.reply(`✅ تم إرسال رسالة خاصة لـ ${member}.`);
      } catch {
        return message.reply('❌ لا أستطيع إرسال رسالة لهذا العضو (ربما أغلق الرسائل الخاصة).');
      }
    }

    // ── botinfo ─────────────────────────────────────────────
    if (sub === 'botinfo') {
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const embed = new EmbedBuilder().setColor(config.colors.info).setTitle('🤖 معلومات البوت')
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          { name: 'الاسم', value: client.user.tag, inline: true },
          { name: 'وقت التشغيل', value: `${h}h ${m}m`, inline: true },
          { name: 'السيرفرات', value: `${client.guilds.cache.size}`, inline: true },
          { name: 'الأوامر', value: `${client.commands.size}`, inline: true },
          { name: '👑 المالك', value: 'A7MED', inline: true },
          { name: '🛠️ المطور', value: '9ATTOS', inline: true },
        ).setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    return message.reply(`❓ أمر غير معروف. اكتب \`!admin\` لعرض الأوامر المتاحة.`);
  },
};
