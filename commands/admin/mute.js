const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');

function parseDuration(str) {
  const match = str?.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2];
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return val * ms[unit];
}

module.exports = {
  name: 'mute', aliases: ['كتم', 'تايم-اوت'],
  description: 'كتم عضو مؤقتاً',
  usage: '!mute @عضو [مدة: 10m/1h/1d] [سبب]',
  category: '🛡️ الإشراف',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ لا تملك صلاحية **كتم الأعضاء**.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('❌ `!mute @عضو [مدة] [سبب]`');
    const duration = parseDuration(args[1]);
    if (!duration) return message.reply('❌ حدد مدة صحيحة مثل: `10m` `1h` `1d`');
    if (duration > 28 * 24 * 3600000) return message.reply('❌ الحد الأقصى للكتم 28 يوماً.');
    const reason = args.slice(2).join(' ') || 'لم يُذكر سبب';
    await member.timeout(duration, reason);
    const embed = new EmbedBuilder().setColor(config.colors.warning).setTitle('🔇 تم الكتم')
      .addFields(
        { name: 'العضو', value: `${member.user.tag}`, inline: true },
        { name: 'المدة', value: args[1], inline: true },
        { name: 'السبب', value: reason, inline: true },
        { name: 'بواسطة', value: message.author.tag, inline: true },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
