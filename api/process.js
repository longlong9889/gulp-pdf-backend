import nlp from 'compromise';

// ============================================
// CONSTANTS
// ============================================

const articlesAndPossessives = ['a', 'an', 'the', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
const personalPronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they'];
const objectPronouns = ['me', 'him', 'her', 'us', 'them'];
const possessivePronouns = ['my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'];
const allPronouns = [...personalPronouns, ...objectPronouns, ...possessivePronouns];
const auxiliaryVerbs = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
const actionVerbs = ['love', 'like', 'enjoy', 'hate', 'prefer', 'start', 'stop', 'keep', 'finish', 'mind', 'avoid', 'consider', 'suggest', 'practice', 'miss', 'risk'];
const contextDependentWords = ['cold', 'light', 'sound', 'warm', 'cool', 'dry', 'wet', 'clean', 'dirty', 'dark', 'bright'];
const commonAdverbs = ['quickly', 'slowly', 'carefully', 'easily', 'happily', 'sadly', 'really', 'very', 'always', 'never', 'often', 'sometimes', 'together', 'apart', 'away', 'here', 'there', 'now', 'then', 'soon', 'already', 'still', 'just', 'also', 'too', 'well', 'fast', 'hard', 'early', 'late', 'daily', 'weekly'];

// ============================================
// HELPER FUNCTIONS
// ============================================

function splitIntoSentences(text) {
  const sentences = text
    .split(/\.(?:\s+)(?=[A-Z])|\.(?=\s*$)/)
    .map(s => s.trim())
    .filter(s => s.length >= 5);
  return sentences;
}

/**
 * Extract single-word parts of speech from a sentence
 * - Nouns: single words only, no articles/possessives
 * - Verbs: includes -ing forms when part of continuous tense
 * - Adjectives: single words only
 * - Adverbs: single words only
 * - Pronouns: personal, object, possessive pronouns
 * - Interjections: common interjections
 */
function extractPartsOfSpeech(sentence) {
  const doc = nlp(sentence);
  const words = sentence.split(/\s+/);
  
  // PRONOUNS
  const foundPronouns = [];
  words.forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[.,!?']/g, '');
    if (allPronouns.includes(cleanWord)) {
      const formatted = cleanWord === 'i' ? 'I' : cleanWord;
      if (!foundPronouns.includes(formatted)) foundPronouns.push(formatted);
    }
  });
  
  // ADVERBS - Extract early to exclude from other categories
  const foundAdverbs = [];
  doc.adverbs().out('array').forEach(adv => {
    adv.split(/\s+/).forEach(a => {
      const cleanA = a.toLowerCase().replace(/[.,!?]/g, '');
      if (!foundAdverbs.includes(cleanA) && cleanA.length > 1) foundAdverbs.push(cleanA);
    });
  });
  // Also check common adverbs list
  words.forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
    if (commonAdverbs.includes(cleanWord) && !foundAdverbs.includes(cleanWord)) {
      foundAdverbs.push(cleanWord);
    }
  });
  
  // ADJECTIVES - Extract before nouns, exclude adverbs
  const foundAdjectives = [];
  doc.adjectives().out('array').forEach(adj => {
    adj.split(/\s+/).forEach(a => {
      const cleanA = a.toLowerCase().replace(/[.,!?]/g, '');
      if (!articlesAndPossessives.includes(cleanA) && 
          !foundAdjectives.includes(cleanA) && 
          !foundAdverbs.includes(cleanA) &&
          cleanA.length > 1) {
        foundAdjectives.push(cleanA);
      }
    });
  });
  
  // VERBS - Exclude adverbs
  const foundVerbs = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[.,!?]/g, '');
    const prevWord = i > 0 ? words[i - 1].toLowerCase().replace(/[.,!?]/g, '') : '';
    
    if (word.endsWith('ing') && word.length > 4) {
      if (auxiliaryVerbs.includes(prevWord)) {
        if (!foundVerbs.includes(word)) foundVerbs.push(word);
      }
    }
  }
  
  const compromiseVerbs = doc.verbs().out('array');
  compromiseVerbs.forEach(verbPhrase => {
    verbPhrase.split(/\s+/).forEach(v => {
      const cleanV = v.toLowerCase().replace(/[.,!?]/g, '');
      if (!articlesAndPossessives.includes(cleanV) && 
          !foundVerbs.includes(cleanV) && 
          !foundAdverbs.includes(cleanV) &&
          cleanV.length > 0) {
        if (cleanV.endsWith('ing') && cleanV.length > 4) {
          const wordIndex = words.findIndex(w => w.toLowerCase().replace(/[.,!?]/g, '') === cleanV);
          if (wordIndex > 0) {
            const prevW = words[wordIndex - 1].toLowerCase().replace(/[.,!?]/g, '');
            if (!auxiliaryVerbs.includes(prevW)) return;
          }
        }
        foundVerbs.push(cleanV);
      }
    });
  });
  
  // NOUNS - Exclude adjectives and adverbs
  const foundNouns = [];
  const compromiseNouns = doc.nouns().not('#Pronoun').out('array');
  compromiseNouns.forEach(nounPhrase => {
    nounPhrase.split(/\s+/).forEach(n => {
      const cleanN = n.toLowerCase().replace(/[.,!?]/g, '');
      if (!articlesAndPossessives.includes(cleanN) && 
          !foundNouns.includes(cleanN) && 
          !foundAdjectives.includes(cleanN) &&
          !foundAdverbs.includes(cleanN) &&
          cleanN.length > 1) {
        foundNouns.push(cleanN);
      }
    });
  });
  
  // Handle gerunds as nouns
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[.,!?]/g, '');
    const prevWord = i > 0 ? words[i - 1].toLowerCase().replace(/[.,!?]/g, '') : '';
    
    if (word.endsWith('ing') && word.length > 4) {
      if (actionVerbs.includes(prevWord) || ['for', 'of', 'about', 'by', 'in', 'at'].includes(prevWord)) {
        if (!foundNouns.includes(word) && !foundVerbs.includes(word)) foundNouns.push(word);
      }
    }
  }
  
  // Handle context-dependent words (cold, light, etc.)
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[.,!?]/g, '');
    const nextWord = i < words.length - 1 ? words[i + 1].toLowerCase().replace(/[.,!?]/g, '') : '';
    
    if (contextDependentWords.includes(word)) {
      const nextWordIsNoun = nextWord && !['', '.', ',', '!', '?'].includes(nextWord) && 
                             !articlesAndPossessives.includes(nextWord) &&
                             !allPronouns.includes(nextWord) &&
                             !auxiliaryVerbs.includes(nextWord) &&
                             !['and', 'or', 'but', 'that', 'which', 'who'].includes(nextWord);
      
      if (nextWordIsNoun) {
        if (!foundAdjectives.includes(word)) foundAdjectives.push(word);
        const nounIdx = foundNouns.indexOf(word);
        if (nounIdx > -1) foundNouns.splice(nounIdx, 1);
      } else {
        if (!foundNouns.includes(word)) foundNouns.push(word);
        const adjIdx = foundAdjectives.indexOf(word);
        if (adjIdx > -1) foundAdjectives.splice(adjIdx, 1);
      }
    }
  }
  
  // INTERJECTIONS
  const interjectionKeywords = [
    'oh', 'wow', 'hey', 'hi', 'hello', 'bye', 'goodbye', 
    'oops', 'ouch', 'uh', 'um', 'ah', 'yay', 'yup', 'yeah', 
    'nope', 'nah', 'huh', 'hmm', 'ugh', 'whoa', 'yikes'
  ];
  
  const foundInterjections = [];
  words.forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
    if (interjectionKeywords.includes(cleanWord) && !foundInterjections.includes(cleanWord)) {
      foundInterjections.push(cleanWord);
    }
  });
  
  // Final cleanup
  const finalVerbs = foundVerbs.filter(v => !(v.endsWith('ing') && foundNouns.includes(v)));
  const finalNouns = foundNouns.filter(n => !allPronouns.includes(n.toLowerCase()));
  
  return {
    sentence: sentence,
    nouns: finalNouns.length > 0 ? finalNouns.join(', ') : '-',
    verbs: finalVerbs.length > 0 ? finalVerbs.join(', ') : '-',
    adjectives: foundAdjectives.length > 0 ? foundAdjectives.join(', ') : '-',
    adverbs: foundAdverbs.length > 0 ? foundAdverbs.join(', ') : '-',
    pronouns: foundPronouns.length > 0 ? foundPronouns.join(', ') : '-',
    interjections: foundInterjections.length > 0 ? foundInterjections.join(', ') : '-'
  };
}

