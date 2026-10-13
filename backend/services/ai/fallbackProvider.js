/**
 * JanSahayak - Deterministic Fallback AI Provider
 * Provides conversational assistance without requiring Claude or any external LLM.
 * Strictly relies on the verified scheme dataset and deterministic eligibility engine.
 */

const { getAllSchemes, getSchemeById } = require('../schemeService');
const { evaluateEligibility } = require('../eligibilityService');

// Supported language codes
const normalizeLanguage = (lang) => {
  if (!lang) return 'en';
  const l = String(lang).toLowerCase().trim();
  if (l === 'hi' || l === 'hindi') return 'hi';
  if (l === 'te' || l === 'telugu') return 'te';
  return 'en';
};

/**
 * Extracts basic profile hints from text
 */
const extractProfileFromText = (text = '') => {
  const profile = {};
  const lower = text.toLowerCase();

  // Age extraction: "35 years old", "age 35", "35 year old"
  const ageMatch = lower.match(/(?:age\s*(?:is|:)?\s*|(\d{1,2})\s*(?:years?|yrs?)\s*old|age\s*(\d{1,2}))/i);
  if (ageMatch) {
    const ageNum = parseInt(ageMatch[1] || ageMatch[2], 10);
    if (!isNaN(ageNum)) profile.age = ageNum;
  }

  // Income extraction: "income 150000", "income: 200000", "income of 50000"
  const incomeMatch = lower.match(/(?:income|salary)(?:\s*(?:of|is|:))?\s*(?:₹|rs\.?)?\s*(\d+)/i);
  if (incomeMatch) {
    const incomeNum = parseInt(incomeMatch[1], 10);
    if (!isNaN(incomeNum)) profile.annualIncome = incomeNum;
  }

  // Gender extraction
  if (/\b(?:female|woman|girl|mahila|stree)\b/i.test(lower)) {
    profile.gender = 'female';
  } else if (/\b(?:male|man|boy|purush)\b/i.test(lower)) {
    profile.gender = 'male';
  }

  // Farmer boolean
  if (/\b(?:farmer|kisan|agriculture|cultivator|rythu)\b/i.test(lower)) {
    profile.farmer = true;
  }

  // Student boolean
  if (/\b(?:student|vidyarthi|study|studying|college|school)\b/i.test(lower)) {
    profile.student = true;
  }

  // Disability boolean
  if (/\b(?:disabled|disability|divyang|handicapped)\b/i.test(lower)) {
    profile.disability = true;
  }

  // State extraction
  if (/\bandhra(?:\s*pradesh)?\b/i.test(lower)) {
    profile.state = 'Andhra Pradesh';
  } else if (/\btelangana\b/i.test(lower)) {
    profile.state = 'Telangana';
  } else if (/\bdelhi\b/i.test(lower)) {
    profile.state = 'Delhi';
  }

  // Category extraction
  if (/\b(?:sc|scheduled caste)\b/i.test(lower)) {
    profile.category = 'SC';
  } else if (/\b(?:st|scheduled tribe)\b/i.test(lower)) {
    profile.category = 'ST';
  } else if (/\b(?:obc|bc|backward class)\b/i.test(lower)) {
    profile.category = 'OBC';
  } else if (/\b(?:general|open)\b/i.test(lower)) {
    profile.category = 'General';
  }

  return profile;
};

/**
 * Determines primary intent from user message
 */
