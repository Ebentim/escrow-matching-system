import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey() {
  // Use SUPABASE_ANON_KEY as the secret key base since it's available and securely long.
  // In production, a dedicated OTP_SECRET_KEY in .env is recommended.
  const secret = process.env.OTP_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret-key-at-least-32-chars-long';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Generates a random 6-digit OTP
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Encrypts the given OTP symmetrically, allowing decryption later.
 * Returns the encrypted string in the format: iv:authTag:encryptedText
 */
export function encryptOTP(otp: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted OTP string back to its original plain text.
 * Returns null if decryption fails (e.g. invalid key or format).
 */
export function decryptOTP(encryptedOtp: string): string | null {
  try {
    const parts = encryptedOtp.split(':');
    if (parts.length !== 3) {
      // Fallback: If it's a legacy SHA-256 hash (64 chars hex string with no colons)
      // We can't decrypt it. The calling function should handle this case.
      return null;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt OTP:", error);
    return null;
  }
}
