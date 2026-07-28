import { describe, expect, it } from 'vitest';
import { decryptSession, encryptSession } from './session';

describe('encryptSession / decryptSession', () => {
  it('round-trips an arbitrary payload', async () => {
    const secret = 'test-secret-value';
    const payload = { accessToken: 'abc', refreshToken: 'xyz', expiresAt: 1234567890 };

    const encrypted = await encryptSession(secret, payload);
    expect(encrypted).not.toContain('abc'); // not just base64 of the plaintext — must be genuinely encrypted
    const decrypted = await decryptSession<typeof payload>(secret, encrypted);

    expect(decrypted).toEqual(payload);
  });

  it('produces a different ciphertext each time (random IV) even for the same payload', async () => {
    const secret = 'test-secret-value';
    const payload = { foo: 'bar' };
    const a = await encryptSession(secret, payload);
    const b = await encryptSession(secret, payload);
    expect(a).not.toBe(b);
  });

  it('returns null when decrypting with the wrong secret', async () => {
    const encrypted = await encryptSession('correct-secret', { foo: 'bar' });
    const result = await decryptSession('wrong-secret', encrypted);
    expect(result).toBeNull();
  });

  it('returns null for tampered ciphertext', async () => {
    const encrypted = await encryptSession('secret', { foo: 'bar' });
    const [iv, data] = encrypted.split('.');
    const tampered = `${iv}.${data.slice(0, -2)}aa`;
    const result = await decryptSession('secret', tampered);
    expect(result).toBeNull();
  });

  it('returns null for garbage input instead of throwing', async () => {
    await expect(decryptSession('secret', 'not-a-valid-token')).resolves.toBeNull();
  });
});
