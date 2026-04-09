const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');
module.exports = {
  name: 'giverole', aliases: ['اعطي-رتبة', 'منح-رتبة'],
  description: 'إعطاء رتبة لعضو',
  usage: '!giverole @عضو @رتبة',
  category: '🎭 الرتب',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ لا تملك صلاحية **إدارة الرتب**.');
    const member = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!member || !role) return message.reply('❌ الاستخدام الصحيح: `!giverole @عضو @رتبة`');
    if (role.position >= message.guild.members.me.roles.highest.position) return message.reply('❌ هذه الرتبة أعلى مني، لا أستطيع منحها.');
    if (member.roles.cache.has(role.id)) return message.reply(`❌ ${member} يملك هذه الرتبة بالفعل.`);
    await member.roles.add(role);
    const embed = new EmbedBuilder().setColor(config.colors.success).setTitle('✅ تم منح الرتبة')
      .addFields({ name: 'العضو', value: `${member}`, inline: true }, { name: 'الرتبة', value: `${role}`, inline: true }, { name: 'بواسطة', value: `${message.author}`, inline: true })
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
