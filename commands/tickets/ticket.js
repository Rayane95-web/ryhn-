// ============================================================
//  commands/tickets/ticket.js — إدارة التذاكر
//  Handles: !ticket close · !ticket claim · !ticket add @user
//  Button interactions (ticket_create / ticket_close / ticket_claim)
//  are handled in index.js interactionCreate event.
// ============================================================

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const config = require('../../config.js');
const db     = require('../../utils/db.js');

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.id === config.devId;
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

    // ── !ticket close ─────────────────────────────────────
    if (!sub || sub === 'close' || sub === 'إغلاق') {
      const ticketData = await db.getTicket(message.guild.id, message.channel.id);
      if (!ticketData) {
        return message.reply('❌ هذه القناة ليست تذكرة.');
      }

      const canClose = isAdmin(message.member) || message.author.id === ticketData.userId;
      if (!canClose) {
        return message.reply('❌ فقط صاحب التذكرة أو الأدمن يمكنه إغلاقها.');
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('🔒 إغلاق التذكرة')
        .setDescription(`سيتم إغلاق هذه التذكرة خلال **5 ثوانٍ**.\nبواسطة: ${message.author}`)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

      // Log to ticket log channel
      if (config.ticketLogChannelId) {
        const logChannel = message.guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
          const opener = await client.users.fetch(ticketData.userId).catch(() => null);
          const logEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('🎫 تذكرة مغلقة')
            .addFields(
              { name: 'القناة', value: message.channel.name, inline: true },
              { name: 'فُتحت بواسطة', value: opener ? opener.tag : ticketData.userId, inline: true },
              { name: 'أُغلقت بواسطة', value: message.author.tag, inline: true },
              { name: 'مدة التذكرة', value: `<t:${Math.floor(ticketData.openedAt / 1000)}:R>`, inline: true },
            )
            .setTimestamp();
          logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      await db.deleteTicket(message.guild.id, message.channel.id);
      setTimeout(() => message.channel.delete().catch(() => {}), 5000);
      return;
    }

    // ── !ticket claim ─────────────────────────────────────
    if (sub === 'claim' || sub === 'استلام') {
      if (!isAdmin(message.member)) {
        return message.reply('❌ فقط الأدمن يمكنه استلام التذاكر.');
      }

      const ticketData = await db.getTicket(message.guild.id, message.channel.id);
      if (!ticketData) {
        return message.reply('❌ هذه القناة ليست تذكرة.');
      }

      await db.addTicketClaim(message.guild.id, message.author.id);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ تم استلام التذكرة')
        .setDescription(`${message.author} استلم هذه التذكرة وسيتولى المساعدة.`)
        .addFields({ name: '🏆 النقاط', value: `+5 نقاط لـ ${message.author.username}`, inline: true })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    // ── !ticket add @user ─────────────────────────────────
    if (sub === 'add' || sub === 'إضافة') {
      if (!isAdmin(message.member)) {
        return message.reply('❌ فقط الأدمن يمكنه إضافة أعضاء للتذكرة.');
      }

      const ticketData = await db.getTicket(message.guild.id, message.channel.id);
      if (!ticketData) {
        return message.reply('❌ هذه القناة ليست تذكرة.');
      }

      const target = message.mentions.members.first();
      if (!target) return message.reply('❌ حدد عضواً: `!ticket add @عضو`');

      await message.channel.permissionOverwrites.edit(target, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      return message.reply(`✅ تم إضافة ${target} إلى التذكرة.`);
    }

    return message.reply('❓ الاستخدام: `!ticket close` · `!ticket claim` · `!ticket add @عضو`');
  },
};
