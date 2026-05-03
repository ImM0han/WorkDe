const lockouts = new Map<string, number>();
const attempts = new Map<string, number>();

export const checkLoginLockout = async (phone: string) => {
  const lockedUntil = lockouts.get(phone);
  if (lockedUntil && lockedUntil > Date.now()) {
    const ttl = Math.ceil((lockedUntil - Date.now()) / 1000);
    throw { status: 429, message: 'Too many attempts', retryAfter: ttl };
  } else if (lockedUntil) {
    lockouts.delete(phone);
  }
};

export const recordFailedAttempt = async (phone: string) => {
  const current = (attempts.get(phone) || 0) + 1;
  attempts.set(phone, current);
  
  if (current >= 5) {
    lockouts.set(phone, Date.now() + 15 * 60 * 1000); // 15 mins lockout
    attempts.delete(phone);
  }
};

export const clearAttempts = async (phone: string) => {
  attempts.delete(phone);
  lockouts.delete(phone);
};
