const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

module.exports = {
  name: 'coinflip', aliases: ['عملة', 'رمي-عملة', 'flip'],
  description: 'رمي عملة مع رهان اختياري',
  usage: '!coinflip [heads/tails] [رهان]',
  category: '🎮 الألعاب',
  cooldown: 5,
  async execute(message, args) {
    const pick = args[0]?.toLowerCase();
    const bet = parseInt(args[1]) || 0;
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const emoji = result === 'heads' ? '👑' : '🪙';

    let desc = `النتيجة: **${emoji} ${result === 'heads' ? 'صورة' : 'كتابة'}**`;
    let color = config.colors.info;

    if (pick === 'heads' || pick === 'tails' || pick === 'صورة' || pick === 'كتابة') {
      const userPick = (pick === 'heads' || pick === 'صورة') ? 'heads' : 'tails';
      if (bet > 0) {
        const bal = await db.getBalance(message.guild.id, message.author.id);
        if (bal < bet) return message.reply(`❌ رصيدك غير كافٍ! رصيدك: **${bal.toLocaleString()}** عملة.`);
        if (userPick === result) {
          await db.addBalance(message.guild.id, message.author.id, bet);
          desc += `\n🎉 **فزت ${bet.toLocaleString()} عملة!**`;
          color = config.colors.success;
        } else {
          await db.removeBalance(message.guild.id, message.author.id, bet);
          desc += `\n😢 **خسرت ${bet.toLocaleString()} عملة!**`;
          color = config.colors.danger;
        }
      } else {
        desc += userPick === result ? '\n🎉 **فزت!**' : '\n😢 **خسرت!**';
        color = userPick === result ? config.colors.success : config.colors.danger;
      }
    }

    const embed = new EmbedBuilder().setColor(color).setTitle('🪙 رمي العملة')
      .setDescription(desc).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
