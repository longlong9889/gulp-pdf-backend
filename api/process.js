import nlp from 'compromise';

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

function extractPartsOfSpeech(sentence) {
  const doc = nlp(sentence);
  
  const nouns = doc.nouns().not('#Pronoun').out('array');
  const verbs = doc.verbs().out('array');
  const adjectives = doc.adjectives().out('array');
  const adverbs = doc.adverbs().out('array');
  
  const interjectionKeywords = [
    'oh', 'wow', 'hey', 'hi', 'hello', 'bye', 'goodbye', 
    'oops', 'ouch', 'uh', 'um', 'ah', 'yay', 'yup', 'yeah', 
    'nope', 'nah', 'huh', 'hmm', 'ugh', 'whoa', 'yikes'
  ];
  
  const words = sentence.toLowerCase().split(/\s+/);
  const interjections = words.filter(word => 
    interjectionKeywords.includes(word.replace(/[.,!?]/g, ''))
  );
  
  return {
    sentence,
    nouns: nouns.length > 0 ? nouns.join(', ') : '-',
    verbs: verbs.length > 0 ? verbs.join(', ') : '-',
    adjectives: adjectives.length > 0 ? adjectives.join(', ') : '-',
    adverbs: adverbs.length > 0 ? adverbs.join(', ') : '-',
    interjections: interjections.length > 0 ? interjections.join(', ') : '-'
  };
}

function categorizeFromAnalysis(analysisRow) {
  const { sentence, nouns, verbs, interjections } = analysisRow;
  
  if (!sentence || typeof sentence !== 'string') {
    return { category: 'sharing_info', confidence: 'low', reason: 'Invalid input' };
  }

  const text = sentence.trim().toLowerCase();
  
  const verbList = verbs && verbs !== '-' ? verbs.toLowerCase().split(',').map(v => v.trim()) : [];
  const nounList = nouns && nouns !== '-' ? nouns.toLowerCase().split(',').map(n => n.trim()) : [];
  const interjectionList = interjections && interjections !== '-' ? interjections.toLowerCase().split(',').map(i => i.trim()) : [];
  
  const hasVerb = (keywords) => verbList.some(v => keywords.some(k => v.includes(k)));
  const hasInterjection = (keywords) => interjectionList.some(i => keywords.some(k => i.includes(k)));

  // PROTEST
  const protestPatterns = [
    /^no\b/i, /^nope\b/i, /^stop\b/i, /^don'?t\b/i,
    /^i don'?t want/i, /^i don'?t like/i, /^i don'?t need/i,
    /^i hate/i, /^go away/i, /^leave me/i, /^get out/i, /^get away/i,
    /^i refuse/i, /^never\b/i, /^not now/i, /^no more/i, /^no way/i,
    /^i can'?t\b/i, /^i won'?t\b/i, /\ball done\b/i, /\bi'?m done\b/i,
    /\bstop that\b/i, /\bstop it\b/i,
  ];
  
  for (const pattern of protestPatterns) {
    if (pattern.test(text)) {
      return { category: 'protest', confidence: 'high', reason: 'Matched protest pattern' };
    }
  }
  
  const protestVerbs = ["don't", "dont", "stop", "won't", "wont", "can't", "cant", "refuse", "hate"];
  if (hasVerb(protestVerbs) && text.startsWith('i ')) {
    return { category: 'protest', confidence: 'high', reason: 'Protest verb with first-person' };
  }

  // SOCIAL
  const socialPatterns = [
    /^hi\b/i, /^hey\b/i, /^hello\b/i, /^good (morning|afternoon|evening|night)/i,
    /^bye\b/i, /^goodbye\b/i, /^good bye\b/i, /^see you/i, /^see ya/i,
    /^thank you/i, /^thanks\b/i, /^please\b$/i, /^sorry\b/i, /^excuse me/i,
    /^pardon/i, /^welcome\b/i, /^nice to meet/i, /^how are you/i, /^what'?s up/i,
    /^look at this/i, /^look at that/i, /^check this/i, /^come here/i, /^over here/i,
    /^guess what/i, /^you know what/i, /^that'?s (funny|cool|awesome|great|nice|silly)/i,
    /^wow\b/i, /^oh boy/i, /^yay\b/i,
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

  // REQUEST
  const requestPatterns = [
    /^i want/i, /^i need/i, /^i would like/i, /^i'?d like/i,
    /^can i (have|get|go|play|see|use|try)/i, /^can you (help|give|get|show|tell|pass|open)/i,
    /^could you/i, /^would you/i, /^will you/i, /^may i/i, /^let me/i,
    /^give me/i, /^get me/i, /^help me/i, /^show me/i, /^tell me/i, /^pass me/i,
    /^i wanna/i, /^i gotta/i, /^more\b/i, /^more please/i, /^another\b/i,
    /^again\b/i, /^do it again/i, /^one more/i, /^please (help|give|get|show|tell|pass|open|can)/i,
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

  // SHARING INFO
  const sharingPatterns = [
    /^i (like|love|enjoy|think|know|see|have|am|was|got|made|played|went|did|saw)/i,
    /^i'?m\b/i, /^it'?s\b/i, /^that'?s\b/i, /^this is/i,
    /^there (is|are|was|were)/i, /^my (name|favorite|mom|dad|friend|dog|cat|brother|sister)/i,
    /^the \w+ (is|are|was|were)/i, /^(he|she|they|we) (is|are|was|were|has|have|had|did|went|got)/i,
    /^yes\b/i, /^yeah\b/i, /^yep\b/i, /^okay\b/i, /^ok\b/i,
  ];
  
  for (const pattern of sharingPatterns) {
    if (pattern.test(text)) {
      return { category: 'sharing_info', confidence: 'high', reason: 'Matched sharing pattern' };
    }
  }
  
  if (hasInterjection(['yeah', 'yep', 'yup', 'yes']) && text.split(/\s+/).length > 1) {
    return { category: 'sharing_info', confidence: 'high', reason: 'Affirmative with content' };
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'GuLP Process API',
      usage: 'POST with { "text": "your sentences here" }'
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
    
    // Step 3: Group
    const grouped = {
      request: categorized.filter(r => r.category === 'request').map(r => r.sentence),
      social: categorized.filter(r => r.category === 'social').map(r => r.sentence),
      sharing_info: categorized.filter(r => r.category === 'sharing_info').map(r => r.sentence),
      protest: categorized.filter(r => r.category === 'protest').map(r => r.sentence)
    };
    
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
      analysisTable: categorized
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}