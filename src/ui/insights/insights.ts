import type { Locale } from '../../domain/types'

export type InsightCategory = 'focus' | 'priorities' | 'stress' | 'relationships' | 'energy' | 'systems'

export type Insight = {
  id: number
  category: InsightCategory
  title: Record<Locale, string>
  summary: Record<Locale, string>
  what: Record<Locale, string>
  howItWorks: Record<Locale, string>
  useToday: Record<Locale, string>
  sourceUrl?: string
}

export const categoryLabels: Record<InsightCategory, Record<Locale, string>> = {
  focus: { pl: 'Skupienie', en: 'Focus' },
  priorities: { pl: 'Priorytety', en: 'Priorities' },
  stress: { pl: 'Stres', en: 'Stress' },
  relationships: { pl: 'Relacje', en: 'Relationships' },
  energy: { pl: 'Energia', en: 'Energy' },
  systems: { pl: 'Systemy', en: 'Systems' },
}

const insight = (
  id: number,
  category: InsightCategory,
  title: Record<Locale, string>,
  summary: Record<Locale, string>,
  what: Record<Locale, string>,
  howItWorks: Record<Locale, string>,
  useToday: Record<Locale, string>,
  sourceUrl?: string,
): Insight => ({ id, category, title, summary, what, howItWorks, useToday, sourceUrl })

const timeBlockingMethodInsights: Insight[] = [
  insight(
    1,
    'focus',
    { pl: 'Metoda Pomodoro', en: 'Pomodoro Method' },
    { pl: '25 minut pracy i 5 minut przerwy dla zadań operacyjnych.', en: '25 minutes of work and 5 minutes of break for operational tasks.' },
    {
      pl: 'Złoty standard dla zadań operacyjnych: pracujesz przez 25 minut, a potem robisz krótką 5-minutową przerwę.',
      en: 'A classic operational-work rhythm: 25 minutes of work followed by a short 5-minute break.',
    },
    {
      pl: 'Krótkie interwały obniżają próg wejścia. Mózg łatwiej zaczyna zadanie, kiedy wie, że przerwa jest blisko.',
      en: 'Short intervals lower the activation barrier. The brain starts more easily when a break is nearby.',
    },
    {
      pl: 'Użyj przy prokrastynacji, niskiej energii albo administracji: ustaw blok 25 minut pracy i 5 minut resetu.',
      en: 'Use it for procrastination, low energy or admin: set a 25-minute work block and a 5-minute reset.',
    },
  ),
  insight(
    2,
    'focus',
    { pl: 'Cykle ultradialne', en: 'Ultradian Cycles' },
    { pl: '90 minut pracy głębokiej i 15-20 minut pełnej przerwy.', en: '90 minutes of deep work and a 15-20 minute full break.' },
    {
      pl: 'Najefektywniejszy rytm dla pracy głębokiej: 90 minut pełnego skupienia, a potem 15-20 minut regeneracji.',
      en: 'A deep-work rhythm: 90 minutes of full focus followed by 15-20 minutes of recovery.',
    },
    {
      pl: 'Po około 90-120 minutach intensywnej pracy aktywność poznawcza naturalnie spada. Praca bez przerwy zaczyna obniżać jakość decyzji i wykonania.',
      en: 'After roughly 90-120 minutes of intense work, cognitive activity naturally dips. Pushing through lowers decision and execution quality.',
    },
    {
      pl: 'Planuj tak kodowanie, strategię, pisanie i analizę danych. Po bloku wyjdź od ekranu, zamiast przełączać się na scrollowanie.',
      en: 'Use it for coding, strategy, writing and data analysis. After the block, leave the screen instead of switching to scrolling.',
    },
  ),
  insight(
    3,
    'focus',
    { pl: 'Technika 52/17', en: '52/17 Technique' },
    { pl: '52 minuty intensywnej pracy i 17 minut przerwy.', en: '52 minutes of intense work and 17 minutes of break.' },
    {
      pl: 'Rytm dla osób pracujących w biurze: 52 minuty skupienia i 17 minut przerwy, gdy trzeba balansować pracę głęboką z responsywnością.',
      en: 'An office-friendly rhythm: 52 minutes of focus and 17 minutes of break when deep work must coexist with team responsiveness.',
    },
    {
      pl: 'Badania obserwacyjne firmy Draugiem Group wskazywały, że osoby pracujące w tym rytmie osiągały bardzo wysoką produktywność w ciągu dnia.',
      en: 'Observational findings from Draugiem Group associated this rhythm with very high daily productivity.',
    },
    {
      pl: 'Użyj, gdy 90 minut jest za długie, ale Pomodoro jest za krótkie: jeden blok 52/17 dobrze pasuje między spotkania.',
      en: 'Use it when 90 minutes is too long but Pomodoro is too short: one 52/17 block fits well between meetings.',
    },
  ),
]

