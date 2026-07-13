import { redis } from '../lib/redis';
import { prisma } from '../utils/prisma';
import { haversineDistance } from '../utils/haversine';

const GEO_KEY = 'partners:online';

export async function addPartnerToPool(
  partnerId: string,
  lat: number,
  lng: number
): Promise<void> {
  try {
    await redis.geoadd(GEO_KEY, lng, lat, partnerId);
  } catch (err: any) {
    console.warn(`[Redis Geo Warning] geoadd failed for partner ${partnerId}:`, err.message);
  }
  try {
    await redis.hmset(`partner:meta:${partnerId}`, { 
      lat: lat.toString(), 
      lng: lng.toString(), 
      updatedAt: Date.now().toString() 
    });
  } catch (err: any) {
    console.warn(`[Redis Meta Warning] hmset failed for partner ${partnerId}:`, err.message);
  }
}

export async function updatePartnerLocation(
  partnerId: string,
  lat: number,
  lng: number
): Promise<void> {
  try {
    await redis.geoadd(GEO_KEY, lng, lat, partnerId);
  } catch (err: any) {
    console.warn(`[Redis Geo Warning] geoadd failed for location update of partner ${partnerId}:`, err.message);
  }
  try {
    await redis.hmset(`partner:meta:${partnerId}`, { 
      lat: lat.toString(), 
      lng: lng.toString(), 
      updatedAt: Date.now().toString() 
    });
  } catch (err: any) {
    console.warn(`[Redis Meta Warning] hmset failed for location update of partner ${partnerId}:`, err.message);
  }
}

export async function removePartnerFromPool(partnerId: string): Promise<void> {
  try {
    await redis.zrem(GEO_KEY, partnerId);
  } catch (err: any) {
    console.warn(`[Redis Geo Warning] zrem failed for partner ${partnerId}:`, err.message);
  }
  try {
    await redis.del(`partner:meta:${partnerId}`);
  } catch (err: any) {
    console.warn(`[Redis Meta Warning] del failed for partner ${partnerId}:`, err.message);
  }
}

export async function findPartnersNearJob(
  lat: number,
  lng: number,
  radiusKm: number = 30
): Promise<string[]> {
  try {
    const partners = await prisma.partner.findMany({
      where: {
        lastLat: { not: null },
        lastLng: { not: null }
      }
    });
    return partners
      .map(p => ({ id: p.id, dist: haversineDistance(lat, lng, p.lastLat!, p.lastLng!) }))
      .filter(p => p.dist <= radiusKm)
      .sort((a, b) => a.dist - b.dist)
      .map(p => p.id);
  } catch (err: any) {
    console.error('[Geo Warning] findPartnersNearJob failed:', err.message);
    return [];
  }
}

export async function findPartnersNearJobWithDistance(
  lat: number,
  lng: number,
  radiusKm: number = 30
): Promise<Array<{ partnerId: string; distanceKm: number }>> {
  try {
    const partners = await prisma.partner.findMany({
      where: {
        lastLat: { not: null },
        lastLng: { not: null }
      }
    });
    return partners
      .map(p => ({
        partnerId: p.id,
        distanceKm: parseFloat(haversineDistance(lat, lng, p.lastLat!, p.lastLng!).toFixed(1))
      }))
      .filter(p => p.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  } catch (err: any) {
    console.error('[Geo Warning] findPartnersNearJobWithDistance failed:', err.message);
    return [];
  }
}

export async function getPartnerLocation(
  partnerId: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const meta = await redis.hgetall(`partner:meta:${partnerId}`);
    if (meta && meta.lat) {
      return { lat: parseFloat(meta.lat), lng: parseFloat(meta.lng) };
    }
  } catch (err: any) {
    console.warn(`[Redis Warning] hgetall failed for partner ${partnerId}:`, err.message);
  }
  
  // DB fallback for getting single partner location
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { lastLat: true, lastLng: true }
  });
  if (partner && partner.lastLat !== null && partner.lastLng !== null) {
    return { lat: partner.lastLat, lng: partner.lastLng };
  }
  return null;
}
