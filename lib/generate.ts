import { getBerlinParts } from "./berlin";
import { replaceDayQueue, type QueueTweet } from "./store";

const FIRST_HOUR = 7;
const LAST_HOUR = 22;

const TOPICS = [
  ["MARKA", "Marka tescili bir başvuru değil: Klasse, Ähnlichkeit und Widerspruch entscheiden über den Schutz."],
  ["PATENT", "Ein Patent schützt die technische Lösung 20 Jahre — aber nur, wenn die Beschreibung neuheitsscharf ist."],
  ["TASARIM", "Designschutz sichert die äußere Form. Ohne Tescil bleibt Nachahmung oft folgenlos."],
  ["MADRID", "Yurt dışı Marka: Madrid-Protokoll spart Zeit, ersetzt aber keine lokale Strategie."],
  ["TPE", "TÜRKPATENT veröffentlicht täglich. Wer nicht überwacht, verpasst Widerspruchsfristen."],
  ["360", "360-Grad-Schutz: Tescil, Monitoring, Domain und Imitate gehören zusammen."],
  ["SINIF", "Falsche Nizza-Klassen sind der häufigste Grund, warum eine Marke später nicht hält."],
  ["ITIRAZ", "Widerspruch wirkt nur in der Frist. Danach wird aus einer ähnlichen Marke oft ein teurer Konflikt."],
  ["TELIF", "Urheberrecht entsteht mit der Schöpfung — die Durchsetzung braucht trotzdem Belege und Strategie."],
  ["COGRAFI", "Coğrafi işaret schützt Herkunft und Qualität. Das ist kein Ersatz für eine eigene Wortmarke."],
  ["ARGE", "Vor der Patentanmeldung: Neuheitsrecherche. Sonst zahlt man für eine Anmeldung, die nicht neu ist."],
  ["KVKK", "Kundendaten in der IP-Akte sind personenbezogen. Schutz der Marke und Schutz der Daten laufen parallel."],
  ["STARTUP", "Für Startups: zuerst Marke und Domain, dann Skalierung. Umgekehrt wird Rebranding teuer."],
  ["LIZENZ", "Lizenzverträge ohne klare Marken-/Patentkette sind später kaum durchsetzbar."],
  ["BEWEIS", "Priorität zählt. Wer Nutzung, Entwurf und Anmeldung nicht dokumentiert, verliert im Streit."],
  ["TAKIP", "Marka takip: täglich neue Veröffentlichungen scannen, bevor Imitate tescil-fähig werden."],
];

function buildTweet(index: number, dayKey: string): string {
  const [ticker, body] = TOPICS[index % TOPICS.length];
  return [
    `${body}`,
    ``,
    `Üstün Patent begleitet Anmeldung, Recherche und laufende Überwachung.`,
    ``,
    `#${ticker} #FikriMulkiyet #UstunPatent`,
  ].join("\n");
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
      text: buildTweet(index, dateKey),
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
