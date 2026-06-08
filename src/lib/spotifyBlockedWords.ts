export const spotifyBlockedWords: readonly string[] = [
  "puta",
  "putaria",
  "foda",
  "sexo",
  "transar",
  "fuck",
  "bitch",
  "pussy",
];

function normalizeTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function hasSpotifyBlockedWord(values: string[]): boolean {
  const combined = normalizeTerm(values.join(" "));
  return spotifyBlockedWords.some((word) => combined.includes(normalizeTerm(word)));
}