const detectIntent = (text = '') => {
  const lower = text.toLowerCase().trim();

  // 1. Greeting
  if (/^(hi|hello|hey|namaste|namaskar|namaskaram|greetings|vanakkam|good morning|good evening)\b/i.test(lower)) {
    return 'greeting';
  }

  // 2. Official Source / Website
  if (/(official\s*(?:website|portal|link|url)|where\s*(?:can\s*i\s*)?apply|application\s*link|online\s*portal)/i.test(lower)) {
    return 'official_source';
  }

  // 3. Eligibility
  if (/(am\s*i\s*eligible|can\s*i\s*apply|eligibility|qualify|eligible\s*for|check\s*my\s*eligibility)/i.test(lower)) {
    return 'eligibility';
  }

  // 4. Scheme details / benefits / documents
  if (/(tell\s*me\s*about|details\s*of|benefits\s*of|documents\s*(?:required|for)|how\s*to\s*apply\s*for|what\s*is\s*(?:the\s*)?(?:pm-?kisan|pmjay|ayushman|pmay|ujjwala|apy|atal|sukanya|mudra|rythu|cheyutha))/i.test(lower)) {
    return 'scheme_details';
  }

  // 5. Scheme Discovery
  if (/(scheme|schemes|available|welfare|yojana|yojanalu|scholarship|pension|loan|assistance)/i.test(lower)) {
    return 'scheme_discovery';
  }

  return 'unknown';
};

/**
 * Match a specific scheme from text
 */
const findTargetScheme = (text, schemes) => {
  const lower = text.toLowerCase();
  for (const s of schemes) {
    const nameLower = s.schemeName.toLowerCase();
    // Check key acronyms
    if (lower.includes('pm-kisan') || lower.includes('pmkisan') || lower.includes('kisan samman')) {
      if (nameLower.includes('pm-kisan')) return s;
    }
    if (lower.includes('ayushman') || lower.includes('pmjay') || lower.includes('jan arogya')) {
      if (nameLower.includes('jan arogya')) return s;
    }
    if (lower.includes('pmay') || lower.includes('awas yojana')) {
      if (nameLower.includes('awas yojana')) return s;
    }
    if (lower.includes('ujjwala') || lower.includes('pmuy') || lower.includes('gas connection')) {
      if (nameLower.includes('ujjwala')) return s;
    }
    if (lower.includes('atal pension') || lower.includes('apy')) {
      if (nameLower.includes('atal pension')) return s;
    }
    if (lower.includes('sukanya') || lower.includes('ssy')) {
      if (nameLower.includes('sukanya')) return s;
    }
    if (lower.includes('mudra') || lower.includes('pmmy')) {
      if (nameLower.includes('mudra')) return s;
    }
    if (lower.includes('post matric') || lower.includes('scholarship')) {
      if (nameLower.includes('scholarship')) return s;
    }
    if (lower.includes('rythu bharosa')) {
      if (nameLower.includes('rythu bharosa')) return s;
    }
    if (lower.includes('cheyutha')) {
      if (nameLower.includes('cheyutha')) return s;
    }
  }
  return null;
};

/**
 * Main fallback response generator
 */
