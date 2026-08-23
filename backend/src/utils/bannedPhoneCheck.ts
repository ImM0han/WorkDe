import { prisma } from './prisma';

export interface PhoneBanStatus {
  isBanned: boolean;
  bannedUntil?: Date;
  reason?: string;
  message?: string;
}

/**
 * Check if a phone number is currently banned from login or registration.
 * Phone numbers are banned for 30 days when deleted/deactivated from Auth Console.
 */
export async function checkPhoneBanned(rawPhone: string | undefined | null): Promise<PhoneBanStatus> {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isBanned: false };
  }

  const cleanPhone = rawPhone.trim();
  const phoneWithoutPrefix = cleanPhone.replace(/^\+91/, '').replace(/\D/g, '');
  const withPrefix = `+91${phoneWithoutPrefix}`;

  try {
    const bannedRecord = await (prisma as any).bannedPhone.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: phoneWithoutPrefix },
          { phone: withPrefix }
        ],
        bannedUntil: {
          gt: new Date()
        }
      }
    });

    if (bannedRecord) {
      const daysLeft = Math.ceil(
        (new Date(bannedRecord.bannedUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const formattedDate = new Date(bannedRecord.bannedUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return {
        isBanned: true,
        bannedUntil: bannedRecord.bannedUntil,
        reason: bannedRecord.reason,
        message: `This phone number has been deactivated. Login and registration are blocked for ${daysLeft} more day(s) (until ${formattedDate}).`
      };
    }
  } catch (error) {
    console.error('[bannedPhoneCheck] Error checking phone ban:', error);
  }

  return { isBanned: false };
}

/**
 * Ban a phone number for 30 days.
 */
export async function banPhoneNumber(rawPhone: string, reason: string = 'User deleted from Auth Console'): Promise<Date> {
  const cleanPhone = rawPhone.trim();
  const phoneWithoutPrefix = cleanPhone.replace(/^\+91/, '').replace(/\D/g, '');
  const withPrefix = `+91${phoneWithoutPrefix}`;
  const bannedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  try {
    // Upsert for primary format
    await (prisma as any).bannedPhone.upsert({
      where: { phone: withPrefix },
      update: { bannedUntil, reason },
      create: { phone: withPrefix, bannedUntil, reason }
    });

    if (phoneWithoutPrefix !== withPrefix) {
      await (prisma as any).bannedPhone.upsert({
        where: { phone: phoneWithoutPrefix },
        update: { bannedUntil, reason },
        create: { phone: phoneWithoutPrefix, bannedUntil, reason }
      });
    }
  } catch (error) {
    console.error('[bannedPhoneCheck] Error banning phone:', error);
  }

  return bannedUntil;
}

/**
 * Revoke ban for a phone number.
 */
export async function unbanPhoneNumber(rawPhone: string | undefined | null): Promise<void> {
  if (!rawPhone || typeof rawPhone !== 'string') return;
  const cleanPhone = rawPhone.trim();
  const phoneWithoutPrefix = cleanPhone.replace(/^\+91/, '').replace(/\D/g, '');
  const withPrefix = `+91${phoneWithoutPrefix}`;

  try {
    await (prisma as any).bannedPhone.deleteMany({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: phoneWithoutPrefix },
          { phone: withPrefix }
        ]
      }
    });
  } catch (error) {
    console.error('[bannedPhoneCheck] Error unbanning phone:', error);
  }
}
