const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'serverinfo', aliases: ['سيرفر', 'معلومات-السيرفر'],
  description: 'معلومات السيرفر',
  usage: '!serverinfo',
  category: '🔧 عام',
  async execute(message) {
    const g = message.guild;
    const embed = new EmbedBuilder().setColor(config.colors.primary).setTitle(`📊 ${g.name}`)
      .setThumbnail(g.iconURL({ dynamic: true }))
      .addFields(
        { name: '👑 المالك', value: `<@${g.ownerId}>`, inline: true },
        { name: '👥 الأعضاء', value: `${g.memberCount}`, inline: true },
        { name: '📅 تأسس في', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '💬 القنوات', value: `${g.channels.cache.size}`, inline: true },
        { name: '🎭 الرتب', value: `${g.roles.cache.size}`, inline: true },
        { name: '😀 الإيموجي', value: `${g.emojis.cache.size}`, inline: true },
      ).setFooter({ text: `ID: ${g.id}` }).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