const coreInsights: Insight[] = [
  insight(
    1,
    'priorities',
    { pl: 'Zasada 80/20', en: '80/20 Rule' },
    { pl: '20% wysiłku często odpowiada za 80% rezultatów.', en: 'A small share of effort often creates most outcomes.' },
    {
      pl: 'Reguła biznesowa i życiowa mówiąca, że 20% Twojego wysiłku i działań odpowiada za 80% Twoich rezultatów.',
      en: 'A prioritization rule that says a small set of actions tends to create most of the results.',
    },
    {
      pl: 'Pomaga odciąć szum i zrezygnować z rzeczy nieważnych. Zamiast próbować robić wszystko, skupiasz się na mniejszości z największą dźwignią.',
      en: 'It reduces noise and helps you stop spending energy on low-leverage work.',
    },
    {
      pl: 'W planie dnia wybierz 1-2 bloki, które najbardziej pchają sprawy do przodu, np. etat, rozwój LLM albo kluczowy projekt.',
      en: 'Pick 1-2 blocks with the highest leverage and place them before lower-value work.',
    },
  ),
  insight(
    2,
    'focus',
    { pl: 'Jeden Kamień', en: 'One Big Rock' },
    { pl: 'Jeden absolutny priorytet dnia przed resztą zadań.', en: 'One absolute priority before the smaller tasks.' },
    {
      pl: 'Wybranie tylko jednego, absolutnego priorytetu na dany dzień, czyli dużego kamienia, zanim zajmiesz się żwirem i piaskiem.',
      en: 'Choosing one true priority for the day before handling smaller tasks.',
    },
    {
      pl: 'Chroni przed iluzją wielozadaniowości, prokrastynacją i poczuciem natłoku. Daje satysfakcję, że główny cel realnie ruszył.',
      en: 'It prevents multitasking theater and gives the day a visible win.',
    },
    {
      pl: 'Rano lub wieczorem dzień wcześniej zapisz jedno zadanie, które zbliża Cię do celu, i wykonaj je w pierwszym bloku głębokiej pracy.',
      en: 'Write one task that moves your goal forward and place it in your first deep work block.',
    },
  ),
  insight(
    3,
    'relationships',
    { pl: 'Kanapka Komunikacyjna', en: 'Communication Sandwich' },
    { pl: 'Troska, granica i alternatywa.', en: 'Care, boundary and alternative.' },
    {
      pl: 'Technika miękkiego stawiania granic: Troska -> Granica -> Alternatywa.',
      en: 'A gentle boundary-setting structure: care -> boundary -> alternative.',
    },
    {
      pl: 'Pozwala bronić czasu bez odrzucenia i agresji. Druga osoba dostaje sygnał bliskości, a Ty nie oddajesz całego planu dnia.',
      en: 'It protects your time while preserving warmth and connection.',
    },
    {
      pl: 'Powiedz: bardzo cenię nasz czas, potrzebuję teraz 2 godzin pracy, potem chętnie pójdziemy na spacer.',
      en: 'Say: I value our time, I need two work hours now, then I will gladly take a walk with you.',
    },
  ),
  insight(
    4,
    'relationships',
    { pl: 'TIME', en: 'TIME' },
    { pl: 'Timing, Ja-komunikaty, spokój i empatia.', en: 'Timing, I-statements, calm and empathy.' },
    {
      pl: 'Algorytm rozmów zmniejszający ryzyko eskalacji: Timing, I-statements, Mannered, Empathy.',
      en: 'A conversation algorithm: Timing, I-statements, Mannered tone, Empathy.',
    },
    {
      pl: 'Przenosi fokus z ataku na fakty i odczucia. Pomaga nie wejść w spiralę oskarżeń.',
      en: 'It moves the focus from blame to facts, feelings and understanding.',
    },
    {
      pl: 'Nie rozmawiaj w szczycie emocji. Mów: ja czuję, potrzebuję, rozumiem, że Ty możesz czuć to inaczej.',
      en: 'Avoid peak-emotion talks. Use: I feel, I need, I understand this may feel different to you.',
    },
  ),
  insight(
    5,
    'stress',
    { pl: 'Oddech 4-7-8', en: '4-7-8 Breathing' },
    { pl: '4 sekundy wdechu, 7 zatrzymania, 8 wydechu.', en: 'Inhale 4, hold 7, exhale 8.' },
    {
      pl: 'Świadome oddychanie według schematu 4 sekundy wdechu, 7 sekund zatrzymania powietrza, 8 sekund wydechu.',
      en: 'A simple breathing pattern: inhale for 4 seconds, hold for 7, exhale for 8.',
    },
    {
      pl: 'Działa jak fizjologiczny przełącznik układu nerwowego: obniża napięcie i przerywa reakcję walcz albo uciekaj.',
      en: 'It can downshift arousal and interrupt the fight-or-flight spiral.',
    },
    {
      pl: 'Dodaj 3-5 minut przed trudnym blokiem albo rano jako reset przed planowaniem.',
      en: 'Add 3-5 minutes before a hard block or as a morning reset.',
    },
  ),
  insight(
    6,
    'stress',
    { pl: '5-4-3-2-1', en: '5-4-3-2-1 Grounding' },
    { pl: 'Uziemienie przez pięć zmysłów.', en: 'Grounding through the five senses.' },
    {
      pl: 'Technika uważności polegająca na przekierowaniu uwagi na 5 zmysłów.',
      en: 'A mindfulness technique that redirects attention to the five senses.',
    },
    {
      pl: 'Odciąga umysł od analizowania lęków i sprowadza uwagę do teraźniejszości.',
      en: 'It pulls attention away from anxious analysis and back to the present moment.',
    },
    {
      pl: 'Nazwij 5 rzeczy, które widzisz; 4, których dotykasz; 3, które słyszysz; 2 zapachy; 1 smak.',
      en: 'Name 5 things you see, 4 you touch, 3 you hear, 2 you smell and 1 you taste.',
    },
  ),
  insight(
    7,
    'priorities',
    { pl: 'Matryca Eisenhowera', en: 'Eisenhower Matrix' },
    { pl: 'Ważne/pilne kontra szum.', en: 'Important/urgent versus noise.' },
    {
      pl: 'Narzędzie do dzielenia zadań na 4 ćwiartki: ważne/pilne, ważne/niepilne, nieważne/pilne, nieważne/niepilne.',
      en: 'A four-quadrant prioritization tool: important/urgent, important/not urgent, not important/urgent, not important/not urgent.',
    },
    {
      pl: 'Odróżnia pożary od działań strategicznych i ujawnia zadania, które tylko krzyczą najgłośniej.',
      en: 'It separates fires from strategic work and exposes loud but low-value tasks.',
    },
    {
      pl: 'Najwięcej czasu planuj w strefie ważne, ale niepilne: rozwój, zdrowie, relacje, projekty.',
      en: 'Spend more time in important but not urgent work: growth, health, relationships and projects.',
    },
  ),
  insight(
    8,
    'focus',
    { pl: 'Zjedz żabę', en: 'Eat the Frog' },
    { pl: 'Najtrudniejsze zadanie jako pierwsze.', en: 'Do the hardest task first.' },
    {
      pl: 'Wykonanie najtrudniejszego lub najbardziej nielubianego zadania jako pierwszego w ciągu dnia.',
      en: 'Doing the hardest or least-liked task first.',
    },
    {
      pl: 'Zmniejsza prokrastynację wynikającą z lęku przed trudnością. Reszta dnia staje się lżejsza.',
      en: 'It reduces avoidance and makes the rest of the day feel lighter.',
    },
    {
      pl: 'Umieść to zadanie na początku porannego bloku pracy, kiedy energia jest najwyższa.',
      en: 'Place it at the beginning of the morning work block.',
    },
  ),
  insight(
    9,
    'systems',
    { pl: 'Zrzut Myśli', en: 'Mind Dump' },
    { pl: 'Wszystko z głowy na zewnątrz.', en: 'Get everything out of your head.' },
    {
      pl: 'Wypisanie absolutnie wszystkiego, co krąży Ci po głowie, bez oceniania i cenzury.',
      en: 'Writing down everything circulating in your head without judging it.',
    },
    {
      pl: 'Mózg świetnie generuje pomysły, ale źle je magazynuje. Zrzut obniża stres i oczyszcza mentalny RAM.',
      en: 'The mind generates ideas well but stores them poorly. Externalizing reduces mental load.',
    },
    {
      pl: 'Dodaj blok 15-20 minut, wypisz wszystko, a dopiero potem kategoryzuj i planuj.',
      en: 'Add 15-20 minutes, dump everything, then categorize and plan.',
    },
  ),
  insight(
    10,
    'stress',
    { pl: 'PAUSE', en: 'PAUSE' },
    { pl: 'Zauważ, zaakceptuj, zrozum, wybierz, oceń.', en: 'Perceive, acknowledge, understand, select, evaluate.' },
    {
      pl: 'Framework pięciu kroków: Perceive, Acknowledge, Understand, Select, Evaluate.',
      en: 'A five-step self-regulation framework: perceive, acknowledge, understand, select, evaluate.',
    },
    {
      pl: 'Tworzy pauzę poznawczą między bodźcem a reakcją, co pomaga wrócić do bardziej racjonalnego wyboru.',
      en: 'It creates a cognitive pause between trigger and reaction.',
    },
    {
      pl: 'Przy presji zauważ sygnały z ciała, nazwij emocję, zrozum potrzebę, wybierz strategię i oceń efekt.',
      en: 'Notice body signals, name the emotion, understand the need, choose a strategy and evaluate.',
    },
  ),
  insight(
    11,
    'stress',
    { pl: 'Kręgi Wpływu', en: 'Circles of Influence' },
    { pl: 'Oddziel kontrolę od braku wpływu.', en: 'Separate control from no-control.' },
    {
      pl: 'Wizualne oddzielenie rzeczy, które możesz kontrolować, od tych, na które nie masz wpływu.',
      en: 'A visual split between what you can control and what you cannot.',
    },
    {
      pl: 'Chroni przed traceniem energii na cudze emocje, decyzje i opór. Kieruje uwagę na własne reakcje.',
      en: 'It saves energy by focusing on your actions, boundaries and responses.',
    },
    {
      pl: 'W wewnętrznym kręgu zapisz: mój kod, mój oddech, moje granice, moje reakcje. Planuj tylko stamtąd.',
      en: 'Write your code, breath, boundaries and reactions in the inner circle. Plan from there.',
    },
  ),
  insight(
    12,
    'systems',
    { pl: 'Zasada 2 minut', en: 'Two-Minute Rule' },
    { pl: 'Jeśli trwa krócej niż 2 minuty, zrób od razu.', en: 'If it takes under two minutes, do it now.' },
    {
      pl: 'Jeśli wykonanie czynności zajmuje mniej niż dwie minuty, nie wpisuj jej na listę, tylko zrób natychmiast.',
      en: 'If an action takes less than two minutes, do it immediately instead of listing it.',
    },
    {
      pl: 'Usuwa mikro-stresory i małe otwarte pętle, które zapychają uwagę.',
      en: 'It removes small open loops that quietly drain attention.',
    },
    {
      pl: 'Przed głęboką pracą zrób 5-minutowy przegląd drobiazgów i zamknij tylko te poniżej 120 sekund.',
      en: 'Before deep work, scan tiny tasks and close only those under 120 seconds.',
    },
  ),
  insight(
    13,
    'focus',
    { pl: 'Time Blocking + Pomodoro', en: 'Time Blocking + Pomodoro' },
    { pl: 'Bloki w kalendarzu plus rytm 25/5.', en: 'Calendar blocks plus 25/5 rhythm.' },
    {
      pl: 'Łączy rezerwację konkretnych bloków w kalendarzu z cyklami 25 minut skupienia i 5 minut przerwy.',
      en: 'Combines calendar time blocks with 25-minute focus and 5-minute breaks.',
    },
    {
      pl: 'Redukuje paraliż decyzyjny i chroni świeżość umysłu, bo z góry wiadomo, co robić.',
      en: 'It removes decision paralysis and protects energy through predefined focus windows.',
    },
    {
      pl: 'Zablokuj 8:00-12:00 jako Deep Focus / LLM i pracuj w cyklach, po czterech robiąc dłuższą przerwę.',
      en: 'Block 8:00-12:00 as Deep Focus / LLM and work in cycles with a longer break after four.',
    },
  ),
  insight(
    14,
    'systems',
    { pl: 'Do-Learn-Check', en: 'Do-Learn-Check' },
    { pl: 'Zrób, ucz się pod projekt, sprawdź.', en: 'Do, learn for the project, check.' },
    {
      pl: 'Pętla rozwojowa: najpierw działasz, potem dobierasz naukę pod konkretny projekt, a na końcu robisz krótką refleksję.',
      en: 'A growth loop: do first, learn what the project needs, then review.',
    },
    {
      pl: 'Minimalizuje perfekcjonizm i wieczne przygotowywanie się bez dostarczania.',
      en: 'It reduces perfectionism and endless preparation.',
    },
    {
      pl: 'Budując AI, zrób mały prototyp, ucz się tylko brakujących elementów i w niedzielę zrób 15 minut check.',
      en: 'Build a small prototype, learn only missing pieces and do a 15-minute weekly check.',
    },
  ),
  insight(
    15,
    'relationships',
    { pl: 'Bufor 24h', en: '24h Buffer' },
    { pl: 'Dobę przed nowym zobowiązaniem.', en: 'One day before a new commitment.' },
    {
      pl: 'Przed przyjęciem pomocy lub nowego zobowiązania dajesz sobie wymuszoną dobę na odpowiedź.',
      en: 'Before accepting a new request, give yourself a forced day to answer.',
    },
    {
      pl: 'Pozwala emocjom opaść i włączyć logikę, szczególnie gdy automatycznie zgadzasz się kosztem siebie.',
      en: 'It lets emotion settle before logic decides.',
    },
    {
      pl: 'Odpowiedz: brzmi super, sprawdzę kalendarz i dam znać jutro. Obiecuj mniej, dostarczaj spokojniej.',
      en: 'Say: sounds good, I need to check my calendar and I will answer tomorrow.',
    },
  ),
  insight(
    16,
    'stress',
    { pl: 'Dystansowanie i Reframing', en: 'Distancing and Reframing' },
    { pl: 'Zmiana perspektywy na bardziej użyteczną.', en: 'Shift perspective into a more useful frame.' },
    {
      pl: 'Tworzenie psychologicznego dystansu od bodźców i celowa zmiana ramy poznawczej sytuacji.',
      en: 'Creating psychological distance and deliberately reframing a situation.',
    },
    {
      pl: 'Mówienie o sobie w trzeciej osobie może odłączyć od zalania emocjami i uruchomić bardziej logiczny ogląd.',
      en: 'Third-person self-talk can create distance from emotional flooding.',
    },
    {
      pl: 'Zadaj pytanie: czego teraz doświadcza Kamil? Porażkę potraktuj jako dane diagnostyczne do kolejnej próby.',
      en: 'Ask: what is Kamil experiencing now? Treat failure as diagnostic data.',
    },
  ),
  insight(
    17,
    'stress',
    { pl: 'Emergency Kit', en: 'Emergency Kit' },
    { pl: 'Protokół na czerwone godziny.', en: 'A protocol for red-hour moments.' },
    {
      pl: 'Z góry przygotowany zestaw kroków na moment kompletnego przytłoczenia lub ostrego stresu.',
      en: 'A prebuilt protocol for moments of overload or sharp stress.',
    },
    {
      pl: 'W panice trudno podejmować dobre decyzje, więc gotowa instrukcja przyspiesza powrót do działania.',
      en: 'When overwhelmed, a prepared script prevents chaotic decision-making.',
    },
    {
      pl: 'Spisz 3 najpilniejsze zadania, jedno skreśl lub przełóż, rusz ciało przez 15 minut i wróć do jednego bloku.',
      en: 'Write 3 urgent tasks, cut or defer one, move for 15 minutes and return to one block.',
    },
  ),
  insight(
    18,
    'stress',
    { pl: "Kroki Zodim'a", en: "Zodim's Steps" },
    { pl: 'Zatrzymaj, obserwuj, nazwij, interpretuj, wybierz.', en: 'Pause, observe, name, interpret, choose.' },
    {
      pl: 'Pięciostopniowy algorytm rozpoznawania emocji: Zatrzymaj się, Obserwuj, Dostosuj do schematu, Interpretuj, Myśl.',
      en: 'A five-step emotion recognition algorithm: pause, observe, map, interpret, think.',
    },
    {
      pl: 'Zamienia abstrakcyjne emocje w proces, który można przejść krok po kroku zamiast działać na autopilocie.',
      en: 'It turns vague emotion into a step-by-step process.',
    },
    {
      pl: 'Weź wdech, nazwij sygnały z ciała, określ kategorię emocji, sprawdź fakty i wybierz celowe działanie.',
      en: 'Breathe, name body signals, classify the emotion, check facts and choose an intentional action.',
    },
  ),
  insight(
    19,
    'systems',
    { pl: 'GTD uproszczone', en: 'Simple GTD' },
    { pl: 'Zbierz, przetwórz, zorganizuj, przeglądaj, działaj.', en: 'Capture, process, organize, review, act.' },
    {
      pl: 'System zarządzania zadaniami oparty na cyklu: zbierz wszystko, przetwórz, zorganizuj, przeglądaj i działaj.',
      en: 'A task system based on capturing, processing, organizing, reviewing and acting.',
    },
    {
      pl: 'Zdejmuje z mózgu obowiązek pamiętania. Mózg ma tworzyć, a nie magazynować.',
      en: 'It removes the burden of remembering; the mind should create, not store.',
    },
    {
      pl: 'Nowe pomysły wrzucaj do jednego inboxa. Raz w tygodniu przypisz im priorytet, termin albo usuń.',
      en: 'Put new ideas in one inbox, then review weekly and assign priority, timing or deletion.',
    },
  ),
  insight(
    20,
    'systems',
    { pl: 'Task Batching', en: 'Task Batching' },
    { pl: 'Podobne zadania w jednym bloku.', en: 'Similar tasks in one block.' },
    {
      pl: 'Łączenie podobnych, powtarzalnych zadań w jeden blok czasowy zamiast robienia ich z doskoku.',
      en: 'Grouping similar repetitive tasks into one time block.',
    },
    {
      pl: 'Chroni przed kosztami przełączania kontekstu i zmęczeniem mentalnym.',
      en: 'It reduces context switching and mental fatigue.',
    },
    {
      pl: 'Zamiast odpisywać cały dzień, ustaw dwa bloki komunikacji: rano i późnym popołudniem.',
      en: 'Instead of replying all day, set two communication blocks: morning and late afternoon.',
    },
  ),
  insight(
    21,
    'stress',
    { pl: 'Cognitive Reframing', en: 'Cognitive Reframing' },
    { pl: 'Z zagrożenia w okazję do nauki.', en: 'From threat to learning opportunity.' },
    {
      pl: 'Celowa zmiana sposobu postrzegania sytuacji wywołującej emocje.',
      en: 'Deliberately changing the way you interpret an emotionally loaded situation.',
    },
    {
      pl: 'Angażuje bardziej refleksyjne myślenie zanim zareagujesz impulsywnie.',
      en: 'It engages reflective thinking before an impulsive reaction takes over.',
    },
    {
      pl: 'Gdy projekt idzie źle, zapisz: to nie wyrok, tylko informacja, co poprawić w kolejnej próbie.',
      en: 'When a project goes badly, write: this is data for the next iteration, not a verdict.',
    },
  ),
  insight(
    22,
    'systems',
    { pl: '5 x Dlaczego', en: '5 Whys' },
    { pl: 'Pytaj dlaczego aż do źródła.', en: 'Ask why until the root appears.' },
    {
      pl: 'Zadawanie pytania dlaczego do momentu znalezienia pierwotnej przyczyny problemu.',
      en: 'Asking why repeatedly until the root cause appears.',
    },
    {
      pl: 'Chroni przed leczeniem objawów i pomaga znaleźć małą rzecz, która naprawia duży fragment problemu.',
      en: 'It prevents symptom-fixing and uncovers leverage.',
    },
    {
      pl: 'Przy frustracji z postępów przejdź 5 pytań i zapisz źródło, np. perfekcjonizm albo brak granicy czasu.',
      en: 'When progress stalls, run five whys and name the source, such as perfectionism or weak time limits.',
    },
  ),
  insight(
    23,
    'priorities',
    { pl: 'ABC', en: 'ABC Priorities' },
    { pl: 'A kluczowe, B średnie, C miłe.', en: 'A critical, B medium, C nice-to-have.' },
    {
      pl: 'Szybkie przypisywanie priorytetów: A najwyższy, B średni, C niski.',
      en: 'A fast priority system: A highest, B medium, C low.',
    },
    {
      pl: 'Upraszcza wybór startu dnia i zmniejsza paraliż decyzyjny.',
      en: 'It simplifies where to start and lowers decision paralysis.',
    },
    {
      pl: 'Nie zaczynaj zadania B, jeśli masz niezrobiony blok A.',
      en: 'Do not start B while an A block is still unfinished.',
    },
  ),
  insight(
    24,
    'priorities',
    { pl: 'SMART', en: 'SMART Goals' },
    { pl: 'Konkretny, mierzalny, osiągalny, realny, terminowy.', en: 'Specific, measurable, achievable, realistic, time-bound.' },
    {
      pl: 'Tworzenie celów, które są konkretne, mierzalne, osiągalne, realistyczne i terminowe.',
      en: 'Making goals specific, measurable, achievable, realistic and time-bound.',
    },
    {
      pl: 'Zamienia mgliste marzenie w instrukcję dla mózgu i kalendarza.',
      en: 'It turns a vague wish into instructions for the mind and calendar.',
    },
    {
      pl: 'Zamiast nauczę się LLM, zapisz: do końca miesiąca zrobię prototyp, pracując 1h we wtorki i czwartki.',
      en: 'Instead of learn LLM, write: by month end I will build a prototype with 1h blocks twice a week.',
    },
  ),
  insight(
    25,
    'energy',
    { pl: 'Palming i Focus Shifting', en: 'Palming and Focus Shifting' },
    { pl: 'Reset oczu po ekranie.', en: 'Eye reset after screen work.' },
    {
      pl: 'Palming to zaciemnienie zamkniętych oczu dłońmi. Focus Shifting to zmiana ostrości wzroku między bliskim i dalekim obiektem.',
      en: 'Palming covers closed eyes with your hands. Focus shifting alternates between near and distant focus.',
    },
    {
      pl: 'Redukuje zmęczenie oczu i pomaga wrócić do pracy bez ostrego przeciążenia ekranem.',
      en: 'It reduces eye strain and helps recovery after screen-heavy work.',
    },
    {
      pl: 'Po każdym długim bloku kodowania dodaj 1-2 minuty palmingu albo 10/10 sekund zmiany ostrości.',
      en: 'After a long coding block, add 1-2 minutes of palming or 10/10 focus shifting.',
    },
  ),
  insight(
    26,
    'stress',
    { pl: 'Oddychanie Tęczą', en: 'Rainbow Breathing' },
    { pl: 'Oddech z wizualizacją kolorów.', en: 'Breathing with color visualization.' },
    {
      pl: 'Połączenie głębokiego oddechu z wizualizacją ciepłych kolorów na wdechu i chłodnych na wydechu.',
      en: 'Deep breathing combined with warm colors on inhale and cool colors on exhale.',
    },
    {
      pl: 'Wizualizacja zajmuje uwagę, a oddech uspokaja układ nerwowy.',
      en: 'Visualization occupies attention while breathing calms the nervous system.',
    },
    {
      pl: 'W chaosie usiądź i zrób 5 cykli: ciepły kolor na wdechu, chłodny na wydechu.',
      en: 'In chaos, do 5 cycles: warm color on inhale, cool color on exhale.',
    },
  ),
  insight(
    27,
    'focus',
    { pl: 'Timeboxing', en: 'Timeboxing' },
    { pl: 'Sztywna rama czasu dla zadania.', en: 'A strict time frame for a task.' },
    {
      pl: 'Ustalanie nieprzekraczalnych ram czasowych na wykonanie zadania.',
      en: 'Setting a strict time boundary for a task.',
    },
    {
      pl: 'Zwalcza perfekcjonizm i zapobiega rozciąganiu się małych zadań na cały dzień.',
      en: 'It fights perfectionism and prevents small tasks from expanding all day.',
    },
    {
      pl: 'Daj szukaniu grafik 30 minut. Gdy czas mija, wybierasz najlepszą opcję z tego, co masz.',
      en: 'Give asset search 30 minutes. When time is up, choose the best option you have.',
    },
  ),
  insight(
    28,
    'relationships',
    { pl: 'LAR-LAR / LARA loop', en: 'LAR-LAR / LARA loop' },
    { pl: 'Słuchaj, uznaj, odpowiedz, dopytaj lub dodaj.', en: 'Listen, affirm, respond, ask/add.' },
    {
      pl: 'Praktyczny wariant metody LARA: najpierw słuchasz, uznajesz sens lub emocję, odpowiadasz na konkret, a dopiero potem dopytujesz albo dodajesz własną perspektywę.',
      en: 'A practical variant of LARA: listen, affirm the value or emotion, respond to the actual concern, then ask or add your perspective.',
    },
    {
      pl: 'Pomaga nie przeskakiwać od razu do kontrargumentu. Najpierw budujesz poczucie bycia usłyszanym, co obniża napięcie i zwiększa szansę na dialog.',
      en: 'It prevents jumping straight into counterargument and creates enough safety for dialogue.',
    },
    {
      pl: 'Przy trudnej rozmowie zrób dwie pętle: LAR, potem jeszcze raz LAR z pytaniem ciekawości. Dopiero na końcu dodaj swoje granice lub dane.',
      en: 'In a difficult talk, run two loops: LAR, then another LAR with a curious question. Add your boundary or information at the end.',
    },
    'https://sparqtools.org/lara/',
  ),
]

export const insights: Insight[] = [
  ...timeBlockingMethodInsights,
  ...coreInsights.map((item) => ({ ...item, id: item.id + timeBlockingMethodInsights.length })),
]