const generateResponse = async ({ message, user = null, conversation = null, language = 'en' }) => {
  const lang = normalizeLanguage(language || conversation?.language || user?.preferredLanguage);
  const text = message ? message.trim() : '';
  const intent = detectIntent(text);

  // Retrieve active schemes
  const allSchemes = await getAllSchemes({ isActive: true });

  // 1. GREETING INTENT
  if (intent === 'greeting') {
    const greetings = {
      en: "Namaste! I am JanSahayak, your intelligent guide for Indian government welfare schemes and public services. You can ask me about available schemes for farmers, students, women, seniors, check your eligibility, or find official application links. How may I assist you today?",
      hi: "नमस्ते! मैं जनसहायक हूँ, भारतीय सरकारी कल्याणकारी योजनाओं और सार्वजनिक सेवाओं के लिए आपका मार्गदर्शक। आप मुझसे किसानों, छात्रों, महिलाओं, वरिष्ठ नागरिकों के लिए उपलब्ध योजनाओं के बारे में पूछ सकते हैं, अपनी पात्रता जांच सकते हैं, या आधिकारिक आवेदन लिंक प्राप्त कर सकते हैं। आज मैं आपकी क्या सहायता कर सकता हूँ?",
      te: "నమస్కారం! నేను జనసహాయక్, భారత ప్రభుత్వ సంక్షేమ పథకాలు మరియు పౌర సేవల సమాచార మార్గదర్శిని. మీరు రైతులు, విద్యార్థులు, మహిళలు, సీనియర్ సిటిజన్లకు అందుబాటులో ఉన్న పథకాల గురించి అడగవచ్చు, మీ అర్హతను తనిఖీ చేసుకోవచ్చు లేదా అధికారిక వెబ్‌సైట్ లింక్‌లను పొందవచ్చు. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?",
    };

    return {
      text: greetings[lang] || greetings.en,
      language: lang,
      intent: 'greeting',
      schemes: [],
      eligibility: null,
      missingFields: [],
    };
  }

  // 2. SCHEME DISCOVERY INTENT
  if (intent === 'scheme_discovery') {
    const lower = text.toLowerCase();
    let filtered = allSchemes;

    if (lower.includes('farmer') || lower.includes('agriculture') || lower.includes('kisan') || lower.includes('rythu')) {
      filtered = allSchemes.filter((s) => s.category.toLowerCase() === 'agriculture' || s.schemeName.toLowerCase().includes('kisan') || s.beneficiary?.toLowerCase().includes('farmer'));
    } else if (lower.includes('student') || lower.includes('education') || lower.includes('scholarship')) {
      filtered = allSchemes.filter((s) => s.category.toLowerCase() === 'education' || s.schemeName.toLowerCase().includes('scholarship'));
    } else if (lower.includes('women') || lower.includes('female') || lower.includes('girl')) {
      filtered = allSchemes.filter((s) => s.category.toLowerCase().includes('women') || s.rules?.gender?.includes?.('female'));
    } else if (lower.includes('health') || lower.includes('medical') || lower.includes('hospital')) {
      filtered = allSchemes.filter((s) => s.category.toLowerCase() === 'healthcare');
    } else if (lower.includes('housing') || lower.includes('house') || lower.includes('awas')) {
      filtered = allSchemes.filter((s) => s.category.toLowerCase() === 'housing');
    } else if (lower.includes('pension') || lower.includes('senior')) {
      filtered = allSchemes.filter((s) => s.category.toLowerCase().includes('financial') || s.schemeName.toLowerCase().includes('pension'));
    } else if (lower.includes('loan') || lower.includes('business') || lower.includes('entrepreneur')) {
      filtered = allSchemes.filter((s) => s.category.toLowerCase() === 'entrepreneurship');
    }

    if (filtered.length === 0) filtered = allSchemes.slice(0, 5);

    const schemeItems = filtered.map((s, idx) => {
      const topBenefit = s.benefits && s.benefits.length > 0 ? s.benefits[0] : s.description;
      return `${idx + 1}. **${s.schemeName}**\n   - Department: ${s.department}\n   - Benefit: ${topBenefit}\n   - Official Portal: ${s.officialWebsite}`;
    }).join('\n\n');

    const headers = {
      en: `Here are the relevant government schemes discovered for your query:\n\n${schemeItems}\n\nYou can ask "Tell me more about [Scheme Name]" or "Am I eligible for [Scheme Name]?" to explore further.`,
      hi: `आपकी खोज के अनुसार संबंधित सरकारी योजनाएँ:\n\n${schemeItems}\n\nआप किसी भी योजना के बारे में विस्तार से जानने के लिए पूछ सकते हैं, उदाहरण: "[योजना का नाम] के बारे में बताएं" या "क्या मैं पात्र हूँ?"`,
      te: `మీ ప్రశ్నకు సంబంధించి కనుగొనబడిన ప్రభుత్వ సంక్షేమ పథకాలు:\n\n${schemeItems}\n\nమరింత సమాచారం కోసం మీరు "[పథకం పేరు] వివరాలు చెప్పండి" లేదా "నేను అర్హుడినా?" అని అడగవచ్చు.`,
    };

    return {
      text: headers[lang] || headers.en,
      language: lang,
      intent: 'scheme_discovery',
      schemes: filtered.map((s) => ({
        id: s._id,
        name: s.schemeName,
        category: s.category,
        officialWebsite: s.officialWebsite,
      })),
      eligibility: null,
      missingFields: [],
    };
  }

  // 3. SCHEME DETAILS INTENT
  if (intent === 'scheme_details') {
    const target = findTargetScheme(text, allSchemes) || allSchemes[0];

    const benefitsText = (target.benefits || []).map((b) => `• ${b}`).join('\n');
    const docsText = (target.documents || []).map((d) => `• ${d}`).join('\n');
    const processText = (target.applicationProcess || []).map((p, i) => `${i + 1}. ${p}`).join('\n');

    const detailTemplates = {
      en: `### ${target.schemeName}\n\n**Department:** ${target.department}\n**Category:** ${target.category} | **Coverage:** ${target.state}\n\n**Description:**\n${target.description}\n\n**Key Benefits:**\n${benefitsText}\n\n**Required Documents:**\n${docsText}\n\n**How to Apply:**\n${processText}\n\n**Official Portal:** [${target.officialWebsite}](${target.officialWebsite})\n*Source: ${target.source}*`,
      hi: `### ${target.schemeName}\n\n**विभाग:** ${target.department}\n**श्रेणी:** ${target.category} | **कार्यक्षेत्र:** ${target.state}\n\n**विवरण:**\n${target.description}\n\n**प्रमुख लाभ:**\n${benefitsText}\n\n**आवश्यक दस्तावेज़:**\n${docsText}\n\n**आवेदन प्रक्रिया:**\n${processText}\n\n**आधिकारिक पोर्टल:** [${target.officialWebsite}](${target.officialWebsite})\n*स्रोत: ${target.source}*`,
      te: `### ${target.schemeName}\n\n**శాఖ:** ${target.department}\n**వర్గం:** ${target.category} | **పరిధి:** ${target.state}\n\n**వివరాలు:**\n${target.description}\n\n**ప్రధాన ప్రయోజనాలు:**\n${benefitsText}\n\n**అవసరమైన పత్రాలు:**\n${docsText}\n\n**దరఖాస్తు విధానం:**\n${processText}\n\n**అధికారిక వెబ్‌సైట్:** [${target.officialWebsite}](${target.officialWebsite})\n*మూలం: ${target.source}*`,
    };

    return {
      text: detailTemplates[lang] || detailTemplates.en,
      language: lang,
      intent: 'scheme_details',
      schemes: [{
        id: target._id,
        name: target.schemeName,
        category: target.category,
        officialWebsite: target.officialWebsite,
      }],
      eligibility: null,
      missingFields: [],
    };
  }

  // 4. ELIGIBILITY INTENT (Deterministically evaluates via eligibilityService)
  if (intent === 'eligibility') {
    const target = findTargetScheme(text, allSchemes) || allSchemes[0];

    // Combine profile from user DB record and inline hints in message
    const userProfile = {
      age: user?.age ?? null,
      gender: user?.gender ?? null,
      state: user?.state ?? null,
      occupation: user?.occupation ?? null,
      annualIncome: user?.annualIncome ?? null,
      category: user?.category ?? null,
      disability: user?.disability ?? false,
      farmer: user?.occupation?.toLowerCase() === 'farmer' ? true : null,
      student: user?.occupation?.toLowerCase() === 'student' ? true : null,
      ...extractProfileFromText(text),
    };

    const evaluation = evaluateEligibility(userProfile, target);

    let explanation = '';
    if (evaluation.status === 'eligible') {
      const msgs = {
        en: `✅ **You appear to be ELIGIBLE for ${target.schemeName}** based on the deterministic criteria provided.\n\n- **Category:** ${target.category}\n- **Verified Benefits:** ${target.benefits?.[0] || target.description}\n\n**Next Steps:**\nPlease visit the official government portal to submit your application: [${target.officialWebsite}](${target.officialWebsite})`,
        hi: `✅ आपके द्वारा प्रदान की गई जानकारी के आधार पर, आप **${target.schemeName}** के लिए **पात्र (Eligible)** प्रतीत होते हैं।\n\n- **योजना लाभ:** ${target.benefits?.[0] || target.description}\n\n**अगले कदम:**\nकृपया आधिकारिक सरकारी पोर्टल पर जाकर अपना आवेदन जमा करें: [${target.officialWebsite}](${target.officialWebsite})`,
        te: `✅ మీరు అందించిన వివరాల ప్రకారం, మీరు **${target.schemeName}** పథకానికి **అర్హులు (Eligible)** గా ఉన్నారు.\n\n- **పథకం ప్రయోజనం:** ${target.benefits?.[0] || target.description}\n\n**తదుపరి చర్యలు:**\nదయచేసి దరఖాస్తు చేసుకోవడానికి అధికారిక పోర్టల్‌ను సందర్శించండి: [${target.officialWebsite}](${target.officialWebsite})`,
      };
      explanation = msgs[lang] || msgs.en;
    } else if (evaluation.status === 'ineligible') {
      const reasonList = evaluation.reasons.map((r) => `• ${r.message}`).join('\n');
      const msgs = {
        en: `❌ **You are currently NOT ELIGIBLE for ${target.schemeName}** due to the following specific rule(s):\n\n${reasonList}\n\n*Official portal for verification:* [${target.officialWebsite}](${target.officialWebsite})`,
        hi: `❌ आप वर्तमान में **${target.schemeName}** के लिए **अपात्र (Not Eligible)** हैं। कारण नीचे दिए गए हैं:\n\n${reasonList}\n\n*सत्यापन के लिए आधिकारिक पोर्टल:* [${target.officialWebsite}](${target.officialWebsite})`,
        te: `❌ మీరు ప్రస్తుతానికి **${target.schemeName}** పథకానికి **అనర్హులు (Not Eligible)**. కారణాలు:\n\n${reasonList}\n\n*ధృవీకరణ కొరకు అధికారిక వెబ్‌సైట్:* [${target.officialWebsite}](${target.officialWebsite})`,
      };
      explanation = msgs[lang] || msgs.en;
    } else {
      // missing_information
      const missingList = evaluation.missingInformation.map((f) => `• ${f}`).join('\n');
      const msgs = {
        en: `ℹ️ **Additional Information Needed for ${target.schemeName}**\n\nTo deterministically evaluate your eligibility, please specify the following required details:\n\n${missingList}\n\n*Example:* "I am 35 years old and my annual income is 150000."`,
        hi: `ℹ️ **${target.schemeName} की पात्रता जांचने के लिए अतिरिक्त जानकारी आवश्यक है**\n\nकृपया निम्नलिखित आवश्यक जानकारी प्रदान करें:\n\n${missingList}\n\n*उदाहरण:* "मेरी आयु 35 वर्ष है और वार्षिक आय 150000 है।"`,
        te: `ℹ️ **${target.schemeName} అర్హతను పరిశీలించడానికి అదనపు సమాచారం అవసరం**\n\nదయచేసి ఈ క్రింది వివరాలను తెలియజేయండి:\n\n${missingList}\n\n*ఉదాహరణ:* "నా వయస్సు 35 సంవత్సరాలు మరియు వార్షిక ఆదాయం 150000."`,
      };
      explanation = msgs[lang] || msgs.en;
    }

    return {
      text: explanation,
      language: lang,
      intent: 'eligibility',
      schemes: [{
        id: target._id,
        name: target.schemeName,
        category: target.category,
        officialWebsite: target.officialWebsite,
      }],
      eligibility: {
        schemeId: target._id,
        schemeName: target.schemeName,
        ...evaluation,
      },
      missingFields: evaluation.missingInformation,
    };
  }

  // 5. OFFICIAL SOURCE INTENT
  if (intent === 'official_source') {
    const target = findTargetScheme(text, allSchemes) || allSchemes[0];
    const msgs = {
      en: `The official government portal for **${target.schemeName}** is:\n\n🌐 **Official Website:** [${target.officialWebsite}](${target.officialWebsite})\n*Authority:* ${target.department}\n*Source Reference:* ${target.source}\n\nAlways verify scheme guidelines directly on the official government website before submitting personal documents.`,
      hi: `**${target.schemeName}** के लिए आधिकारिक सरकारी पोर्टल:\n\n🌐 **आधिकारिक वेबसाइट:** [${target.officialWebsite}](${target.officialWebsite})\n*विभाग:* ${target.department}\n*संदर्भ:* ${target.source}\n\nव्यक्तिगत दस्तावेज़ जमा करने से पहले हमेशा आधिकारिक पोर्टल पर विवरण सत्यापित करें।`,
      te: `**${target.schemeName}** పథకం యొక్క అధికారిక ప్రభుత్వ పోర్టల్:\n\n🌐 **అధికారిక వెబ్‌సైట్:** [${target.officialWebsite}](${target.officialWebsite})\n*శాఖ:* ${target.department}\n*మూల ఆధారము:* ${target.source}\n\nదరఖాస్తుకు ముందు ఎల్లప్పుడూ అధికారిక ప్రభుత్వ పోర్టల్‌ను మాత్రమే సందర్శించండి.`,
    };

    return {
      text: msgs[lang] || msgs.en,
      language: lang,
      intent: 'official_source',
      schemes: [{
        id: target._id,
        name: target.schemeName,
        officialWebsite: target.officialWebsite,
      }],
      eligibility: null,
      missingFields: [],
    };
  }

  // 6. SAFE GENERAL FALLBACK
  const fallbacks = {
    en: "I am JanSahayak, your government welfare assistance guide. I can help you:\n1. Discover welfare schemes for farmers, students, women, or entrepreneurs.\n2. Evaluate your eligibility using structured criteria.\n3. Explain benefits, application steps, and document checklists.\n4. Provide official verified government portal links.\n\nPlease ask a specific question, such as: 'What schemes are available for farmers?' or 'Am I eligible for PM-KISAN?'",
    hi: "मैं जनसहायक हूँ, आपका सरकारी योजना सहायक। मैं आपकी सहायता कर सकता हूँ:\n1. किसानों, छात्रों, महिलाओं आदि के लिए योजनाएं खोजने में।\n2. आपकी पात्रता का निष्पक्ष मूल्यांकन करने में।\n3. योजना के लाभ, दस्तावेज़ और आवेदन प्रक्रिया समझाने में।\n4. सत्यापित आधिकारिक सरकारी पोर्टल लिंक प्रदान करने में।\n\nकृपया अपना प्रश्न पूछें, जैसे: 'किसानों के लिए कौन सी योजनाएं हैं?' या 'क्या मैं पीएम-किसान के लिए पात्र हूँ?'",
    te: "నేను జనసహాయక్, మీ ప్రభుత్వ సంక్షేమ పథకాల మార్గదర్శిని. నేను మీకు ఈ క్రింది అంశాలలో సహాయపడగలను:\n1. రైతులు, విద్యార్థులు, మహిళల సంక్షేమ పథకాలను కనుగొనడం.\n2. మీ అర్హతలను నిష్పక్షపాతంగా అంచనా వేయడం.\n3. ప్రయోజనాలు, అవసరమైన పత్రాలు మరియు దరఖాస్తు విధానం వివరించడం.\n4. అధికారిక ప్రభుత్వ పోర్టల్ లింక్‌లను అందించడం.\n\nదయచేసి మీ ప్రశ్నను అడగండి, ఉదాహరణకు: 'రైతులకు ఏ పథకాలు ఉన్నాయి?' లేదా 'నేను పిఎం-కిసాన్‌కు అర్హుడినా?'",
  };

  return {
    text: fallbacks[lang] || fallbacks.en,
    language: lang,
    intent: 'unknown',
    schemes: [],
    eligibility: null,
    missingFields: [],
  };
};

module.exports = {
  generateResponse,
  detectIntent,
  extractProfileFromText,
  normalizeLanguage,
};
