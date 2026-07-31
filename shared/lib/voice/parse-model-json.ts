export function extractJsonText(content: string): string {
  const trimmed = content.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');

  if (objectStart !== -1 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  return trimmed;
}

function sanitizeJsonCandidate(candidate: string): string {
  return candidate
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/,\s*([}\]])/g, '$1');
}

export function parseModelJson(content: string): unknown {
  const candidates = [
    content.trim(),
    extractJsonText(content),
    sanitizeJsonCandidate(content.trim()),
    sanitizeJsonCandidate(extractJsonText(content)),
  ].filter((value, index, array) => value && array.indexOf(value) === index);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new Error('Invalid JSON');
}
