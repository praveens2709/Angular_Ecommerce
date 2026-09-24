/** Builds an unsigned JWT-shaped token; enough for jwtDecode in the browser */
export const fakeToken = (payload: Record<string, unknown>): string => {
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
};

export const inSeconds = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;
