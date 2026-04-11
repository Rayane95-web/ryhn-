const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'listroles', aliases: ['رتب-العضو', 'عرض-رتب'],
  description: 'عرض رتب عضو',
  usage: '!listroles @عضو',
  category: '🎭 الرتب',
  async execute(message, args) {
    const member = message.mentions.members.first() || message.member;
    const roles = member.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `${r}`)
      .join(', ') || 'لا توجد رتب';
    const embed = new EmbedBuilder().setColor(config.colors.primary).setTitle(`🎭 رتب ${member.user.username}`)
      .setDescription(roles)
      .setFooter({ text: `إجمالي الرتب: ${member.roles.cache.size - 1}` }).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
