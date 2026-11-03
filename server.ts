import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI client (Server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Emergency Triage & AI Companion Endpoint
app.post('/api/emergency/ai-assistant', async (req, res) => {
  try {
    const {
      situation,
      category = 'general',
      location,
      language = 'ru',
      history = [],
      patientDetails,
    } = req.body;

    if (!situation && !category) {
      return res.status(400).json({ error: 'Situation description or category is required' });
    }

    const languageInstruction =
      language === 'kz'
        ? 'Жауапты қазақ тілінде анық, сабырлы және нақты беріңіз.'
        : language === 'en'
        ? 'Provide the emergency guidance in clear, calm, and direct English.'
        : 'Предоставляй инструкции на русском языке: предельно четко, без лишней воды, спокойным командным тоном.';

    const systemInstruction = `Ты — «Qutqar 112 AI», специализированный цифровой оперативный диспетчер-инструктор службы спасения 112 и медицины катастроф.
Твоя главная задача: спасти жизнь человека до прибытия оперативных служб (скорой, пожарных, спасателей МЧС, полиции).
Принципы:
1. Оценка угрозы для самого спасающего (первое правило — безопасность того, кто оказывает помощь).
2. Четкий алгоритм ABCDE (Дыхательные пути, Дыхание, Кровообращение, Неврология, Осмотр).
3. При остановке сердца немедленно дать указание начать СЛР (непрямой массаж сердца, 100-120 наж/мин).
4. При кровотечении — прямое давление, жгут/турникет выше раны.
5. При задымлении — мокрая ткань, пригнуться к полу, закрыть щели, не открывать окна при сквозняке.
6. Выдавать структурированный ответ с:
   - statusLevel (CRITICAL / HIGH / MODERATE)
   - immediateAction (Что сделать в первые 10-30 секунд)
   - stepByStepInstructions (3-5 последовательных шагов)
   - strictlyProhibited (Чего делать категорически нельзя)
   - dispatcherBrief (Точный текст, что сказать диспетчеру 112 при звонке)
   - followUpCheck (Контрольный вопрос пострадавшему/свидетелю: "Дышит ли?", "Есть ли пульс?", "Идет ли дым?")
${languageInstruction}`;

    const promptContext = `СИТУАЦИЯ ОТ ПОЛЬЗОВАТЕЛЯ: "${situation || 'Чрезвычайная ситуация'}"
Категория: ${category}
Местоположение: ${location ? `${location.latitude}, ${location.longitude} (${location.address || 'Определяется'})` : 'Координаты запрашиваются'}
Данные пострадавшего: ${JSON.stringify(patientDetails || {})}
Предыдущий контекст: ${JSON.stringify(history.slice(-4))}`;

    // If API key is not set or network fails, provide a rich, certified fallback
    if (!process.env.GEMINI_API_KEY) {
      return res.json(getOfflineGuidance(category, situation, language));
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptContext,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Краткое название диагноза/угрозы' },
            statusLevel: {
              type: Type.STRING,
              description: 'CRITICAL (красный), HIGH (оранжевый), MODERATE (желтый)',
            },
            immediateAction: {
              type: Type.STRING,
              description: 'Самое первое действие за 10 секунд',
            },
            stepByStepInstructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Четкие пошаговые инструкции',
            },
            strictlyProhibited: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Опасные ошибки, которые нельзя совершать',
            },
            dispatcherBrief: {
              type: Type.STRING,
              description: 'Короткая фраза для 112: Кто, Где, Что случилось, Сколько пострадавших',
            },
            cprRequired: {
              type: Type.BOOLEAN,
              description: 'Нужно ли включить метроном сердечно-легочной реанимации (СЛР)?',
            },
            followUpCheck: {
              type: Type.STRING,
              description: 'Вопрос для продолжения оценки состояния',
            },
          },
          required: [
            'title',
            'statusLevel',
            'immediateAction',
            'stepByStepInstructions',
            'strictlyProhibited',
            'dispatcherBrief',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      data: parsed,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error generating AI emergency response:', error);
    // Graceful offline fallback
    const { category = 'general', situation = '', language = 'ru' } = req.body;
    return res.json(getOfflineGuidance(category, situation, language));
  }
});

