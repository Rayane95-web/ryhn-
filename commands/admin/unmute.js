const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'unmute', aliases: ['فك-الكتم', 'انميوت'],
  description: 'فك كتم عضو',
  usage: '!unmute @عضو',
  category: '🛡️ الإشراف',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ لا تملك صلاحية **كتم الأعضاء**.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('❌ `!unmute @عضو`');
    if (!member.isCommunicationDisabled()) return message.reply('❌ هذا العضو غير مكتوم.');
    await member.timeout(null);
    const embed = new EmbedBuilder().setColor(config.colors.success).setTitle('🔊 تم فك الكتم')
      .addFields(
        { name: 'العضو', value: `${member.user.tag}`, inline: true },
        { name: 'بواسطة', value: message.author.tag, inline: true },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
