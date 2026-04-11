const FMP_BASE = 'https://financialmodelingprep.com/api';

function fmpKey() {
  return import.meta.env.VITE_FMP_API_KEY;
}

export async function searchCompanies(query) {
  if (!query || query.length < 1) return [];
  const res = await fetch(
    `${FMP_BASE}/v3/search?query=${encodeURIComponent(query)}&limit=10&exchange=NASDAQ,NYSE,AMEX&apikey=${fmpKey()}`
  );
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();
  if (data['Error Message']) throw new Error(data['Error Message']);
  return data;
}

export async function getCompanyProfile(symbol) {
  const res = await fetch(`${FMP_BASE}/v3/profile/${symbol}?apikey=${fmpKey()}`);
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  const data = await res.json();
  if (data['Error Message']) throw new Error(data['Error Message']);
  return data[0] || null;
}

export async function getAvailableTranscripts(symbol) {
  const res = await fetch(`${FMP_BASE}/v4/earning_call_transcript?symbol=${symbol}&apikey=${fmpKey()}`);
  if (!res.ok) throw new Error(`Transcripts list failed: ${res.status}`);
  const data = await res.json();
  if (data['Error Message']) throw new Error(data['Error Message']);
  return Array.isArray(data) ? data : [];
}

export async function getTranscript(symbol, quarter, year) {
  const res = await fetch(
    `${FMP_BASE}/v3/earning_call_transcript/${symbol}?quarter=${quarter}&year=${year}&apikey=${fmpKey()}`
  );
  if (!res.ok) throw new Error(`Transcript fetch failed: ${res.status}`);
  const data = await res.json();
  if (data['Error Message']) throw new Error(data['Error Message']);
  return data[0] || null;
}

function categorizeRole(name, title) {
  const combined = `${name} ${title}`.toLowerCase();
  if (/\boperator\b/.test(combined)) return 'OPERATOR';
  if (/\bchief executive\b|\bceo\b/.test(combined)) return 'CEO';
  if (/\bchief financial\b|\bcfo\b|\btreasurer\b/.test(combined)) return 'CFO';
  if (/\bchief operating\b|\bcoo\b/.test(combined)) return 'COO';
  if (/\bchief\b|\bofficer\b|\bvice president\b|\bsvp\b|\bevp\b|\bdirector\b/.test(combined)) return 'EXECUTIVE';
  if (/\binvestor relation/.test(combined)) return 'IR';
  if (
    /\banalyst\b|\bresearch\b|\bcapital\b|\bsecurities\b|\bpartners\b|\bbank\b|\bmorgan\b|\bgoldman\b|\bbarclays\b|\bciti\b|\bubs\b|\bbofa\b|\bwells\s?fargo\b|\bjpmorgan\b|\bcredit\s?suisse\b|\bnomura\b|\bdeutsche\b|\bmacquarie\b|\bbernstein\b|\bcowen\b|\bpiper\b|\bwedbush\b|\bneedham\b|\boppenheimer\b|\brbc\b|\bstifel\b|\btruist\b|\bkeybanc\b|\bcanaccord\b|\bleerink\b|\bevercore\b|\blazard\b|\bjefferies\b|\braymond\sjames\b/.test(
      combined
    )
  )
    return 'ANALYST';
  return 'OTHER';
}

export function parseTranscript(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') return [];

  const speakerPattern =
    /^([A-Z][A-Za-z\s.\-']{2,50}?)(?:\s*[-–—]+\s*([^\n:]{1,120}?))?\s*:\s*/gm;

  const matches = [];
  let m;
  while ((m = speakerPattern.exec(rawContent)) !== null) {
    matches.push({
      name: m[1].trim(),
      title: m[2]?.trim() || '',
      textStart: m.index + m[0].length,
      matchStart: m.index,
    });
  }

  const entries = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const textEnd =
      i + 1 < matches.length ? matches[i + 1].matchStart : rawContent.length;
    const text = rawContent
      .slice(match.textStart, textEnd)
      .trim()
      .replace(/\s+/g, ' ');

    if (text.length < 10) continue;

    const role = categorizeRole(match.name, match.title);
    if (role === 'OPERATOR' || role === 'IR') continue;

    entries.push({
      id: entries.length,
      speaker: match.name,
      title: match.title,
      role,
      text: text.length > 800 ? text.slice(0, 800) + '…' : text,
      time: entries.length * 4,
    });
  }

  return entries;
}

export function hasKeys() {
  return !!(import.meta.env.VITE_FMP_API_KEY && import.meta.env.VITE_ANTHROPIC_API_KEY);
}
