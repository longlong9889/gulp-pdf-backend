// api/analyze-grammar.js
// Grammar analysis endpoint for Swift app

import nlp from 'compromise';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Clean and split text into sentences
    let cleanedText = text
      .replace(/\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = cleanedText
      .split(/\.(?=\s+[A-Z]|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    // Analyze each sentence
    const analyzedSentences = sentences.map(sentence => {
      const doc = nlp(sentence);

      // Interjections list
      const interjectionWords = [
        'wow', 'oh', 'ah', 'hey', 'ouch', 'yay', 'yeah', 
        'hooray', 'oops', 'uh', 'um', 'hmm', 'whoa', 
        'yikes', 'geez', 'gosh', 'phew', 'aha', 'yup'
      ];
      const words = sentence.toLowerCase().split(/\s+/);
      const foundInterjections = words.filter(word =>
        interjectionWords.includes(word.replace(/[.,!?]/g, ''))
      );

      // Extract parts of speech
      const nouns = doc.nouns().not('#Pronoun').out('array');
      const verbs = doc.verbs().out('array');
      const adjectives = doc.adjectives().out('array');
      const adverbs = doc.adverbs().out('array');

      // Clean verbs (remove adverbs)
      const cleanVerbs = verbs.map(verb => {
        let cleanVerb = verb;
        adverbs.forEach(adverb => {
          const safeAdverb = adverb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          cleanVerb = cleanVerb.replace(new RegExp('\\s*' + safeAdverb + '\\s*', 'gi'), ' ').trim();
        });
        return cleanVerb;
      }).filter(v => v.length > 0);

      // Clean nouns (filter out verbs)
      const cleanNouns = nouns.filter(noun => {
        const nounLower = noun.toLowerCase();
        return !cleanVerbs.some(verb =>
          nounLower.includes(verb.toLowerCase()) ||
          verb.toLowerCase().includes(nounLower)
        );
      });

      return {
        sentence,
        nouns: cleanNouns.join(', ') || '-',
        verbs: cleanVerbs.join(', ') || '-',
        adjectives: adjectives.join(', ') || '-',
        adverbs: adverbs.join(', ') || '-',
        interjections: foundInterjections.join(', ') || '-'
      };
    });

    return res.status(200).json({
      success: true,
      sentences: analyzedSentences
    });

  } catch (error) {
    console.error('Grammar analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze grammar'
    });
  }
}