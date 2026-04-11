const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'ban', aliases: ['حظر', 'بان'],
  description: 'حظر عضو من السيرفر',
  usage: '!ban @عضو [سبب]',
  category: '🛡️ الإشراف',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply('❌ لا تملك صلاحية **حظر الأعضاء**.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('❌ حدد عضواً: `!ban @عضو [سبب]`');
    if (!member.bannable) return message.reply('❌ لا أستطيع حظر هذا العضو (رتبته أعلى مني).');
    const reason = args.slice(1).join(' ') || 'لم يُذكر سبب';
    await member.ban({ reason });
    const embed = new EmbedBuilder().setColor(config.colors.danger).setTitle('🔨 تم الحظر')
      .addFields(
        { name: 'العضو', value: `${member.user.tag}`, inline: true },
        { name: 'السبب', value: reason, inline: true },
        { name: 'بواسطة', value: message.author.tag, inline: true },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
