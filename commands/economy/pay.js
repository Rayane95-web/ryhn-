const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

module.exports = {
  name: 'pay', aliases: ['تحويل', 'ارسل-عملات'],
  description: 'تحويل عملات لعضو آخر',
  usage: '!pay @عضو [مبلغ]',
  category: '💰 الاقتصاد',
  cooldown: 5,
  async execute(message, args) {
    const target = message.mentions.members.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount) || amount <= 0)
      return message.reply('❌ `!pay @عضو [مبلغ]`');
    if (target.id === message.author.id)
      return message.reply('❌ لا يمكنك تحويل عملات لنفسك!');
    if (target.user.bot)
      return message.reply('❌ لا يمكنك تحويل عملات للبوت!');

    const bal = await db.getBalance(message.guild.id, message.author.id);
    if (bal < amount) return message.reply(`❌ رصيدك غير كافٍ! رصيدك: **${bal.toLocaleString()}** عملة.`);

    await db.removeBalance(message.guild.id, message.author.id, amount);
    await db.addBalance(message.guild.id, target.id, amount);
    const newBal = await db.getBalance(message.guild.id, message.author.id);

    const embed = new EmbedBuilder().setColor(config.colors.success).setTitle('💸 تم التحويل')
      .addFields(
        { name: 'إلى', value: `${target}`, inline: true },
        { name: 'المبلغ', value: `**${amount.toLocaleString()}** عملة`, inline: true },
        { name: 'رصيدك الآن', value: `${newBal.toLocaleString()} عملة`, inline: true },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
