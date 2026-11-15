/* מאגר פורטוגזית לטיול (v0.18). נכתב על ידי Claude ולא נבדק על ידי דובר שפת אם: מומלץ לעבור על הפריטים ולסמן לי טעויות.
   ברירת המחדל היא פורטוגזית ברזילאית (br); לפריטים שונים בפורטוגל מופיעה גרסה שנייה (pp).
   כללי תחזוקה: מזהי המילים נקבעים לפי הקטגוריה והמיקום (gr01...), ומזהי המשפטים לפי המיקום (s01...). לכן מוסיפים רק בסוף הרשימה ולא מוחקים או מסדרים מחדש, כדי לא לאבד התקדמות שמורה. */
(function () {
    'use strict';
    // [עברית, פורטוגזית ברזילאית, (אופציונלי) פורטוגזית של פורטוגל]
    const W = {
        gr: [
            ['שלום (היי)', 'olá'], ['בוקר טוב', 'bom dia'], ['צהריים טובים / אחר הצהריים טובים', 'boa tarde'], ['ערב טוב / לילה טוב', 'boa noite'],
            ['להתראות', 'tchau', 'adeus'], ['נתראה בקרוב', 'até logo'], ['נתראה מחר', 'até amanhã'], ['תודה', 'obrigado / obrigada'], ['תודה רבה', 'muito obrigado / obrigada'],
            ['על לא דבר', 'de nada'], ['בבקשה (כשמבקשים)', 'por favor'], ['סליחה (על טעות)', 'desculpe'], ['סליחה (כדי לעבור או לפנות למישהו)', 'com licença'],
            ['כן', 'sim'], ['לא', 'não'], ['אולי', 'talvez'], ['בסדר גמור', 'tudo certo'], ['אין בעיה', 'sem problema'], ['מה שלומך?', 'tudo bem?'], ['אני בסדר', 'estou bem'],
            ['נעים להכיר', 'prazer'], ['קוראים לי...', 'meu nome é...', 'o meu nome é...'], ['אני מישראל', 'sou de Israel'], ['אני לא מבין', 'não entendo'], ['אני מבין', 'entendo'],
            ['אתה מדבר אנגלית?', 'você fala inglês?', 'fala inglês?'], ['לאט יותר, בבקשה', 'mais devagar, por favor'], ['עוד פעם, בבקשה', 'de novo, por favor', 'outra vez, por favor'],
            ['ברוך הבא', 'bem-vindo'], ['בתיאבון', 'bom apetite'], ['לחיים (בשתייה)', 'saúde'], ['מזל טוב', 'parabéns'], ['בהצלחה', 'boa sorte'], ['שיהיה לך יום טוב', 'tenha um bom dia']
        ],
        nu: [
            ['אפס', 'zero'], ['אחד', 'um'], ['שניים', 'dois'], ['שלושה', 'três'], ['ארבעה', 'quatro'], ['חמישה', 'cinco'], ['שישה', 'seis'], ['שבעה', 'sete'], ['שמונה', 'oito'], ['תשעה', 'nove'],
            ['עשרה', 'dez'], ['אחד עשר', 'onze'], ['שנים עשר', 'doze'], ['חמישה עשר', 'quinze'], ['עשרים', 'vinte'], ['שלושים', 'trinta'], ['חמישים', 'cinquenta'], ['מאה', 'cem'], ['מאתיים', 'duzentos'], ['אלף', 'mil']
        ],
        ti: [
            ['היום', 'hoje'], ['מחר', 'amanhã'], ['אתמול', 'ontem'], ['עכשיו', 'agora'], ['מוקדם', 'cedo'], ['מאוחר', 'tarde'], ['בוקר', 'manhã'], ['אחר הצהריים', 'à tarde'], ['ערב / לילה', 'noite'],
            ['שעה', 'hora'], ['דקה', 'minuto'], ['יום', 'dia'], ['שבוע', 'semana'], ['חודש', 'mês'], ['שנה', 'ano'], ['סוף שבוע', 'fim de semana'],
            ['יום ראשון', 'domingo'], ['יום שני', 'segunda-feira'], ['יום שלישי', 'terça-feira'], ['יום רביעי', 'quarta-feira'], ['יום חמישי', 'quinta-feira'], ['יום שישי', 'sexta-feira'], ['שבת', 'sábado']
        ],
        tr: [
            ['אוטובוס', 'ônibus', 'autocarro'], ['רכבת', 'trem', 'comboio'], ['מטרו', 'metrô', 'metro'], ['מונית', 'táxi'], ['רכב', 'carro'], ['אופניים', 'bicicleta'],
            ['תחנת אוטובוס', 'ponto de ônibus', 'paragem de autocarro'], ['תחנת רכבת', 'estação de trem', 'estação de comboio'], ['כרטיס נסיעה', 'passagem', 'bilhete'], ['נהג', 'motorista'],
            ['לשכור רכב', 'alugar um carro'], ['חניה', 'estacionamento'], ['תחנת דלק', 'posto de gasolina'], ['כביש', 'estrada'], ['תחבורה ציבורית', 'transporte público'],
            ['עיכוב', 'atraso'], ['ביטול (של נסיעה)', 'cancelamento'], ['כניסה', 'entrada'], ['יציאה', 'saída'], ['מחיר', 'preço'], ['לוח זמנים', 'horário']
        ],
        ai: [
            ['שדה תעופה', 'aeroporto'], ['טיסה', 'voo'], ['דרכון', 'passaporte'], ['ויזה', 'visto'], ['מזוודה', 'mala'], ['כבודה', 'bagagem'], ['כרטיס עלייה למטוס', 'cartão de embarque'],
            ['שער עלייה למטוס', 'portão de embarque', 'porta de embarque'], ['עלייה למטוס', 'embarque'], ['נחיתה', 'aterrissagem', 'aterragem'], ['ביקורת דרכונים', 'controle de passaportes', 'controlo de passaportes'],
            ['מכס', 'alfândega'], ['חלון (במטוס)', 'janela'], ['מעבר (במטוס)', 'corredor'], ['חגורת בטיחות', 'cinto de segurança'], ['טרמינל', 'terminal']
        ],
        ho: [
            ['מלון', 'hotel'], ['חדר', 'quarto'], ['חדר זוגי', 'quarto de casal'], ['חדר ליחיד', 'quarto de solteiro', 'quarto individual'], ['מיטה', 'cama'], ['מפתח', 'chave'], ['קבלה (במלון)', 'recepção'],
            ['הזמנה', 'reserva'], ['צ׳ק-אין', 'check-in'], ['צ׳ק-אאוט', 'check-out'], ['ארוחת בוקר', 'café da manhã', 'pequeno-almoço'], ['מזגן', 'ar-condicionado'], ['ווי-פיי', 'wi-fi'],
            ['סיסמה', 'senha', 'palavra-passe'], ['מקלחת', 'chuveiro', 'duche'], ['שירותים', 'banheiro', 'casa de banho'], ['מגבת', 'toalha'], ['שמיכה', 'cobertor'], ['מעלית', 'elevador'], ['קומה', 'andar']
        ],
        fo: [
            ['מים', 'água'], ['קפה', 'café'], ['תה', 'chá'], ['חלב', 'leite'], ['מיץ', 'suco', 'sumo'], ['בירה', 'cerveja'], ['יין', 'vinho'], ['קרח', 'gelo'], ['לחם', 'pão'], ['חמאה', 'manteiga'],
            ['גבינה', 'queijo'], ['ביצה', 'ovo'], ['בשר', 'carne'], ['עוף', 'frango'], ['דג', 'peixe'], ['אורז', 'arroz'], ['שעועית', 'feijão'], ['סלט', 'salada'], ['פירות', 'frutas'], ['ירקות', 'legumes'],
            ['תפוח עץ', 'maçã'], ['בננה', 'banana'], ['תפוז', 'laranja'], ['תפוח אדמה', 'batata'], ['עגבנייה', 'tomate'], ['מרק', 'sopa'], ['עוגה', 'bolo'], ['גלידה', 'sorvete', 'gelado'], ['סוכר', 'açúcar'],
            ['מלח', 'sal'], ['פלפל (תבלין)', 'pimenta'], ['תפריט', 'cardápio', 'ementa'], ['חשבון (במסעדה)', 'conta'], ['מלצר', 'garçom', 'empregado de mesa'], ['מסעדה', 'restaurante'], ['צמחוני', 'vegetariano'],
            ['אלרגיה', 'alergia'], ['ארוחת צהריים', 'almoço'], ['ארוחת ערב', 'jantar'], ['כוס', 'copo'], ['צלחת', 'prato'], ['סכין', 'faca'], ['מזלג', 'garfo'], ['כף', 'colher'], ['שולחן', 'mesa'],
            ['חריף', 'picante'], ['טעים', 'gostoso', 'saboroso'], ['קינוח', 'sobremesa'], ['כריך', 'sanduíche', 'sandes']
        ],
        di: [
            ['איפה?', 'onde?'], ['ימינה', 'à direita'], ['שמאלה', 'à esquerda'], ['ישר (קדימה)', 'em frente'], ['קרוב', 'perto'], ['רחוק', 'longe'], ['כאן', 'aqui'], ['שם', 'ali'], ['רחוב', 'rua'],
            ['כיכר', 'praça'], ['פינה (של רחוב)', 'esquina'], ['מפה', 'mapa'], ['חוף', 'praia'], ['ים', 'mar'], ['עיר', 'cidade'], ['מרכז העיר', 'centro'], ['מוזיאון', 'museu'], ['כנסייה', 'igreja'],
            ['בנק', 'banco'], ['בית מרקחת', 'farmácia'], ['שוק', 'mercado'], ['פארק', 'parque'], ['פתוח', 'aberto'], ['סגור', 'fechado'], ['אסור', 'proibido'], ['צפון', 'norte'], ['דרום', 'sul'],
            ['מזרח', 'leste', 'este'], ['מערב', 'oeste']
        ],
        sh: [
            ['כסף (מזומן)', 'dinheiro'], ['כרטיס אשראי', 'cartão de crédito'], ['כמה זה עולה?', 'quanto custa?'], ['יקר', 'caro'], ['זול', 'barato'], ['הנחה', 'desconto'], ['חנות', 'loja'], ['לקנות', 'comprar'],
            ['קבלה', 'recibo'], ['עודף (כסף)', 'troco'], ['כספומט', 'caixa eletrônico', 'multibanco'], ['אירו', 'euro'], ['דולר', 'dólar'], ['ריאל (מטבע ברזיל)', 'real'], ['מידה (בגדים)', 'tamanho'],
            ['חולצה', 'camisa'], ['מכנסיים', 'calça', 'calças'], ['נעליים', 'sapatos'], ['מתנה', 'presente'], ['שקית', 'sacola', 'saco'], ['מבצע', 'promoção'], ['לשלם', 'pagar'], ['לנסות (בגד)', 'experimentar'],
            ['להחליף כסף', 'trocar dinheiro']
        ],
        he: [
            ['עזרה!', 'socorro!'], ['חירום', 'emergência'], ['רופא', 'médico'], ['בית חולים', 'hospital'], ['אמבולנס', 'ambulância'], ['משטרה', 'polícia'], ['כואב לי', 'dói'], ['ראש', 'cabeça'],
            ['בטן', 'barriga', 'estômago'], ['כאב', 'dor'], ['חום (קדחת)', 'febre'], ['תרופה', 'remédio', 'medicamento'], ['אני חולה', 'estou doente'], ['ביטוח', 'seguro'], ['אבוד', 'perdido'],
            ['גנב', 'ladrão'], ['שרפה', 'incêndio'], ['שיעול', 'tosse']
        ],
        ap: [
            ['אני', 'eu'], ['אתה / את', 'você', 'tu'], ['הוא', 'ele'], ['היא', 'ela'], ['אנחנו', 'nós'], ['הם', 'eles'], ['מי', 'quem'], ['מה', 'o que'], ['למה', 'por que'], ['מתי', 'quando'], ['איך', 'como'],
            ['כמה (כמות)', 'quanto'], ['מאיפה', 'de onde'], ['ו (וגם)', 'e'], ['או', 'ou'], ['אבל', 'mas'], ['כי', 'porque'], ['עם', 'com'], ['בלי', 'sem'], ['מאוד', 'muito'], ['קצת', 'um pouco'],
            ['טוב', 'bom'], ['רע', 'ruim', 'mau'], ['גדול', 'grande'], ['קטן', 'pequeno'], ['חדש', 'novo'], ['ישן', 'velho'], ['יפה', 'bonito'], ['לרצות', 'querer'], ['לאכול', 'comer'], ['לשתות', 'beber'],
            ['ללכת / לנסוע', 'ir'], ['לבוא', 'vir'], ['לראות', 'ver'], ['לדעת', 'saber'], ['לדבר', 'falar'], ['להבין', 'entender'], ['לעזור', 'ajudar'], ['לישון', 'dormir'], ['לקחת', 'pegar', 'apanhar'], ['צריך', 'precisar']
        ]
    };
    const CATS = {
        gr: { l: 'ברכות ושיחה בסיסית', ic: '👋' }, tr: { l: 'תחבורה', ic: '🚌' }, ai: { l: 'שדה תעופה', ic: '✈️' }, ho: { l: 'מלון ולינה', ic: '🏨' }, fo: { l: 'אוכל ומסעדה', ic: '🍽️' },
        di: { l: 'כיוונים ומקומות', ic: '🧭' }, sh: { l: 'קניות וכסף', ic: '🛍️' }, he: { l: 'בריאות וחירום', ic: '🚑' }, nu: { l: 'מספרים', ic: '🔢' }, ti: { l: 'זמן ותאריכים', ic: '🕒' }, ap: { l: 'מילות יסוד ופעלים', ic: '⚙️' }, mine: { l: 'המילים שלי', ic: '⭐' }
    };
    // סדר הלמידה המומלץ לטיול (מה שהכי נחוץ קודם)
    const ORDER = ['gr', 'ai', 'tr', 'ho', 'fo', 'di', 'sh', 'he', 'nu', 'ti', 'ap'];
    const WORDS = []; ORDER.forEach(c => W[c].forEach((r, i) => WORDS.push({ id: c + String(i + 1).padStart(2, '0'), cat: c, he: r[0], pt: r[1], pp: r[2] || '' })));

    // משפטים: [קטגוריה, עברית, פורטוגזית ברזילאית, פורטוגזית של פורטוגל (או ריק), [ניסוחים נוספים שמתקבלים], [ניסוחים נוספים בעברית שמתקבלים]]
    const S = [
        ['gr', 'שלום, קוראים לי דן.', 'Olá, meu nome é Dan.', 'Olá, o meu nome é Dan.', ['Olá, eu me chamo Dan.', 'Olá, chamo-me Dan.'], ['שלום, שמי דן.', 'שלום, אני דן.']],
        ['gr', 'נעים מאוד להכיר.', 'Muito prazer.', '', ['Prazer em conhecer você.', 'Prazer em conhecê-lo.', 'Prazer em conhecê-la.'], ['נעים להכיר.', 'נעים מאוד.']],
        ['gr', 'אני מישראל.', 'Eu sou de Israel.', '', ['Sou de Israel.'], ['אני מגיע מישראל.', 'אני מגיעה מישראל.']],
        ['gr', 'אני לא מדבר פורטוגזית טוב.', 'Eu não falo português bem.', '', ['Não falo bem português.', 'Eu não falo bem português.', 'Não falo português bem.'], ['אני לא מדברת פורטוגזית טוב.', 'אני לא מדבר טוב פורטוגזית.']],
        ['gr', 'אתה מדבר אנגלית?', 'Você fala inglês?', 'Fala inglês?', ['Tu falas inglês?', 'O senhor fala inglês?', 'A senhora fala inglês?'], ['את מדברת אנגלית?', 'אתם מדברים אנגלית?', 'האם אתה מדבר אנגלית?']],
        ['gr', 'אני לא מבין.', 'Eu não entendo.', '', ['Não entendo.', 'Não percebo.'], ['אני לא מבינה.', 'אני לא מבין אותך.']],
        ['gr', 'אפשר לדבר לאט יותר, בבקשה?', 'Pode falar mais devagar, por favor?', '', ['Você pode falar mais devagar, por favor?', 'Fale mais devagar, por favor.', 'Pode falar mais devagar?'], ['תוכל לדבר לאט יותר, בבקשה?', 'אפשר לדבר יותר לאט, בבקשה?']],
        ['gr', 'אפשר לחזור על זה, בבקשה?', 'Pode repetir, por favor?', '', ['Você pode repetir, por favor?', 'Pode repetir?', 'Pode dizer outra vez, por favor?', 'Pode dizer de novo, por favor?'], ['תוכל לחזור על זה, בבקשה?', 'אפשר שוב, בבקשה?']],
        ['gr', 'מה שלומך?', 'Tudo bem?', '', ['Como vai você?', 'Como você está?', 'Como estás?', 'Como vai?', 'Tudo bem com você?'], ['מה נשמע?']],
        ['gr', 'אני בסדר, תודה. ואתה?', 'Estou bem, obrigado. E você?', 'Estou bem, obrigado. E tu?', ['Estou bem, obrigada. E você?', 'Estou bem, obrigada. E tu?', 'Tudo bem, obrigado. E você?', 'Tudo bem, obrigada. E você?'], ['אני בסדר, תודה. ומה איתך?', 'אני בסדר, תודה. ואת?']],
        ['gr', 'תודה רבה על העזרה.', 'Muito obrigado pela ajuda.', '', ['Muito obrigada pela ajuda.', 'Obrigado pela ajuda.', 'Obrigada pela ajuda.'], ['תודה רבה על העזרה שלך.', 'תודה על העזרה.']],
        ['gr', 'סליחה, אפשר לעבור?', 'Com licença, posso passar?', '', ['Com licença, dá para passar?', 'Desculpe, posso passar?'], ['סלח לי, אפשר לעבור?']],
        ['gr', 'נתראה מחר.', 'Até amanhã.', '', ['A gente se vê amanhã.', 'Vejo você amanhã.', 'Vemo-nos amanhã.'], ['להתראות מחר.', 'ניפגש מחר.']],
        ['gr', 'שיהיה לך יום נפלא.', 'Tenha um ótimo dia.', '', ['Tenha um dia maravilhoso.', 'Tenha um excelente dia.', 'Tenha um bom dia.'], ['שיהיה לך יום מצוין.', 'שיהיה לך יום טוב.']],
        ['gr', 'מה זה?', 'O que é isso?', '', ['O que é isto?', 'Que é isso?'], []],
        ['ai', 'אני צריך ללכת לשדה התעופה.', 'Eu preciso ir ao aeroporto.', '', ['Preciso ir ao aeroporto.', 'Eu tenho que ir ao aeroporto.', 'Tenho de ir ao aeroporto.'], ['אני צריכה ללכת לשדה התעופה.', 'אני חייב ללכת לשדה התעופה.']],
        ['ai', 'באיזו שעה הטיסה?', 'Que horas é o voo?', 'A que horas é o voo?', ['A que horas é o voo?', 'Qual é o horário do voo?', 'Quando é o voo?', 'Que horas sai o voo?'], ['מתי הטיסה?', 'מה שעת הטיסה?']],
        ['ai', 'הטיסה שלי התעכבה.', 'Meu voo atrasou.', 'O meu voo atrasou.', ['O meu voo atrasou.', 'Meu voo está atrasado.', 'O meu voo está atrasado.'], ['הטיסה שלי מאחרת.', 'הטיסה שלי בעיכוב.']],
        ['ai', 'איפה שער העלייה למטוס?', 'Onde fica o portão de embarque?', 'Onde fica a porta de embarque?', ['Onde é o portão de embarque?', 'Onde está o portão de embarque?'], ['איפה השער?', 'איפה שער העלייה?']],
        ['ai', 'איבדתי את המזוודה שלי.', 'Perdi minha mala.', 'Perdi a minha mala.', ['Perdi a minha mala.', 'Eu perdi minha mala.', 'Eu perdi a minha mala.', 'Perdi a minha bagagem.', 'Perdi minha bagagem.'], ['איבדתי את המטען שלי.', 'המזוודה שלי אבדה.']],
        ['ai', 'הדרכון שלי כאן.', 'Meu passaporte está aqui.', 'O meu passaporte está aqui.', ['O meu passaporte está aqui.', 'Aqui está meu passaporte.', 'Aqui está o meu passaporte.'], ['הנה הדרכון שלי.', 'הדרכון שלי פה.']],
        ['ai', 'אני כאן לחופשה.', 'Estou aqui de férias.', '', ['Eu estou aqui de férias.', 'Estou aqui para as férias.', 'Estou aqui em férias.'], ['אני כאן בחופשה.', 'אני כאן בשביל חופשה.']],
        ['ai', 'אני נשאר חמישה ימים.', 'Vou ficar cinco dias.', '', ['Eu vou ficar cinco dias.', 'Fico cinco dias.', 'Vou ficar por cinco dias.', 'Vou passar cinco dias.'], ['אני אשאר חמישה ימים.', 'אני אהיה כאן חמישה ימים.']],
        ['tr', 'איפה תחנת האוטובוס?', 'Onde fica o ponto de ônibus?', 'Onde fica a paragem de autocarro?', ['Onde é o ponto de ônibus?', 'Onde está o ponto de ônibus?', 'Onde está a paragem de autocarro?', 'Onde é a paragem de autocarro?'], ['היכן תחנת האוטובוס?']],
        ['tr', 'איזה אוטובוס נוסע למוזיאון?', 'Qual ônibus vai para o museu?', 'Qual autocarro vai para o museu?', ['Que ônibus vai ao museu?', 'Qual ônibus vai ao museu?', 'Qual autocarro vai ao museu?', 'Que autocarro vai para o museu?'], ['איזה אוטובוס הולך למוזיאון?', 'איזה אוטובוס מגיע למוזיאון?']],
        ['tr', 'אפשר להזמין מונית?', 'Posso pedir um táxi?', 'Posso chamar um táxi?', ['Pode chamar um táxi?', 'Você pode chamar um táxi?', 'Pode pedir um táxi?', 'Posso chamar um táxi?'], ['אפשר לקרוא למונית?', 'תוכל להזמין מונית?']],
        ['tr', 'אני רוצה לקנות כרטיס.', 'Eu quero comprar uma passagem.', 'Quero comprar um bilhete.', ['Quero comprar uma passagem.', 'Eu quero comprar um bilhete.', 'Quero comprar um bilhete.', 'Gostaria de comprar uma passagem.', 'Gostaria de comprar um bilhete.'], ['אני רוצה לקנות כרטיס נסיעה.', 'אני מעוניין לקנות כרטיס.']],
        ['tr', 'כמה זה עולה לנסוע למרכז?', 'Quanto custa ir ao centro?', '', ['Quanto custa para ir ao centro?', 'Quanto é para ir ao centro?', 'Quanto custa até o centro?', 'Quanto custa a viagem até o centro?', 'Quanto custa a viagem para o centro?'], ['כמה עולה הנסיעה למרכז?', 'כמה עולה להגיע למרכז?']],
        ['tr', 'מתי הרכבת הבאה?', 'Quando sai o próximo trem?', 'Quando parte o próximo comboio?', ['A que horas sai o próximo trem?', 'Que horas sai o próximo trem?', 'A que horas sai o próximo comboio?', 'Quando é o próximo trem?', 'Quando é o próximo comboio?'], ['באיזו שעה יוצאת הרכבת הבאה?', 'מתי יוצאת הרכבת הבאה?']],
        ['tr', 'איפה תחנת הרכבת?', 'Onde fica a estação de trem?', 'Onde fica a estação de comboios?', ['Onde é a estação de trem?', 'Onde está a estação de trem?', 'Onde fica a estação de comboio?', 'Onde está a estação de comboio?', 'Onde é a estação de comboio?'], ['איפה נמצאת תחנת הרכבת?', 'היכן תחנת הרכבת?']],
        ['tr', 'אני רוצה לשכור רכב.', 'Eu quero alugar um carro.', '', ['Quero alugar um carro.', 'Gostaria de alugar um carro.', 'Eu gostaria de alugar um carro.'], ['אני מעוניין לשכור רכב.']],
        ['tr', 'איפה אפשר לחנות?', 'Onde posso estacionar?', '', ['Onde dá para estacionar?', 'Onde é possível estacionar?', 'Onde se pode estacionar?'], ['איפה יש חניה?', 'איפה אני יכול לחנות?']],
        ['ho', 'יש לי הזמנה על שם כהן.', 'Tenho uma reserva em nome de Cohen.', '', ['Eu tenho uma reserva em nome de Cohen.', 'Tenho uma reserva no nome de Cohen.', 'Fiz uma reserva em nome de Cohen.', 'Tenho reserva em nome de Cohen.'], ['הזמנתי על שם כהן.', 'יש לי הזמנה בשם כהן.']],
        ['ho', 'אני רוצה חדר זוגי ללילה אחד.', 'Quero um quarto de casal para uma noite.', '', ['Eu quero um quarto de casal para uma noite.', 'Gostaria de um quarto de casal para uma noite.', 'Queria um quarto de casal para uma noite.'], ['אני צריך חדר זוגי ללילה אחד.', 'אני מעוניין בחדר זוגי ללילה אחד.']],
        ['ho', 'באיזו שעה ארוחת הבוקר?', 'A que horas é o café da manhã?', 'A que horas é o pequeno-almoço?', ['Que horas é o café da manhã?', 'A que horas é o pequeno almoço?', 'Que horas é o pequeno-almoço?', 'Quando é o café da manhã?'], ['מתי ארוחת הבוקר?', 'מה שעת ארוחת הבוקר?']],
        ['ho', 'יש ווי-פיי בחדר?', 'Tem wi-fi no quarto?', 'Há wi-fi no quarto?', ['Tem Wi-Fi no quarto?', 'Tem wifi no quarto?', 'Há wifi no quarto?', 'Existe wi-fi no quarto?'], ['האם יש ווי-פיי בחדר?']],
        ['ho', 'מה הסיסמה של הווי-פיי?', 'Qual é a senha do wi-fi?', 'Qual é a palavra-passe do wi-fi?', ['Qual a senha do wi-fi?', 'Qual é a senha do wifi?', 'Qual a palavra-passe do wi-fi?', 'Qual é a palavra-passe do wifi?'], ['מהי הסיסמה לווי-פיי?', 'מה הקוד של הווי-פיי?']],
        ['ho', 'המזגן לא עובד.', 'O ar-condicionado não funciona.', '', ['O ar condicionado não funciona.', 'O ar-condicionado não está funcionando.', 'O ar condicionado não está funcionando.', 'O ar-condicionado não está a funcionar.'], ['המזגן מקולקל.', 'המזגן לא פועל.']],
        ['ho', 'אפשר עוד מגבת, בבקשה?', 'Posso ter mais uma toalha, por favor?', '', ['Pode me dar mais uma toalha, por favor?', 'Pode dar-me mais uma toalha, por favor?', 'Tem mais uma toalha, por favor?', 'Mais uma toalha, por favor.'], ['אפשר מגבת נוספת, בבקשה?', 'אפשר להביא עוד מגבת?']],
        ['ho', 'אפשר להשאיר את המזוודות כאן?', 'Posso deixar as malas aqui?', '', ['Posso deixar a bagagem aqui?', 'Posso deixar as minhas malas aqui?', 'Posso deixar minhas malas aqui?'], ['אפשר להפקיד את המזוודות כאן?', 'אפשר להשאיר כאן את המזוודות?']],
        ['ho', 'באיזו שעה עושים צ׳ק-אאוט?', 'A que horas é o check-out?', '', ['Que horas é o check-out?', 'A que horas se faz o check-out?', 'Até que horas é o check-out?', 'A que horas é o checkout?'], ['מתי צ׳ק-אאוט?', 'מה שעת הצ׳ק-אאוט?']],
        ['fo', 'שולחן לשניים, בבקשה.', 'Uma mesa para dois, por favor.', '', ['Mesa para dois, por favor.', 'Uma mesa para duas pessoas, por favor.', 'Queria uma mesa para dois, por favor.'], ['שולחן לשני אנשים, בבקשה.', 'בבקשה, שולחן לשניים.']],
        ['fo', 'אפשר לראות את התפריט?', 'Posso ver o cardápio?', 'Posso ver a ementa?', ['Pode trazer o cardápio?', 'Pode me trazer o cardápio?', 'Pode trazer a ementa?', 'Posso ver o menu?', 'Pode trazer o menu, por favor?'], ['אפשר לקבל את התפריט?', 'תוכל להביא את התפריט?']],
        ['fo', 'אני רוצה מים, בבקשה.', 'Quero água, por favor.', '', ['Eu quero água, por favor.', 'Gostaria de água, por favor.', 'Eu gostaria de água, por favor.', 'Queria água, por favor.', 'Água, por favor.'], ['אני מבקש מים, בבקשה.', 'אני רוצה מים.']],
        ['fo', 'מה אתה ממליץ?', 'O que você recomenda?', 'O que recomenda?', ['O que o senhor recomenda?', 'O que tu recomendas?', 'O que a senhora recomenda?', 'Qual você recomenda?'], ['מה את ממליצה?', 'מה המלצתך?']],
        ['fo', 'אני צמחוני.', 'Eu sou vegetariano.', '', ['Sou vegetariano.', 'Sou vegetariana.', 'Eu sou vegetariana.'], ['אני צמחונית.']],
        ['fo', 'יש לי אלרגיה לבוטנים.', 'Tenho alergia a amendoim.', '', ['Eu tenho alergia a amendoim.', 'Sou alérgico a amendoim.', 'Sou alérgica a amendoim.', 'Tenho alergia a amendoins.', 'Sou alérgico a amendoins.'], ['אני אלרגי לבוטנים.', 'אני אלרגית לבוטנים.']],
        ['fo', 'האוכל היה טעים מאוד.', 'A comida estava muito boa.', '', ['A comida estava muito gostosa.', 'A comida estava muito saborosa.', 'A comida estava deliciosa.', 'A comida estava ótima.'], ['האוכל היה מצוין.', 'האוכל היה מעולה.']],
        ['fo', 'החשבון, בבקשה.', 'A conta, por favor.', '', ['Pode trazer a conta, por favor?', 'A conta, por favor?', 'Pode me trazer a conta?', 'Pode trazer a conta?', 'Queria a conta, por favor.'], ['אפשר חשבון, בבקשה?', 'תביא את החשבון, בבקשה.']],
        ['fo', 'אפשר לשלם בכרטיס אשראי?', 'Posso pagar com cartão de crédito?', '', ['Aceita cartão de crédito?', 'Vocês aceitam cartão de crédito?', 'Posso pagar com cartão?', 'Aceitam cartão de crédito?'], ['מקבלים כרטיס אשראי?', 'האם אפשר לשלם באשראי?']],
        ['fo', 'בלי חריף, בבקשה.', 'Sem pimenta, por favor.', '', ['Sem picante, por favor.', 'Não picante, por favor.'], ['לא חריף, בבקשה.', 'בלי פלפל חריף, בבקשה.']],
        ['fo', 'אני רוצה קפה עם חלב.', 'Quero um café com leite.', '', ['Eu quero um café com leite.', 'Gostaria de um café com leite.', 'Queria um café com leite.'], ['אני מבקש קפה עם חלב.']],
        ['fo', 'עוד בירה, בבקשה.', 'Mais uma cerveja, por favor.', '', ['Outra cerveja, por favor.', 'Queria mais uma cerveja, por favor.'], ['בירה נוספת, בבקשה.', 'עוד בירה אחת, בבקשה.']],
        ['fo', 'מה יש לקינוח?', 'O que tem de sobremesa?', 'O que há de sobremesa?', ['Quais são as sobremesas?', 'O que vocês têm de sobremesa?', 'Que sobremesas tem?', 'Que sobremesas há?'], ['איזה קינוחים יש?', 'מה אפשר לקבל לקינוח?']],
        ['fo', 'אני רעב.', 'Estou com fome.', '', ['Eu estou com fome.', 'Tenho fome.', 'Eu tenho fome.'], ['אני רעבה.', 'אני מרגיש רעב.']],
        ['fo', 'אני צמא.', 'Estou com sede.', '', ['Eu estou com sede.', 'Tenho sede.', 'Eu tenho sede.'], ['אני צמאה.']],
        ['fo', 'אנחנו שלושה.', 'Somos três.', '', ['Nós somos três.', 'Somos em três.', 'Somos três pessoas.'], ['אנחנו שלושה אנשים.']],
        ['di', 'איפה השירותים?', 'Onde fica o banheiro?', 'Onde fica a casa de banho?', ['Onde é o banheiro?', 'Onde está o banheiro?', 'Onde é a casa de banho?', 'Onde está a casa de banho?', 'Onde tem um banheiro?', 'Onde há uma casa de banho?'], ['היכן השירותים?']],
        ['di', 'איך מגיעים לחוף?', 'Como chego à praia?', '', ['Como eu chego à praia?', 'Como se chega à praia?', 'Como faço para chegar à praia?', 'Como chegar à praia?'], ['איך אני מגיע לחוף?']],
        ['di', 'זה רחוק מכאן?', 'Fica longe daqui?', '', ['É longe daqui?', 'Isso fica longe daqui?', 'Isto fica longe daqui?', 'É muito longe daqui?'], ['האם זה רחוק מפה?', 'זה רחוק מפה?']],
        ['di', 'פנה ימינה ואז ישר.', 'Vire à direita e depois siga em frente.', '', ['Vire à direita e depois vá em frente.', 'Vire à direita e siga em frente.', 'Vire à direita e depois vá reto.', 'Vire à direita e depois siga reto.', 'Vira à direita e depois segue em frente.'], ['פנו ימינה ואז תמשיכו ישר.', 'פנה ימינה ואז המשך ישר.']],
        ['di', 'אני אבוד. אפשר לעזור לי?', 'Estou perdido. Pode me ajudar?', 'Estou perdido. Pode ajudar-me?', ['Estou perdida. Pode me ajudar?', 'Estou perdida. Pode ajudar-me?', 'Eu estou perdido. Pode me ajudar?', 'Estou perdido. Você pode me ajudar?'], ['אני הלכתי לאיבוד. תוכל לעזור לי?', 'אני אבודה. אפשר לעזור לי?']],
        ['di', 'איפה המוזיאון?', 'Onde fica o museu?', '', ['Onde é o museu?', 'Onde está o museu?'], ['היכן המוזיאון?', 'איפה נמצא המוזיאון?']],
        ['di', 'מה שעות הפתיחה?', 'Qual é o horário de funcionamento?', 'Qual é o horário de abertura?', ['Qual o horário de funcionamento?', 'Qual é o horário de abertura?', 'A que horas abre?', 'A que horas vocês abrem?', 'Qual o horário de atendimento?'], ['באילו שעות פתוח?', 'מתי פותחים?']],
        ['di', 'כמה עולה כרטיס כניסה?', 'Quanto custa o ingresso?', 'Quanto custa o bilhete de entrada?', ['Quanto é o ingresso?', 'Quanto custa a entrada?', 'Quanto é a entrada?', 'Quanto custa o bilhete?', 'Quanto é o bilhete?'], ['כמה עולה הכניסה?', 'מה מחיר הכרטיס?']],
        ['di', 'אפשר לצלם כאן?', 'Posso tirar fotos aqui?', 'Posso tirar fotografias aqui?', ['É permitido tirar fotos aqui?', 'Posso fotografar aqui?', 'Posso tirar foto aqui?', 'É permitido fotografar aqui?'], ['מותר לצלם כאן?', 'אפשר לצלם פה?']],
        ['di', 'אתה יכול להראות לי במפה?', 'Você pode me mostrar no mapa?', 'Pode mostrar-me no mapa?', ['Pode me mostrar no mapa?', 'Pode mostrar no mapa?', 'Você pode mostrar no mapa?', 'Pode me mostrar no mapa, por favor?'], ['תוכל להראות לי על המפה?', 'אפשר להראות לי במפה?']],
        ['di', 'אתה יכול לצלם אותנו?', 'Você pode tirar uma foto nossa?', 'Pode tirar-nos uma fotografia?', ['Pode tirar uma foto nossa?', 'Você pode tirar uma foto de nós?', 'Pode tirar uma foto de nós?', 'Pode nos fotografar?', 'Pode tirar-nos uma foto?'], ['תוכל לצלם אותנו?', 'אפשר שתצלם אותנו?']],
        ['di', 'אפשר לשבת כאן?', 'Posso sentar aqui?', 'Posso sentar-me aqui?', ['Posso me sentar aqui?'], ['מותר לשבת פה?']],
        ['sh', 'כמה זה עולה?', 'Quanto custa?', '', ['Quanto é?', 'Quanto custa isso?', 'Quanto custa isto?', 'Quanto é isso?', 'Quanto é isto?'], ['מה המחיר?', 'כמה זה?']],
        ['sh', 'זה יקר מדי.', 'Isso é muito caro.', '', ['É muito caro.', 'Isto é muito caro.', 'É caro demais.', 'Isso é caro demais.', 'É demasiado caro.', 'Isto é demasiado caro.'], ['זה מאוד יקר.', 'זה יקר מידי.']],
        ['sh', 'יש לך מידה גדולה יותר?', 'Você tem um tamanho maior?', 'Tem um tamanho maior?', ['Tem um tamanho maior?', 'Você tem um número maior?', 'Tem tamanho maior?', 'Tens um tamanho maior?'], ['יש לכם מידה גדולה יותר?', 'אפשר מידה גדולה יותר?']],
        ['sh', 'אני רק מסתכל, תודה.', 'Estou só olhando, obrigado.', 'Estou só a ver, obrigado.', ['Só estou olhando, obrigado.', 'Estou apenas olhando, obrigado.', 'Só estou a ver, obrigado.', 'Estou só olhando, obrigada.', 'Só estou olhando, obrigada.'], ['אני רק מציץ, תודה.', 'אני רק מסתכלת, תודה.']],
        ['sh', 'אני אקנה את זה.', 'Vou levar isto.', '', ['Eu vou levar isto.', 'Vou levar isso.', 'Eu vou levar isso.', 'Vou comprar isto.', 'Vou comprar isso.', 'Quero comprar isto.', 'Quero comprar isso.'], ['אני רוצה לקנות את זה.', 'אני לוקח את זה.']],
        ['sh', 'אפשר קבלה, בבקשה?', 'Posso ter o recibo, por favor?', '', ['Pode me dar o recibo, por favor?', 'Pode dar-me o recibo, por favor?', 'Pode me dar a nota fiscal, por favor?', 'O recibo, por favor.', 'Posso receber o recibo?'], ['אפשר לקבל קבלה, בבקשה?', 'תוכל לתת לי קבלה?']],
        ['sh', 'איפה אפשר להחליף כסף?', 'Onde posso trocar dinheiro?', '', ['Onde dá para trocar dinheiro?', 'Onde se pode trocar dinheiro?'], ['איפה אני יכול להחליף כסף?', 'איפה אפשר להמיר כסף?']],
        ['sh', 'איפה יש כספומט?', 'Onde tem um caixa eletrônico?', 'Onde há um multibanco?', ['Onde fica o caixa eletrônico?', 'Onde há um caixa eletrônico?', 'Onde fica um caixa eletrônico?', 'Onde tem um caixa?', 'Onde fica o multibanco?', 'Onde tem um multibanco?'], ['איפה הכספומט?']],
        ['he', 'אני צריך רופא.', 'Preciso de um médico.', '', ['Eu preciso de um médico.', 'Preciso de médico.', 'Preciso de uma médica.', 'Preciso de atendimento médico.'], ['אני זקוק לרופא.', 'אני צריכה רופא.']],
        ['he', 'תתקשרו לאמבולנס!', 'Chamem uma ambulância!', '', ['Chame uma ambulância!', 'Liguem para uma ambulância!', 'Chamem a ambulância!', 'Chame a ambulância!', 'Liguem para a ambulância!'], ['תזמינו אמבולנס!', 'תקראו לאמבולנס!']],
        ['he', 'כואב לי הראש.', 'Estou com dor de cabeça.', 'Tenho dor de cabeça.', ['Tenho dor de cabeça.', 'Minha cabeça dói.', 'Eu estou com dor de cabeça.', 'Me dói a cabeça.', 'Dói-me a cabeça.', 'A minha cabeça dói.'], ['יש לי כאב ראש.', 'הראש שלי כואב.']],
        ['he', 'אני לא מרגיש טוב.', 'Não estou me sentindo bem.', 'Não me sinto bem.', ['Eu não estou me sentindo bem.', 'Não me sinto bem.', 'Eu não me sinto bem.', 'Não estou bem.', 'Estou me sentindo mal.', 'Estou a sentir-me mal.', 'Sinto-me mal.'], ['אני מרגיש לא טוב.', 'אני מרגיש רע.']],
        ['he', 'איפה בית המרקחת הקרוב?', 'Onde fica a farmácia mais próxima?', '', ['Onde tem uma farmácia por perto?', 'Onde é a farmácia mais próxima?', 'Onde há uma farmácia por perto?', 'Onde está a farmácia mais próxima?', 'Onde fica a farmácia mais perto?'], ['איפה בית המרקחת הכי קרוב?', 'היכן בית המרקחת הקרוב ביותר?']],
        ['he', 'גנבו לי את הארנק.', 'Roubaram minha carteira.', 'Roubaram-me a carteira.', ['Roubaram a minha carteira.', 'Minha carteira foi roubada.', 'A minha carteira foi roubada.', 'Me roubaram a carteira.', 'Furtaram minha carteira.', 'Furtaram a minha carteira.'], ['הארנק שלי נגנב.', 'ארנקי נגנב.']],
        ['he', 'אני צריך את המשטרה.', 'Preciso da polícia.', '', ['Eu preciso da polícia.', 'Preciso chamar a polícia.', 'Preciso de ajuda da polícia.'], ['אני צריך להתקשר למשטרה.']],
        ['he', 'זה חירום!', 'É uma emergência!', '', ['Isto é uma emergência!', 'Isso é uma emergência!', 'É emergência!', 'É uma urgência!'], ['זה מקרה חירום!', 'זו חירום!']],
        ['ti', 'מה השעה?', 'Que horas são?', '', ['Que horas são agora?', 'Qual é a hora?', 'Que hora é?'], ['כמה השעה?', 'מהי השעה?']],
        ['ti', 'מחר בבוקר.', 'Amanhã de manhã.', '', ['Amanhã pela manhã.', 'Amanhã cedo.'], ['בבוקר של מחר.']],
        ['ap', 'אני אוהב את המקום הזה.', 'Eu gosto deste lugar.', '', ['Gosto deste lugar.', 'Eu gosto desse lugar.', 'Gosto desse lugar.', 'Eu adoro este lugar.', 'Adoro este lugar.', 'Eu amo este lugar.', 'Amo este lugar.', 'Gosto muito deste lugar.'], ['אני אוהבת את המקום הזה.', 'המקום הזה מוצא חן בעיניי.']],
        ['ap', 'מזג האוויר יפה היום.', 'O tempo está bonito hoje.', '', ['Hoje o tempo está bom.', 'O tempo está bom hoje.', 'Hoje está um dia lindo.', 'Está um dia bonito hoje.', 'Hoje o tempo está bonito.', 'Hoje está bom tempo.', 'Está bom tempo hoje.', 'Hoje está um dia bonito.'], ['מזג האוויר נעים היום.', 'היום יום יפה.']],
        ['ap', 'אני רוצה לראות את העיר.', 'Quero conhecer a cidade.', '', ['Eu quero conhecer a cidade.', 'Quero ver a cidade.', 'Eu quero ver a cidade.', 'Gostaria de conhecer a cidade.', 'Quero visitar a cidade.'], ['אני רוצה להכיר את העיר.', 'אני רוצה לסייר בעיר.']],
        ['ap', 'הכול בסדר.', 'Está tudo bem.', '', ['Está tudo certo.', 'Tudo bem.', 'Está tudo ótimo.', 'Está tudo perfeito.'], ['זה בסדר גמור.', 'זה בסדר.']]
    ];
    const SENTS = S.map((r, i) => ({ id: 's' + String(i + 1).padStart(2, '0'), cat: r[0], he: r[1], pt: r[2], pp: r[3] || '', alts: r[4] || [], heAlts: r[5] || [] }));
    window.GOV_PT = { CATS, ORDER, WORDS, SENTS };
})();
