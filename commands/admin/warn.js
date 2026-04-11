const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

module.exports = {
  name: 'warn', aliases: ['تحذير', 'انذار'],
  description: 'تحذير عضو',
  usage: '!warn @عضو [سبب]',
  category: '🛡️ الإشراف',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ لا تملك صلاحية **تحذير الأعضاء**.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('❌ `!warn @عضو [سبب]`');
    const reason = args.slice(1).join(' ') || 'لم يُذكر سبب';
    const warn = { reason, by: message.author.tag, date: new Date().toLocaleDateString('ar') };
    const warns = await db.addWarn(message.guild.id, member.id, warn);
    const embed = new EmbedBuilder().setColor(config.colors.warning).setTitle('⚠️ تحذير')
      .addFields(
        { name: 'العضو', value: `${member.user.tag}`, inline: true },
        { name: 'السبب', value: reason, inline: true },
        { name: 'عدد التحذيرات', value: `${warns.length}`, inline: true },
        { name: 'بواسطة', value: message.author.tag, inline: true },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
    member.send(`⚠️ تلقيت تحذيراً في **${message.guild.name}**\nالسبب: ${reason}\nإجمالي تحذيراتك: ${warns.length}`).catch(() => {});
  },
};