/**
 * Check if sentence involves 2+ people (social interaction)
 */
function involvesTwoPeople(text) {
  const lowerText = text.toLowerCase();
  
  const secondPersonPatterns = [
    /\byou\b/i, /\byour\b/i, /\byours\b/i, /\byourself\b/i,
  ];
  
  const firstPersonPluralPatterns = [
    /\bwe\b/i, /\bus\b/i, /\bour\b/i, /\bours\b/i, /\bourselves\b/i,
    /\blet'?s\b/i, /\blets\b/i,
  ];
  
  for (const pattern of secondPersonPatterns) {
    if (pattern.test(lowerText)) return true;
  }
  
  for (const pattern of firstPersonPluralPatterns) {
    if (pattern.test(lowerText)) return true;
  }
  
  const callingPatterns = [
    /\bmommy\b/i, /\bmom\b/i, /\bmama\b/i,
    /\bdaddy\b/i, /\bdad\b/i, /\bdada\b/i, /\bpapa\b/i,
    /\bteacher\b/i, /\bfriend\b/i,
  ];
  
  for (const pattern of callingPatterns) {
    if (pattern.test(lowerText) && (lowerText.includes('!') || lowerText.match(/^(mommy|mom|mama|daddy|dad|dada|papa|teacher|friend)\b/i))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if sentence is ego-centric (only about oneself)
 */
function isEgoCentric(text) {
  const lowerText = text.toLowerCase();
  const hasFirstPerson = /\bi\b|\bi'?m\b|\bim\b|\bmy\b|\bme\b|\bmyself\b|\bmine\b/i.test(lowerText);
  const hasTwoPeople = involvesTwoPeople(lowerText);
  return hasFirstPerson && !hasTwoPeople;
}

/**
 * Categorize a sentence
 */
function categorizeFromAnalysis(analysisRow) {
  const { sentence, nouns, verbs, pronouns, interjections } = analysisRow;
  
  if (!sentence || typeof sentence !== 'string') {
    return { category: 'sharing_info', confidence: 'low', reason: 'Invalid input' };
  }

  const text = sentence.trim().toLowerCase();
  
  const verbList = verbs && verbs !== '-' ? verbs.toLowerCase().split(',').map(v => v.trim()) : [];
  const nounList = nouns && nouns !== '-' ? nouns.toLowerCase().split(',').map(n => n.trim()) : [];
  const pronounList = pronouns && pronouns !== '-' ? pronouns.toLowerCase().split(',').map(p => p.trim()) : [];
  const interjectionList = interjections && interjections !== '-' ? interjections.toLowerCase().split(',').map(i => i.trim()) : [];
  
  const hasVerb = (keywords) => verbList.some(v => keywords.some(k => v.includes(k)));
  const hasInterjection = (keywords) => interjectionList.some(i => keywords.some(k => i.includes(k)));

  // ============================================
  // PROTEST (Red)
  // ============================================
  
  const protestPatterns = [
    /^no\b/i, /^nope\b/i, /^stop\b/i, 
    /^i don'?t want/i, /^i don'?t like/i, /^i don'?t need/i,
    /^i hate/i, /^go away/i, /^leave me/i, /^get out/i, /^get away/i,
    /^i refuse/i, /^never\b/i, /^not now/i, /^no more/i, /^no way/i,
    /^i can'?t\b/i, /^i won'?t\b/i, /\ball done\b/i, /\bi'?m done\b/i,
    /\bstop that\b/i, /\bstop it\b/i,
    /^not that\b/i, /^not like that/i, /^not this/i,
    /\bhurts\b/i, /\btoo loud\b/i, /\btoo big\b/i, /\btoo hot\b/i, /\btoo cold\b/i,
    /\bi'?m uncomfortable/i, /\bsomething'?s wrong/i, /\bsomethings wrong/i,
    /\bi'?m finished\b/i, /\bim finished\b/i,
    /\bi need space\b/i,
  ];
  
  for (const pattern of protestPatterns) {
    if (pattern.test(text)) {
      return { category: 'protest', confidence: 'high', reason: 'Matched protest pattern' };
    }
  }
  
  const protestVerbs = ["don't", "dont", "stop", "won't", "wont", "can't", "cant", "refuse", "hate"];
  if (hasVerb(protestVerbs) && text.startsWith('i ')) {
    if (!/don'?t stop/i.test(text)) {
      return { category: 'protest', confidence: 'high', reason: 'Protest verb with first-person' };
    }
  }

  // ============================================
  // REQUEST (Blue)
  // ============================================
  
  const requestPatterns = [
    /^i want/i, /^i need/i, /^i would like/i, /^i'?d like/i,
    /^can i (have|get|go|play|see|use|try)/i, /^can you (help|give|get|show|tell|pass|open)/i,
    /^could you/i, /^would you/i, /^will you/i, /^may i/i, /^let me/i,
    /^give me/i, /^get me/i, /^help me/i, /^show me/i, /^tell me/i, /^pass me/i,
    /^i wanna/i, /^i gotta/i, /^more\b/i, /^more please/i, /^another\b/i,
    /^again\b/i, /^do it again/i, /^one more/i, /^please (help|give|get|show|tell|pass|open|can)/i,
    /^let'?s\b/i, /^lets\b/i,
    /^keep going/i, /^keep it coming/i, /^keep \w+ing/i,
    /^don'?t stop/i, /^dont stop/i,
    /^look at me/i, /^watch this/i, /^watch me/i, /^look here/i,
    /^listen\b/i, /^pay attention/i, /^come see/i,
    /^do this/i, /^try this/i,
    /^not finished/i,
  ];
  
  for (const pattern of requestPatterns) {
    if (pattern.test(text)) {
      return { category: 'request', confidence: 'high', reason: 'Matched request pattern' };
    }
  }
  
  const requestVerbs = ['want', 'need', 'give', 'help', 'get', 'show', 'pass'];
  if (hasVerb(requestVerbs)) {
    if (/\bi\b/i.test(text) && hasVerb(['want', 'need', 'wanna', 'gotta'])) {
      return { category: 'request', confidence: 'medium', reason: 'Request verb with first-person' };
    }
    if (/^(give|help|get|show|pass|let)\b/i.test(text)) {
      return { category: 'request', confidence: 'high', reason: 'Imperative request verb' };
    }
  }
  
  if (/help me/i.test(text)) {
    return { category: 'request', confidence: 'high', reason: 'Contains help me' };
  }

  // ============================================
  // SOCIAL (Yellow)
  // ============================================
  
  const socialPatterns = [
    /^hi\b/i, /^hey\b/i, /^hello\b/i, /^good (morning|afternoon|evening|night)/i,
    /^bye\b/i, /^goodbye\b/i, /^good bye\b/i, /^see you/i, /^see ya/i,
    /^thank you/i, /^thanks\b/i, /^please\b$/i, /^sorry\b/i, /^excuse me/i,
    /^pardon/i, /^welcome\b/i, /^nice to meet/i, /^how are you/i, /^what'?s up/i,
    /^come here/i, /^over here/i,
    /^guess what/i, /^you know what/i, 
    /^that'?s (funny|cool|awesome|great|nice|silly)/i, /^thats (funny|cool|awesome|great|nice|silly)/i,
    /^wow\b/i, /^oh boy/i, /^yay\b/i,
    /^your turn/i, /^my turn/i,
    /^just kidding/i,
  ];
  
  for (const pattern of socialPatterns) {
    if (pattern.test(text)) {
      return { category: 'social', confidence: 'high', reason: 'Matched social pattern' };
    }
  }
  
  const socialInterjections = ['hi', 'hey', 'hello', 'bye', 'goodbye', 'wow', 'yay', 'ooh', 'whoa'];
  const firstWord = text.split(/\s+/)[0].replace(/[.,!?]/g, '');
  if (socialInterjections.includes(firstWord)) {
    return { category: 'social', confidence: 'high', reason: 'Starts with social interjection' };
  }
  
  // 2-person check
  if (involvesTwoPeople(text)) {
    const affectionPatterns = [
      /\bi love you\b/i, /\bi like you\b/i, /\bi miss you\b/i,
      /\byou'?re my favorite/i, /\byoure my favorite/i,
      /\bi like being with you/i, /\byou matter to me/i,
      /\bwant some\b/i,
    ];
    
    for (const pattern of affectionPatterns) {
      if (pattern.test(text)) {
        return { category: 'social', confidence: 'high', reason: 'Affection/connection with another person' };
      }
    }
    
    return { category: 'social', confidence: 'medium', reason: 'Involves 2+ people (you/we/us)' };
  }

  // ============================================
  // SHARING INFO (Orange)
  // ============================================
  
  const sharingPatterns = [
    /^i (like|enjoy|think|know|see|have|am|was|got|made|played|went|did|saw)/i,
    /^i'?m\b/i, /^im\b/i, /^it'?s\b/i, /^its\b/i, /^that'?s\b/i, /^thats\b/i, /^this is/i,
    /^there (is|are|was|were)/i, /^my (name|favorite|mom|dad|friend|dog|cat|brother|sister)/i,
    /^the \w+ (is|are|was|were)/i, /^(he|she|they|we) (is|are|was|were|has|have|had|did|went|got)/i,
    /^yes\b/i, /^yeah\b/i, /^yep\b/i, /^okay\b/i, /^ok\b/i,
    /^what'?s that/i, /^whats that/i, /^where did/i, /^who'?s that/i, /^whos that/i,
    /^why\b/i, /^what happened/i, /^where'?s my/i, /^wheres my/i,
  ];
  
  for (const pattern of sharingPatterns) {
    if (pattern.test(text)) {
      return { category: 'sharing_info', confidence: 'high', reason: 'Matched sharing pattern' };
    }
  }
  
  if (hasInterjection(['yeah', 'yep', 'yup', 'yes']) && text.split(/\s+/).length > 1) {
    return { category: 'sharing_info', confidence: 'high', reason: 'Affirmative with content' };
  }
  
  if (isEgoCentric(text)) {
    return { category: 'sharing_info', confidence: 'medium', reason: 'Ego-centric (about oneself)' };
  }
  
  if (nounList.length > 0 && verbList.length > 0) {
    return { category: 'sharing_info', confidence: 'medium', reason: 'Declarative structure' };
  }
  
  if (nounList.length > 0 && verbList.length === 0) {
    return { category: 'sharing_info', confidence: 'low', reason: 'Noun phrase' };
  }
  
  return { category: 'sharing_info', confidence: 'low', reason: 'Default' };
}

function getCategoryColor(category) {
  const colors = {
    request: '#5DADE2',
    social: '#F7DC6F',
    sharing_info: '#F5B041',
    protest: '#FF6B6B'
  };
  return colors[category] || '#CCCCCC';
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'GuLP Process API v2',
      usage: 'POST with { "text": "your sentences here" }',
      features: ['Single-word extraction', 'Pronouns column', 'Better gerund handling']
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid "text" field' 
      });
    }
    
    // Step 1: Split and analyze
    const sentences = splitIntoSentences(text);
    const analysisTable = sentences.map(sentence => extractPartsOfSpeech(sentence));
    
    // Step 2: Categorize
    const categorized = analysisTable.map(row => ({
      ...row,
      ...categorizeFromAnalysis(row),
      color: getCategoryColor(categorizeFromAnalysis(row).category)
    }));
    
    // Step 3: Group phrases
    const grouped = {
      request: categorized.filter(r => r.category === 'request').map(r => r.sentence),
      social: categorized.filter(r => r.category === 'social').map(r => r.sentence),
      sharing_info: categorized.filter(r => r.category === 'sharing_info').map(r => r.sentence),
      protest: categorized.filter(r => r.category === 'protest').map(r => r.sentence)
    };
    
    // Step 4: Collect all unique words by type (for People tile, etc.)
    const allNouns = new Set();
    const allVerbs = new Set();
    const allAdjectives = new Set();
    const allAdverbs = new Set();
    const allPronouns = new Set();
    
    categorized.forEach(row => {
      if (row.nouns !== '-') row.nouns.split(', ').forEach(w => allNouns.add(w));
      if (row.verbs !== '-') row.verbs.split(', ').forEach(w => allVerbs.add(w));
      if (row.adjectives !== '-') row.adjectives.split(', ').forEach(w => allAdjectives.add(w));
      if (row.adverbs !== '-') row.adverbs.split(', ').forEach(w => allAdverbs.add(w));
      if (row.pronouns !== '-') row.pronouns.split(', ').forEach(w => allPronouns.add(w));
    });
    
    return res.status(200).json({
      success: true,
      summary: {
        request: grouped.request.length,
        social: grouped.social.length,
        sharing_info: grouped.sharing_info.length,
        protest: grouped.protest.length,
        total: categorized.length
      },
      phrases: grouped,
      words: {
        nouns: Array.from(allNouns),
        verbs: Array.from(allVerbs),
        adjectives: Array.from(allAdjectives),
        adverbs: Array.from(allAdverbs),
        pronouns: Array.from(allPronouns)
      },
      analysisTable: categorized
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}