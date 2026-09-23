const { PrismaClient } = require("/mnt/vscode/hefengqi/node_modules/@prisma/client");
const prisma = new PrismaClient();

const SLUG = "telecom-rectifier-gold-finger-pinout-can-bus-tuning-guide-2026";

function parseInlineMarks(text) {
  const tokens = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        text: text.substring(lastIndex, match.index)
      });
    }

    if (match[2] !== undefined) {
      tokens.push({
        type: "text",
        marks: [{ type: "bold" }],
        text: match[2]
      });
    } else if (match[3] !== undefined) {
      tokens.push({
        type: "text",
        marks: [{ type: "code" }],
        text: match[3]
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      text: text.substring(lastIndex)
    });
  }

  return tokens.length ? tokens : [{ type: "text", text: "" }];
}

function convertMarkdownToAST(md) {
  const lines = md.split("\n");
  const nodes = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const hashHeading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (hashHeading) {
      const level = Math.min(Math.max(hashHeading[1].length, 2), 3);
      nodes.push({
        type: "heading",
        attrs: { level },
        content: parseInlineMarks(hashHeading[2].replace(/\*\*/g, ""))
      });
      i++;
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      const listItems = [];
      while (i < lines.length) {
        const itemLine = lines[i].trim();
        const m = itemLine.match(/^(\d+)\.\s+(.*)$/);
        if (!m) break;
        listItems.push({
          type: "listItem",
          content: [{
            type: "paragraph",
            content: parseInlineMarks(m[2])
          }]
        });
        i++;
      }
      nodes.push({
        type: "orderedList",
        content: listItems
      });
      continue;
    }

    const bulletMatch = trimmed.match(/^[-•*]\s+(.*)$/);
    if (bulletMatch) {
      const listItems = [];
      while (i < lines.length) {
        const itemLine = lines[i].trim();
        const m = itemLine.match(/^[-•*]\s+(.*)$/);
        if (!m) break;
        listItems.push({
          type: "listItem",
          content: [{
            type: "paragraph",
            content: parseInlineMarks(m[1])
          }]
        });
        i++;
      }
      nodes.push({
        type: "bulletList",
        content: listItems
      });
      continue;
    }

    nodes.push({
      type: "paragraph",
      content: parseInlineMarks(trimmed)
    });
    i++;
  }

  return {
    type: "doc",
    content: nodes
  };
}

