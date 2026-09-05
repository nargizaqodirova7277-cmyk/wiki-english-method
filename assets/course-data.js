/*
 * WIKI ENGLISH — course configuration (single source of truth)
 *
 * Every learning-path node points at a REAL file that already exists in the
 * repository: an in-page anchor of a generated lesson page, a stand-alone
 * lesson page, or the project's GitHub wiki (for the "write your own page",
 * "peer feedback", "revise" and "history" steps). Nothing here invents lesson
 * content. All in-repo URLs are document-relative so the site works unchanged
 * under the GitHub Pages base path /wiki-english-method/.
 */

export const WIKI = 'https://github.com/nargizaqodirova7277-cmyk/wiki-english-method';
export const WIKI_HOME = WIKI + '/wiki';
export const WIKI_NEW = WIKI + '/wiki/_new';

/*
 * Node kinds. `xp` is awarded once per node id (see state.js).
 * completion:
 *   'visit'    — self-marked, but only after the linked lesson section was opened
 *   'external' — self-marked; the work is done on the GitHub wiki, never "verified" here
 *   'auto'     — marked complete directly (rest / reflection stops)
 */
export const KINDS = {
  objectives:    { label: 'Learning objectives',   short: 'Maqsadlar',       icon: '◆', xp: 5,  completion: 'visit' },
  warmup:        { label: 'Warm-up',               short: 'Warm-up',         icon: '◇', xp: 5,  completion: 'visit' },
  vocab:         { label: 'Technical vocabulary',  short: 'Lug‘at',     icon: '▤', xp: 15, completion: 'visit' },
  audio:         { label: 'Audio concept map',     short: 'Audio',           icon: '♪', xp: 10, completion: 'visit' },
  reading:       { label: 'Reading',               short: 'O‘qish',     icon: '▥', xp: 15, completion: 'visit' },
  comprehension: { label: 'Comprehension',         short: 'Tushunish',       icon: '❓', xp: 10, completion: 'visit' },
  language:      { label: 'Language focus',        short: 'Til qoidasi',     icon: '↔', xp: 10, completion: 'visit' },
  tasks:         { label: 'Levelled tasks',        short: 'Darajali mashq',  icon: '⬢', xp: 20, completion: 'visit' },
  conceptmap:    { label: 'Concept map',           short: 'Concept map',     icon: '⬡', xp: 10, completion: 'visit' },
  break:         { label: 'Short break',           short: 'Tanaffus',        icon: '⏸', xp: 0,  completion: 'auto'  },
  homework:      { label: 'Homework',              short: 'Uyga vazifa',     icon: '➕', xp: 15, completion: 'visit' },
  wikiCreate:    { label: 'Create your Wiki page', short: 'Wiki sahifa',     icon: '✎', xp: 30, completion: 'external' },
  peerFeedback:  { label: 'Peer feedback',         short: 'Sherik fikri',    icon: '⇄', xp: 25, completion: 'external' },
  revise:        { label: 'Revise after feedback', short: 'Qayta tahrir',    icon: '↻', xp: 20, completion: 'external' },
  history:       { label: 'See your growth',       short: 'Wiki History',    icon: '⌚', xp: 10, completion: 'external' },
  speaking:      { label: 'Speaking presentation', short: 'Og‘zaki',    icon: '▸', xp: 20, completion: 'visit' },
  checkpoint:    { label: 'Module checkpoint',     short: 'Nazorat',         icon: '⚑', xp: 15, completion: 'visit' },
};

/* Left navigation — the five required sections. */
export const NAV = [
  { id: 'path',     label: 'O‘quv yo‘li',    href: '#learning-path', kind: 'section' },
  { id: 'projects', label: 'Wiki loyihalar',           href: WIKI_HOME,        kind: 'external' },
  { id: 'team',     label: 'Jamoa',                    href: '#jamoa',         kind: 'section' },
  { id: 'results',  label: 'Natijalar',                href: '#natijalar',     kind: 'section' },
  { id: 'guide',    label: 'Qo‘llanma',           href: 'lessons/How-to-Work.html', kind: 'page' },
];

