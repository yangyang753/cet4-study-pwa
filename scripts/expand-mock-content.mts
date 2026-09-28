import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const contentDir = path.join(process.cwd(), 'content/v1');
const readJson = async <T>(name: string): Promise<T> => JSON.parse(await readFile(path.join(contentDir, name), 'utf8')) as T;
const writeJson = async (name: string, value: unknown) => writeFile(path.join(contentDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');

type QuestionSkillTag = 'detail' | 'reason' | 'purpose' | 'action' | 'attitude' | 'inference' | 'main-idea' | 'vocabulary-in-context' | 'reference' | 'paragraph-role' | 'structure';
type SetItem = { id: string; theme: string; themeEn?: string; type: string; difficulty: string; audioSrc?: string; segments?: Array<{ start: number; end: number; text: string }> };
type WritingItem = { id: string; topic: string; prompt: string; outline: string[]; referenceOpening: string };
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

const listeningSets = (await readJson<SetItem[]>('listeningSets.json')).map((set, index) => {
  const scenario = listeningScenarios[index];
  if (!scenario) throw new Error(`Missing listening scenario ${index + 1}`);
  const themeEn = set.themeEn ?? set.theme;
  const segments = [scenario.intro, `${scenario.reason} ${scenario.schedule}`, `${scenario.deadline} ${scenario.bring}`, scenario.experience, scenario.fallback];
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
  return { ...set, transcript: segments.join(' '), segments: segments.map((text, segmentIndex) => ({ start: Number((segmentIndex * segmentDuration).toFixed(3)), end: Number(((segmentIndex + 1) * segmentDuration).toFixed(3)), text })), questions };
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
    const clozePassage = `Researchers began a campus project that involved ${participants}. They compared activity records with short interviews. Participants reported more consistent progress when ${aid} was available. The main difficulty was ${challenge}, so organizers responded with ${response}. The team will collect further evidence before expanding the program.`;
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
  return { ...set, passage: sentences.join(' '), questions };
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
const writingPrompts = (await readJson<WritingItem[]>('writingPrompts.json')).map((item, index) => ({
  ...item,
  outline: writingOutlines[index],
  referenceOpening: writingOpenings[index],
}));

await writeJson('listeningSets.json', listeningSets);
await writeJson('readingSets.json', readingSets);
await writeJson('writingPrompts.json', writingPrompts);
const inventory = await readJson<Record<string, unknown>>('inventory.json');
inventory.listeningSets = listeningSets;
inventory.readingSets = readingSets;
inventory.writingPrompts = writingPrompts;
await writeJson('inventory.json', inventory);
console.log({ listeningQuestions: listeningSets.reduce((sum, set) => sum + set.questions.length, 0), readingQuestions: readingSets.reduce((sum, set) => sum + set.questions.length, 0) });
