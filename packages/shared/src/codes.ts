/** Room codes: 4 letters, no vowels (can't spell words), no easily-confused letters. */
export const CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ';
export const CODE_LENGTH = 4;

export function randomCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

export function normaliseCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null;
  return code;
}
