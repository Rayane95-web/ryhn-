const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

function isAdmin(message) {
  return message.member.permissions.has(PermissionFlagsBits.Administrator) ||
    message.author.id === config.ownerId || message.author.id === config.devId ||
    message.member.roles.cache.has(config.adminRoleId);
}

module.exports = {
  name: 'admin', aliases: ['ادمن', 'لوحة-التحكم'],
  description: 'لوحة تحكم الأدمن',
  usage: '!admin [أمر]',
  category: '⚙️ الإدارة',
  async execute(message, args, client) {
    if (!isAdmin(message)) return message.reply('❌ هذا الأمر للأدمن فقط.');

    const sub = args[0]?.toLowerCase();

    // عرض لوحة التحكم
    if (!sub || sub === 'مساعدة' || sub === 'help') {
      const embed = new EmbedBuilder().setColor(config.colors.danger)
        .setTitle('⚙️ لوحة تحكم الأدمن — مجتمع A7MED')
        .setDescription('أوامر الإدارة المتاحة:')
        .addFields(
          { name: '💰 الاقتصاد', value: '`!admin addmoney @عضو [مبلغ]`\n`!admin removemoney @عضو [مبلغ]`\n`!admin setmoney @عضو [مبلغ]`\n`!admin resetmoney @عضو`' },
          { name: '⚠️ التحذيرات', value: '`!admin clearwarns @عضو`\n`!admin warns @عضو`' },
          { name: '🔧 الإعدادات', value: '`!admin prefix [بادئة]`\n`!admin botinfo`\n`!admin serverinfo`' },
          { name: '📢 الإعلانات', value: '`!admin announce [#قناة] [رسالة]`\n`!admin dm @عضو [رسالة]`' },
          { name: '🎭 الرتب', value: '`!admin addrole @عضو @رتبة`\n`!admin removerole @عضو @رتبة`' },
        )
        .addFields({ name: '👑 المالك', value: 'A7MED', inline: true }, { name: '🛠️ المطور', value: '9ATTOS', inline: true })
        .setFooter({ text: 'لوحة تحكم مجتمع A7MED' }).setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    // إضافة عملات
    if (sub === 'addmoney') {
      const member = message.mentions.members.first();
      const amount = parseInt(args[2]);
      if (!member || isNaN(amount)) return message.reply('❌ `!admin addmoney @عضو [مبلغ]`');
      await db.addBalance(message.guild.id, member.id, amount);
      const bal = await db.getBalance(message.guild.id, member.id);
      return message.reply(`✅ تم إضافة **${amount.toLocaleString()} عملة** لـ ${member}. رصيده الآن: **${bal.toLocaleString()}**`);
    }

    // خصم عملات
    if (sub === 'removemoney') {
      const member = message.mentions.members.first();
      const amount = parseInt(args[2]);
      if (!member || isNaN(amount)) return message.reply('❌ `!admin removemoney @عضو [مبلغ]`');
      await db.removeBalance(message.guild.id, member.id, amount);
      return message.reply(`✅ تم خصم **${amount.toLocaleString()} عملة** من ${member}.`);
    }

    // تعيين رصيد
    if (sub === 'setmoney') {
      const member = message.mentions.members.first();
      const amount = parseInt(args[2]);
      if (!member || isNaN(amount)) return message.reply('❌ `!admin setmoney @عضو [مبلغ]`');
      await db.setBalance(message.guild.id, member.id, amount);
      return message.reply(`✅ تم تعيين رصيد ${member} إلى **${amount.toLocaleString()} عملة**.`);
    }

    // إعادة تعيين الرصيد
    if (sub === 'resetmoney') {
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ حدد عضواً.');
      await db.setBalance(message.guild.id, member.id, config.economy.startingBalance);
      return message.reply(`✅ تم إعادة تعيين رصيد ${member} إلى **${config.economy.startingBalance} عملة**.`);
    }

    // مسح تحذيرات
    if (sub === 'clearwarns') {
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ حدد عضواً.');
      await db.clearWarns(message.guild.id, member.id);
      return message.reply(`✅ تم مسح تحذيرات ${member}.`);
    }

    // إعلان
    if (sub === 'announce') {
      const channel = message.mentions.channels.first();
      const msg = args.slice(2).join(' ');
      if (!channel || !msg) return message.reply('❌ `!admin announce #قناة [رسالة]`');
      const embed = new EmbedBuilder().setColor(config.colors.primary)
        .setTitle('📢 إعلان رسمي')
        .setDescription(msg)
        .addFields({ name: 'بواسطة', value: message.author.tag })
        .setTimestamp();
      channel.send({ embeds: [embed] });
      return message.reply(`✅ تم إرسال الإعلان إلى ${channel}.`);
    }

    // إرسال DM
    if (sub === 'dm') {
      const member = message.mentions.members.first();
      const msg = args.slice(2).join(' ');
      if (!member || !msg) return message.reply('❌ `!admin dm @عضو [رسالة]`');
      try {
        await member.send(`📩 **رسالة من إدارة مجتمع A7MED:**\n${msg}`);
        return message.reply(`✅ تم إرسال رسالة خاصة لـ ${member}.`);
      } catch { return message.reply('❌ لا أستطيع إرسال رسالة لهذا العضو (ربما أغلق الرسائل الخاصة).'); }
    }

    // معلومات البوت
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
