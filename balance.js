const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');
module.exports = {
  name: 'balance', aliases: ['رصيد', 'bal', 'محفظة'],
  description: 'عرض رصيدك من العملات',
  usage: '!balance [@عضو]',
  category: '💰 الاقتصاد',
  async execute(message, args) {
    const target = message.mentions.members.first() || message.member;
    const bal = await db.getBalance(message.guild.id, target.id);
    const level = await db.getLevel(message.guild.id, target.id);
    const embed = new EmbedBuilder().setColor(config.colors.gold)
      .setTitle(`💰 محفظة ${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '💵 الرصيد', value: `**${bal.toLocaleString()}** عملة`, inline: true },
        { name: '🏆 المستوى', value: `${level}`, inline: true }
      )
      .setFooter({ text: 'العب واكسب عملات! | مجتمع A7MED' }).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
