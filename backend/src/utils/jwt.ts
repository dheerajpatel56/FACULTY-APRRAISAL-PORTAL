import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Fail fast on weak/missing secrets — never boot with an insecure signing key.
const WEAK = new Set(['secret', 'changeme', 'jwt_secret', 'your-secret-key']);
for (const [name, val] of [['JWT_SECRET', JWT_SECRET], ['REFRESH_TOKEN_SECRET', REFRESH_SECRET]] as const) {
  if (!val || val.length < 32 || WEAK.has(val.toLowerCase())) {
    throw new Error(`${name} must be set and at least 32 random characters`);
  }
}
if (JWT_SECRET === REFRESH_SECRET) {
  throw new Error('JWT_SECRET and REFRESH_TOKEN_SECRET must differ');
}

export interface TokenPayload {
  userId: string;
  employeeCode: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
