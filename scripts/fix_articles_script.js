
const { PrismaClient } = require('/mnt/vscode/hefengqi/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Starting article content fix...');

  // 1. R4850G2 (cmtx5kj7p00027i5zbfghnpjz) - EN
  const enR4850Body = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '1. Industry Background and Architectural Foundation' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'In modern telecommunications base stations, data center micro-modules, and battery energy storage deployments, the Huawei ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' (50A / 3000W / 96% Titanium-class efficiency) stands out as one of the most widely deployed and robust switch-mode rectifiers globally. However, during field maintenance, remote site recovery, or standalone battery reactivation, electrical engineers frequently encounter a critical barrier: without an ETP48100/ETP48200 subrack or SMU02C supervisory unit present, how do you safely power on an isolated ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' module and achieve a stable 53.5V DC output?' }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Compiled by the HEFENGQI engineering team based on extensive field deliveries and original equipment standards, this tutorial breaks down the ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' edge-connector pinout, offline bypass activation steps, and essential electrical safety rules.' }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '2. Edge Connector Physical Architecture and Pinout Definitions' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'The rear edge connector of the Huawei ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' is partitioned into three distinct functional zones: heavy-current power terminals on the left and right flanks, flanked around a central dual-row high-density signal pin block. The leftmost terminal group accommodates single-phase AC input (L, N, and chassis PE ground), incorporating integrated inrush-limiting pre-charge resistors. The rightmost terminal bus provides heavy-current DC output (-48V and +48V/RTN). The central high-density signal block houses startup enable logic (Inhibit/Enable), CAN communication bus (CAN_H / CAN_L), hardware slot address pins, and analog current-sharing lines.' }
        ]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: 'Standalone Offline Startup Without Controller: Without an SMU02C supervisory controller sending periodic CAN polling frames, the R4850G2 defaults to a high-impedance standby lockout state. Achieving autonomous standalone startup requires proper configuration of the power-on enable pin and analog reference ground:' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '1. Securely connect 220V AC utility power to the AC input terminals (minimum wire cross-section 2.5 mm² / 14 AWG), ensuring the PE terminal is bonded to ground;' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '2. Locate the Power-On Enable pin and analog ground reference pin (GND_S) within the central control signal header;' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '3. Bridge a 1kΩ–4.7kΩ pull-down resistor (or direct shorting jumper) between the Enable pin and GND_S. Upon applying AC power, the yellow fault/alarm LED flashes for 3–5 seconds during self-diagnostic capacitor pre-charge, followed by a solid green RUN LED and automatic fan ramp-up. The DC output will now deliver a rock-solid -53.5V nominal voltage!' }]
            }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '3. Field Challenges, CAN Dynamic Tuning & Safety Precautions' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'CAN Bus Dynamic Voltage Regulation and Real-time Telemetry: If an application requires continuously variable output voltage between 42V and 58V (e.g., custom equalization charging for LiFePO4 battery banks or specialized test benches), CAN bus control must be leveraged. The ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' utilizes the industry-standard ' },
          { type: 'text', text: 'CAN 2.0B', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' protocol at a fixed 125 kbps baud rate. By interfacing a USB-to-CAN adapter across the CAN_H and CAN_L pins, sending control frames to identifier 0x1081407F allows 0.1V step voltage tuning alongside real-time current telemetry feedback.' }
        ]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: 'Critical Field Precautions and Electrical Standards:' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '1. Never operate the rectifier continuously in an unventilated, sealed enclosure. The R4850G2 employs forced front-to-back airflow; maintain at least 10 cm of unhindered clearance behind the rear exhaust grill;' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '2. Never hot-plug DC output terminals while connected to an active load, as high-energy DC arcing will erode the gold-plated contact surfaces;' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '3. Always install an upstream 16A/20A Type C Miniature Circuit Breaker (MCB) on the AC input feed to handle initial capacitor inrush current transients.' }]
            }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '4. Operational Guidelines and Preventive Standards' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'HEFENGQI / RICEWIND supplies telecom operators and infrastructure contractors in over 50 countries with genuine Huawei ETP48100, ETP48200 systems, verified ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: '/R4875G1 rectifiers, and custom telecom enclosures. Every unit undergoes 100% full-load burn-in testing and dielectric verification prior to global dispatch.' }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Technical inquiries, bulk stock availability, and global engineering consultation: Email: lee@ricewind.com | WhatsApp: +86 17621197907.' }
        ]
      }
    ]
  };

  // RU R4850G2
  const ruR4850Body = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '1. Отраслевой контекст и архитектурный базис' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'В современных базовых станциях сотовой связи и центрах обработки данных выпрямительный модуль Huawei ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' (50A / 3000 Вт / КПД 96% класса Titanium) является одним из самых надежных импульсных источников питания в мире. Однако при аварийном обслуживании или автономном заряде АКБ инженеры сталкиваются с задачей: как запустить одиночный модуль ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' без корзины ETP48100/ETP48200 и контроллера SMU02C с получением стабильного выходного напряжения 53,5 В?' }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Инженерный отдел компании HEFENGQI подготовил подробное практическое руководство по назначению контактов разъема, схеме бессистемного автономного пуска и правилам электробезопасности.' }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '2. Архитектура заднего разъема и распиновка контактов' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Задний ножевой разъем Huawei ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' разделен на три функциональные зоны: силовые клеммы по краям и центральный блок сигнальных пинов высокой плотности. Слева расположены клеммы входа AC 220В (L, N и защитное заземление PE) со встроенной цепью предзаряда. Справа размещены шины постоянного тока DC (-48В и +48В/RTN). В центральной сигнальной группе находятся цепи разрешения пуска (Enable), шина CAN (CAN_H / CAN_L), пины адресации слота и аналоговая шина выравнивания токов.' }
        ]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: 'Пошаговый регламент автономного пуска без контроллера: Без сигналов опроса от SMU02C выпрямитель блокируется в дежурном режиме. Для прямого пуска необходимо замкнуть контакт разрешения на аналоговую землю:' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '1. Подключите сеть 220В AC к входным клеммам (сечение кабеля не менее 2,5 мм²), надежно заземлив корпус через контакт PE;' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '2. В центральной сигнальной колодке найдите контакт запуска (Power-On Enable) и аналоговую землю (GND_S);' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '3. Установите резистор 1–4,7 кОм (или прямую перемычку) между контактом Enable и GND_S. После подачи сетевого питания желтый индикатор будет мигать 3–5 секунд в процессе самодиагностики, затем загорится зеленый RUN и на выходе появится стабильное номинальное напряжение -53,5 В DC!' }]
            }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '3. Регулировка по CAN-шине и правила безопасности' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Интеллектуальная регулировка напряжения по CAN-шине: Для плавной перестройки выходного напряжения в диапазоне 42–58 В (например, для заряда литий-железо-фосфатных аккумуляторов) используется интерфейс CAN. Модуль поддерживает протокол ' },
          { type: 'text', text: 'CAN 2.0B', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' на фиксированной скорости 125 кбит/с. При подключении USB-CAN адаптера к пинам CAN_H и CAN_L и отправке команд на идентификатор 0x1081407F доступна регулировка с шагом 0,1 В и телеметрия тока в реальном времени.' }
        ]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: 'Основные правила эксплуатации и техники безопасности:' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '1. Запрещается длительная работа модуля в закрытом невентилируемом объеме. Обеспечьте не менее 10 см свободного пространства перед задней решеткой вентилятора;' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '2. Не допускается горячее отключение контактов DC под нагрузкой во избежание образования дуги и повреждения золотого покрытия;' }]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '3. На входе питания обязательно используйте автоматический выключатель 16А/20А с характеристикой C для защиты от пусковых токов.' }]
            }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '4. Регламент технического обслуживания и стандарты безопасности' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Компания HEFENGQI (HEFENGQI / RICEWIND) осуществляет поставки оригинальных систем питания Huawei ETP48100, ETP48200 и выпрямителей ' },
          { type: 'text', text: 'R4850G2', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' более чем в 50 стран. Все модули проходят 100% входное тестирование под нагрузкой.' }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Технические консультации, поставки оборудования и запросы документации: Email: lee@ricewind.com | WhatsApp: +86 17621197907.' }
        ]
      }
    ]
  };

  await prisma.newsArticleTranslation.updateMany({
    where: { articleId: 'cmtx5kj7p00027i5zbfghnpjz', locale: 'en' },
    data: { body: enR4850Body }
  });
  console.log('Successfully updated EN R4850G2 body!');

  await prisma.newsArticleTranslation.updateMany({
    where: { articleId: 'cmtx5kj7p00027i5zbfghnpjz', locale: 'ru' },
    data: { body: ruR4850Body }
  });
  console.log('Successfully updated RU R4850G2 body!');

  // 2. 100G QSFP28 LR4 (cmtyd1tc700017i7amzv5lo1s)
  // FR
  const fr100gBody = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Le module optique Huawei 100G QSFP28 LR4 (portée 10 km sur fibre monomode SMF, connecteur duplex LC, 4 voies LAN-WDM à 1310 nm) constitue le composant d\'interconnexion prédominant des cœurs de réseau IP métropolitains et des centres de calcul IA Leaf-Spine. Dans les déploiements réels sur le terrain, plus de 75 % des pannes de liaison optique et des erreurs CRC résultent de la contamination par poussière ou résidus gras sur la face optique des férules LC, et non d\'une défaillance matérielle.' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Le département technique de HEFENGQI présente ce manuel d\'exploitation terrain complet pour le Huawei 100G QSFP28 LR4, couvrant l\'inspection, le nettoyage combiné, la télémétrie DDM et la compatibilité multi-constructeurs.' }]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Étape 1 : Préparation, sécurité laser et contrôle ESD' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sécurité laser Class 1M : Le module combine 4 lasers DFB d\'une puissance cumulée atteignant +4,5 dBm. Ne jamais regarder directement dans l\'interface optique LC ou l\'extrémité d\'une jarretière sans lunettes de protection laser adaptées.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Protection antistatique (ESD) : Portez impérativement un bracelet antistatique relié à la terre (résistance 1 MΩ) lors de la manipulation des modules optiques.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Outillage requis : Microscope d\'inspection de fibre (grossissement 400x), stylo de nettoyage LC One-Click 1,25 mm, lingettes optiques non pelucheuses, alcool isopropylique (IPA ≥ 99,5 %) et photomètre optique calibré à 1310 nm.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Étape 2 : Inspection des férules LC et protocole de nettoyage combiné' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Retirez les bouchons anti-poussière LC sans jamais toucher les faces terminales en céramique avec les doigts.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inspectez la zone du cœur (9 µm) au microscope 400x selon la norme CEI 61300-3-35. Toute particule impose un nettoyage immédiat.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nettoyage à sec : Insérez l\'embout du stylo de nettoyage LC dans le port optique ou sur la férule, puis poussez jusqu\'au clic mécanique d\'essuyage rotatif.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nettoyage humide combiné : En cas de résidus gras tenaces, humidifiez légèrement un coin de lingette avec de l\'isopropanol, essuyez en mouvement unidirectionnel, puis séchez sur zone sèche avant contre-inspection.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Étape 3 : Insertion mécanique, verrouillage et statut des voyants LED' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Maintenez le loquet d\'extraction (Bail Latch) en position fermée et alignez le module QSFP28 avec le slot du commutateur.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Insérez le module fermement le long du rail jusqu\'au déclic franc de verrouillage interne, puis tirez doucement pour vérifier la fixation.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Raccordez la jarretière optique LC duplex jusqu\'à l\'enclenchement des clips latéraux.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Vérifiez la LED du port : un voyant vert fixe indique une synchronisation physique réussie (Link Up) ; un voyant éteint ou orange clignotant signale une désynchronisation.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Étape 4 : Télémétrie DDM et critères d\'acceptation de puissance optique' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Interrogez les registres DDM via CLI (ex. display transceiver verbose ou show interfaces transceiver detail) :' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Température de fonctionnement : Plage nominale de 0 °C à +70 °C (au-delà de 75 °C, vérifier le flux d\'air et la ventilation du châssis).' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tension d\'alimentation : 3,3 V nominale, devant rester impérativement entre 3,13 V et 3,47 V.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Puissance d\'émission 4 voies (Tx Lane 0~3) : Valeur typique entre -4,3 dBm et +4,5 dBm, écart inter-voies inférieur à 1,5 dB.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Puissance de réception 4 voies (Rx Lane 0~3) : Sensibilité minimale de -10,6 dBm, seuil de saturation à +4,5 dBm. En dessous de -10,0 dBm, nettoyer les fibres ; au-dessus de +2,0 dBm en liaison courte, insérer un atténuateur optique de 3 à 5 dB pour éviter la saturation du récepteur.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Étape 5 : Compatibilité multi-constructeurs et contournement EEPROM' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Lors de l\'installation d\'un module Huawei sur des commutateurs tiers (Cisco, Arista ou commutateurs ouverts), le port peut signaler "unsupported transceiver" et passer en Err-Disabled :' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sur environnement Cisco, appliquez les commandes de contournement : service unsupported-transceiver et no errdisable detect cause gbic-invalid.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'HEFENGQI propose en amont le flashage personnalisé de l\'EEPROM selon la marque de vos équipements (Cisco, Arista, Juniper, Nokia, etc.) pour une reconnaissance native sans alarme.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pour toute demande de modules optiques 100G/400G testés en laboratoire et support d\'ingénierie : Email : lee@ricewind.com | WhatsApp : +86 17621197907.' }] }]
          }
        ]
      }
    ]
  };

  // DE
  const de100gBody = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Das optische Transceivermodul Huawei 100G QSFP28 LR4 (10 km Reichweite über Singlemode-Faser SMF, Duplex-LC-Anschluss, 4 LAN-WDM-Kanäle bei 1310 nm) ist eine tragende Säule moderner AI-Rechenzentren und Metro-Transportnetze. Praxiserfahrungen belegen, dass über 75 % aller optischen Verbindungsausfälle und CRC-Fehler auf Verschmutzungen der LC-Keramikferrule zurückzuführen sind und nicht auf Hardwaredefekte.' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Die technische Abteilung von HEFENGQI stellt dieses umfassende Betriebshandbuch für den Huawei 100G QSFP28 LR4 bereit, das Endflächenreinigung, DDM-Telemetrie und Multi-Vendor-Kompatibilität detailliert abdeckt.' }]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Schritt 1: Arbeitsvorbereitung, Lasersicherheit und ESD-Schutz' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Laserschutzklasse 1M: Der Transceiver bündelt 4 DFB-Laser mit bis zu +4,5 dBm Gesamtsendeleistung. Niemals ohne Laserschutzbrille direkt in den LC-Port oder Stecker blicken.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ESD-Richtlinien: Hochempfindliche CDR- und Fotodiodenschaltkreise erfordern zwingend das Tragen eines geerdeten Antistatikarmbands (1 MΩ Ableitwiderstand).' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Werkzeugausstattung: Glasfaser-Prüfmikroskop (400-fache Vergrößerung), 1,25-mm-LC-Reinigungsstift (One-Click), fusselfreie Optiktücher, hochreines Isopropanol (IPA ≥ 99,5 %) und kalibrierter optischer Leistungsmesser.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Schritt 2: LC-Endflächeninspektion und kombinierte Trocken-/Nassreinigung' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Entfernen Sie Staubschutzkappen, ohne die Keramikendflächen mit bloßen Fingern zu berühren.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Prüfen Sie den 9-µm-Faserkernbereich unter dem 400x-Mikroskop gemäß IEC 61300-3-35 auf Staubpartikel oder Ölfilme.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Trockenreinigung: Den LC-Reinigungsstift gerade einführen und durchdrücken, bis ein Klickgeräusch die rotierende Reinigung bestätigt.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kombinierte Nassreinigung: Bei hartnäckigen Rückständen eine Tuchecke mit Isopropanol leicht befeuchten, unidirektional abwischen und auf trockenem Tuchbereich nachtrocknen.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Schritt 3: Modulinstallation, Arretierung und LED-Statusanzeige' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Halten Sie den Entriegelungsbügel (Bail Latch) geschlossen und richten Sie das QSFP28-Modul waagerecht am Port aus.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Schieben Sie das Modul vorsichtig ein, bis die interne Verriegelung spürbar einrastet. Durch leichten Gegenzug Sitz prüfen.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Stecken Sie den Duplex-LC-Stecker ein, bis die Rasthaken sicher greifen.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Port-LED prüfen: Dauerhaft grünes Leuchten signalisiert Synchronisation (Link Up); Blinken oder Ausfall weist auf Signalverlust hin.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Schritt 4: DDM-Echtzeitdiagnose und Grenzwerte der optischen Leistung' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Lesen Sie die DDM-Telemetriewerte über die CLI des Switches aus (z. B. display transceiver verbose) :' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Betriebstemperatur: Normalbereich 0 °C bis +70 °C (über 75 °C Lüfterdrehzahl und Luftführung prüfen).' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Versorgungsspannung: Nennwert 3,3 V, stabiler Bereich zwischen 3,13 V und 3,47 V.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sendeleistung 4 Kanäle (Tx Lane 0~3): Typischer Wert zwischen -4,3 dBm und +4,5 dBm; Kanalabweichung maximal 1,5 dB.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Empfangsleistung 4 Kanäle (Rx Lane 0~3): Empfindlichkeitsgrenze bei -10,6 dBm, Übersteuerungsgrenze bei +4,5 dBm. Liegt Rx unter -10,0 dBm, Faser reinigen; liegt Rx bei Kurzstrecken über +2,0 dBm, Dämpfungsglied (3–5 dB) vorschalten.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Schritt 5: Multi-Vendor-Kompatibilität und EEPROM-Lösungen' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Wird der Huawei QSFP28-Transceiver in Switches von Drittanbietern (Cisco, Arista etc.) eingesetzt, kann die Schnittstelle in den Zustand Err-Disabled versetzt werden:' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'In Cisco-Umgebungen aktivieren Sie: service unsupported-transceiver und no errdisable detect cause gbic-invalid.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'HEFENGQI liefert Transceiver mit maßgeschneiderter EEPROM-Codierung für Cisco, Arista, Juniper u. a., um reibungslose Plug-and-Play-Funktion zu garantieren.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Produktanfragen, 100G/400G-Lagerbestände und technische Unterstützung: E-Mail: lee@ricewind.com | WhatsApp: +86 17621197907.' }] }]
          }
        ]
      }
    ]
  };

  // ES
  const es100gBody = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'El transceptor óptico Huawei 100G QSFP28 LR4 (alcance de 10 km sobre fibra monomodo SMF, conector dúplex LC, 4 canales LAN-WDM en 1310 nm) es el componente de interconexión neurálgico en centros de datos de IA y redes troncales metropolitanas. Las estadísticas de campo demuestran que más del 75 % de las fallas de enlace y errores CRC se originan por contaminación en la férula de los conectores LC y no por averías de hardware.' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'El departamento técnico de HEFENGQI presenta esta guía de ingeniería para el Huawei 100G QSFP28 LR4, detallando inspección de fibra, limpieza combinada, telemetría DDM y resolución de compatibilidad multimarca.' }]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Paso 1: Preparación, seguridad láser y control antiestático (ESD)' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Seguridad láser Clase 1M: El módulo integra 4 transmisores DFB con una potencia total de hasta +4,5 dBm. Nunca mire directamente a las interfaces ópticas sin protección ocular homologada.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Normativa ESD: Utilice obligatoriamente muñequera antiestática conectada a tierra (resistencia 1 MΩ) para manipular los módulos ópticos sensibles.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Herramientas de campo: Microscopio óptico de 400 aumentos, lápiz limpiador One-Click LC de 1,25 mm, toallitas sin pelusa, alcohol isopropílico (IPA ≥ 99,5 %) y medidor de potencia calibrado a 1310 nm.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Paso 2: Inspección de férulas LC y protocolo de limpieza seca/húmeda' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Retire los tapones protectores sin tocar las caras cerámicas con los dedos bajo ninguna circunstancia.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Examine el núcleo de fibra de 9 µm con el microscopio según la norma IEC 61300-3-35 para detectar polvo o grasa.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Limpieza en seco: Inserte el lápiz de limpieza LC y presione firmemente hasta escuchar el clic rotativo de limpieza.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Limpieza húmeda combinada: Ante manchas persistentes, humedezca ligeramente una toallita con isopropanol, frote en un solo sentido y seque inmediatamente en zona limpia.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Paso 3: Instalación mecánica, bloqueo del pestillo y estado de luces LED' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sujete el pestillo de extracción (Bail Latch) en posición cerrada y alinee el módulo con la ranura del conmutador.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Deslice el módulo de manera suave hasta percibir el clic metálico de fijación interna y tire con suavidad para confirmar el anclaje.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Conecte el latiguillo LC dúplex asegurando el encastre de las pestañas laterales.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Verifique el LED del puerto: luz verde continua indica enlace sincronizado (Link Up); luz apagada o ámbar indica pérdida de sincronismo.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Paso 4: Telemetría DDM y criterios de aceptación de potencia óptica' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Consulte los registros de diagnóstico DDM mediante la consola CLI del conmutador (ej. display transceiver verbose):' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Temperatura operativa: Rango estándar de 0 °C a +70 °C (si excede 75 °C, revise la ventilación del rack).' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Voltaje de alimentación: 3,3 V nominal, debiendo mantenerse estable entre 3,13 V y 3,47 V.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Potencia de transmisión de 4 canales (Tx Lane 0~3): Valores típicos de -4,3 dBm a +4,5 dBm con una variación entre canales menor a 1,5 dB.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Potencia de recepción de 4 canales (Rx Lane 0~3): Sensibilidad de -10,6 dBm y umbral de saturación de +4,5 dBm. Con Rx inferior a -10,0 dBm, limpie la fibra; con Rx superior a +2,0 dBm en enlaces cortos, instale un atenuador de 3 a 5 dB.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Paso 5: Compatibilidad multimarca y resolución de bloqueos EEPROM' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Al instalar ópticas Huawei en conmutadores de terceros (Cisco, Arista o switches abiertos), el puerto puede generar avisos de óptica no admitida y bloquear la interfaz:' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'En entornos Cisco aplique: service unsupported-transceiver y no errdisable detect cause gbic-invalid.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'HEFENGQI ofrece transceptores preconfigurados con codificación EEPROM personalizada para Cisco, Arista, Juniper, Nokia, etc., garantizando operatividad directa.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Suministro global de ópticas 100G/400G y soporte técnico: Email: lee@ricewind.com | WhatsApp: +86 17621197907.' }] }]
          }
        ]
      }
    ]
  };

  // AR
  const ar100gBody = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'تعتبر وحدة الإرسال والاستقبال الضوئية Huawei 100G QSFP28 LR4 (نطاق 10 كم عبر الألياف أحادية النمط SMF، وموصل LC مزدوج، و4 قنوات LAN-WDM بتردد 1310 نانومتر) من أهم مكونات الربط البيني في مراكز بيانات الذكاء الاصطناعي وشبكات النقل التابعة للمدن. وتؤكد البيانات الميدانية أن أكثر من 75% من انقطاعات الإشارة وأخطاء CRC ناتجة عن تلوث أطراف موصلات LC وليس عن تلف المكونات الداخلية.' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'يقدم الفريق الهندسي لشركة HEFENGQI هذا الدليل الميداني الشامل لمحول Huawei 100G QSFP28 LR4، والذي يغطي الفحص، والتنظيف المركب، ومراقبة DDM، وحل مشكلات التوافق مع الأنظمة المختلفة.' }]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'الخطوة 1: التحضير، سلامة الليزر والتحكم في التفريغ الكهروستاتيكي (ESD)' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'سلامة الليزر الفئة 1M: تحتوي الوحدة على 4 أجهزة ليزر DFB بقدرة إجمالية تصل إلى +4.5 ديسيبل ميلي واط. يحظر تماماً النظر مباشرة إلى منفذ LC بدون نظارات واقية.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'الحماية الكهروستاتيكية: يجب ارتداء سوار معصم مؤرض لمقاومة التفريغ الكهروستاتيكي أثناء التعامل مع الوحدات الضوئية.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'الأدوات المطلوبة: مجهر فحص الألياف (تكبير 400x)، وقلم تنظيف One-Click LC مقاس 1.25 مم، ومناديل بصرية خالية من الوبر، وكحول أيزوبروبيل (IPA ≥ 99.5%)، ومقياس قدرة ضوئية معاير على 1310 نانومتر.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'الخطوة 2: فحص نهايات موصلات LC وبروتوكول التنظيف الجاف والرطب' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'انزع أغطية الحماية من الغبار دون لمس الأطراف الخزفية بالأصابع نهائياً.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'افحص منطقة قلب الليف (قطر 9 ميكرومتر) بالمجهر وفق معيار IEC 61300-3-35 للتأكد من خلوها من الغبار والزيوت.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'التنظيف الجاف: أدخل رأس قلم التنظيف في منفذ LC واضغط حتى تسمع صوت نقرة التنظيف الدوراني.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'التنظيف الرطب: في حال وجود بقع عنيدة، بلل زاوية المنديل بكحول الأيزوبروبيل وامسح في اتجاه واحد ثم جفف في منطقة نظيفة.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'الخطوة 3: التثبيت الميكانيكي، القفل والتحقق من مؤشرات LED' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'أبقِ مقبض التثبيت في وضع الإغلاق وحاذِ وحدة QSFP28 مع فتحة المنفذ بدقة.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ادفع الوحدة بسلاسة حتى تسمع صوت استقرار القفل الميكانيكي الداخلي وتأكد من ثباتها.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'قم بتوصيل كابل LC المزدوج حتى استقرار مشابك التثبيت.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'تحقق من مؤشر LED: يشير الضوء الأخضر الثابت إلى اكتمال المزامنة الفيزيائية (Link Up).' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'الخطوة 4: مراقبة تشخيص DDM ومعايير قبول القدرة الضوئية' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'افتح سجلات تشخيص DDM عبر سطر أوامر المحول (CLI) مثل display transceiver verbose:' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'درجة حرارة التشغيل: النطاق النموذجي من 0 إلى 70 درجة مئوية (فوق 75 درجة يتطلب فحص التبريد).' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'جهد التغذية: 3.3 فولت اسمي، ويجب أن يظل مستقراً بين 3.13 و3.47 فولت.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'قدرة الإرسال عبر القنوات الأربع (Tx Lane 0~3): بين -4.3 و +4.5 ديسيبل ميلي واط بتفاوت أقل من 1.5 ديسيبل.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'قدرة الاستقبال (Rx Lane 0~3): حساسية -10.6 ديسيبل ميلي واط وحد تشبع +4.5 ديسيبل ميلي واط. إذا انخفضت عن -10 ديسيبل نظف الألياف؛ وإذا تجاوزت +2 ديسيبل استخدم مخمداً ضوئياً.' }] }]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'الخطوة 5: التوافق مع الأنظمة المتعددة وبرمجة EEPROM' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'عند تركيب محولات Huawei في محولات من شركات أخرى (مثل Cisco أو Arista)، قد يتم تعطيل المنفذ تلقائياً:' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'في بيئات Cisco يمكن استخدام الأوامر: service unsupported-transceiver و no errdisable detect cause gbic-invalid.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'توفر HEFENGQI وحدات مبرمجة مسبقاً بشفرات EEPROM متوافقة مع Cisco وArista وJuniper للتشغيل المباشر.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'لطلبات التوريد العالمية لوحدات 100G/400G والدعم الفني: البريد الإلكتروني: lee@ricewind.com | واتساب: 17621197907 86+.' }] }]
          }
        ]
      }
    ]
  };

  await prisma.newsArticleTranslation.updateMany({
    where: { articleId: 'cmtyd1tc700017i7amzv5lo1s', locale: 'fr' },
    data: { body: fr100gBody }
  });
  console.log('Successfully updated FR 100G body!');

  await prisma.newsArticleTranslation.updateMany({
    where: { articleId: 'cmtyd1tc700017i7amzv5lo1s', locale: 'de' },
    data: { body: de100gBody }
  });
  console.log('Successfully updated DE 100G body!');

  await prisma.newsArticleTranslation.updateMany({
    where: { articleId: 'cmtyd1tc700017i7amzv5lo1s', locale: 'es' },
    data: { body: es100gBody }
  });
  console.log('Successfully updated ES 100G body!');

  await prisma.newsArticleTranslation.updateMany({
    where: { articleId: 'cmtyd1tc700017i7amzv5lo1s', locale: 'ar' },
    data: { body: ar100gBody }
  });
  console.log('Successfully updated AR 100G body!');

  console.log('All updates completed successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  return prisma[""]();
});
