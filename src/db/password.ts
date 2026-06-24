import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64) as Buffer).toString('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(input: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedHash = (await scryptAsync(input, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuffer, suppliedHash);
}
