const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

const questions = [
  { q: 'ما هي عاصمة المملكة العربية السعودية؟', options: ['الرياض', 'جدة', 'مكة', 'الدمام'], answer: 0, points: 200 },
  { q: 'كم عدد كواكب المجموعة الشمسية؟', options: ['7', '8', '9', '10'], answer: 1, points: 150 },
  { q: 'ما هو الرمز الكيميائي للذهب؟', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2, points: 250 },
  { q: 'من هو مخترع الهاتف؟', options: ['إديسون', 'غراهام بيل', 'تيسلا', 'نيوتن'], answer: 1, points: 200 },
  { q: 'ما هي أطول نهر في العالم؟', options: ['الأمازون', 'النيل', 'المسيسيبي', 'اليانغتسي'], answer: 1, points: 200 },
  { q: 'كم يساوي 7 × 8؟', options: ['54', '56', '58', '64'], answer: 1, points: 150 },
  { q: 'ما هو أكبر كوكب في المجموعة الشمسية؟', options: ['زحل', 'المريخ', 'المشتري', 'نبتون'], answer: 2, points: 200 },
  { q: 'في أي عام بدأت الحرب العالمية الثانية؟', options: ['1935', '1938', '1939', '1941'], answer: 2, points: 250 },
  { q: 'ما هو اختصار HTML؟', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Link', 'Home Tool Markup Language'], answer: 0, points: 200 },
  { q: 'ما هو أصغر دولة في العالم؟', options: ['موناكو', 'سان مارينو', 'الفاتيكان', 'ليختنشتاين'], answer: 2, points: 250 },
];

module.exports = {
  name: 'marathon', aliases: ['ماراثون', 'quiz-marathon'],
  description: 'ماراثون 5 أسئلة متتالية',
  usage: '!marathon',
  category: '🎮 الألعاب',
  cooldown: 30,
  async execute(message, args, client) {
    if (client.activeQuizzes.has(message.channel.id))
      return message.reply('⚠️ يوجد سؤال جارٍ في هذه القناة!');

    const pool = [...questions].sort(() => Math.random() - 0.5).slice(0, 5);
    const scores = new Map();
    const letters = ['أ', 'ب', 'ج', 'د'];

    await message.channel.send({
      embeds: [new EmbedBuilder().setColor(config.colors.info).setTitle('🏁 ماراثون الأسئلة!')
        .setDescription('**5 أسئلة متتالية!** كل إجابة صحيحة تمنحك عملات.\nيبدأ الماراثون خلال 3 ثوانٍ...')]
    });

    await new Promise(r => setTimeout(r, 3000));

    for (let i = 0; i < pool.length; i++) {
      const question = pool[i];
      client.activeQuizzes.set(message.channel.id, true);

      const row = new ActionRowBuilder().addComponents(
        question.options.map((opt, j) =>
          new ButtonBuilder()
            .setCustomId(`marathon_${j}_${message.id}_${i}`)
            .setLabel(`${letters[j]}) ${opt}`)
            .setStyle(ButtonStyle.Primary)
        )
      );

      const embed = new EmbedBuilder().setColor(config.colors.info)
        .setTitle(`🧠 سؤال ${i + 1}/5`)
        .setDescription(`**${question.q}**`)
        .addFields(
          { name: '💰 المكافأة', value: `${question.points} عملة`, inline: true },
          { name: '⏳ الوقت', value: '20 ثانية', inline: true },
        );

      const msg = await message.channel.send({ embeds: [embed], components: [row] });
      const answered = new Set();

      await new Promise(resolve => {
        const collector = msg.createMessageComponentCollector({ time: 20_000 });
        collector.on('collect', async interaction => {
          if (answered.has(interaction.user.id))
            return interaction.reply({ content: '❌ أجبت بالفعل!', ephemeral: true });
          answered.add(interaction.user.id);
          const chosen = parseInt(interaction.customId.split('_')[1]);
          if (chosen === question.answer) {
            scores.set(interaction.user.id, (scores.get(interaction.user.id) || 0) + question.points);
            await db.addBalance(message.guild.id, interaction.user.id, question.points);
            await interaction.reply({ content: `✅ **${interaction.user.username}** أجاب صح! +${question.points} عملة 🎉`, ephemeral: false });
          } else {
            await interaction.reply({ content: `❌ **${interaction.user.username}** أجاب غلط!`, ephemeral: false });
          }
        });
        collector.on('end', () => resolve());
      });

      client.activeQuizzes.delete(message.channel.id);
      const disabledRow = new ActionRowBuilder().addComponents(
        question.options.map((opt, j) =>
          new ButtonBuilder().setCustomId(`marathon_${j}_${message.id}_${i}`)
            .setLabel(`${letters[j]}) ${opt}`)
            .setStyle(j === question.answer ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(true)
        )
      );
      await msg.edit({ components: [disabledRow] }).catch(() => {});

      if (i < pool.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const resultDesc = sorted.length === 0
      ? 'لم يجب أحد!'
      : sorted.map(([uid, pts], i) => `**${i + 1}.** <@${uid}> — ${pts.toLocaleString()} عملة`).join('\n');

    message.channel.send({
      embeds: [new EmbedBuilder().setColor(config.colors.gold).setTitle('🏆 نتائج الماراثون!')
        .setDescription(resultDesc).setTimestamp()]
    });
  },
};
