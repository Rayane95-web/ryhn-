const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'clear', aliases: ['مسح', 'حذف-رسائل', 'purge'],
  description: 'حذف عدد من الرسائل',
  usage: '!clear [عدد 1-100]',
  category: '🛡️ الإشراف',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply('❌ لا تملك صلاحية **حذف الرسائل**.');
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100)
      return message.reply('❌ حدد رقماً بين 1 و 100: `!clear 10`');
    await message.delete().catch(() => {});
    const deleted = await message.channel.bulkDelete(amount, true);
    const reply = await message.channel.send(`🗑️ تم حذف **${deleted.size}** رسالة.`);
    setTimeout(() => reply.delete().catch(() => {}), 3000);
  },
};