/* Extra reference material surfaced under "Qo'llanma". */
export const GUIDE_LINKS = [
  { label: 'Ishlash tartibi (5 qadam)', href: 'lessons/How-to-Work.html' },
  { label: 'Platforma qoidalari / Netiket', href: 'lessons/Platform-Rules.html' },
  { label: 'Baholash mezonlari (20 ball)', href: 'lessons/Assessment.html' },
  { label: 'O‘quv yo‘nalishlari', href: 'lessons/Learning-Focus.html' },
  { label: 'Audio va lug‘at', href: 'lessons/Audio-Glossary.html' },
  { label: 'Mas’uliyatli raqamli yordam', href: 'lessons/AI-Scaffolding.html' },
];

/*
 * Badges. `test` receives a summary object built in state.js:
 *   { completedByKind: {kind: count}, modulesCompleted: number }
 * Criteria are concrete and the predicates are idempotent.
 */
export const BADGES = [
  { id: 'first-wiki',   label: 'First Wiki Page',   icon: '✎', desc: 'Birinchi Wiki sahifangizni yarating.',              test: (s) => (s.completedByKind.wikiCreate || 0) >= 1 },
  { id: 'helpful',      label: 'Helpful Reviewer',  icon: '⇄', desc: 'Uch marta sherik ishiga mazmunli fikr bildiring.',  test: (s) => (s.completedByKind.peerFeedback || 0) >= 3 },
  { id: 'revision',     label: 'Revision Master',   icon: '↻', desc: 'Uch marta feedback asosida qayta tahrir qiling.',   test: (s) => (s.completedByKind.revise || 0) >= 3 },
  { id: 'speaking',     label: 'Speaking Explorer', icon: '▸', desc: 'Birinchi og‘zaki taqdimotni bajaring.',        test: (s) => (s.completedByKind.speaking || 0) >= 1 },
  { id: 'module',       label: 'Module Completer',  icon: '⚑', desc: 'Kamida bitta modulni to‘liq yakunlang.',       test: (s) => s.modulesCompleted >= 1 },
  { id: 'course',       label: 'Course Completer',  icon: '★', desc: 'Barcha 12 modulni yakunlang.',                      test: (s) => s.modulesCompleted >= 12 },
];