const TRANSLATIONS = {
  en: `
## 1. Gold Finger Edge Connector Physical Layout and Electrical Definition
High-frequency telecom rectifier modules utilize heavy-duty blind-mate edge connectors combining AC mains input, -48V high-current DC output, and low-voltage signal circuits. The standard 1U blade interface is physically partitioned into three distinct operational functional zones:
- **AC High Voltage Input Area**: Live (L) and Neutral (N) power pins rated for 300V AC with internal fast-blow protection. PE safety ground connects to structural chassis pins.
- **High-Current DC Output Area**: OUT+ (-48V RTN) acts as common positive ground reference plane, while OUT- (-48V NEG) delivers up to 50A/75A continuous current via parallel contact blades.
- **Low-Voltage Signal & Bus Area**: Critical logic pins include CAN_H (Pin 1) and CAN_L (Pin 2) differential communication bus lines (125 kbps), Address pins (Addr0~Addr2), and hardware Enable (ON_OFF) control lines.

## 2. Standalone Startup Jumpers and Bench Testing Procedures
When powering a rectifier outside a subrack chassis (such as ETP48400 frames), the module defaults to unmanaged standby lock. Bench test procedures require exact jumper configuration:
1. **Insulation Resistance Pre-Check**: Verify insulation resistance R_iso ≥ 20MΩ between AC input (L/N) and DC terminals (OUT+/OUT-) using a 500V digital megohmmeter.
2. **Hardware Enable Jumper**: Bridge the Enable (ON_OFF) pin to signal ground GND with a 1kΩ resistor or direct short, pulling internal optocoupler cathode low.
3. **Power-On Self-Test (POST)**: Connect AC supply through an isolation transformer. Observe internal fan spinning up at maximum speed for 3 seconds before stabilizing at low-noise idle, with green power LED turning solid ON.

## 3. CAN 2.0B Protocol Commands and Precision Voltage Tuning
In customized applications such as LiFePO4 battery charging curves or variable bench power supplies, digital CAN 2.0B commands provide millivolt-level precision without analog potentiometer drift:
- **Bus Physical Termination**: Terminate CAN differential lines with 120Ω resistors at each end to prevent high-frequency signal reflections. Set industrial USB-to-CAN transceiver to 125 kbps baud rate.
- **Heartbeat & Keep-Alive Frames**: Broadcast cyclic keep-alive packets every 1000ms. If communication drops for over 30 seconds, modules automatically revert to default safe float voltage (53.5V).
- **Voltage Command Syntax (Extended 29-bit CAN ID)**: Send frame ID \`0x1081407F\` with command payload: \`[Byte 0: 0x01] [Byte 1: 0x00] [Byte 2-3: Target mV in Hex] [Byte 4-7: Reserved]\`. Setting output to 48.00V corresponds to 48000 mV (\`0xBB80\`).
- **Dynamic Current Limiting**: Transmit parameter code \`0x01\` to set maximum output current limit continuously between 5A and 50A for battery protection.

## 4. Multi-Module Parallel Current Sharing Troubleshooting Criteria
When multiple rectifiers are installed in parallel along a common DC copper busbar, load current imbalance must not exceed standardized tolerances:
- **Current Sharing Imbalance Formula**: Current Imbalance % = |Individual Module Current - Average Module Current| / Rated Module Current * 100%. Under 50% to 100% nominal load, imbalance must stay **≤ 5%**.
- **Contact Resistance and Drop Check**: Inspect gold finger connector blades for oxidation or fretting wear. A micro-ohm difference of just 5mΩ across contacts creates several amperes of current asymmetry under heavy load.
- **CAN Address Conflict Resolution**: Ensure hardware address jumpers or slot ID positions do not collide on the multidrop communication bus.

## 5. HEFENGQI Industrial Engineering Support and Global Supply
HEFENGQI (RICEWIND) delivers carrier-grade telecom rectifiers, embedded power subracks, and outdoor IP55/IP65 micro-enclosures worldwide:
- **Comprehensive Bench Pre-Testing**: Every refurbished and new-surplus module undergoes 100% full-load burn-in at 50 degrees Celsius before dispatch.
- **Custom Firmware Flashing**: Pre-configured CAN parameters and custom float voltage baselines tailored to specific battery chemistries.
- **Global Contact Desk**: Sales Email: lee@ricewind.com | WhatsApp Technical Support: +86 17621197907.
`,
  ru: `
## 1. Конструкция ножевого разъема выпрямителя и назначение контактов
Высокочастотные телекоммуникационные выпрямительные модули используют комбинированные разъемы горячего подключения, объединяющие цепи переменного тока, постоянного тока -48В и сигнальные интерфейсы:
- **Секция переменного тока (AC)**: Контакты фазы (L) и нейтрали (N) с рабочим напряжением до 300В AC и встроенными быстродействующими предохранителями. Защитное заземление PE соединено с металлическим шасси.
- **Силовая секция постоянного тока (DC)**: Вывод OUT+ (-48V RTN) служит общей положительной шиной заземления, а вывод OUT- (-48V NEG) обеспечивает рабочий ток 50А/75А через параллельные контакты.
- **Секция сигналов и управления**: Дифференциальная шина CAN_H (контакт 1) и CAN_L (контакт 2) со скоростью 125 кбит/с, адресные контакты (Addr0~Addr2) и аппаратный вывод включения (ON_OFF).

## 2. Перемычки автономного пуска и пошаговые испытания
При отдельном включении модуля без управляющей корзины он переходит в заблокированный режим ожидания. Процедура стендового пуска:
1. **Контроль сопротивления изоляции**: Измерение сопротивления между входом AC и выходами DC мегаомметром 500В (норма R_iso ≥ 20 МОм).
2. **Установка перемычки запуска**: Соединение контакта Enable (ON_OFF) с сигнальной землей GND через резистор 1 кОм для открытия внутреннего оптрона.
3. **Подача сетевого питания**: Включение через разделительный трансформатор. Вентилятор отрабатывает продув на максимальных оборотах и переходит в тихий режим, зеленый индикатор горит непрерывно.

## 3. Команды протокола CAN 2.0B и точная регулировка напряжения
Цифровое управление по шине CAN 2.0B обеспечивает регулировку выходного напряжения с точностью до милливольта без дрейфа параметров:
- **Согласование физической линии**: Установка терминальных резисторов 120 Ом на концах линии для подавления паразитных отражений.
- **Пакеты контроля связи (Heartbeat)**: Периодическая отправка широковещательных пакетов с интервалом 1000 мс. При отсутствии связи модуль возвращается к базовому напряжению 53.5В.
- **Синтаксис команды установки напряжения**: Идентификатор кадра \`0x1081407F\`, байты данных: \`[Байт 0: 0x01] [Байт 1: 0x00] [Байты 2-3: целевое напряжение в мВ Hex] [Байты 4-7: резерв]\`. Напряжение 48.00В задается значением 48000 мВ (\`0xBB80\`).
- **Ограничение выходного тока**: Передача параметра \`0x01\` для плавной регулировки порога от 5А до 50А.

## 4. Диагностика неравномерности распределения нагрузки
При параллельной работе выпрямителей на общую шину постоянного тока отклонение тока между модулями строго регламентировано:
- **Формула коэффициента неравномерности**: Отклонение % = |Ток отдельного модуля - Средний ток| / Номинальный ток * 100%. При нагрузке от 50% до 100% разбаланс не должен превышать **5%**.
- **Проверка переходного сопротивления**: Контроль состояния ножевых контактов на предмет окисления. Разница в 5 мОм приводит к существенному перекосу по току.
- **Устранение конфликтов адресации**: Проверка отсутствия дублирования аппаратных адресов модулей на шине CAN.

## 5. Инженерная поддержка и глобальные поставки HEFENGQI
HEFENGQI (RICEWIND) поставляет телекоммуникационные выпрямители, встраиваемые системы питания и климатические шкафы IP55/IP65:
- **Полное стендовое тестирование**: Прогон всех модулей под 100% нагрузкой при температуре 50 градусов Цельсия.
- **Индивидуальная прошивка**: Предварительная настройка параметров CAN и кастомных профилей заряда аккумуляторов.
- **Контакты для заказа**: Email: lee@ricewind.com | WhatsApp: +86 17621197907.
`,
  fr: `
## 1. Schéma physique du connecteur et affectation des broches
Les modules redresseurs télécoms haute fréquence intègrent des connecteurs arrières combinant l'alimentation secteur 230V, la sortie continue -48V et les bus de contrôle basse tension :
- **Zone d'entrée alternative (AC)** : Broches phase (L) et neutre (N) isolées jusqu'à 300V AC avec fusibles intégrés. La terre de protection PE est reliée au châssis.
- **Zone de sortie continue forte puissance (DC)** : La borne OUT+ (-48V RTN) sert de masse positive de référence, tandis que OUT- (-48V NEG) fournit un courant nominal jusqu'à 50A/75A.
- **Zone de signal et bus de commande** : Lignes différentielles CAN_H (broche 1) et CAN_L (broche 2) à 125 kbps, broches d'adressage matériel et ligne de validation Enable (ON_OFF).

## 2. Cavaliers de démarrage autonome et procédure de test
Hors châssis système, le redresseur reste verrouillé en attente de commande. Procédure d'activation sur banc d'essai :
1. **Mesure d'isolement préalable** : Vérification d'une résistance d'isolement R_iso ≥ 20 MΩ sous 500V continu entre entrée alternative et bornes de sortie.
2. **Cavalier d'autorisation** : Raccordement de la broche Enable (ON_OFF) à la masse signal GND via une résistance de 1 kΩ.
3. **Mise sous tension** : Connexion via un transformateur d'isolement. Le ventilateur accélère à plein régime pendant 3 secondes avant de revenir à basse vitesse, le voyant vert devenant fixe.

## 3. Commandes par bus CAN 2.0B et réglage précis de la tension
Le pilotage numérique par bus CAN évite l'utilisation de potentiomètres sujets aux dérives thermiques :
- **Adaptation d'impédance de ligne** : Résistance de terminaison de 120 Ω à chaque extrémité du bus pour éliminer les réflexions de signaux.
- **Trames cycliques de maintien** : Envoi périodique d'un battement de cœur toutes les 1000 ms pour éviter le repli du module sur 53.5V.
- **Format de trame de consigne** : Identifiant étendu \`0x1081407F\`, données : \`[Octet 0: 0x01] [Octet 1: 0x00] [Octets 2-3: tension en mV Hex] [Octets 4-7: réservé]\`. Une tension de 48.00V correspond à 48000 mV (\`0xBB80\`).
- **Limitation active de courant** : Paramétrage dynamique du courant maximum entre 5A et 50A pour la charge sécurisée des batteries.

## 4. Diagnostic d'équilibrage de charge entre modules en parallèle
Lors du fonctionnement en parallèle sur barre omnibus, la répartition de courant doit respecter les critères suivants :
- **Formule d'écart d'équilibrage** : Écart % = |Courant du module - Courant moyen| / Courant nominal * 100%. Entre 50% et 100% de charge, l'écart doit rester **≤ 5%**.
- **Contrôle des résistances de contact** : Vérification de l'absence d'oxydation sur les broches. Une résistance parasite de 5 mΩ induit un déséquilibre de plusieurs ampères.
- **Conflits d'adresses CAN** : Vérification de l'unicité de l'identifiant matériel de chaque module sur le bus multipoint.

## 5. Support technique industriel et approvisionnement HEFENGQI
HEFENGQI (RICEWIND) fournit des équipements d'énergie télécom, des baies d'énergie intégrées et des armoires extérieures IP55/IP65 :
- **Tests complets en charge** : Essai thermique à 100% de charge sous 50 degrés Celsius pour chaque équipement.
- **Personnalisation d'usine** : Pré-programmation des profils de tension CAN adaptés aux batteries LiFePO4.
- **Contact commercial et technique** : Email : lee@ricewind.com | WhatsApp : +86 17621197907.
`,
  de: `
## 1. Physisches Steckverbinder-Layout und elektrische Belegung
Hochfrequenz-Telekom-Gleichrichtermodule nutzen robuste Blade-Steckverbinder für AC-Netzeingang, -48V-DC-Leistungsausgang und Niederspannungs-Steuersignale:
- **AC-Hochspannungsbereich**: Außenleiter (L) und Neutralleiter (N) bis 300V AC mit integrierten Schmelzsicherungen. Der Schutzleiter PE ist mit dem Gehäuse verbunden.
- **DC-Hochstrombereich**: OUT+ (-48V RTN) dient als gemeinsame positive Masse, OUT- (-48V NEG) liefert Dauerströme von 50A bis 75A über parallele Kontaktzungen.
- **Signal- und Schnittstellenbereich**: CAN_H (Pin 1) und CAN_L (Pin 2) Differenzialbus (125 kbps), Adress-Pins (Addr0~Addr2) und Enable-Steuerleitung (ON_OFF).

## 2. Standalone-Startbrücken und Prüfablauf am Prüfstand
Ohne Einbaurahmen verbleibt das Modul im Standby-Modus. Schrittfolge für den autarken Start:
1. **Isolationsprüfung**: Überprüfung des Isolationswiderstands R_iso ≥ 20 MΩ zwischen Netzeingang und Gleichspannungsausgang mit 500V Prüfspannung.
2. **Hardware-Freigabe**: Verbindung des Pins Enable (ON_OFF) mit Signalmasse GND über einen 1-kΩ-Widerstand.
3. **Einschaltvorgang**: Netzzuschaltung über Trenntransformator. Der Lüfter läuft kurz auf Vollgas an und regelt auf Leerlaufdrehzahl herunter, die grüne Betriebs-LED leuchtet dauerhaft.

## 3. CAN-2.0B-Befehlssätze und präzise Spannungsregelung
Die digitale Steuerung über CAN-Bus 2.0B ermöglicht millivoltgenaue Spannungsführung ohne Bauteildrift:
- **Leitungsabschluss**: 120-Ω-Abschlusswiderstände an beiden Busenden zur Vermeidung von Signalreflexionen.
- **Zyklische Heartbeat-Telegramme**: Senden eines Keep-Alive-Signals alle 1000 ms, um ein Zurückfallen auf die Nennspannung von 53.5V zu verhindern.
- **Befehlssyntax zur Spannungseinstellung**: Frame-ID \`0x1081407F\`, Datenbytes: \`[Byte 0: 0x01] [Byte 1: 0x00] [Bytes 2-3: Zielspannung in mV Hex] [Bytes 4-7: Reserviert]\`. Eine Vorgabe von 48.00V entspricht 48000 mV (\`0xBB80\`).
- **Dynamische Strombegrenzung**: Festlegung des Maximalstroms zwischen 5A und 50A zum Schutz empfindlicher Batteriebänke.

## 4. Kriterien zur Lastverteilung bei Parallelbetrieb
Beim Parallelbetrieb mehrerer Gleichrichter an einer gemeinsamen DC-Sammelschiene gilt:
- **Formel zur Stromasymmetrie**: Abweichung % = |Einzelstrom - Mittelwert| / Nennstrom * 100%. Im Lastbereich von 50% bis 100% muss die Asymmetrie **≤ 5%** betragen.
- **Übergangswiderstände prüfen**: Korrosionsfreie Kontakte sicherstellen. Schon 5 mΩ Übergangswiderstand bewirken spürbare Stromverschiebungen.
- **Adresskollisionen ausschließen**: Eindeutige Moduladressierung auf dem gemeinsamen CAN-Bus gewährleisten.

## 5. HEFENGQI Engineering-Support und weltweite Beschaffung
HEFENGQI (RICEWIND) liefert modulare Gleichrichtersysteme, DC-Stromversorgungen und wetterfeste IP55/IP65-Outdoor-Gehäuse:
- **Vollständige Lastprüfung**: 100% Burn-in-Test aller Module bei 50 Grad Celsius vor Auslieferung.
- **Kundenspezifische Vorabkonfiguration**: Programmierung anwendungsspezifischer Spannungsprofile für LiFePO4-Batterien.
- **Technischer Vertrieb**: E-Mail: lee@ricewind.com | WhatsApp: +86 17621197907.
`,
  es: `
## 1. Disposición física del conector y asignación eléctrica de pines
Los módulos rectificadores de telecomunicaciones de alta frecuencia emplean conectores traseros de inserción ciega que combinan entrada de CA, salida de CC de -48V y señales de control:
- **Zona de entrada de corriente alterna (CA)**: Pines de fase (L) y neutro (N) preparados para 300V CA con fusibles rápidos internos. La toma de tierra de protección PE está enlazada al chasis.
- **Zona de potencia de corriente continua (CC)**: La terminal OUT+ (-48V RTN) actúa como referencia de tierra positiva común, mientras que OUT- (-48V NEG) suministra hasta 50A/75A continuos.
- **Zona de señales y bus de control**: Bus diferencial CAN_H (pin 1) y CAN_L (pin 2) a 125 kbps, pines de direccionamiento y línea de activación por hardware Enable (ON_OFF).

## 2. Puentes de encendido autónomo y protocolo de pruebas
Fuera de la bandeja de control del bastidor, el módulo permanece en modo de espera seguro. Procedimiento de arranque en banco:
1. **Verificación previa de aislamiento**: Medición de resistencia de aislamiento R_iso ≥ 20 MΩ entre entrada de CA y bornes de CC aplicando 500V.
2. **Puente de habilitación**: Conexión del pin Enable (ON_OFF) a tierra de señal GND mediante una resistencia de 1 kΩ.
3. **Secuencia de encendido**: Conexión de alimentación a través de un transformador de aislamiento. El ventilador gira a velocidad máxima durante 3 segundos antes de estabilizarse en reposo silencioso con el LED verde fijo.

## 3. Comandos de protocolo CAN 2.0B y ajuste de tensión milimétrico
El control digital por bus CAN 2.0B proporciona ajustes estables sin derivas térmicas propias de potenciómetros analógicos:
- **Terminación de línea diferencial**: Inclusión de resistencias de 120 Ω en los extremos del bus para evitar rebotes de señal.
- **Tramas de latido periódicas (Heartbeat)**: Transmisión cíclica cada 1000 ms para evitar que el rectificador regrese a la tensión de flotación estándar de 53.5V tras 30 segundos.
- **Estructura del comando de tensión**: Identificador extendido \`0x1081407F\`, carga útil: \`[Byte 0: 0x01] [Byte 1: 0x00] [Bytes 2-3: mV objetivo en Hex] [Bytes 4-7: reservado]\`. Una salida de 48.00V equivale a 48000 mV (\`0xBB80\`).
- **Limitación dinámica de corriente**: Envío del código de parámetro \`0x01\` para fijar la corriente máxima admisible entre 5A y 50A.

## 4. Diagnóstico de balanceo de corriente en funcionamiento en paralelo
Al instalar varios rectificadores en paralelo compartiendo barra de distribución de CC:
- **Fórmula de desequilibrio de corriente**: Desbalance % = |Corriente individual - Corriente promedio| / Corriente nominal * 100%. Entre el 50% y 100% de carga nominal, el desequilibrio debe ser **≤ 5%**.
- **Inspección de resistencia de contacto**: Comprobación del estado superficial de las cuchillas del conector. Una desviación de 5 mΩ causa marcadas asimetrías de corriente.
- **Resolución de conflictos de dirección**: Confirmación de direcciones de hardware exclusivas para cada módulo en el bus CAN.

## 5. Soporte de ingeniería y suministro internacional HEFENGQI
HEFENGQI (RICEWIND) suministra rectificadores industriales, sistemas de alimentación integrados y armarios para exteriores IP55/IP65:
- **Pruebas de carga completa en banco**: Ensayo de quemado (burn-in) al 100% de carga a 50 grados Celsius antes del despacho.
- **Configuración de firmware a medida**: Ajuste de perfiles de carga de baterías de litio LiFePO4 directamente en los parámetros de arranque.
- **Canal de atención global**: Correo: lee@ricewind.com | WhatsApp: +86 17621197907.
`,
  ar: `
## 1. التخطيط الفيزيائي للموصل وتحديد الوظائف الكهربائية للأطراف
تستخدم وحدات مقومات الاتصالات عالية التردد موصلات خلفية مدمجة شديدة التحمل تجمع بين دخل التيار المتردد وخرج التيار المستمر -48V ودوائر التحكم منخفضة الجهد:
- **منطقة دخل التيار المتردد (AC)**: أطراف الطور (L) والحيادي (N) بجهد حتى 300V AC مع صمامات حماية داخلية سريعة، ويتصل طرف التأريض الوقائي PE بهيكل الوحدة.
- **منطقة خرج التيار المستمر عالي القدرة (DC)**: يعمل الطرف OUT+ (-48V RTN) كمرجع تأريض موجب مشترك، بينما يوفر الطرف OUT- (-48V NEG) تياراً تشغيلياً يصل إلى 50A/75A.
- **منطقة الإشارات وناقل التحكم**: خطوط الناقل التفاضلي CAN_H (الطرف 1) وCAN_L (الطرف 2) بسرعة 125 كيلوبت/ثانية، وأطراف تحديد العنوان، وخط التمكين التشغيلي Enable (ON_OFF).

## 2. وصلات التشغيل المستقل وإجراءات الاختبار الميداني
عند تشغيل المقوم بشكل مستقل خارج هيكل التوزيع الرئيسي، يظل في وضع الاستعداد الآمن المقفل. خطوات التشغيل على منصة الاختبار:
1. **فحص مقاومة العزل المسبق**: التحقق من أن مقاومة العزل R_iso ≥ 20 ميجا أوم بين دخل التيار المتردد وخرجات التيار المستمر باستخدام جهاز قياس عزل بجهد 500V.
2. **وصلة التمكين التشغيلي**: توصيل طرف Enable (ON_OFF) بالأرضي المرجعي للإشارة GND عبر مقاومة بقيمة 1 كيلو أوم.
3. **تسلسل بدء التشغيل**: توصيل مصدر التيار المتردد عبر محول عزل. تدور المروحة بالسرعة القصوى لمدة 3 ثوانٍ قبل أن تستقر في سرعة الهدوء المنخفضة مع إضاءة مؤشر التشغيل الأخضر بشكل ثابت.

## 3. أوامر بروتوكول CAN 2.0B والضبط الدقيق للجهد
يوفر التحكم الرقمي عبر ناقل CAN 2.0B دقة ضبط تصل إلى مستوى الميلي فولت دون أي انحرافات حرارية:
- **إنهاء خط الناقل الفيزيائي**: تركيب مقاومات إنهاء بقيمة 120 أوم على طرفي الناقل لمنع ارتداد الإشارات عالية التردد.
- **حزم نبضات المراقبة الدورية (Heartbeat)**: إرسال حزم دورية كل 1000 ميلي ثانية لتفادي رجوع المقوم تلقائياً إلى جهد الطفو الافتراضي 53.5V.
- **صيغة أمر ضبط الجهد**: معرف الإطار \`0x1081407F\`، وبيانات الأمر: \`[بايت 0: 0x01] [بايت 1: 0x00] [بايت 2-3: الجهد المستهدف بالميلي فولت Hex] [بايت 4-7: محجوز]\`. وضبط الجهد عند 48.00V يقابل 48000 ميلي فولت (\`0xBB80\`).
- **الحد الديناميكي للتيار**: إرسال كود المعلمة \`0x01\` لتحديد الحد الأقصى للتيار المسموح به بين 5A و50A لحماية البطاريات.

## 4. معايير تشخيص اتزان تقاسم الحمل عند التوصيل على التوازي
عند توصيل عدة مقومات على التوازي ومشاركتها لقضيب توزيع التيار المستمر:
- **معادلة نسبة عدم توازن التيار**: نسبة الخلل % = |تيار الوحدة الفردية - متوسط تيار الوحدات| / التيار الاسمي للوحدة * 100%. وفي نطاق الحمل بين 50% و100%، يجب ألا تتجاوز النسبة **≤ 5%**.
- **فحص مقاومة نقاط التوصيل**: التأكد من نظافة أطراف التوصيل وخلوها من الأكسدة، حيث إن وجود مقاومة تلامس بقيمة 5 ميلي أوم يسبب تبايناً ملموساً في التيار.
- **منع تضارب العناوين**: التأكد من فرادة العنوان الرقمي لكل مقوم على ناقل CAN المشترك.

## 5. الدعم الهندسي والتوريد العالمي من HEFENGQI
توفر HEFENGQI (RICEWIND) مقومات الاتصالات الاحترافية، وأنظمة الطاقة المدمجة، وخزائن الاتصالات الخارجية المقاومة للعوامل الجوية IP55/IP65:
- **اختبارات الأحمال الكاملة**: إخضاع كافة الوحدات لاختبارات التحمل بنسبة حمل 100% تحت درجة حرارة 50 مئوية قبل الشحن.
- **تخصيص المعلمات مسبقاً**: برمجة مسبقة لمعايير الجهد لناقل CAN بما يتوافق مع بطاريات الليثيوم LiFePO4.
- **مكتب الاتصال الهندسي والتجاري**: البريد الإلكتروني: lee@ricewind.com | الدعم الفني عبر واتساب: +86 17621197907.
`
};

async function fixTranslations() {
  const article = await prisma.newsArticle.findFirst({
    where: { key: SLUG }
  });

  if (!article) {
    console.error("Article not found:", SLUG);
    return;
  }

  for (const [locale, md] of Object.entries(TRANSLATIONS)) {
    const ast = convertMarkdownToAST(md);
    await prisma.newsArticleTranslation.update({
      where: {
        articleId_locale: {
          articleId: article.id,
          locale: locale
        }
      },
      data: {
        body: ast
      }
    });
    console.log(`Successfully updated pure localized rich text AST for [${locale}]`);
  }
}

fixTranslations().catch(console.error).finally(() => prisma.$disconnect());
