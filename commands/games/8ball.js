const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

const responses = [
  '✅ نعم بالتأكيد!', '✅ بكل تأكيد.', '✅ الأمور تبدو جيدة.',
  '✅ نعم.', '✅ من المؤكد ذلك.', '🤔 ربما...', '🤔 من الصعب القول.',
  '🤔 ليس متأكداً.', '🤔 اسأل لاحقاً.', '🤔 لا أستطيع التنبؤ الآن.',
  '❌ لا أعتقد ذلك.', '❌ لا.', '❌ الأمور لا تبدو جيدة.', '❌ مستبعد جداً.',
];

module.exports = {
  name: '8ball', aliases: ['كرة-سحرية', 'تنبأ'],
  description: 'اسأل الكرة السحرية',
  usage: '!8ball [سؤالك]',
  category: '🎮 الألعاب',
  cooldown: 3,
  execute(message, args) {
    if (!args.length) return message.reply('❌ اكتب سؤالاً: `!8ball هل سأنجح؟`');
    const response = responses[Math.floor(Math.random() * responses.length)];
    const embed = new EmbedBuilder().setColor(config.colors.info).setTitle('🎱 الكرة السحرية')
      .addFields(
        { name: '❓ السؤال', value: args.join(' ') },
        { name: '🔮 الإجابة', value: response },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