/* Verbatim technical-vocabulary tables (used by the flashcard mini-exercise). */
export const VOCAB = {
  1: [
    { term: 'digital literacy', definition: 'raqamli savodxonlik', example: 'Digital literacy helps students use technology effectively.' },
    { term: 'programming', definition: 'dasturlash', example: 'Programming is a core skill for software engineers.' },
    { term: 'debugging', definition: 'xatoni topish va tuzatish', example: 'Debugging improves software reliability.' },
    { term: 'algorithm', definition: 'masalani yechish qadamlari', example: 'A clear algorithm makes a solution easier to implement.' },
    { term: 'version control', definition: 'kod o‘zgarishlarini boshqarish', example: 'Version control supports safe collaboration.' },
    { term: 'problem-solving', definition: 'muammoni yechish', example: 'Developers use problem-solving every day.' },
    { term: 'communication', definition: 'muloqot', example: 'Clear communication prevents misunderstandings.' },
    { term: 'collaboration', definition: 'hamkorlik', example: 'Collaboration helps teams build better products.' },
    { term: 'innovation', definition: 'yangilik yaratish', example: 'Innovation creates new technical opportunities.' },
    { term: 'continuous learning', definition: 'uzluksiz o‘rganish', example: 'Continuous learning is important in a changing industry.' },
  ],
  2: [
    { term: 'teamwork', definition: 'jamoaviy ish', example: 'Good teamwork improves project results.' },
    { term: 'role', definition: 'vazifa yoki lavozim', example: 'Every member should understand their role.' },
    { term: 'responsibility', definition: 'mas’uliyat', example: 'Testing is the tester’s responsibility.' },
    { term: 'task', definition: 'topshiriq', example: 'The team divided the project into smaller tasks.' },
    { term: 'communication', definition: 'muloqot', example: 'Clear communication reduces mistakes.' },
    { term: 'collaboration', definition: 'hamkorlik', example: 'Collaboration helps developers share ideas.' },
    { term: 'team leader', definition: 'jamoa rahbari', example: 'The team leader coordinates the work.' },
    { term: 'developer', definition: 'dasturchi', example: 'The developer implements the feature.' },
    { term: 'tester', definition: 'sinovchi', example: 'The tester reports software defects.' },
    { term: 'deadline', definition: 'oxirgi muddat', example: 'We must finish the task before the deadline.' },
  ],
  3: [
    { term: 'artificial intelligence', definition: 'human-like tasks performed by software', example: 'Artificial intelligence can classify data.' },
    { term: 'machine learning', definition: 'systems learning patterns from data', example: 'Machine learning improves with useful data.' },
    { term: 'dataset', definition: 'a structured collection of data', example: 'The team cleaned the dataset before training.' },
    { term: 'prompt', definition: 'an instruction given to an AI system', example: 'A clear prompt produces a more relevant answer.' },
    { term: 'output', definition: 'a result produced by a system', example: 'The developer reviewed the generated output.' },
    { term: 'bias', definition: 'an unfair or systematic preference', example: 'Biased data can create unfair results.' },
    { term: 'accuracy', definition: 'how often a result is correct', example: 'The team measured the model’s accuracy.' },
    { term: 'verification', definition: 'checking whether information is correct', example: 'Human verification is necessary before release.' },
  ],
  4: [
    { term: 'learning platform', definition: 'an online environment for study', example: 'The learning platform stores course materials.' },
    { term: 'accessibility', definition: 'usability for people with different needs', example: 'Captions improve accessibility.' },
    { term: 'user interface', definition: 'the visible controls of software', example: 'A simple user interface reduces confusion.' },
    { term: 'feedback', definition: 'information about performance', example: 'Immediate feedback helps students correct mistakes.' },
    { term: 'progress tracking', definition: 'recording completed learning', example: 'Progress tracking shows unfinished activities.' },
    { term: 'adaptive learning', definition: 'content changing to learner needs', example: 'Adaptive learning provides easier or harder tasks.' },
    { term: 'offline access', definition: 'use without an internet connection', example: 'Offline access supports students in remote areas.' },
    { term: 'engagement', definition: 'active interest and participation', example: 'Short activities can improve engagement.' },
  ],
  5: [
    { term: 'frontend', definition: 'the part users see and interact with', example: 'The frontend displays the dashboard.' },
    { term: 'backend', definition: 'server-side logic and processing', example: 'The backend validates the request.' },
    { term: 'database', definition: 'organized storage for information', example: 'The database stores user profiles.' },
    { term: 'requirement', definition: 'a needed function or condition', example: 'The team documents every requirement.' },
    { term: 'prototype', definition: 'an early model of a product', example: 'Users tested the prototype before development.' },
    { term: 'responsive design', definition: 'layout adapting to screen size', example: 'Responsive design improves mobile use.' },
    { term: 'authentication', definition: 'confirming a user’s identity', example: 'Authentication protects private accounts.' },
    { term: 'deployment', definition: 'making software available to users', example: 'Deployment moved the application to production.' },
  ],
  6: [
    { term: 'native app', definition: 'an app built for one platform', example: 'A native app can use device features directly.' },
    { term: 'cross-platform', definition: 'software working on several platforms', example: 'Cross-platform development can reduce cost.' },
    { term: 'touch interface', definition: 'controls operated by touch', example: 'The touch interface uses large clear buttons.' },
    { term: 'notification', definition: 'a short message from an app', example: 'The app sends a deadline notification.' },
    { term: 'permission', definition: 'approval to access a device feature', example: 'The camera permission must be explained.' },
    { term: 'battery usage', definition: 'energy consumed by an app', example: 'Background tracking increases battery usage.' },
    { term: 'offline mode', definition: 'functions available without internet', example: 'Offline mode stores unfinished work locally.' },
    { term: 'usability testing', definition: 'observing people using a product', example: 'Usability testing revealed a confusing menu.' },
  ],
  7: [
    { term: 'bug', definition: 'a defect in software', example: 'A bug prevents the form from saving.' },
    { term: 'reproduce', definition: 'make the problem happen again', example: 'The tester reproduced the issue on Android.' },
    { term: 'expected result', definition: 'what should happen', example: 'The expected result is a confirmation message.' },
    { term: 'actual result', definition: 'what really happens', example: 'The actual result is a blank screen.' },
    { term: 'severity', definition: 'how much damage a bug causes', example: 'Data loss gives the bug high severity.' },
    { term: 'log', definition: 'recorded technical events', example: 'The developer checked the server log.' },
    { term: 'root cause', definition: 'the underlying reason for a problem', example: 'An invalid query was the root cause.' },
    { term: 'regression test', definition: 'checking that a fix breaks nothing else', example: 'A regression test protected the login flow.' },
  ],
  8: [
    { term: 'threat', definition: 'something that may cause harm', example: 'Phishing is a common threat.' },
    { term: 'vulnerability', definition: 'a weakness that can be exploited', example: 'The old library contained a vulnerability.' },
    { term: 'risk', definition: 'likelihood and impact of harm', example: 'The team evaluated the security risk.' },
    { term: 'authentication', definition: 'verifying identity', example: 'Multi-factor authentication protects accounts.' },
    { term: 'authorization', definition: 'deciding what a user may access', example: 'Authorization blocks access to admin pages.' },
    { term: 'encryption', definition: 'protecting data by encoding it', example: 'Encryption protects data in transit.' },
    { term: 'patch', definition: 'an update fixing a problem', example: 'The administrator installed the security patch.' },
    { term: 'phishing', definition: 'a message designed to steal information', example: 'The phishing email copied the university logo.' },
  ],
  9: [
    { term: 'milestone', definition: 'an important project point', example: 'The prototype is our first milestone.' },
    { term: 'backlog', definition: 'a list of planned work', example: 'The team prioritized the backlog.' },
    { term: 'sprint', definition: 'a short fixed work period', example: 'The sprint lasts two weeks.' },
    { term: 'assignee', definition: 'the person responsible for a task', example: 'Each task has one assignee.' },
    { term: 'priority', definition: 'the importance of work', example: 'Security fixes have high priority.' },
    { term: 'dependency', definition: 'work relying on other work', example: 'Testing has a dependency on deployment.' },
    { term: 'blocker', definition: 'a problem stopping progress', example: 'Missing access is the current blocker.' },
    { term: 'status update', definition: 'a short progress report', example: 'The leader shared a weekly status update.' },
  ],
  10: [
    { term: 'role', definition: 'a defined job in a team', example: 'A QA engineer has a quality-focused role.' },
    { term: 'qualification', definition: 'knowledge or experience required', example: 'The position requires a technical qualification.' },
    { term: 'hard skill', definition: 'measurable technical ability', example: 'SQL is a useful hard skill.' },
    { term: 'soft skill', definition: 'ability to work effectively with people', example: 'Communication is an essential soft skill.' },
    { term: 'portfolio', definition: 'evidence of completed work', example: 'Her portfolio includes three web projects.' },
    { term: 'internship', definition: 'supervised entry-level work experience', example: 'The internship provides practical experience.' },
    { term: 'job description', definition: 'a document explaining a position', example: 'Read the job description before applying.' },
    { term: 'career path', definition: 'a sequence of professional development', example: 'His career path leads toward system architecture.' },
  ],
  11: [
    { term: 'privacy', definition: 'control over personal information', example: 'Privacy requires limited data collection.' },
    { term: 'consent', definition: 'informed agreement', example: 'Users gave consent before sharing location.' },
    { term: 'transparency', definition: 'openness about decisions and processes', example: 'Transparency explains how recommendations work.' },
    { term: 'accountability', definition: 'responsibility for actions and results', example: 'The company accepted accountability for the failure.' },
    { term: 'fairness', definition: 'equal and unbiased treatment', example: 'The team tested the system for fairness.' },
    { term: 'conflict of interest', definition: 'competing personal and professional interests', example: 'The reviewer declared a conflict of interest.' },
    { term: 'intellectual property', definition: 'legally protected creative work', example: 'The license protects intellectual property.' },
    { term: 'stakeholder', definition: 'a person affected by a decision', example: 'Students are key stakeholders in the project.' },
  ],
  12: [
    { term: 'social impact', definition: 'an effect on people and communities', example: 'Online banking has a broad social impact.' },
    { term: 'digital divide', definition: 'unequal access to digital technology', example: 'Rural connectivity affects the digital divide.' },
    { term: 'inclusion', definition: 'enabling different groups to participate', example: 'Accessible design supports inclusion.' },
    { term: 'automation', definition: 'technology performing human tasks', example: 'Automation changes routine office work.' },
    { term: 'sustainability', definition: 'meeting needs with long-term responsibility', example: 'Efficient software supports sustainability.' },
    { term: 'unintended consequence', definition: 'an effect that was not planned', example: 'Recommendation systems can have unintended consequences.' },
    { term: 'public interest', definition: 'the well-being of society', example: 'Safety decisions should protect the public interest.' },
    { term: 'digital literacy', definition: 'ability to use technology effectively', example: 'Digital literacy helps citizens access services.' },
  ],
};