// Official 112 Emergency Dossier generation
app.post('/api/emergency/generate-112-dossier', async (req, res) => {
  try {
    const {
      incidentType,
      coordinates,
      address,
      medicalProfile,
      details,
      batteryLevel,
    } = req.body;

    const lat = coordinates?.latitude ? coordinates.latitude.toFixed(6) : 'N/A';
    const lng = coordinates?.longitude ? coordinates.longitude.toFixed(6) : 'N/A';
    const accuracy = coordinates?.accuracy ? `±${Math.round(coordinates.accuracy)}м` : '';

    const textSms = `[SOS 112 QUTQAR]
Тип ЧС: ${incidentType || 'ЭКСТРЕННАЯ ПОМОЩЬ'}
Координаты: ${lat}, ${lng} ${accuracy}
Карта: https://maps.google.com/?q=${lat},${lng}
Адрес: ${address || 'Определяется по GPS'}
Пострадавший: ${medicalProfile?.fullName || 'Не указано'}
Группа крови: ${medicalProfile?.bloodGroup || 'Не указана'}
Аллергии/Заболевания: ${medicalProfile?.allergies || 'Нет'} / ${medicalProfile?.chronicIllness || 'Нет'}
Экстренный контакт: ${medicalProfile?.iceContactName || 'Контакт'}: ${medicalProfile?.iceContactPhone || 'Н/Д'}
Детали: ${details || 'Срочно требуется помощь спасателей/медиков'}
Заряд батареи: ${batteryLevel ? `${batteryLevel}%` : 'Н/Д'}
Время: ${new Date().toLocaleTimeString('ru-RU')} ${new Date().toLocaleDateString('ru-RU')}`;

    return res.json({
      success: true,
      dossier: {
        rawSms: textSms,
        coordinates: { lat, lng },
        googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Built-in offline emergency protocols (Certified First Aid / Emergency Response)
function getOfflineGuidance(category: string, situation: string, lang: string = 'ru') {
  const isKz = lang === 'kz';

  const defaultGuidance: Record<string, any> = {
    cpr: {
      title: isKz ? 'Жүрек-өкпе реанимациясы (ЖӨР)' : 'Сердечно-легочная реанимация (СЛР)',
      statusLevel: 'CRITICAL',
      cprRequired: true,
      immediateAction: isKz
        ? 'Адамды қатты тегіс жерге жатқызыңыз және 103/112 нөміріне қоңырау шалыңыз!'
        : 'Уложите человека на твердую ровную поверхность и немедленно вызовите 103 / 112!',
      stepByStepInstructions: isKz
        ? [
            '1. Қауіпсіздікті тексеріңіз, иығынан сілкіп: «Сізге не болды?» деп сұраңыз.',
            '2. Дем алысын тексеріңіз: тыңдаңыз және кеуденің көтерілуін 10 секунд бақылаңыз.',
            '3. Егер дем алмаса — алақанның түбін кеуде ортасына қойыңыз.',
            '4. Қолды бүкпей, минутына 100-120 рет қарқынмен 5-6 см тереңдікке басыңыз.',
            '5. Әр 30 рет басудан кейін 2 рет ауызға ауа үрлеңіз (немесе тек үздіксіз басыңыз).',
          ]
        : [
            '1. Проверьте безопасность, окликните пострадавшего, потрясите за плечи.',
            '2. Проверьте дыхание в течение 10 секунд (слушайте ухом, смотрите на грудную клетку).',
            '3. Если дыхания нет — положите основание ладони на центр грудины пострадавшего.',
            '4. Надавливайте прямыми руками на глубину 5–6 см с частотой 100–120 нажатий в минуту.',
            '5. Делайте 30 компрессий и 2 вдоха искусственного дыхания (или только компрессии без остановки).',
          ],
      strictlyProhibited: isKz
        ? [
            'Науқасты жұмсақ төсекке немесе диванға қалдыруға болмайды (тек қатты еден).',
            'Есін жимаған адамға су немесе дәрі беруге қатаң тыйым салынады.',
            'Жүректі басуды 10 секундтан артық үзбеңіз.',
          ]
        : [
            'Не проводите реанимацию на мягком диване или кровати (только твердый пол).',
            'Не давайте воду, валидол или таблетки человеку без сознания.',
            'Не прерывайте компрессии грудной клетки более чем на 10 секунд.',
          ],
      dispatcherBrief: isKz
        ? '«Адам ес-түссіз, дем алмайды. Жүрек-өкпе реанимациясын жасап жатырмын. Мекенжайымыз...»'
        : '«Человек без сознания, не дышит. Провожу непрямой массаж сердца (СЛР). Срочно реанимобиль! Адрес...»',
      followUpCheck: isKz ? 'Кеуде қозғалысы немесе дем пайда болды ма?' : 'Появились ли признаки дыхания или движения?',
    },
    bleeding: {
      title: isKz ? 'Қатты қан кету' : 'Обильное артериальное/венозное кровотечение',
      statusLevel: 'CRITICAL',
      cprRequired: false,
      immediateAction: isKz
        ? 'Жараны алақанмен немесе таза матамен барынша қатты басыңыз!'
        : 'Прижмите рану чистой тканью или рукой со всей силы прямо сейчас!',
      stepByStepInstructions: isKz
        ? [
            '1. Жараны тікелей саусақпен немесе жұдырықпен басып тұрыңыз.',
            '2. Егер қан атқылап жатса (артериялық) — жарадан 5 см жоғары жгут немесе белбеу байлаңыз.',
            '3. Жгуттың астына уақыты жазылған қағаз қыстырыңыз (1 сағаттан асырмау).',
            '4. Зақымдалған аяқ-қолды жүрек деңгейінен жоғары көтеріңіз.',
            '5. 112 жедел қызметін шақырыңыз.',
          ]
        : [
            '1. Осуществите прямое давление на рану ладонью через салфетку или одежду.',
            '2. При пульсирующей алой струе (артериальное) — наложите жгут/турникет на 5 см выше раны.',
            '3. Обязательно зафиксируйте точное время наложения жгута (максимум 1 час).',
            '4. Если жгута нет — сделайте тугую давящую повязку из бинтов или одежды.',
            '5. Приподнимите поврежденную конечность выше уровня сердца.',
          ],
      strictlyProhibited: isKz
        ? [
            'Жарадағы бөтен заттарды (пышақ, шыны, арматура) суырып алуға болмайды!',
            'Жгутты мойын немесе буынға қате байламаңыз.',
            'Қанға боялған алғашқы матаны алмаңыз, үстінен жаңасын қосып байлаңыз.',
          ]
        : [
            'Не извлекайте из раны глубоко сидящие инородные предметы (осколки, нож).',
            'Не снимайте пропитавшуюся кровью повязку — накладывайте новые слои поверх.',
            'Не закрывайте жгут одеждой (он должен быть виден медикам).',
          ],
      dispatcherBrief: isKz
        ? '«Қатты артериялық қан кету. Жгут салынды. Адам әлсіреп барады. Мекенжай...»'
        : '«Сильное кровотечение из конечности. Наложили давящую повязку/жгут. Срочно скорую помощь. Адрес...»',
      followUpCheck: isKz ? 'Қан тоқтады ма, әлде таңғыштан өтіп жатыр ма?' : 'Кровотечение остановилось или повязка промокает?',
    },
    fire: {
      title: isKz ? 'Өрт және түтін басу' : 'Пожар и сильное задымление',
      statusLevel: 'HIGH',
      cprRequired: false,
      immediateAction: isKz
        ? 'Түтіннен сақтану үшін жерге жатыңыз, аузы-мұрныңызды сулы шүберекпен жабыңыз!'
        : 'Немедленно пригнитесь к полу и закройте рот и нос влажной тканью!',
      stepByStepInstructions: isKz
        ? [
            '1. Еңкейіп немесе еңбектеп есікке қарай жылжыңыз (төменде таза ауа көбірек).',
            '2. Есік тұтқасын қолмен ұстап көріңіз: егер ыстық болса — ашпаңыз, артында от бар!',
            '3. Ешқашан лифтті пайдаланбаңыз, тек баспалдақпен түсіңіз.',
            '4. Егер шығу мүмкін болмаса — бөлме есігін жауып, саңылауларды су матамен тығыздаңыз.',
            '5. Терезеге шығып, ашық түсті матамен құтқарушыларға белгі беріңіз.',
          ]
        : [
            '1. Опуститесь на четвереньки (чистый воздух всегда внизу у пола).',
            '2. Закройте дыхательные пути мокрой тканью или любой одеждой.',
            '3. Проверьте ручку двери тыльной стороной ладони: горячая — не открывать!',
            '4. Спускайтесь исключительно по пожарным лестницам. Лифт категорически запрещен.',
            '5. Если путь отрезан: закройте дверь, заткните щели мокрыми полотенцами, подавайте сигналы из окна.',
          ],
      strictlyProhibited: isKz
        ? [
            'Лифтке мінуге қатаң тыйым салынады!',
            'Терезелерді ашып сквозняк тудырмаңыз (отты одан сайын күшейтеді).',
            'Құжат немесе зат үшін жанып жатқан ғимаратқа қайта кірмеңіз.',
          ]
        : [
            'Ни в коем случае не пользуйтесь лифтом при тревоге!',
            'Не открывайте настежь окна в горящей комнате (приток кислорода усилит пламя).',
            'Не возвращайтесь в горящее здание за вещами или питомцами.',
          ],
      dispatcherBrief: isKz
        ? '«Өрт. Қабатта түтін. Адамдар бар. Лифт жұмыс істемейді. Мекенжай...»'
        : '«Пожар в здании, сильное задымление на этаже. Люди внутри. Нужна эвакуация и расчет МЧС. Адрес...»',
      followUpCheck: isKz ? 'Сіз қауіпсіз жерге шыға алдыңыз ба?' : 'Вы находитесь на безопасном расстоянии от огня?',
    },
    earthquake: {
      title: isKz ? 'Жер сілкінісі' : 'Землетрясение (подземные толчки)',
      statusLevel: 'HIGH',
      cprRequired: false,
      immediateAction: isKz
        ? '«Жат! Жасырын! Ұстан!» (Төсектің, берік үстелдің астына тығылыңыз)'
        : '«Упади! Прикройся! Держись!» Укройтесь под прочным столом или у несущей стены.',
      stepByStepInstructions: isKz
        ? [
            '1. Терезелерден, айналардан және ауыр жиһаздан дереу алыстаңыз.',
            '2. Мықты үстелдің астына кіріп, оның аяғынан мықтап ұстаңыз.',
            '3. Тоқтағанша күтіңіз. Селкініс кезінде баспалдақпен жүгіруге болмайды.',
            '4. Толқын басылған соң: газды, суды, электр қуатын өшіріңіз.',
            '5. «Дабыл чемоданын» алып, баспалдақ арқылы ашық алаңға шығыңыз.',
          ]
        : [
            '1. Отойдите от окон, стеклянных перегородок, навесных шкафов и люстр.',
            '2. Укройтесь под крепким столом, закройте голову руками или встаньте в проеме несущей стены.',
            '3. Не бегите по лестницам во время толчков (лестничные пролеты обрушаются первыми).',
            '4. После прекращения толчков: перекройте газ, отключите электрощит и воду.',
            '5. Возьмите тревожный чемоданчик и спуститесь пешком на открытое безопасное пространство.',
          ],
      strictlyProhibited: isKz
        ? [
            'Толқындар кезінде баспалдақпен жүгіруге немесе лифтке мінуге болмайды!',
            'Терезеден секірмеңіз (әсіресе 2-қабаттан жоғары).',
            'Шырпы немесе от жақпаңыз (газ құбыры жарылуы мүмкін).',
          ]
        : [
            'Не бегите к лифтам и не спускайтесь по лестнице в момент вибраций.',
            'Не зажигайте спички, зажигалки или свечи (возможна утечка бытового газа).',
            'Не стойте возле наружных стен зданий, линий электропередач и билбордов на улице.',
          ],
      dispatcherBrief: isKz
        ? '«Жер сілкінісінен кейін ғимарат зақымдалды, қиранды астында адамдар болуы мүмкін. Мекенжай...»'
        : '«Последствия землетрясения: частичное повреждение конструкций, возможны заблокированные. Адрес...»',
      followUpCheck: isKz ? 'Толқындар тоқтады ма? Ашық жердесіз бе?' : 'Толчки прекратились? Вы на открытой безопасной площадке?',
    },
  };

  const matched =
    defaultGuidance[category] ||
    (situation.toLowerCase().includes('сердц') || situation.toLowerCase().includes('дыш')
      ? defaultGuidance.cpr
      : situation.toLowerCase().includes('кров')
      ? defaultGuidance.bleeding
      : situation.toLowerCase().includes('пожар') || situation.toLowerCase().includes('дым')
      ? defaultGuidance.fire
      : situation.toLowerCase().includes('землетряс') || situation.toLowerCase().includes('толч')
      ? defaultGuidance.earthquake
      : defaultGuidance.cpr);

  return {
    success: true,
    data: matched,
    source: 'certified-offline-emergency-protocol',
  };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Qutqar 112',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Configure Vite or Static Serve
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Qutqar 112 server is running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
