const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

const questions = [
  { q: 'ما هي عاصمة المملكة العربية السعودية؟', options: ['الرياض', 'جدة', 'مكة المكرمة', 'الدمام'], answer: 0, points: 200 },
  { q: 'كم يساوي 7 × 8؟', options: ['54', '56', '58', '64'], answer: 1, points: 150 },
  { q: 'ما هو أكبر كوكب في المجموعة الشمسية؟', options: ['زحل', 'المريخ', 'المشتري', 'نبتون'], answer: 2, points: 200 },
  { q: 'من هو مخترع الهاتف؟', options: ['توماس إديسون', 'ألكسندر غراهام بيل', 'نيكولا تيسلا', 'ألبرت أينشتاين'], answer: 1, points: 250 },
  { q: 'ما هي أسرع حيوان بري في العالم؟', options: ['الأسد', 'النمر', 'الفهد', 'الغزال'], answer: 2, points: 200 },
  { q: 'كم عدد أيام السنة الكبيسة؟', options: ['364', '365', '366', '367'], answer: 2, points: 150 },
  { q: 'ما هي لغة البرمجة التي يُعرف بها موقع ديسكورد؟', options: ['Python', 'JavaScript', 'Java', 'C++'], answer: 1, points: 250 },
  { q: 'ما هو أعمق محيط في العالم؟', options: ['المحيط الهندي', 'المحيط الأطلسي', 'المحيط الهادئ', 'المحيط المتجمد'], answer: 2, points: 200 },
  { q: 'كم عدد ألوان قوس قزح؟', options: ['5', '6', '7', '8'], answer: 2, points: 150 },
  { q: 'من كتب رواية ألف ليلة وليلة؟', options: ['مؤلف مجهول', 'ابن بطوطة', 'الجاحظ', 'المتنبي'], answer: 0, points: 300 },
  { q: 'ما هي عاصمة فرنسا؟', options: ['لندن', 'برلين', 'باريس', 'روما'], answer: 2, points: 100 },
  { q: 'كم عدد لاعبي فريق كرة القدم؟', options: ['9', '10', '11', '12'], answer: 2, points: 100 },
  { q: 'ما هو العنصر الكيميائي للماء؟', options: ['CO2', 'H2O', 'NaCl', 'O2'], answer: 1, points: 150 },
  { q: 'ما هي أطول نهر في العالم؟', options: ['الأمازون', 'النيل', 'المسيسيبي', 'اليانغتسي'], answer: 1, points: 200 },
  { q: 'في أي سنة بدأت الحرب العالمية الثانية؟', options: ['1935', '1938', '1939', '1941'], answer: 2, points: 250 },
  { q: 'كم عدد قارات العالم؟', options: ['5', '6', '7', '8'], answer: 2, points: 100 },
  { q: 'ما هي اللغة الأكثر تحدثاً في العالم؟', options: ['الإنجليزية', 'الإسبانية', 'الصينية المندرينية', 'العربية'], answer: 2, points: 200 },
  { q: 'كم عدد أضلاع المثلث؟', options: ['2', '3', '4', '5'], answer: 1, points: 100 },
  { q: 'ما اسم مؤسس شركة Apple؟', options: ['بيل غيتس', 'ستيف جوبز', 'إيلون ماسك', 'مارك زوكربيرغ'], answer: 1, points: 200 },
  { q: 'ما هو أصغر دولة في العالم؟', options: ['موناكو', 'سان مارينو', 'الفاتيكان', 'ليختنشتاين'], answer: 2, points: 250 },
];

module.exports = {
  name: 'qst', aliases: ['سؤال', 'quiz', 'لعبة-أسئلة'],
  description: 'العب لعبة الأسئلة واربح عملات!',
  usage: '!qst',
  category: '🎮 الألعاب',
  cooldown: 15,
  async execute(message, args, client) {
    if (client.activeQuizzes.has(message.channel.id)) return message.reply('⚠️ يوجد سؤال جارٍ في هذه القناة، انتظر حتى ينتهي!');

    const question = questions[Math.floor(Math.random() * questions.length)];
    client.activeQuizzes.set(message.channel.id, true);

    const row = new ActionRowBuilder().addComponents(
      question.options.map((opt, i) =>
        new ButtonBuilder().setCustomId(`quiz_${i}`).setLabel(`${['أ', 'ب', 'ج', 'د'][i]}) ${opt}`).setStyle(ButtonStyle.Primary)
      )
    );

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('🧠 سؤال جديد!')
      .setDescription(`**${question.q}**`)
      .addFields({ name: '💰 المكافأة', value: `${question.points} عملة`, inline: true }, { name: '⏳ الوقت', value: '30 ثانية', inline: true })
      .setFooter({ text: 'اضغط على الإجابة الصحيحة!' });

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 30000 });
    const answered = new Set();

    collector.on('collect', async interaction => {
      if (answered.has(interaction.user.id)) {
        return interaction.reply({ content: '❌ لقد أجبت بالفعل!', ephemeral: true });
      }
      answered.add(interaction.user.id);

      const chosen = parseInt(interaction.customId.split('_')[1]);
      const correct = chosen === question.answer;

      if (correct) {
        await db.addBalance(message.guild.id, interaction.user.id, question.points);
        await interaction.reply({ content: `✅ **${interaction.user.username}** أجاب صح! ربح **${question.points} عملة** 🎉`, ephemeral: false });
      } else {
        await db.removeBalance(message.guild.id, interaction.user.id, config.economy.quizWrongPenalty);
        await interaction.reply({ content: `❌ **${interaction.user.username}** أجاب غلط! خسر **${config.economy.quizWrongPenalty} عملة** 😢`, ephemeral: false });
      }
    });

    collector.on('end', () => {
      client.activeQuizzes.delete(message.channel.id);
      const disabledRow = new ActionRowBuilder().addComponents(
        question.options.map((opt, i) =>
          new ButtonBuilder().setCustomId(`quiz_${i}`).setLabel(`${['أ', 'ب', 'ج', 'د'][i]}) ${opt}`)
            .setStyle(i === question.answer ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(true)
        )
      );
      const endEmbed = new EmbedBuilder().setColor(config.colors.success)
        .setTitle('⏰ انتهى الوقت!')
        .setDescription(`الإجابة الصحيحة كانت: **${question.options[question.answer]}** ✅`)
        .setFooter({ text: `أجاب ${answered.size} شخص` });
      msg.edit({ embeds: [endEmbed], components: [disabledRow] });
    });
  },
};
