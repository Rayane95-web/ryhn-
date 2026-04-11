const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'kick', aliases: ['طرد', 'كيك'],
  description: 'طرد عضو من السيرفر',
  usage: '!kick @عضو [سبب]',
  category: '🛡️ الإشراف',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply('❌ لا تملك صلاحية **طرد الأعضاء**.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('❌ حدد عضواً: `!kick @عضو [سبب]`');
    if (!member.kickable) return message.reply('❌ لا أستطيع طرد هذا العضو (رتبته أعلى مني).');
    const reason = args.slice(1).join(' ') || 'لم يُذكر سبب';
    await member.kick(reason);
    const embed = new EmbedBuilder().setColor(config.colors.warning).setTitle('👢 تم الطرد')
      .addFields(
        { name: 'العضو', value: `${member.user.tag}`, inline: true },
        { name: 'السبب', value: reason, inline: true },
        { name: 'بواسطة', value: message.author.tag, inline: true },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
