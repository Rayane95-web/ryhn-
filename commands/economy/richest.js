const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

module.exports = {
  name: 'richest', aliases: ['الأغنياء', 'top', 'اغنى'],
  description: 'قائمة أغنى الأعضاء',
  usage: '!richest',
  category: '💰 الاقتصاد',
  cooldown: 10,
  async execute(message, args) {
    const all = await db.getAllBalances(message.guild.id);
    const top = all.slice(0, 10);
    const medals = ['🥇', '🥈', '🥉'];

    const description = top.length === 0
      ? 'لا توجد بيانات بعد!'
      : top.map((e, i) => {
          const member = message.guild.members.cache.get(e.userId);
          const name = member ? member.displayName : `<@${e.userId}>`;
          return `${medals[i] ?? `**${i + 1}.**`} **${name}** — 💰 ${e.balance.toLocaleString()} عملة`;
        }).join('\n');

    const embed = new EmbedBuilder().setColor(config.colors.gold)
      .setTitle('💰 أغنى الأعضاء — مجتمع A7MED')
      .setDescription(description)
      .setFooter({ text: 'العب واكسب عملات!' }).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