/* Build the repeated 13-node spine shared by modules 3–12. */
function standardModule(n, slug, name, goal, langFrag, firstTaskFrag) {
  const L = (frag) => 'lessons/' + slug + '.html#' + frag;
  const page = 'lessons/' + slug + '.html';
  const wikiName = 'Ism-Module-' + n;
  return {
    n: n,
    slug: slug,
    name: name,
    goal: goal,
    wikiName: wikiName,
    overview: page,
    nodes: [
      { id: 'm' + n + '-objectives', kind: 'objectives', href: L('o-quv-maqsadlari'),
        goal: 'Modulning to‘rt o‘quv maqsadi bilan tanishing.' },
      { id: 'm' + n + '-warmup', kind: 'warmup', href: L('warm-up'),
        goal: 'Juftlikda warm-up savollarini muhokama qiling.' },
      { id: 'm' + n + '-vocab', kind: 'vocab', href: L('technical-vocabulary'), vocabKey: n,
        goal: 'Modulning ' + VOCAB[n].length + ' ta terminini kontekstda o‘rganing.' },
      { id: 'm' + n + '-reading', kind: 'reading', href: L('reading'),
        goal: 'Amaliy vaziyat matnini o‘qing.' },
      { id: 'm' + n + '-comprehension', kind: 'comprehension', href: L('comprehension'),
        goal: 'To‘rt tushunish savoliga javob bering.' },
      { id: 'm' + n + '-language', kind: 'language', href: L(langFrag),
        goal: 'Modulning til qolipini (connectors) mashq qiling.' },
      { id: 'm' + n + '-tasks', kind: 'tasks', href: L('darajali-topshiriqlar'),
        goal: 'O‘z darajangizdagi topshiriqni tanlang va bajaring.',
        levels: [
          { label: 'Beginner', href: L(firstTaskFrag) },
          { label: 'Intermediate', href: L('intermediate-b1') },
          { label: 'Advanced', href: L('advanced-b2') },
        ] },
      { id: 'm' + n + '-wiki', kind: 'wikiCreate', href: WIKI_NEW, external: true,
        instructionsHref: L('wiki-writing'),
        goal: 'Wiki’da «' + wikiName + '» sahifasini yarating: 5+ modul termini, 2+ dalil, muvozanatli xulosa.' },
      { id: 'm' + n + '-peer', kind: 'peerFeedback', href: WIKI_HOME, external: true,
        instructionsHref: L('peer-review'), rubricHref: 'lessons/Assessment.html',
        netiquetteHref: 'lessons/Platform-Rules.html',
        goal: 'Sherik ishiga alohida feedback sahifasida: 1 yutuq, 1 aniq taklif, 1 termin — rubrika bandiga bog‘lang.' },
      { id: 'm' + n + '-revise', kind: 'revise', href: WIKI_HOME, external: true,
        instructionsHref: L('wiki-writing'),
        goal: 'Feedback asosida faqat o‘z sahifangizni tahrirlang; sherik matnini o‘zgartirmang.' },
      { id: 'm' + n + '-history', kind: 'history', href: WIKI_HOME, external: true,
        instructionsHref: 'lessons/How-to-Work.html',
        goal: 'Sahifangiz History bo‘limini oching va dastlabki hamda qayta ishlangan variantni solishtiring.' },
      { id: 'm' + n + '-speaking', kind: 'speaking', href: L('self-assessment'),
        goal: 'Self-assessment ro‘yxati asosida sahifangizni 2–3 daqiqada og‘zaki taqdim eting.' },
      { id: 'm' + n + '-checkpoint', kind: 'checkpoint', href: page,
        goal: 'Modul vazifasi bajarilganini tasdiqlang.' },
    ],
  };
}

