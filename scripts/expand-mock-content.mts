import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const contentDir = path.join(process.cwd(), 'content/v1');
const readJson = async <T>(name: string): Promise<T> => JSON.parse(await readFile(path.join(contentDir, name), 'utf8')) as T;
const writeJson = async (name: string, value: unknown) => writeFile(path.join(contentDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');

type QuestionSkillTag = 'detail' | 'reason' | 'purpose' | 'action' | 'attitude' | 'inference' | 'main-idea' | 'vocabulary-in-context' | 'reference' | 'paragraph-role' | 'structure';
type SetItem = { id: string; theme: string; themeEn?: string; type: string; difficulty: string; audioSrc?: string; segments?: Array<{ start: number; end: number; text: string; speaker?: string }> };
type WritingItem = { id: string; topic: string; prompt: string; outline: string[]; referenceOpening: string; referenceAnswer?: string };
type TranslationItem = { id: string; theme: string; prompt: string; referenceAnswer: string; rubric: string[] };
type ListeningScenario = { intro: string; schedule: string; reason: string; deadline: string; bring: string; experience: string; fallback: string };

const listeningScenarios: ListeningScenario[] = [
  { intro: 'The student volunteer office is organizing reading visits to a nearby primary school.', schedule: 'The new group will meet on Sunday afternoon.', reason: 'A Saturday team reached its maximum size.', deadline: 'Applications close before Thursday noon.', bring: 'Volunteers should bring a student card and one picture book.', experience: 'No teaching experience is needed because mentors will give a short orientation.', fallback: 'Students who miss orientation can watch the recorded briefing.' },
  { intro: 'The library has launched appointments for its research-support desk.', schedule: 'Individual consultations are available on Monday evening.', reason: 'Many students requested help after the daytime desks closed.', deadline: 'Bookings must be made by Friday at six.', bring: 'Visitors need a library card and a draft search question.', experience: 'First-year students are welcome and do not need database experience.', fallback: 'A librarian will answer remaining questions by email.' },
  { intro: 'The academic office is offering a seminar on choosing optional courses.', schedule: 'The seminar takes place at noon on Wednesday.', reason: 'Several popular modules changed their entry requirements.', deadline: 'Students should reserve a seat before Tuesday morning.', bring: 'They should bring their timetable and degree checklist.', experience: 'Advisers will explain the system, so prior planning is unnecessary.', fallback: 'Slides will be posted for anyone with a class conflict.' },
  { intro: 'Residence staff have arranged a meeting about reducing noise in shared halls.', schedule: 'Residents will gather on Friday evening in the common room.', reason: 'Recent complaints increased during the examination period.', deadline: 'Suggestions can be submitted online until Wednesday.', bring: 'Participants are asked to bring one practical proposal.', experience: 'Everyone may speak, even if they have never joined a hall meeting.', fallback: 'Anonymous comments will also be accepted after the meeting.' },
  { intro: 'The student union is holding a fair for clubs seeking new members.', schedule: 'The fair opens Tuesday afternoon in the sports hall.', reason: 'More organizations registered than the original room could hold.', deadline: 'Clubs must confirm their tables by Sunday night.', bring: 'Each group should bring a sign and a short activity.', experience: 'New clubs receive setup guidance from union volunteers.', fallback: 'Late groups can submit a digital introduction for the union website.' },
  { intro: 'The careers center has added a workshop on preparing for internships.', schedule: 'The added workshop begins Thursday at four.', reason: 'The first session filled within one day.', deadline: 'Students must upload a résumé before Wednesday.', bring: 'They should also bring a printed vacancy description.', experience: 'The workshop is designed for applicants with no previous internship.', fallback: 'A résumé checklist will be sent to students who cannot attend.' },
  { intro: 'The city transport office is testing a later campus bus.', schedule: 'The trial bus leaves the main gate at ten thirty each night.', reason: 'A survey showed that evening students lacked a safe connection.', deadline: 'Feedback is requested by the end of the month.', bring: 'Passengers only need their campus travel card.', experience: 'No advance booking is required during the trial.', fallback: 'If the bus is full, an extra vehicle will arrive within fifteen minutes.' },
  { intro: 'An environmental group is starting a reusable-cup campaign in campus cafés.', schedule: 'The launch event is Saturday morning beside the central café.', reason: 'Disposable cup waste rose sharply last semester.', deadline: 'Volunteers should register by Thursday.', bring: 'They need comfortable shoes and a refillable bottle.', experience: 'Campaign training will be provided at the start.', fallback: 'Rain will move the activity into the student center.' },
  { intro: 'The health center is offering a class on planning affordable meals.', schedule: 'The demonstration is scheduled for Sunday at eleven.', reason: 'Students reported relying too often on takeaway food.', deadline: 'Free places can be booked until Friday afternoon.', bring: 'Participants should bring a food container and a pen.', experience: 'Basic ingredients and instructions will be supplied.', fallback: 'The recipes will be published after the class.' },
  { intro: 'The sports department has introduced short exercise sessions between lectures.', schedule: 'Sessions run at one o’clock on Mondays and Thursdays.', reason: 'A pilot found that brief movement improved afternoon concentration.', deadline: 'Students can join the list until the previous evening.', bring: 'Comfortable clothing is recommended, but equipment is provided.', experience: 'Every activity has a beginner version.', fallback: 'Recorded stretching routines are available during bad weather.' },
  { intro: 'The learning center is testing a note-taking application with volunteers.', schedule: 'Training starts online at seven on Tuesday evening.', reason: 'Teachers want evidence about which digital tools reduce revision time.', deadline: 'Volunteers must install the application before Monday night.', bring: 'They need a charged laptop and one set of lecture notes.', experience: 'Technical support will guide anyone unfamiliar with the software.', fallback: 'A telephone help session is offered the following morning.' },
  { intro: 'A study-skills tutor is running a clinic on weekly planning.', schedule: 'Small groups meet Wednesday afternoon for forty minutes.', reason: 'Many students said long task lists made them postpone important work.', deadline: 'A short time-use survey is due on Tuesday.', bring: 'Students should bring their current calendar.', experience: 'The clinic begins with a simple method suitable for beginners.', fallback: 'Those absent receive a blank planning sheet and instructions.' },
  { intro: 'The community office needs students to help older residents use mobile services.', schedule: 'The first visit is next Saturday at the neighborhood center.', reason: 'Residents asked for support with hospital and transport applications.', deadline: 'Volunteer names are needed by Wednesday.', bring: 'Helpers should bring a charged phone but no personal documents.', experience: 'Privacy training is compulsory and will be given before the visit.', fallback: 'Students who cannot travel may answer questions through a supervised video call.' },
  { intro: 'The international office is arranging a low-cost weekend trip to a historic town.', schedule: 'The coach departs at eight on Sunday morning.', reason: 'Saturday was avoided because several departments hold tests then.', deadline: 'Payment and registration are due by Tuesday.', bring: 'Travelers need an identity card and packed lunch.', experience: 'A guide will explain the sites in both Chinese and English.', fallback: 'The fee will be refunded if severe weather cancels the trip.' },
  { intro: 'The language club is recruiting hosts for a campus cultural festival.', schedule: 'Host practice takes place Friday after classes.', reason: 'This year the festival includes twice as many visiting groups.', deadline: 'Applications close at noon on Wednesday.', bring: 'Candidates should prepare a thirty-second welcome.', experience: 'Clear communication matters more than stage experience.', fallback: 'Unselected applicants can still help at information desks.' },
  { intro: 'The engineering school is opening a student innovation laboratory.', schedule: 'Safety tours are offered Tuesday and Thursday mornings.', reason: 'New equipment cannot be used before students complete an introduction.', deadline: 'Tour reservations close one day in advance.', bring: 'Students must wear closed shoes and carry their university card.', experience: 'The tour assumes no laboratory background.', fallback: 'A virtual tour is available for students studying off campus.' },
  { intro: 'The careers team is organizing practice interviews with local employers.', schedule: 'Interviews will be held on Monday evening.', reason: 'Graduating students requested feedback before the autumn recruitment fair.', deadline: 'A résumé must be submitted by Thursday.', bring: 'Candidates should bring the job description they selected.', experience: 'Advisers will provide sample questions beforehand.', fallback: 'Anyone without a booking may attend a group feedback session.' },
  { intro: 'A leadership course is looking for teams to solve a campus navigation problem.', schedule: 'The challenge begins Saturday at nine.', reason: 'Construction has made several common routes confusing for visitors.', deadline: 'Teams of four must register before Wednesday.', bring: 'Each team needs one phone capable of taking photographs.', experience: 'Design experience is helpful but not required.', fallback: 'Solo applicants will be matched with a team on Friday.' },
  { intro: 'Campus security is offering bicycle-safety checks before winter.', schedule: 'Checks take place outside the north gate on Thursday afternoon.', reason: 'Several bicycles were found with weak lights and brakes.', deadline: 'Owners may reserve a slot until Wednesday evening.', bring: 'They should bring the bicycle key and student identification.', experience: 'Mechanics will explain simple maintenance during the check.', fallback: 'Rain will postpone the service until the following Tuesday.' },
  { intro: 'The consumer club is comparing refill shops with ordinary supermarkets.', schedule: 'Volunteers visit both stores on Sunday morning.', reason: 'The club wants to test whether packaging-free shopping really costs less.', deadline: 'Participants must join the shared list by Friday.', bring: 'They need a calculator and two reusable bags.', experience: 'A price-comparison form will be explained before departure.', fallback: 'Receipts can be analyzed online by students unable to visit.' },
  { intro: 'The geography department is installing small weather sensors around campus.', schedule: 'Sensor teams meet at the laboratory on Tuesday afternoon.', reason: 'Local temperature records are needed for a climate study.', deadline: 'Students should select a location before Monday.', bring: 'Each team needs a notebook; all instruments are supplied.', experience: 'A technician will demonstrate calibration.', fallback: 'Indoor data analysis is planned if a storm prevents fieldwork.' },
  { intro: 'The city museum has invited students to test a new audio guide.', schedule: 'Testing begins at ten on Saturday morning.', reason: 'The museum wants clearer directions before the guide is released publicly.', deadline: 'Volunteers must complete a language survey by Thursday.', bring: 'They should bring wired headphones if possible.', experience: 'No knowledge of art history is expected.', fallback: 'Remote volunteers may review the guide transcript instead.' },
  { intro: 'A visiting scientist will speak about reliable information on social media.', schedule: 'The lecture starts Wednesday at half past six.', reason: 'A larger hall was booked after registrations passed two hundred.', deadline: 'Students should claim free tickets before Tuesday noon.', bring: 'Attendees may bring one example of a doubtful online claim.', experience: 'The talk is intended for a general audience.', fallback: 'Questions can be submitted online and the lecture will be streamed.' },
  { intro: 'The computing center is teaching students to run accessible online meetings.', schedule: 'The workshop is held Friday at three in a computer room.', reason: 'Several student groups reported problems with captions and turn-taking.', deadline: 'Group leaders need to register by Wednesday.', bring: 'Participants should bring their usual meeting invitation.', experience: 'The trainer starts with basic platform controls.', fallback: 'A checklist and captioning guide will be emailed afterward.' },
];

function choices(correct: string, distractors: string[], position: number) { const options = [...new Set(distractors.filter((item) => item !== correct))].slice(0, 3); options.splice(position, 0, correct); return { options, answer: position }; }
function alternateFacts<T extends readonly unknown[]>(rows: readonly T[], rowIndex: number, factIndex: number) {
  return [1, 7, 13].map((offset) => String(rows[(rowIndex + offset) % rows.length][factIndex]));
}

const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

function extendEnglish(value: string, minimum: number, subject: string, seed: number) {
  const additions = [
    `The organizers explained that the arrangement would be reviewed after participants had shared practical feedback.`,
    `Clear instructions were published in advance so that beginners could prepare without unnecessary pressure.`,
    `Staff members recorded attendance and common questions to improve the next stage of ${subject}.`,
    `Participants were encouraged to ask for help whenever a detail of the plan seemed unclear.`,
    `The team also considered accessibility, cost, travel time, and the needs of students with busy schedules.`,
    `A short follow-up survey would compare expectations with the experience reported after the activity.`,
    `Organizers emphasized that steady participation mattered more than previous knowledge or special equipment.`,
    `Any later change would be announced through the official campus website and student email system.`,
    `The results could help the university decide whether to continue or expand the same service next term.`,
    `Students who took part would receive a summary of the findings and suggestions for further action.`,
  ];
  let result = value;
  let offset = 0;
  while (countWords(result) < minimum) {
    result += ` ${additions[(seed + offset) % additions.length]}`;
    offset += 1;
  }
  return result;
}

const listeningSets = (await readJson<SetItem[]>('listeningSets.json')).map((set, index) => {
  const scenario = listeningScenarios[index];
  if (!scenario) throw new Error(`Missing listening scenario ${index + 1}`);
  const themeEn = set.themeEn ?? set.theme;
  const segmentRows = set.type === 'conversation'
    ? [
        { speaker: 'Woman', text: `Have you heard? ${scenario.intro}` },
        { speaker: 'Man', text: `Yes. ${scenario.reason}` },
        { speaker: 'Woman', text: `Then remember this change. ${scenario.schedule}` },
        { speaker: 'Man', text: `When do we need to respond? ${scenario.deadline}` },
        { speaker: 'Woman', text: `We should also prepare carefully. ${scenario.bring}` },
        { speaker: 'Man', text: `I have not done this before. ${scenario.experience}` },
        { speaker: 'Woman', text: `That should be fine. ${scenario.fallback}` },
        { speaker: 'Man', text: 'Great. I will follow the instructions and register in time.' },
      ]
    : set.type === 'passage'
      ? [
          { text: scenario.intro },
          { text: `The program responds to a clear need. ${scenario.reason}` },
          { text: `Its timetable is designed to be practical. ${scenario.schedule}` },
          { text: `Students should plan ahead. ${scenario.deadline} ${scenario.bring}` },
          { text: `Beginners can take part with confidence. ${scenario.experience}` },
          { text: `The organizers have also prepared another option. ${scenario.fallback}` },
        ]
      : [
          { text: scenario.intro },
          { text: `${scenario.reason} ${scenario.schedule}` },
          { text: `${scenario.deadline} ${scenario.bring}` },
          { text: scenario.experience },
          { text: scenario.fallback },
        ];
  const listeningMinimum = set.type === 'news' ? 145 : set.type === 'conversation' ? 240 : 220;
  const extended = extendEnglish(segmentRows.map((segment) => segment.text).join(' '), listeningMinimum, themeEn, index);
  const original = segmentRows.map((segment) => segment.text).join(' ');
  const addedText = extended.slice(original.length).trim().match(/[^.!?]+[.!?]+/g) ?? [];
  addedText.forEach((text, addedIndex) => {
    const speaker = set.type === 'conversation' ? (addedIndex % 2 === 0 ? 'Woman' : 'Man') : undefined;
    segmentRows.push({ ...(speaker ? { speaker } : {}), text: text.trim() });
  });
  const segments = segmentRows.map((segment) => segment.text);
  const audioDuration = set.segments?.at(-1)?.end ?? 50;
  const segmentDuration = audioDuration / segments.length;
  const summarySkill: QuestionSkillTag = index % 2 === 0 ? 'main-idea' : 'purpose';
  const values = [scenario.schedule, scenario.reason, scenario.intro, scenario.deadline, scenario.bring, scenario.experience];
  const prompts = [
    index % 2 === 0
      ? `After the original ${themeEn.toLowerCase()} plan became unavailable, which alternative time did the notice announce?`
      : `What revised time should listeners remember after organizers changed the original ${themeEn.toLowerCase()} plan?`,
    `What situation led organizers to schedule the event described as “${scenario.schedule}”?`,
    summarySkill === 'main-idea' ? `Which statement best summarizes the notice that begins “${scenario.intro}”?` : `What is the central purpose of the message introducing “${scenario.intro}”?`,
    `By what point must a listener act before following the plan “${scenario.schedule}”?`,
    `Which preparation matches the notice after the deadline “${scenario.deadline}”?`,
    `What can a first-time participant infer from the statement “${scenario.experience}”?`,
  ];
  const skillTags: QuestionSkillTag[] = ['detail', 'reason', summarySkill, 'action', 'action', 'inference'];
  const scenarioRows = listeningScenarios.map((item) => [item.schedule, item.reason, item.intro, item.deadline, item.bring, item.experience] as const);
  const questions = prompts.map((prompt, questionIndex) => ({ prompt, skillTag: skillTags[questionIndex], ...choices(values[questionIndex], alternateFacts(scenarioRows, index, questionIndex), (index + questionIndex) % 4), explanationZh: `原文依据：${values[questionIndex]}` }));
  const fallbackFacts = listeningScenarios.map((item) => item.fallback);
  const preparationFacts = listeningScenarios.map((item) => `${item.deadline} ${item.bring}`);
  questions.push({
    prompt: `What alternative is available if the main arrangement for ${themeEn} cannot be followed?`,
    skillTag: 'action',
    ...choices(scenario.fallback, [1, 7, 13].map((offset) => fallbackFacts[(index + offset) % fallbackFacts.length]), (index + 2) % 4),
    explanationZh: `原文给出的替代安排是：${scenario.fallback}`,
  }, {
    prompt: `By offering “${scenario.fallback}”, what attitude do the organizers show toward possible difficulties?`,
    skillTag: 'attitude',
    ...choices('They are flexible and willing to help participants.', [`They dismiss every concern raised about ${themeEn}.`, `They insist that no plan connected with ${themeEn} can change.`, `They blame participants before the ${themeEn} activity begins.`], (index + 2) % 4),
    explanationZh: `原文提供替代安排，体现组织者愿意灵活解决困难：${scenario.fallback}`,
  }, {
    prompt: `Which pair of actions would best prepare a student for the ${themeEn} arrangement?`,
    skillTag: 'detail',
    ...choices(`${scenario.deadline} ${scenario.bring}`, [1, 7, 13].map((offset) => preparationFacts[(index + offset) % preparationFacts.length]), (index + 3) % 4),
    explanationZh: `应同时注意截止时间和准备事项：${scenario.deadline} ${scenario.bring}`,
  }, {
    prompt: `What does the message imply about students with little previous experience in ${themeEn}?`,
    skillTag: 'inference',
    ...choices('They can participate because guidance or support is available.', ['They are automatically refused a place.', 'They must organize the entire activity alone.', 'They may join only after completing a university degree.'], index % 4),
    explanationZh: `原文说明会提供支持，因此缺少经验并不会阻止参加：${scenario.experience}`,
  });
  if (set.type === 'passage') {
    questions.push({ prompt: `What practical concern is reflected in the preparation advice for ${themeEn}?`, skillTag: 'purpose', ...choices('Helping participants arrive ready for the activity.', ['Testing whether participants can memorize every rule.', 'Discouraging beginners from joining the activity.', 'Replacing the announced schedule with private meetings.'], (index + 1) % 4), explanationZh: `原文通过准备事项帮助参与者顺利参加：${scenario.bring}` });
    questions.push({ prompt: `Why does the speaker mention the alternative arrangement for ${themeEn}?`, skillTag: 'reason', ...choices('To show that a practical backup is available.', ['To cancel the activity without explanation.', 'To require every participant to pay an extra fee.', 'To prove that the original plan was unnecessary.'], (index + 2) % 4), explanationZh: `原文给出了备用安排：${scenario.fallback}` });
    questions.push({ prompt: `Which action best follows all of the instructions in the ${themeEn} message?`, skillTag: 'action', ...choices('Respond before the deadline and prepare the requested item.', ['Wait until the activity ends before registering.', 'Ignore the announced time and arrive without preparation.', 'Ask an inexperienced friend to replace the organizers.'], (index + 3) % 4), explanationZh: `需要同时遵守截止时间和准备要求：${scenario.deadline} ${scenario.bring}` });
  }
  const extraFacts = [scenario.intro, scenario.schedule, scenario.reason, scenario.deadline, scenario.bring, scenario.experience, scenario.fallback];
  while (questions.length < 16) {
    const extraIndex = questions.length - 10;
    const fact = extraFacts[(extraIndex + index) % extraFacts.length];
    questions.push({
      prompt: `Considering the statement “${fact}”, which conclusion is supported by the complete ${themeEn} message?`,
      skillTag: extraIndex % 2 === 0 ? 'inference' : 'detail',
      ...choices('The announced detail should be understood together with the other instructions.', ['The statement proves that every other instruction can be ignored.', 'The statement describes an unrelated commercial advertisement.', 'The message asks listeners to invent a different event.'], (index + extraIndex) % 4),
      explanationZh: `该细节需要结合全文安排理解：${fact}`,
    });
  }
  const transcript = segmentRows.map((segment) => `${segment.speaker ? `${segment.speaker}: ` : ''}${segment.text}`).join(' ');
  return { ...set, transcript, segments: segmentRows.map((segment, segmentIndex) => ({ start: Number((segmentIndex * segmentDuration).toFixed(3)), end: Number(((segmentIndex + 1) * segmentDuration).toFixed(3)), ...segment })), questions };
});

const readingFacts = [
  ['a peer tutoring trial', 'ten weeks', '86 first-year students', 'weekly goal cards', 'irregular attendance', 'shorter evening sessions'], ['a library seat-booking study', 'six weeks', '240 library users', 'live occupancy updates', 'unused reservations', 'automatic cancellation after fifteen minutes'],
  ['an elective-course guide', 'one semester', '150 students', 'examples from senior students', 'too many technical terms', 'plain-language summaries'], ['a quiet-hours agreement', 'eight weeks', 'nine residence halls', 'resident-led discussions', 'different sleep schedules', 'separate quiet zones'],
  ['a club discovery platform', 'three months', '48 student societies', 'short demonstration videos', 'outdated contact details', 'monthly information checks'], ['an internship reflection project', 'twelve weeks', '72 interns', 'brief weekly journals', 'fear of criticizing workplaces', 'anonymous theme reports'],
  ['a late-bus pilot', 'five weeks', '1,100 passenger trips', 'a predictable timetable', 'delays near the city center', 'a revised evening route'], ['a reusable-container campaign', 'seven weeks', '14 campus cafés', 'small reward points', 'containers being forgotten', 'return boxes near dormitories'],
  ['a low-cost meal program', 'four weeks', '96 participants', 'shopping lists with prices', 'limited cooking equipment', 'recipes requiring one pan'], ['a movement-break experiment', 'nine weeks', '11 lecture groups', 'two-minute guided routines', 'teachers losing track of time', 'automatic classroom reminders'],
  ['a digital note comparison', 'one term', '132 volunteers', 'searchable labels', 'too many notifications', 'a distraction-free mode'], ['a planning-habit challenge', 'twenty-one days', '180 students', 'one priority chosen each morning', 'overly ambitious schedules', 'a three-task daily limit'],
  ['a neighborhood technology clinic', 'two months', '64 older residents', 'patient one-to-one guidance', 'privacy concerns', 'practice accounts with invented data'], ['a regional travel survey', 'six weekends', '310 visitors', 'clear transport maps', 'crowding at famous sites', 'alternative walking routes'],
  ['a student cultural festival', 'four days', '26 international groups', 'bilingual volunteer hosts', 'long queues at popular booths', 'timed entry cards'], ['an open laboratory scheme', 'one semester', '93 student projects', 'rapid safety feedback', 'equipment booking conflicts', 'shared preparation periods'],
  ['a graduate interview program', 'five Saturdays', '120 candidates', 'specific employer comments', 'answers sounding memorized', 'follow-up reflection questions'], ['a team navigation challenge', 'thirty days', '18 mixed-discipline teams', 'testing routes with visitors', 'maps becoming outdated', 'editable digital signs'],
  ['a bicycle-light campaign', 'three weeks', '420 bicycles', 'free evening inspections', 'replacement parts running out', 'advance stock reservations'], ['a packaging-price comparison', 'eight shopping trips', '55 households', 'recording unit prices', 'different product sizes', 'a standard price-per-kilogram measure'],
  ['a campus temperature study', 'one year', '36 sensors', 'hourly automatic readings', 'missing data after storms', 'backup sensors in sheltered locations'], ['a museum audio-guide test', 'two weekends', '175 visitors', 'route instructions before each object', 'headphone volume differences', 'a simple sound check'],
  ['a science-information workshop', 'six sessions', '210 students', 'checking the original source', 'confidence in familiar headlines', 'anonymous prediction exercises'], ['an accessible-meeting review', 'one month', '34 student groups', 'captions and written agendas', 'speakers talking over one another', 'a visible turn-taking queue'],
  ['an artificial-intelligence literacy course', 'seven weeks', '260 learners', 'comparing model answers with evidence', 'trusting fluent wording', 'mandatory source checks'], ['a lifelong-learning survey', 'five months', '600 adults', 'courses linked to personal goals', 'work and family pressure', 'short self-paced units'],
  ['a traditional craft apprenticeship', 'one summer', '42 young participants', 'learning directly from artisans', 'materials being expensive', 'shared community tool kits'], ['a food-waste measurement project', 'fourteen days', '12 dining halls', 'weighing leftovers by dish', 'students misunderstanding labels', 'smaller sample portions'],
  ['a student well-being program', 'eight weeks', '140 volunteers', 'regular peer check-ins', 'reluctance to ask for help', 'private booking channels'], ['a recreational reading circle', 'six months', '95 members', 'freedom to choose short books', 'uneven discussion participation', 'rotating small-group leaders'],
] as const;

const readingSets = (await readJson<SetItem[]>('readingSets.json')).map((set, index) => {
  const [project, duration, participants, aid, challenge, response] = readingFacts[index];
  const endings = ['Most participants wanted the project to continue, and the organizers will measure longer-term results next term.', 'The final survey showed stronger satisfaction, although the team says more evidence is still needed.', 'After the change, participation became steadier and the revised method will be used in a larger trial.'];
  const sentences = [`Researchers examined the issue through ${project} lasting ${duration}.`, `The project involved ${participants} and collected both activity records and short interviews.`, `Participants said ${aid} helped them make consistent progress.`, `The main difficulty was ${challenge}, which reduced the benefit for some people.`, `Organizers responded by introducing ${response} instead of abandoning the project.`, endings[index % endings.length]];
  if (set.type === 'cloze') {
    const clozeWords = ['researchers', 'project', 'involved', 'records', 'interviews', 'participants', 'consistent', 'difficulty', 'responded', 'evidence'];
    const clozePassage = extendEnglish(`Researchers began a campus project that involved ${participants}. They compared activity records with short interviews. Participants reported more consistent progress when ${aid} was available. The main difficulty was ${challenge}, so organizers responded with ${response}. The team will collect further evidence before expanding the program.`, 200, project, index);
    const distractorPool = ['although', 'briefly', 'declined', 'external', 'frequent', 'gradually', 'however', 'independent', 'limited', 'normally', 'previous', 'rarely', 'separate', 'temporary', 'widely'];
    const clozePromptStems = [
      `At the opening of the report on ${project}, choose the word for the people conducting the study.`,
      `In the introduction to ${project}, choose the noun naming the organized study.`,
      `In the participant sentence about ${project}, choose the verb that links the study to its members.`,
      `In the method description for ${project}, choose the noun for stored activity information.`,
      `In the same method description, choose the noun for the short conversations used by the team.`,
      `When the report turns to the people in ${project}, choose the correct plural noun.`,
      `In the progress sentence about ${aid}, choose the adjective meaning steady over time.`,
      `When the report introduces ${challenge}, choose the noun that signals a problem.`,
      `After that problem, choose the verb describing how the organizers reacted.`,
      `In the conclusion to ${project}, choose the noun for information supporting a decision.`,
    ];
    const questions = clozeWords.map((word, questionIndex) => ({
      prompt: clozePromptStems[questionIndex],
      skillTag: questionIndex % 2 === 0 ? 'vocabulary-in-context' : 'structure',
      ...choices(word, [distractorPool[questionIndex], distractorPool[(questionIndex + 5) % distractorPool.length], distractorPool[(questionIndex + 10) % distractorPool.length]], (index + questionIndex) % 4),
      explanationZh: `结合上下文与词性，空格 ${questionIndex + 1} 应填 ${word}。`,
    }));
    return { ...set, passage: clozePassage, questions };
  }
  if (set.type === 'matching') {
    const paragraphs = [
      `The report begins with ${project}, a practical attempt to improve everyday campus life rather than a purely theoretical study.`,
      `The trial continued for ${duration}, giving the organizers enough time to observe changes instead of relying on a single event.`,
      `In total, ${participants} took part, so the team could compare experiences across a reasonably varied group.`,
      `Participants repeatedly identified ${aid} as the feature that made progress easier to maintain.`,
      `The organizers collected activity records as well as short interviews, combining numerical evidence with personal explanations.`,
      `However, ${challenge} emerged as the main obstacle and prevented some people from receiving the same benefit.`,
      `Rather than ending the project, the team introduced ${response} to deal directly with that difficulty.`,
      `After this adjustment, attendance and satisfaction became steadier, although improvement differed from person to person.`,
      `The researchers warn that the present findings should not be treated as final because the trial covered only one campus community.`,
      `A larger follow-up is planned for the next term, when the revised method will be tested for longer and with new participants.`,
    ];
    const statements = [
      'This paragraph introduces the project as a response to an ordinary campus need.',
      'This paragraph explains why the study lasted long enough to reveal patterns.',
      'This paragraph identifies the size and variety of the participant group.',
      'This paragraph names the resource participants considered most helpful.',
      'This paragraph describes the two kinds of evidence used by the researchers.',
      'This paragraph presents the chief barrier to equal benefits.',
      'This paragraph explains the practical change made after a problem appeared.',
      'This paragraph reports improvement while noting that results were not identical.',
      'This paragraph states a limitation that prevents an overconfident conclusion.',
      'This paragraph describes how the research will continue in the future.',
    ];
    const paragraphOptions = 'ABCDEFGHIJ'.split('');
    const questions = statements.map((prompt, questionIndex) => ({
      prompt,
      skillTag: questionIndex === 8 ? 'inference' : questionIndex === 9 ? 'action' : 'detail',
      options: paragraphOptions,
      answer: questionIndex,
      explanationZh: `应匹配段落 ${paragraphOptions[questionIndex]}：${paragraphs[questionIndex]}`,
    }));
    const expandedParagraphs = paragraphs.map((paragraph, paragraphIndex) => extendEnglish(paragraph, 95, `${project} paragraph ${paragraphIndex + 1}`, index + paragraphIndex));
    return { ...set, passage: expandedParagraphs.join('\n\n'), questions };
  }
  const finalSkill: QuestionSkillTag = index % 2 === 0 ? 'paragraph-role' : 'structure';
  const answers = [`The results of ${project}`, duration, participants, 'steady improvement over time', 'The difficulty prevented some participants from receiving the same benefit.', `It presents the practical solution: ${response}.`, response, `It was intended to address ${challenge}.`, 'The organizers see promise in the revised method but still want stronger evidence.', 'Cautiously positive.'];
  const prompts = [
    `Which title best captures the findings from ${project} rather than merely naming the topic?`,
    `What duration is reported for ${project}, the study involving ${participants}?`,
    `In the sentence following “The project involved ${participants}”, who does “Participants” refer to?`,
    `In the account where ${aid} helped, what does “consistent progress” most nearly mean?`,
    `What can be inferred about the effect of ${challenge} on the people studied?`,
    finalSkill === 'paragraph-role' ? `What role does the sentence about ${response} play after the problem of ${challenge}?` : `How does the passage move from the problem of ${challenge} to its conclusion?`,
    `Which change did the organizers introduce after identifying ${challenge}?`,
    `Why was ${response} added to the project?`,
    `What does the final sentence suggest about the future of ${project}?`,
    `Which description best matches the writer's attitude toward the outcome of ${project}?`,
  ];
  const skillTags: QuestionSkillTag[] = ['main-idea', 'detail', 'reference', 'vocabulary-in-context', 'inference', finalSkill, 'detail', 'reason', 'inference', 'attitude'];
  const genericDistractors = [
    alternateFacts(readingFacts, index, 0).map((item) => `The results of ${item}`),
    alternateFacts(readingFacts, index, 1),
    alternateFacts(readingFacts, index, 2),
    ['rapid change without a clear direction', 'a single success that cannot be repeated', 'less effort with no measurable result'],
    ['Every participant benefited equally from the project.', 'The challenge caused the entire project to end immediately.', 'The difficulty was unrelated to the project results.'],
    alternateFacts(readingFacts, index, 5).map((item) => `It introduces an unrelated detail about ${item}.`),
    alternateFacts(readingFacts, index, 5),
    ['It was intended to shorten the reported duration.', 'It was intended to replace every participant.', 'It was added before any difficulty was observed.'],
    ['The project will certainly expand without further review.', 'The organizers have decided to end the project immediately.', 'The results are considered completely unreliable.'],
    ['Entirely negative.', 'Uncritically enthusiastic.', 'Indifferent to the results.'],
  ];
  const evidence = [sentences[0], sentences[0], sentences[1], sentences[2], sentences[3], `${sentences[3]} ${sentences[4]}`, sentences[4], `${sentences[3]} ${sentences[4]}`, sentences[5], sentences[5]];
  const questionLimit = set.type === 'reading' ? 10 : 6;
  const questions = prompts.slice(0, questionLimit).map((prompt, questionIndex) => ({ prompt, skillTag: skillTags[questionIndex], ...choices(answers[questionIndex], genericDistractors[questionIndex], (index * 2 + questionIndex) % 4), explanationZh: `原文依据：${evidence[questionIndex]}` }));
  return { ...set, passage: extendEnglish(sentences.join(' '), 300, project, index), questions };
});

const writingOpenings = [
  'A daily reading habit gives students a reliable way to widen their knowledge and sharpen their thinking.',
  'Volunteer work teaches lessons that are difficult to learn from textbooks alone.',
  'Managing time well does not mean filling every minute; it means protecting time for both study and rest.',
  'Among the habits college students overlook, regular sleep is one of the most important.',
  'Online learning is most useful when flexibility is balanced with self-discipline.',
  'Effective teamwork begins when members understand both their shared goal and their individual responsibility.',
  'A greener campus can begin with one realistic action repeated by many students.',
  'Campus activities deserve support when they help students build skills and genuine connections.',
  'Career planning should start before graduation because useful experience takes time to develop.',
  'Digital tools improve learning only when students control how and when they use them.',
  'Reliable public transport around a university benefits students, staff, and nearby residents alike.',
  'A well-designed cultural exchange activity allows participants to learn with one another rather than simply watch a performance.',
];
const writingOutlines = [
  ['Explain the value of daily reading', 'Describe one realistic campus reading activity', 'Show how students could maintain the habit'],
  ['State what volunteer work can teach', 'Use one specific example', 'Connect the lesson to future study or work'],
  ['Identify the study-rest conflict', 'Explain one scheduling method', 'Describe the result of using it consistently'],
  ['Name one overlooked healthy habit', 'Explain why students neglect it', 'Suggest one university-level improvement'],
  ['Acknowledge the main advantage', 'Explain a common difficulty', 'Set out rules for responsible use'],
  ['Identify a common team problem', 'Explain its effect on the group', 'Propose a practical solution'],
  ['Choose one achievable environmental action', 'Explain its direct impact', 'Show how participation could grow'],
  ['Name the activity that deserves support', 'Explain the skills or connections it develops', 'Recommend how the university should organize it'],
  ['Explain why early planning matters', 'Identify a useful first step', 'Describe how that step supports a later decision'],
  ['Describe how digital tools help', 'Identify one source of distraction', 'Propose clear limits for responsible use'],
  ['Identify one transport problem', 'Describe the proposed improvement', 'Explain who benefits and how'],
  ['Propose one interactive cultural activity', 'Explain how participants would take part', 'Show how it could deepen mutual understanding'],
];
const writingBodies = [
  `Reading for only twenty minutes a day can improve vocabulary, concentration, and the ability to compare different ideas. The university could therefore hold a month-long reading relay. Each participant would choose an accessible book, record one useful sentence after every session, and share a short comment with a small group each Friday. The activity should reward steady participation instead of the number of pages finished, so beginners would not feel pressured. Librarians could prepare themed book lists and quiet reading corners. After the relay, students could keep the same daily time slot and exchange books with their partners. In this way, a temporary campus activity could gradually become a personal habit that supports every subject.`,
  `When students serve real people, they learn to listen carefully, solve unexpected problems, and take responsibility for a result. For instance, a volunteer helping older residents use mobile services may discover that clear instructions require patience rather than technical language. The student must notice confusion, explain one step at a time, and protect private information. Such experience develops communication and empathy, while also showing where one's own knowledge is incomplete. A useful volunteer program should include brief training and a reflection meeting after each visit. Students can then connect the difficulties they met with lessons from class. These practical habits will remain valuable in future teamwork, customer service, and community life.`,
  `A simple method is to divide the day into three blocks: focused study, necessary tasks, and genuine rest. At the beginning of each week, a student can choose two important goals and place fixed study sessions on a calendar. Smaller jobs should fill the spaces around them instead of replacing them. During a study block, the phone can stay outside reach; when the block ends, taking a walk or talking with friends becomes planned recovery rather than guilty delay. The schedule should also leave one open period for unexpected work. After reviewing the plan each evening, students can adjust the next day. Consistent use of this method reduces last-minute pressure and makes both learning and rest more satisfying.`,
  `Many students stay awake to finish assignments or use their phones, then depend on coffee the next morning. This pattern weakens attention, memory, and emotional control, so the extra waking hours often produce poor work. Universities can help by running a two-week sleep challenge rather than giving another general lecture. Participants could set a regular bedtime, record screen-free minutes before sleep, and compare their daytime energy privately. Residence halls might dim common-area lights late at night, while libraries could publicize earlier planning services during busy weeks. The goal is not to control students but to make healthy choices easier. Better sleep would improve classroom participation and reduce the need for exhausting last-minute study.`,
  `Recorded lessons allow students to review difficult points and learn when travel or illness prevents attendance. However, the same screen also carries messages, games, and endless links, while delayed viewing can quickly create a backlog. Students should treat an online course like a real appointment. Before each session, they can close unrelated tabs, write one question to answer, and set a finishing time. Watching should be followed by a short summary or practice task, because passive replay creates an illusion of understanding. A weekly checklist can reveal unfinished lessons before they become overwhelming. Teachers should provide clear deadlines and brief discussion opportunities. With these limits, flexibility supports learning instead of turning into postponement.`,
  `A common team problem is silent disagreement about who should do what. Active members become overloaded, quieter members wait for instructions, and the final work lacks a consistent direction. The group should begin by turning its goal into small tasks with named owners and visible deadlines. A shared page can record decisions, but a ten-minute weekly meeting is still needed to report obstacles and ask for help. The team leader should invite each member to speak and should change assignments when one person is carrying too much. At the end, members can review which process worked rather than only celebrating the product. Clear responsibility and regular communication make cooperation fairer and help everyone contribute useful strengths.`,
  `Reducing disposable cups is achievable because students make the same purchase many times each week. Campus cafés could offer a small discount to customers who bring a reusable cup and lend returnable cups to those who forget. Clear washing stations and return points would remove the main inconvenience. Student volunteers could publish the number of cups avoided each month, allowing participants to see the combined effect of ordinary choices. The campaign should begin with two busy cafés, collect feedback, and expand only after the system works smoothly. Visible results would encourage more people than moral slogans alone. If the habit spreads, the university would reduce waste, lower purchasing costs, and show that environmental action can be practical.`,
  `Collaborative workshops deserve more support than activities in which students only sit and watch. A workshop on public speaking, photography, or cultural storytelling asks participants to create something together, exchange feedback, and meet people outside their usual classes. The university could offer small rooms, basic equipment, and trained student hosts while keeping each group below twenty members. Every meeting should end with a modest product, such as a short presentation or photo story, so progress is visible. Beginners could join an introductory session before choosing a longer project. This structure would produce genuine connections and useful skills without demanding a large budget. Campus life would become a place for participation rather than a calendar of passive events.`,
  `The first step is not choosing a permanent job title but learning what kinds of work match one's interests and abilities. A student can select three possible fields, read real job descriptions, and note the skills that appear repeatedly. The next step is to interview an older student or professional and ask what daily work actually involves. This information can guide the choice of a course, internship, or campus project during the following semester. Keeping a short record of completed tasks and feedback will also make future résumés more specific. Early exploration leaves time to change direction without panic. By graduation, students who have tested several options can make decisions based on evidence instead of fashion or family pressure.`,
  `Calendar applications, online dictionaries, and note systems can save time and make learning materials easier to find. The danger begins when every alert interrupts attention or when students collect resources without using them. A responsible rule is to assign each tool one clear purpose. Notifications should be turned off during focused work, entertainment applications can have daily limits, and important files should follow a simple naming system. Students might also check messages at fixed times instead of reacting immediately. Once a week, they should remove unused applications and review whether a tool improved an actual result. Technology should reduce decisions and support practice; if it creates more distraction than value, the simplest solution may be to stop using it.`,
  `Around many campuses, buses become crowded at class-changing times but arrive too rarely in the evening. The university and city could test a later circular route linking the main gate, residence halls, railway station, and nearby neighborhoods. A mobile timetable should show real arrival times, while the final two services should wait for evening classes to end. During a one-month trial, passenger counts and short surveys could identify which stops are truly needed. Students would gain a safer trip home, staff could work flexible hours, and residents would reach university facilities without driving. If the data show steady demand, the route could become permanent and reduce both traffic pressure and unnecessary private-car journeys.`,
  `The university could organize a culture studio in which small mixed groups learn one another's everyday traditions through a shared task. Instead of watching formal performances, participants might cook a simple festival food, explain the story behind an object, or create a bilingual guide to a local custom. Before the event, each group would prepare questions and agree not to treat one person as the representative of an entire culture. Student hosts could help with language difficulties and make sure everyone contributes. At the end, groups would present what surprised them and correct one earlier assumption. Working together makes differences concrete but not threatening. Such exchange can build curiosity, respectful communication, and friendships that continue after the activity.`,
];
const writingPrompts = (await readJson<WritingItem[]>('writingPrompts.json')).map((item, index) => ({
  ...item,
  outline: writingOutlines[index],
  referenceOpening: writingOpenings[index],
  referenceAnswer: `${writingOpenings[index]} ${writingBodies[index]}`,
}));

const cultureExtensions = [
  ['这种服务体现了中国社会重视互助与集体责任的传统，许多高校还把社区实践作为劳动教育和社会教育的重要组成部分。', 'This service reflects the Chinese tradition of mutual help and collective responsibility. Many universities also regard community practice as an important part of labor and social education.'],
  ['春节、中秋节和端午节等节日承载着丰富的历史记忆，各地还通过庙会、灯会和非遗展示延续独特的地方传统。', 'Festivals such as the Spring Festival, the Mid-Autumn Festival and the Dragon Boat Festival carry rich historical memories. Local traditions are also continued through temple fairs, lantern shows and displays of intangible cultural heritage.'],
  ['高铁网络把许多城市连接起来，使跨地区旅行更加高效，也为中小城市的旅游业和人员往来创造了新的机会。', 'The high-speed railway network connects many cities, making interregional travel more efficient and creating new opportunities for tourism and communication in smaller cities.'],
  ['移动支付覆盖商店、公共交通和生活服务，为居民带来便利，也推动商家不断改进数字化经营方式。', 'Mobile payment covers shops, public transport and daily services. It brings convenience to residents and encourages businesses to improve digital operations.'],
  ['一些博物馆和公共文化机构也推出在线课程，让不同地区的人能够共享优质教育资源并了解中华文明。', 'Museums and public cultural institutions also offer online courses, allowing people in different regions to share quality educational resources and learn about Chinese civilization.'],
  ['中国许多城市正在建设绿色社区，居民通过垃圾分类、公共交通和低碳消费共同改善生活环境。', 'Many Chinese cities are building green communities, where residents improve the environment through waste sorting, public transport and low-carbon consumption.'],
  ['不同地区形成了各具特色的制茶工艺和饮茶礼仪，茶也成为中国与世界开展文化交流的重要媒介。', 'Different regions have developed distinctive tea-making skills and customs. Tea has also become an important medium for cultural exchange between China and the world.'],
  ['不少公园融入传统园林设计，通过山水布局、亭台和季节性植物展现人与自然和谐相处的理念。', 'Many parks incorporate traditional garden design and express harmony between people and nature through landscapes, pavilions and seasonal plants.'],
  ['从古代四大发明到现代航天工程，中国的创新实践始终与改善生产、传播知识和服务社会密切相关。', 'From the four great inventions of ancient China to modern space projects, Chinese innovation has remained closely connected with production, knowledge sharing and public service.'],
  ['太极拳等传统运动把身体锻炼与呼吸、节奏和内心平静结合起来，至今仍受到不同年龄人群的喜爱。', 'Traditional exercises such as tai chi combine physical training with breathing, rhythm and inner calm, and remain popular among people of different ages.'],
  ['近年来，数字技术被用于记录古建筑和传统技艺，使珍贵资料能够长期保存并以更生动的方式向公众展示。', 'Digital technology is now used to record historic buildings and traditional skills, preserving valuable materials and presenting them to the public in more vivid ways.'],
  ['许多乡村依托传统手工艺、特色农业和自然景观发展旅游，在增加收入的同时也努力保护当地文化和生态环境。', 'Many villages develop tourism through traditional crafts, local agriculture and natural scenery, increasing income while protecting local culture and the environment.'],
] as const;
const obsoleteTranslationDetails = [
  '这些实践不仅丰富了日常生活，也让更多人有机会理解传统文化在现代社会中的价值。',
  '有关机构还通过课程、展览和志愿活动鼓励公众参与，使相关知识得到更广泛的传播。',
  '在保护传统特色的同时，人们也不断采用新的方式改善体验并满足现实生活的需要。',
  '越来越多的年轻人开始主动了解这些变化，并用自己的方式参与文化传承与社会服务。',
] as const;
const translationDetails = [
  ['相关活动也吸引了年轻人的关注。', 'Related activities have also attracted the attention of young people.'],
  ['许多学校鼓励学生积极参与。', 'Many schools encourage students to take an active part.'],
  ['新的传播方式让传统更有活力。', 'New forms of communication have brought fresh vitality to the tradition.'],
  ['公众因此有了更多学习机会。', 'The public therefore has more opportunities to learn about it.'],
] as const;
const chineseCount = (value: string) => (value.match(/[\u3400-\u9fff]/g) ?? []).length;
function extendChinese(value: string, referenceAnswer: string, seed: number) {
  let result = obsoleteTranslationDetails.reduce((text, detail) => text.replaceAll(detail, ''), value);
  result = translationDetails.reduce((text, detail) => text.replaceAll(detail[0], ''), result);
  let answer = translationDetails.reduce((text, detail) => text.replaceAll(` ${detail[1]}`, ''), referenceAnswer);
  let offset = 0;
  while (chineseCount(result) < 140) {
    const detail = translationDetails[(seed + offset) % translationDetails.length];
    result += detail[0];
    answer += ` ${detail[1]}`;
    offset += 1;
  }
  return { prompt: result, referenceAnswer: answer };
}
const translations = (await readJson<TranslationItem[]>('translations.json')).map((item, index) => {
  const prompt = item.prompt.includes(cultureExtensions[index][0]) ? item.prompt : `${item.prompt}${cultureExtensions[index][0]}`;
  const referenceAnswer = item.referenceAnswer.includes(cultureExtensions[index][1]) ? item.referenceAnswer : `${item.referenceAnswer} ${cultureExtensions[index][1]}`;
  return { ...item, ...extendChinese(prompt, referenceAnswer, index) };
});

await writeJson('listeningSets.json', listeningSets);
await writeJson('readingSets.json', readingSets);
await writeJson('writingPrompts.json', writingPrompts);
await writeJson('translations.json', translations);
const existingMocks = await readJson<Array<Record<string, unknown>>>('mockExams.json');
const mockExams = Array.from({ length: 10 }, (_, index) => existingMocks[index] ?? {
  id: `mock-${index + 1}`,
  title: `阶段模拟卷 ${index + 1}`,
  listeningSetIds: Array.from({ length: 4 }, (_, offset) => `listen-${String(((index * 4 + offset) % 24) + 1).padStart(2, '0')}`),
  readingSetIds: Array.from({ length: 5 }, (_, offset) => `read-${String(((index * 5 + offset) % 30) + 1).padStart(2, '0')}`),
  translationId: `trans-${String([2, 4, 6, 8][index - 6]).padStart(2, '0')}`,
  writingId: `write-${String([2, 4, 6, 8][index - 6]).padStart(2, '0')}`,
  timingMinutes: 125,
  listeningDistribution: { news: 7, conversation: 8, passage: 10 },
  readingDistribution: { cloze: 10, matching: 10, reading: 10 },
});
await writeJson('mockExams.json', mockExams);
const inventory = await readJson<Record<string, unknown>>('inventory.json');
inventory.listeningSets = listeningSets;
inventory.readingSets = readingSets;
inventory.writingPrompts = writingPrompts;
inventory.translations = translations;
inventory.mockExams = mockExams;
await writeJson('inventory.json', inventory);
console.log({ listeningQuestions: listeningSets.reduce((sum, set) => sum + set.questions.length, 0), readingQuestions: readingSets.reduce((sum, set) => sum + set.questions.length, 0) });
