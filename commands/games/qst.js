// ============================================================
//  commands/games/qst.js — لعبة الأسئلة والأجوبة
//  50+ Arabic quiz questions with button-based answers.
//  Awards economy coins + leaderboard points for correct answers.
// ============================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../utils/db.js');

const questions = [
  // ── جغرافيا ──────────────────────────────────────────────
  { q: 'ما هي عاصمة المملكة العربية السعودية؟', options: ['الرياض', 'جدة', 'مكة المكرمة', 'الدمام'], answer: 0, points: 200 },
  { q: 'ما هي عاصمة فرنسا؟', options: ['لندن', 'برلين', 'باريس', 'روما'], answer: 2, points: 100 },
  { q: 'ما هي أطول نهر في العالم؟', options: ['الأمازون', 'النيل', 'المسيسيبي', 'اليانغتسي'], answer: 1, points: 200 },
  { q: 'ما هو أعمق محيط في العالم؟', options: ['المحيط الهندي', 'المحيط الأطلسي', 'المحيط الهادئ', 'المحيط المتجمد'], answer: 2, points: 200 },
  { q: 'كم عدد قارات العالم؟', options: ['5', '6', '7', '8'], answer: 2, points: 100 },
  { q: 'ما هو أصغر دولة في العالم؟', options: ['موناكو', 'سان مارينو', 'الفاتيكان', 'ليختنشتاين'], answer: 2, points: 250 },
  { q: 'ما هي عاصمة اليابان؟', options: ['بكين', 'سيول', 'طوكيو', 'بانكوك'], answer: 2, points: 100 },
  { q: 'ما هي عاصمة البرازيل؟', options: ['ريو دي جانيرو', 'ساو باولو', 'برازيليا', 'بوينس آيرس'], answer: 2, points: 200 },
  { q: 'في أي قارة تقع مصر؟', options: ['آسيا', 'أوروبا', 'أفريقيا', 'أمريكا'], answer: 2, points: 100 },
  { q: 'ما هو أكبر بلد في العالم من حيث المساحة؟', options: ['الصين', 'كندا', 'الولايات المتحدة', 'روسيا'], answer: 3, points: 150 },
  { q: 'ما هي عاصمة الإمارات العربية المتحدة؟', options: ['دبي', 'أبوظبي', 'الشارقة', 'عجمان'], answer: 1, points: 150 },
  { q: 'ما هو أعلى جبل في العالم؟', options: ['جبل كيليمنجارو', 'جبل ماكينلي', 'جبل إيفرست', 'جبل K2'], answer: 2, points: 150 },

  // ── علوم ─────────────────────────────────────────────────
  { q: 'ما هو أكبر كوكب في المجموعة الشمسية؟', options: ['زحل', 'المريخ', 'المشتري', 'نبتون'], answer: 2, points: 200 },
  { q: 'ما هو العنصر الكيميائي للماء؟', options: ['CO2', 'H2O', 'NaCl', 'O2'], answer: 1, points: 150 },
  { q: 'كم عدد ألوان قوس قزح؟', options: ['5', '6', '7', '8'], answer: 2, points: 150 },
  { q: 'ما هي أسرع حيوان بري في العالم؟', options: ['الأسد', 'النمر', 'الفهد', 'الغزال'], answer: 2, points: 200 },
  { q: 'كم عدد أيام السنة الكبيسة؟', options: ['364', '365', '366', '367'], answer: 2, points: 150 },
  { q: 'ما هو الرمز الكيميائي للذهب؟', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2, points: 250 },
  { q: 'كم عدد عظام جسم الإنسان البالغ؟', options: ['186', '206', '226', '246'], answer: 1, points: 250 },
  { q: 'ما هو أكبر عضو في جسم الإنسان؟', options: ['الكبد', 'الرئة', 'الجلد', 'القلب'], answer: 2, points: 200 },
  { q: 'ما هي درجة غليان الماء بالسيليزيوس؟', options: ['90°', '95°', '100°', '110°'], answer: 2, points: 100 },
  { q: 'ما هو أصغر كوكب في المجموعة الشمسية؟', options: ['المريخ', 'الزهرة', 'عطارد', 'بلوتو'], answer: 2, points: 200 },
  { q: 'كم تبلغ سرعة الضوء تقريباً؟', options: ['200,000 كم/ث', '300,000 كم/ث', '400,000 كم/ث', '500,000 كم/ث'], answer: 1, points: 250 },
  { q: 'ما هو الغاز الأكثر وفرة في الغلاف الجوي للأرض؟', options: ['الأكسجين', 'ثاني أكسيد الكربون', 'النيتروجين', 'الهيدروجين'], answer: 2, points: 200 },

  // ── رياضيات ──────────────────────────────────────────────
  { q: 'كم يساوي 7 × 8؟', options: ['54', '56', '58', '64'], answer: 1, points: 150 },
  { q: 'كم عدد أضلاع المثلث؟', options: ['2', '3', '4', '5'], answer: 1, points: 100 },
  { q: 'كم يساوي جذر 144؟', options: ['10', '11', '12', '13'], answer: 2, points: 200 },
  { q: 'كم يساوي 15% من 200؟', options: ['20', '25', '30', '35'], answer: 2, points: 200 },
  { q: 'ما هو ناتج 2 أس 10؟', options: ['512', '1024', '2048', '256'], answer: 1, points: 250 },
  { q: 'كم يساوي 100 ÷ 4 × 3؟', options: ['75', '80', '85', '90'], answer: 0, points: 200 },

  // ── تاريخ ─────────────────────────────────────────────────
  { q: 'في أي سنة بدأت الحرب العالمية الثانية؟', options: ['1935', '1938', '1939', '1941'], answer: 2, points: 250 },
  { q: 'من كتب رواية ألف ليلة وليلة؟', options: ['مؤلف مجهول', 'ابن بطوطة', 'الجاحظ', 'المتنبي'], answer: 0, points: 300 },
  { q: 'في أي عام سقطت الخلافة العثمانية؟', options: ['1918', '1920', '1923', '1924'], answer: 3, points: 300 },
  { q: 'من هو أول رئيس للولايات المتحدة الأمريكية؟', options: ['أبراهام لينكولن', 'جورج واشنطن', 'توماس جيفرسون', 'جون آدامز'], answer: 1, points: 200 },
  { q: 'في أي عام اكتشف كريستوفر كولومبوس أمريكا؟', options: ['1488', '1490', '1492', '1498'], answer: 2, points: 250 },
  { q: 'ما هي الحضارة التي بنت الأهرامات؟', options: ['الرومانية', 'اليونانية', 'المصرية القديمة', 'الفارسية'], answer: 2, points: 150 },

  // ── تقنية ─────────────────────────────────────────────────
  { q: 'ما هي لغة البرمجة التي يُعرف بها موقع ديسكورد؟', options: ['Python', 'JavaScript', 'Java', 'C++'], answer: 1, points: 250 },
  { q: 'ما اسم مؤسس شركة Apple؟', options: ['بيل غيتس', 'ستيف جوبز', 'إيلون ماسك', 'مارك زوكربيرغ'], answer: 1, points: 200 },
  { q: 'من هو مخترع الهاتف؟', options: ['توماس إديسون', 'ألكسندر غراهام بيل', 'نيكولا تيسلا', 'ألبرت أينشتاين'], answer: 1, points: 250 },
  { q: 'ما هو اختصار HTML؟', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Link', 'Home Tool Markup Language'], answer: 0, points: 200 },
  { q: 'ما هي شركة تطوير لعبة Minecraft؟', options: ['EA Games', 'Ubisoft', 'Mojang', 'Valve'], answer: 2, points: 200 },
  { q: 'في أي عام أُطلق موقع Facebook؟', options: ['2002', '2003', '2004', '2005'], answer: 2, points: 200 },
  { q: 'ما هو نظام التشغيل الذي طورته Google للهواتف؟', options: ['iOS', 'Windows Mobile', 'Android', 'Symbian'], answer: 2, points: 150 },
  { q: 'ما هو اختصار CPU؟', options: ['Central Processing Unit', 'Computer Power Unit', 'Core Processing Utility', 'Central Program Unit'], answer: 0, points: 200 },

  // ── رياضة ─────────────────────────────────────────────────
  { q: 'كم عدد لاعبي فريق كرة القدم؟', options: ['9', '10', '11', '12'], answer: 2, points: 100 },
  { q: 'كم عدد حلقات الأولمبياد؟', options: ['4', '5', '6', '7'], answer: 1, points: 150 },
  { q: 'في أي دولة أُقيمت كأس العالم 2022؟', options: ['الإمارات', 'السعودية', 'قطر', 'البحرين'], answer: 2, points: 150 },
  { q: 'كم مرة فازت البرازيل بكأس العالم؟', options: ['3', '4', '5', '6'], answer: 2, points: 200 },
  { q: 'ما هو طول ملعب كرة القدم القياسي؟', options: ['90-100م', '100-110م', '105-110م', '110-120م'], answer: 1, points: 200 },

  // ── ثقافة عامة ───────────────────────────────────────────
  { q: 'ما هي اللغة الأكثر تحدثاً في العالم؟', options: ['الإنجليزية', 'الإسبانية', 'الصينية المندرينية', 'العربية'], answer: 2, points: 200 },
  { q: 'كم عدد أيام رمضان في السنة الهجرية؟', options: ['28', '29 أو 30', '30', '31'], answer: 1, points: 150 },
  { q: 'ما هو أطول سور في العالم؟', options: ['سور الصين العظيم', 'سور أدريان', 'سور برلين', 'سور القسطنطينية'], answer: 0, points: 200 },
  { q: 'ما هو الكتاب الأكثر مبيعاً في التاريخ؟', options: ['هاري بوتر', 'القرآن الكريم', 'الكتاب المقدس', 'دون كيخوته'], answer: 2, points: 250 },
  { q: 'كم عدد نجوم العلم الأمريكي؟', options: ['48', '50', '52', '54'], answer: 1, points: 200 },
  { q: 'ما هو أقدم لغة مكتوبة في التاريخ؟', options: ['العربية', 'اليونانية', 'السومرية', 'المصرية القديمة'], answer: 2, points: 300 },
];

module.exports = {
  name: 'qst',
  aliases: ['سؤال', 'quiz', 'لعبة-أسئلة'],
  description: 'العب لعبة الأسئلة واربح عملات ونقاط!',
  usage: '!qst',
  category: '🎮 الألعاب',
  cooldown: 15,

  async execute(message, args, client) {
    if (client.activeQuizzes.has(message.channel.id)) {
      return message.reply('⚠️ يوجد سؤال جارٍ في هذه القناة، انتظر حتى ينتهي!');
    }

    const question = questions[Math.floor(Math.random() * questions.length)];
    client.activeQuizzes.set(message.channel.id, true);

    const letters = ['أ', 'ب', 'ج', 'د'];

    const row = new ActionRowBuilder().addComponents(
      question.options.map((opt, i) =>
        new ButtonBuilder()
          .setCustomId(`quiz_${i}_${message.id}`)
          .setLabel(`${letters[i]}) ${opt}`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('🧠 سؤال جديد!')
      .setDescription(`**${question.q}**`)
      .addFields(
        { name: '💰 المكافأة', value: `${question.points} عملة`, inline: true },
        { name: '🏆 النقاط', value: `+${Math.ceil(question.points / 50)} نقطة`, inline: true },
        { name: '⏳ الوقت', value: '30 ثانية', inline: true }
      )
      .setFooter({ text: `${questions.length} سؤال متاح | اضغط على الإجابة الصحيحة!` });

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 30_000 });
    const answered = new Set();

    collector.on('collect', async interaction => {
      if (answered.has(interaction.user.id)) {
        return interaction.reply({ content: '❌ لقد أجبت بالفعل!', ephemeral: true });
      }
      answered.add(interaction.user.id);

      const chosen  = parseInt(interaction.customId.split('_')[1]);
      const correct = chosen === question.answer;

      if (correct) {
        const bonusPoints = Math.ceil(question.points / 50);
        await Promise.all([
          db.addBalance(message.guild.id, interaction.user.id, question.points),
          db.addMessagePoints(message.guild.id, interaction.user.id, bonusPoints),
        ]);
        await interaction.reply({
          content: `✅ **${interaction.user.username}** أجاب صح! ربح **${question.points} عملة** و **${bonusPoints} نقطة** 🎉`,
          ephemeral: false,
        });
      } else {
        await db.removeBalance(message.guild.id, interaction.user.id, config.economy.quizWrongPenalty);
        await interaction.reply({
          content: `❌ **${interaction.user.username}** أجاب غلط! خسر **${config.economy.quizWrongPenalty} عملة** 😢`,
          ephemeral: false,
        });
      }
    });

    collector.on('end', () => {
      client.activeQuizzes.delete(message.channel.id);

      const disabledRow = new ActionRowBuilder().addComponents(
        question.options.map((opt, i) =>
          new ButtonBuilder()
            .setCustomId(`quiz_${i}_${message.id}`)
            .setLabel(`${letters[i]}) ${opt}`)
            .setStyle(i === question.answer ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(true)
        )
      );

      const endEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('⏰ انتهى الوقت!')
        .setDescription(`الإجابة الصحيحة كانت: **${question.options[question.answer]}** ✅`)
        .setFooter({ text: `أجاب ${answered.size} شخص` });

      msg.edit({ embeds: [endEmbed], components: [disabledRow] }).catch(() => {});
    });
  },
};