export const COURSE = [
  /* ---- Module 1 : 8 dedicated sub-pages, no shared anchors ---- */
  {
    n: 1,
    slug: 'Importance-of-IT-Skills-in-Software-Engineering',
    name: 'Importance of IT Skills',
    goal: 'IT ko‘nikmalarining kasbiy ahamiyatini ingliz tilida tushuntiring.',
    wikiName: 'Ism-Module-1',
    overview: 'lessons/Importance-of-IT-Skills-in-Software-Engineering.html',
    nodes: [
      { id: 'm1-objectives', kind: 'objectives', href: 'lessons/Module-1-Objectives.html',
        goal: 'Modul natijalari va muvaffaqiyat mezoni bilan tanishing.' },
      { id: 'm1-vocab', kind: 'vocab', href: 'lessons/Module-1-Vocabulary.html', vocabKey: 1,
        goal: '10 ta asosiy IT terminini misol gaplar bilan o‘rganing.' },
      { id: 'm1-audio', kind: 'audio', href: 'lessons/Audio-Module-1.html',
        goal: 'Terminlar zanjirini tinglang va talaffuzni mashq qiling.' },
      { id: 'm1-tasks', kind: 'tasks', href: 'lessons/Module-1-DiffLevels.html',
        goal: 'Beginner, Intermediate yoki Advanced topshiriqni tanlang.',
        levels: [
          { label: 'Beginner', href: 'lessons/Module-1-DiffLevels.html#beginner-a1-a2' },
          { label: 'Intermediate', href: 'lessons/Module-1-DiffLevels.html#intermediate-b1' },
          { label: 'Advanced', href: 'lessons/Module-1-DiffLevels.html#advanced-b2' },
        ] },
      { id: 'm1-wiki', kind: 'wikiCreate', href: WIKI_NEW, external: true,
        instructionsHref: 'lessons/Module-1-WikiWriting.html',
        goal: 'Wiki’da «Ism-Module-1» sahifasini yarating: 4+ termin, aniq asosiy fikr, misol, xulosa.' },
      { id: 'm1-peer', kind: 'peerFeedback', href: WIKI_HOME, external: true,
        instructionsHref: 'lessons/Module-1-WikiWriting.html#peer-review',
        rubricHref: 'lessons/Assessment.html', netiquetteHref: 'lessons/Platform-Rules.html',
        goal: 'Sherik matniga: Strong point, Suggestion va to‘g‘ri ishlatilgan bitta termin yozing.' },
      { id: 'm1-revise', kind: 'revise', href: WIKI_HOME, external: true,
        instructionsHref: 'lessons/AI-Grammar.html',
        goal: 'Feedback va grammatik tekshiruvdan so‘ng o‘z sahifangizni qayta tahrirlang.' },
      { id: 'm1-break', kind: 'break', href: 'lessons/Module-1-WikiBreak.html',
        goal: '5 daqiqa tanaffus qiling, so‘ng matnni ovoz chiqarib o‘qing.' },
      { id: 'm1-history', kind: 'history', href: WIKI_HOME, external: true,
        instructionsHref: 'lessons/How-to-Work.html',
        goal: 'Sahifangiz History bo‘limida o‘zgarishlar tarixini ko‘rib chiqing.' },
      { id: 'm1-homework', kind: 'homework', href: 'lessons/Module-1-Homework.html',
        goal: '«My IT skills» bo‘yicha 100–150 so‘zli paragraf tayyorlang.' },
      { id: 'm1-speaking', kind: 'speaking', href: 'lessons/Module-1-Assessment.html',
        goal: 'Reflection savollari asosida o‘rgangan fikringizni og‘zaki bayon qiling.' },
      { id: 'm1-checkpoint', kind: 'checkpoint', href: 'lessons/Module-1-Assessment.html',
        goal: 'O‘z-o‘zini baholash jadvalini to‘ldiring va modulni yakunlang.' },
    ],
  },

  /* ---- Module 2 : 7 dedicated sub-pages ---- */
  {
    n: 2,
    slug: 'Module-2-Teamwork',
    name: 'Teamwork in IT Projects',
    goal: 'IT jamoasidagi rol, mas’uliyat va muloqotni ifodalang.',
    wikiName: 'Ism-Module-2',
    overview: 'lessons/Module-2-Teamwork.html',
    nodes: [
      { id: 'm2-objectives', kind: 'objectives', href: 'lessons/Module-2-Objectives.html',
        goal: 'Modul maqsadlari va muvaffaqiyat mezoni bilan tanishing.' },
      { id: 'm2-warmup', kind: 'warmup', href: 'lessons/Module-2-Warm-up.html',
        goal: 'Jamoa vaziyatini o‘qing va muhokama savollariga javob bering.' },
      { id: 'm2-vocab', kind: 'vocab', href: 'lessons/Module-2-Vocabulary.html', vocabKey: 2,
        goal: '10 ta teamwork terminini misol gaplar bilan o‘rganing.' },
      { id: 'm2-conceptmap', kind: 'conceptmap', href: 'lessons/Module-2-ConceptMap.html',
        goal: 'Samarali IT jamoasi tarkibini concept map orqali ko‘ring.' },
      { id: 'm2-tasks', kind: 'tasks', href: 'lessons/Module-2-Beginner-Task.html',
        goal: 'O‘z darajangizdagi teamwork topshirig‘ini bajaring.',
        levels: [
          { label: 'Beginner', href: 'lessons/Module-2-Beginner-Task.html' },
          { label: 'Intermediate', href: 'lessons/Module-2-Intermediate-Task.html' },
          { label: 'Advanced', href: 'lessons/Module-2-Advanced-Task.html' },
        ] },
      { id: 'm2-wiki', kind: 'wikiCreate', href: WIKI_NEW, external: true,
        instructionsHref: 'lessons/Module-2-Teamwork.html',
        goal: 'Wiki’da «Ism-Module-2» sahifasini yarating: rol, mas’uliyat, muloqot va muddatni yoriting.' },
      { id: 'm2-peer', kind: 'peerFeedback', href: WIKI_HOME, external: true,
        instructionsHref: 'lessons/How-to-Work.html', rubricHref: 'lessons/Assessment.html',
        netiquetteHref: 'lessons/Platform-Rules.html',
        goal: 'Sherik ishiga: 1 kuchli tomon, 1 aniq taklif, 1 termin — rubrika bandiga bog‘lang.' },
      { id: 'm2-revise', kind: 'revise', href: WIKI_HOME, external: true,
        instructionsHref: 'lessons/AI-Grammar.html',
        goal: 'Feedback asosida faqat o‘z sahifangizni qayta tahrirlang.' },
      { id: 'm2-history', kind: 'history', href: WIKI_HOME, external: true,
        instructionsHref: 'lessons/How-to-Work.html',
        goal: 'Sahifangiz History bo‘limida dastlabki va qayta ishlangan variantni solishtiring.' },
      { id: 'm2-speaking', kind: 'speaking', href: 'lessons/Module-2-Objectives.html',
        goal: 'Jamoa hamkorligi bo‘yicha guruh fikrini 2–3 daqiqada og‘zaki umumlashtiring.' },
      { id: 'm2-checkpoint', kind: 'checkpoint', href: 'lessons/Module-2-Teamwork.html',
        goal: 'Modul vazifasi bajarilganini tasdiqlang.' },
    ],
  },

  /* ---- Modules 3–12 : single self-contained page each ---- */
  standardModule(3, 'Module-3-Artificial-Intelligence', 'Artificial Intelligence',
    'AI imkoniyati va cheklovlarini mas’uliyatli tahlil qiling.',
    'language-focus-cause-and-contrast', 'beginner-a2'),
  standardModule(4, 'Module-4-Software-in-Education', 'Software in Education',
    'Ta’lim dasturlarining foydasini mezon asosida baholang.',
    'language-focus-comparison', 'beginner-a2'),
  standardModule(5, 'Module-5-Web-App-Development', 'Web App Development',
    'Web-ilova yaratish jarayonini ketma-ket tushuntiring.',
    'language-focus-process-sequence', 'beginner-a2'),
  standardModule(6, 'Module-6-Mobile-Software-Development', 'Mobile Software Development',
    'Mobil mahsulot xususiyatlari va cheklovlarini taqqoslang.',
    'language-focus-requirements', 'beginner-a2'),
  standardModule(7, 'Module-7-Software-Error-and-Debugging', 'Software Errors and Debugging',
    'Xato va yechimni aniq, professional tarzda tasvirlang.',
    'language-focus-precise-reporting', 'beginner-a2'),
  standardModule(8, 'Module-8-Software-Security', 'Software Security',
    'Tahdid, zaiflik va himoya choralarini tushuntiring.',
    'language-focus-advice-and-obligation', 'beginner-a2'),
  standardModule(9, 'Module-9-Project-Management-Tools', 'Project Management Tools',
    'Loyiha jarayoni va vositalarini tasvirlang.',
    'language-focus-project-status', 'beginner-a2'),
  standardModule(10, 'Module-10-Careers-in-Software-Engineering', 'Careers in Software Engineering',
    'Kasbiy rol va shaxsiy rivojlanish rejasini bayon qiling.',
    'language-focus-goals-and-evidence', 'beginner-a2'),
  standardModule(11, 'Module-11-Ethics-for-Developers', 'Ethics for Developers',
    'Axloqiy vaziyatni dalillar bilan muhokama qiling.',
    'language-focus-ethical-reasoning', 'beginner-b1'),
  standardModule(12, 'Module-12-Software-Engineering-and-Society', 'Software Engineering and Society',
    'Texnologiyaning inson va jamiyatga ta’sirini baholang.',
    'language-focus-balanced-argument', 'beginner-b1'),
];

/* Flat, ordered node list with a back-reference to the owning module. */
export const NODES = COURSE.flatMap((mod) =>
  mod.nodes.map((node, index) => ({ node: node, module: mod, index: index }))
);

export function findNode(nodeId) {
  return NODES.find((entry) => entry.node.id === nodeId) || null;
}
