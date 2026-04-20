// ============================================================
//  commands/general/userinfo.js — معلومات العضو
//  Displays comprehensive profile info for the author or a
//  mentioned member: ID, dates, roles, points breakdown,
//  balance, level / XP, and warns count.
// ============================================================

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db     = require('../../utils/db.js');

module.exports = {
  name: 'userinfo',
  aliases: ['معلومات-عضو', 'يوزر', 'عضو', 'whoami'],
  description: 'عرض معلومات شاملة عن عضو في السيرفر',
  usage: '!userinfo [@عضو]',
  category: '👤 معلومات',
  cooldown: 5,

  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.member;
    const user   = target.user;

    // ── Fetch all data in parallel ────────────────────────────
    const [
      balance,
      xp,
      level,
      msgPoints,
      invPoints,
      tktPoints,
      warns,
    ] = await Promise.all([
      db.getBalance(message.guild.id, target.id),
      db.getXP(message.guild.id, target.id),
      db.getLevel(message.guild.id, target.id),
      db.getMessagePoints(message.guild.id, target.id),
      db.getInvitePoints(message.guild.id, target.id),
      db.getTicketPoints(message.guild.id, target.id),
      db.getWarns(message.guild.id, target.id),
    ]);

    const totalPoints = msgPoints + invPoints + tktPoints;

    // ── Roles (excluding @everyone, sorted by position) ───────
    const roles = target.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `${r}`)
      .join(' ') || 'لا توجد رتب';

    // ── Timestamps ────────────────────────────────────────────
    const createdAt = Math.floor(user.createdTimestamp / 1000);
    const joinedAt  = Math.floor(target.joinedTimestamp  / 1000);

    // ── Embed colour: member's display colour or primary ──────
    const colour =
      target.displayHexColor !== '#000000'
        ? target.displayHexColor
        : config.colors.primary;

    const embed = new EmbedBuilder()
      .setColor(colour)
      .setTitle(`👤 معلومات ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        // ── Identity ─────────────────────────────────────────
        { name: '🪪 المعرّف (ID)', value: `\`${user.id}\``, inline: true },
        { name: '🏷️ الوسم', value: `\`${user.tag}\``, inline: true },
        { name: '🤖 بوت؟', value: user.bot ? 'نعم' : 'لا', inline: true },

        // ── Dates ────────────────────────────────────────────
        { name: '📅 تاريخ إنشاء الحساب', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
        { name: '📥 تاريخ الانضمام للسيرفر', value: `<t:${joinedAt}:D> (<t:${joinedAt}:R>)`, inline: false },

        // ── Roles ────────────────────────────────────────────
        { name: `🎭 الرتب (${target.roles.cache.size - 1})`, value: roles, inline: false },

        // ── Points breakdown ─────────────────────────────────
        { name: '✉️ نقاط الرسائل', value: `**${msgPoints.toLocaleString()}**`, inline: true },
        { name: '📨 نقاط الدعوات', value: `**${invPoints.toLocaleString()}**`, inline: true },
        { name: '🎫 نقاط التذاكر', value: `**${tktPoints.toLocaleString()}**`, inline: true },
        { name: '🏆 إجمالي النقاط', value: `**${totalPoints.toLocaleString()}**`, inline: true },

        // ── Economy & progression ────────────────────────────
        { name: '💰 الرصيد', value: `**${balance.toLocaleString()}** عملة`, inline: true },
        { name: '🎖️ المستوى', value: `**${level}**`, inline: true },
        { name: '⭐ XP', value: `**${xp.toLocaleString()}**`, inline: true },

        // ── Moderation ───────────────────────────────────────
        { name: '⚠️ التحذيرات', value: `**${warns.length}**`, inline: true },
      )
      .setFooter({ text: `مجتمع A7MED | ID: ${user.id}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
