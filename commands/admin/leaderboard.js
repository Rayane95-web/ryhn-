const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../../config.js');
const db     = require('../../utils/db.js');

const PAGE_SIZE = 10;

function buildEmbed(entries, page, totalPages, guild) {
  const medals = ['🥇', '🥈', '🥉'];
  const start  = page * PAGE_SIZE;

  const description = entries.length === 0
    ? '> لا توجد بيانات نقاط بعد. ابدأ بالدردشة والدعوات!'
    : entries.map((e, i) => {
        const rank   = start + i + 1;
        const medal  = medals[rank - 1] ?? `**${rank}.**`;
        const member = guild.members.cache.get(e.userId);
        const name   = member ? member.displayName : `<@${e.userId}>`;
        return (
          `${medal} **${name}** — 🏆 **${e.total.toLocaleString()} نقطة**\n` +
          `　💬 ${e.messagePoints} رسالة · ✉️ ${e.invitePoints} دعوة · 🎫 ${e.ticketPoints} تذكرة`
        );
      }).join('\n\n');

  return new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🏆 لوحة المتصدرين — مجتمع A7MED')
    .setDescription(description)
    .addFields(
      { name: '💬 نقاط الرسائل', value: '1 نقطة / رسالة', inline: true },
      { name: '✉️ نقاط الدعوات', value: '25 نقطة / دعوة', inline: true },
      { name: '🎫 نقاط التذاكر', value: '5 نقاط / تذكرة', inline: true },
    )
    .setFooter({ text: `صفحة ${page + 1} من ${Math.max(totalPages, 1)} | إجمالي ${entries.length} عضو` })
    .setTimestamp();
}

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'المتصدرين', 'نقاط-المتصدرين', 'richest-points'],
  description: 'عرض أعلى الأعضاء نقاطاً',
  usage: '!leaderboard',
  category: '🏆 النقاط والمتصدرين',
  cooldown: 10,

  async execute(message, args, client) {
    const allPoints  = await db.getAllPoints(message.guild.id);
    const totalPages = Math.max(Math.ceil(allPoints.length / PAGE_SIZE), 1);
    let page = 0;

    const getPage  = (p) => allPoints.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);
    const buildRow = (p) => new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('lb_prev')
        .setLabel('◀ السابق')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p === 0),
      new ButtonBuilder()
        .setCustomId('lb_refresh')
        .setLabel('🔄 تحديث')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('lb_next')
        .setLabel('التالي ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p >= totalPages - 1),
    );

    const msg = await message.channel.send({
      embeds: [buildEmbed(getPage(page), page, totalPages, message.guild)],
      components: [buildRow(page)],
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 120_000,
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'lb_prev' && page > 0) page--;
      else if (interaction.customId === 'lb_next' && page < totalPages - 1) page++;
      else if (interaction.customId === 'lb_refresh') {
        const fresh = await db.getAllPoints(message.guild.id);
        await interaction.update({
          embeds: [buildEmbed(fresh.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), page, Math.max(Math.ceil(fresh.length / PAGE_SIZE), 1), message.guild)],
          components: [buildRow(page)],
        });
        return;
      }
      await interaction.update({
        embeds: [buildEmbed(getPage(page), page, totalPages, message.guild)],
        components: [buildRow(page)],
      });
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lb_prev').setLabel('◀ السابق').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('lb_refresh').setLabel('🔄 تحديث').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('lb_next').setLabel('التالي ▶').setStyle(ButtonStyle.Secondary).setDisabled(true),
      );
      msg.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
