const {
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config.js');
const db     = require('../../utils/db.js');

function isStaff(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.id === config.devId ||
    (config.supportRoleId && member.roles.cache.has(config.supportRoleId));
}

module.exports = {
  name: 'ticket',
  aliases: ['تذكرة', 'tickets'],
  description: 'إدارة التذاكر: close · claim · add',
  usage: '!ticket [close|claim|add @عضو]',
  category: '🎫 التذاكر',
  cooldown: 5,

  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();

    // ── !ticket close ──────────────────────────────────────
    if (!sub || sub === 'close' || sub === 'إغلاق') {
      const ticketData = await db.getTicket(message.guild.id, message.channel.id);
      if (!ticketData) return message.reply('❌ هذه القناة ليست تذكرة.');

      const canClose = isStaff(message.member) || message.author.id === ticketData.userId;
      if (!canClose) return message.reply('❌ فقط صاحب التذكرة أو فريق الدعم يمكنه إغلاقها.');

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('🔒 إغلاق التذكرة')
        .setDescription(`سيتم إغلاق هذه التذكرة خلال **5 ثوانٍ**.\nبواسطة: ${message.author}`)
        .setTimestamp();
      await message.channel.send({ embeds: [embed] });

      if (config.ticketLogChannelId) {
        const logChannel = message.guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
          const opener = await client.users.fetch(ticketData.userId).catch(() => null);
          logChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.danger)
              .setTitle('🎫 تذكرة مغلقة')
              .addFields(
                { name: 'القناة', value: message.channel.name, inline: true },
                { name: 'فُتحت بواسطة', value: opener ? opener.tag : ticketData.userId, inline: true },
                { name: 'أُغلقت بواسطة', value: message.author.tag, inline: true },
                { name: 'مُستلمة بواسطة', value: ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : 'لم تُستلم', inline: true },
                { name: 'مدة التذكرة', value: `<t:${Math.floor(ticketData.openedAt / 1000)}:R>`, inline: true },
              ).setTimestamp()]
          }).catch(() => {});
        }
      }

      await db.deleteTicket(message.guild.id, message.channel.id);
      setTimeout(() => message.channel.delete().catch(() => {}), 5000);
      return;
    }

    // ── !ticket claim ──────────────────────────────────────
    if (sub === 'claim' || sub === 'استلام') {
      if (!isStaff(message.member))
        return message.reply('❌ فقط فريق الدعم يمكنه استلام التذاكر.');

      const ticketData = await db.getTicket(message.guild.id, message.channel.id);
      if (!ticketData) return message.reply('❌ هذه القناة ليست تذكرة.');
      if (ticketData.claimedBy) return message.reply(`❌ تم استلام هذه التذكرة بالفعل بواسطة <@${ticketData.claimedBy}>.`);

      await db.claimTicket(message.guild.id, message.channel.id, message.author.id);
      await db.addTicketClaim(message.guild.id, message.author.id);

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('✅ تم استلام التذكرة')
          .setDescription(`${message.author} استلم هذه التذكرة وسيتولى المساعدة.`)
          .addFields({ name: '🏆 النقاط', value: `+5 نقاط لـ ${message.author.username}`, inline: true })
          .setTimestamp()]
      });
    }

    // ── !ticket add @user ──────────────────────────────────
    if (sub === 'add' || sub === 'إضافة') {
      if (!isStaff(message.member))
        return message.reply('❌ فقط فريق الدعم يمكنه إضافة أعضاء للتذكرة.');

      const ticketData = await db.getTicket(message.guild.id, message.channel.id);
      if (!ticketData) return message.reply('❌ هذه القناة ليست تذكرة.');

      const target = message.mentions.members.first();
      if (!target) return message.reply('❌ حدد عضواً: `!ticket add @عضو`');

      // Give channel permissions
      await message.channel.permissionOverwrites.edit(target, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      // ✅ Save to db so they're whitelisted from penalties
      await db.addUserToTicket(message.guild.id, message.channel.id, target.id);

      return message.reply(
        `✅ تم إضافة ${target} إلى التذكرة.\n` +
        `🛡️ لن يتعرض لأي عقوبة عند الكتابة في هذه التذكرة.`
      );
    }

    return message.reply('❓ الاستخدام: `!ticket close` · `!ticket claim` · `!ticket add @عضو`');
  },
};
