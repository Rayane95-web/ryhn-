// ============================================================
//  commands/utility/stats.js — إحصائيات العضو
//  Shows a user's personal stats: messages, invites, tickets,
//  total points, XP, level, and balance.
// ============================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db     = require('../../utils/db.js');

module.exports = {
  name: 'stats',
  aliases: ['إحصائيات', 'stat', 'احصائياتي'],
  description: 'عرض إحصائياتك الكاملة في السيرفر',
  usage: '!stats [@عضو]',
  category: '🔧 عام',
  cooldown: 5,

  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.member;

    const [
      msgPoints,
      invPoints,
      tktPoints,
      invCount,
      tktCount,
      balance,
      xp,
      level,
    ] = await Promise.all([
      db.getMessagePoints(message.guild.id, target.id),
      db.getInvitePoints(message.guild.id, target.id),
      db.getTicketPoints(message.guild.id, target.id),
      db.getInviteCount(message.guild.id, target.id),
      db.getTicketClaimCount(message.guild.id, target.id),
      db.getBalance(message.guild.id, target.id),
      db.getXP(message.guild.id, target.id),
      db.getLevel(message.guild.id, target.id),
    ]);

    const totalPoints = msgPoints + invPoints + tktPoints;

    // Leaderboard rank
    const allPoints = await db.getAllPoints(message.guild.id);
    const rank = allPoints.findIndex(e => e.userId === target.id) + 1;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`📊 إحصائيات ${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🏆 إجمالي النقاط', value: `**${totalPoints.toLocaleString()}**`, inline: true },
        { name: '📈 الترتيب', value: rank > 0 ? `**#${rank}**` : '—', inline: true },
        { name: '🎖️ المستوى', value: `**${level}**`, inline: true },
        { name: '💬 نقاط الرسائل', value: `**${msgPoints}** نقطة`, inline: true },
        { name: '✉️ نقاط الدعوات', value: `**${invPoints}** نقطة (${invCount} دعوة)`, inline: true },
        { name: '🎫 نقاط التذاكر', value: `**${tktPoints}** نقطة (${tktCount} تذكرة)`, inline: true },
        { name: '⭐ XP', value: `**${xp.toLocaleString()}** نقطة خبرة`, inline: true },
        { name: '💰 الرصيد', value: `**${balance.toLocaleString()}** عملة`, inline: true },
      )
      .setFooter({ text: 'مجتمع A7MED | استمر في النشاط لترتفع في الترتيب!' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_refresh_${target.id}`)
        .setLabel('🔄 تحديث')
        .setStyle(ButtonStyle.Secondary),
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id && i.customId === `stats_refresh_${target.id}`,
      time: 60_000,
      max: 3,
    });

    collector.on('collect', async interaction => {
      const [
        mp2, ip2, tp2, ic2, tc2, bal2, xp2, lv2,
      ] = await Promise.all([
        db.getMessagePoints(message.guild.id, target.id),
        db.getInvitePoints(message.guild.id, target.id),
        db.getTicketPoints(message.guild.id, target.id),
        db.getInviteCount(message.guild.id, target.id),
        db.getTicketClaimCount(message.guild.id, target.id),
        db.getBalance(message.guild.id, target.id),
        db.getXP(message.guild.id, target.id),
        db.getLevel(message.guild.id, target.id),
      ]);
      const total2 = mp2 + ip2 + tp2;
      const allPts2 = await db.getAllPoints(message.guild.id);
      const rank2 = allPts2.findIndex(e => e.userId === target.id) + 1;

      const refreshed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`📊 إحصائيات ${target.user.username}`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🏆 إجمالي النقاط', value: `**${total2.toLocaleString()}**`, inline: true },
          { name: '📈 الترتيب', value: rank2 > 0 ? `**#${rank2}**` : '—', inline: true },
          { name: '🎖️ المستوى', value: `**${lv2}**`, inline: true },
          { name: '💬 نقاط الرسائل', value: `**${mp2}** نقطة`, inline: true },
          { name: '✉️ نقاط الدعوات', value: `**${ip2}** نقطة (${ic2} دعوة)`, inline: true },
          { name: '🎫 نقاط التذاكر', value: `**${tp2}** نقطة (${tc2} تذكرة)`, inline: true },
          { name: '⭐ XP', value: `**${xp2.toLocaleString()}** نقطة خبرة`, inline: true },
          { name: '💰 الرصيد', value: `**${bal2.toLocaleString()}** عملة`, inline: true },
        )
        .setFooter({ text: 'مجتمع A7MED | تم التحديث ✅' })
        .setTimestamp();

      await interaction.update({ embeds: [refreshed], components: [row] });
    });

    collector.on('end', () => {
      const disabled = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`stats_refresh_${target.id}`)
          .setLabel('🔄 تحديث')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );
      msg.edit({ components: [disabled] }).catch(() => {});
    });
  },
};
