const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

module.exports = {
  name: 'warns', aliases: ['تحذيرات', 'سجل-التحذيرات'],
  description: 'عرض تحذيرات عضو',
  usage: '!warns @عضو',
  category: '🛡️ الإشراف',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ لا تملك الصلاحية.');
    const member = message.mentions.members.first() || message.member;
    const warns = await db.getWarns(message.guild.id, member.id);
    const embed = new EmbedBuilder().setColor(config.colors.warning).setTitle(`⚠️ تحذيرات ${member.user.username}`)
      .setDescription(
        warns.length === 0
          ? '✅ لا توجد تحذيرات.'
          : warns.map((w, i) => `**${i + 1}.** ${w.reason} — بواسطة ${w.by} (${w.date})`).join('\n')
      )
      .setFooter({ text: `إجمالي التحذيرات: ${warns.length}` }).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
