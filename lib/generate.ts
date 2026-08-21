import { getBerlinParts } from "./berlin";
import { replaceDayQueue, type QueueTweet } from "./store";

const FIRST_HOUR = 7;
const LAST_HOUR = 22;

const TOPICS = [
  ["MARKA", "Marka tescili yalnızca bir başvuru değildir: sınıf, benzerlik ve itiraz korumayı belirler."],
  ["PATENT", "Patent, teknik çözümü 20 yıl korur — ancak tarifname yenilik açısından net olmalıdır."],
  ["TASARIM", "Tasarım tescili dış görünümü korur. Tescil yoksa taklit çoğu zaman cezasız kalır."],
  ["MADRID", "Yurt dışı marka: Madrid Protokolü zaman kazandırır, yerel stratejinin yerini tutmaz."],
  ["TPE", "TÜRKPATENT her gün ilan yayınlar. Takip etmeyen, itiraz sürelerini kaçırır."],
  ["360", "360 derece koruma: tescil, izleme, alan adı ve taklitler birlikte ele alınır."],
  ["SINIF", "Yanlış Nice sınıfları, bir markanın sonradan tutmamasının en sık nedenidir."],
  ["ITIRAZ", "İtiraz yalnızca süre içinde işe yarar. Sonra benzer marka pahalı bir uyuşmazlığa dönüşür."],
  ["TELIF", "Telif hakkı eser ile doğar — icra için yine de kanıt ve strateji gerekir."],
  ["COGRAFI", "Coğrafi işaret menşei ve kaliteyi korur. Kendi kelime markasının yerine geçmez."],
  ["ARGE", "Patent başvurusundan önce yenilik araştırması yapın. Aksi halde yeni olmayan bir başvuruya ödeme yapılır."],
  ["KVKK", "IP dosyasındaki müşteri verileri kişisel veridir. Marka koruması ve veri koruması paralel yürür."],
  ["STARTUP", "Girişimler için önce marka ve alan adı, sonra büyüme. Tersi rebranding’i pahalılaştırır."],
  ["LISANS", "Net marka/patent zinciri olmayan lisans sözleşmeleri sonradan zor icra edilir."],
  ["BELGE", "Öncelik önemlidir. Kullanım, tasarım ve başvuruyu belgelendirmeyen, uyuşmazlıkta kaybeder."],
  ["TAKIP", "Marka takibi: taklitler tescil edilebilir hale gelmeden önce günlük ilanları tarayın."],
];

function buildTweet(index: number): string {
  const [ticker, body] = TOPICS[index % TOPICS.length];
  return [
    body,
    "",
    "Üstün Patent; başvuru, araştırma ve sürekli izlemede yanınızda.",
    "",
    `#${ticker} #FikriMulkiyet #UstunPatent`,
  ].join("\n");
}

export function tweetForNow(now = new Date()): {
  ticker: string;
  text: string;
  hour: number;
  dateKey: string;
} {
  const { dateKey, hour } = getBerlinParts(now);
  const index = Math.max(0, Math.min(LAST_HOUR, hour) - FIRST_HOUR);
  const [ticker] = TOPICS[index % TOPICS.length];
  return { ticker, text: buildTweet(index), hour, dateKey };
}

export async function regenerateTodayQueue(): Promise<{ dayKey: string; count: number }> {
  const { dateKey } = getBerlinParts();
  const tweets: QueueTweet[] = [];
  let hour = FIRST_HOUR;
  let index = 0;
  while (hour <= LAST_HOUR) {
    const [ticker] = TOPICS[index % TOPICS.length];
    tweets.push({
      id: `${dateKey}_${ticker}_${index}`,
      dayKey: dateKey,
      hour,
      ticker,
      text: buildTweet(index),
      posted: false,
      tweetId: null,
      postedAt: null,
      status: "queued",
    });
    hour += 1;
    index += 1;
  }
  await replaceDayQueue(dateKey, tweets);
  return { dayKey: dateKey, count: tweets.length };
}
