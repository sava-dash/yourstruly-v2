// Generate a personalized heartfelt question based on everything collected
function generateHeartfeltQuestion(
  name: string,
  context: {
    places: string[];
    contacts: { name: string; relationship: string }[];
    interests: string[];
    whyHere: string[];
    whyHereText: string;
  }
): string {
  const { places, contacts, interests, whyHere } = context;

  // Build question pool based on available data
  const questions: string[] = [];

  // Place-based questions
  if (places.length > 0) {
    const place = places[Math.floor(Math.random() * places.length)];
    questions.push(
      `${name}, you mentioned you lived in ${place}. What's a memory from there that still makes you smile?`,
      `${name}, of all the places you've lived, which one felt most like home, and why?`,
    );
    if (places.length > 1) {
      questions.push(
        `${name}, you've lived in some interesting places: ${places.slice(0, 3).join(', ')}. Which move changed your life the most?`,
      );
    }
  }

  // Contact-based questions
  if (contacts.length > 0) {
    const person = contacts[Math.floor(Math.random() * contacts.length)];
    const relation = person.relationship.toLowerCase();
    questions.push(
      `${name}, tell me about ${person.name}. What's a moment with your ${relation} that you'd love to preserve forever?`,
      `${name}, what's something ${person.name} taught you that you carry with you every day?`,
    );
  }

  // Interest-based questions
  if (interests.length > 0) {
    const interest = interests[Math.floor(Math.random() * interests.length)];
    questions.push(
      `${name}, you said you're into ${interest}. How did that start? Was there a moment that sparked it?`,
    );
  }

  // Why-here-based questions
  if (whyHere.includes('Leave something for my family')) {
    questions.push(
      `${name}, you want to leave something for your family. If you could only pass down one story, one lesson... what would it be?`,
    );
  }
  if (whyHere.includes('Capture memories before they fade')) {
    questions.push(
      `${name}, what's a memory that you're afraid of forgetting? Let's make sure it's captured.`,
    );
  }
  if (whyHere.includes('Preserve my life story')) {
    questions.push(
      `${name}, every life story has a turning point. What was yours?`,
    );
  }
  if (whyHere.includes('Send future messages to loved ones')) {
    questions.push(
      `${name}, if you could send a message to someone 10 years from now, who would it be and what would you say?`,
    );
  }

  // Fallback
  if (questions.length === 0) {
    questions.push(
      `${name}, what's a moment in your life that really shaped who you are today?`,
    );
  }

  return questions[Math.floor(Math.random() * questions.length)];
}

// Title-case a name: "john smith" → "John Smith"
function titleCaseName(name: string): string {
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export { generateHeartfeltQuestion, titleCaseName, delay };
