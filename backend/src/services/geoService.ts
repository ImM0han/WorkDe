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
  await redis.hset(`partner:meta:${partnerId}`, { lat: lat.toString(), lng: lng.toString(), updatedAt: Date.now().toString() });
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
  await redis.hset(`partner:meta:${partnerId}`, { lat: lat.toString(), lng: lng.toString(), updatedAt: Date.now().toString() });
}

export async function removePartnerFromPool(partnerId: string): Promise<void> {
  try {
    await redis.zrem(GEO_KEY, partnerId);
  } catch (err: any) {
    console.warn(`[Redis Geo Warning] zrem failed for partner ${partnerId}:`, err.message);
  }
  await redis.del(`partner:meta:${partnerId}`);
}

export async function findPartnersNearJob(
  lat: number,
  lng: number,
  radiusKm: number = 10
): Promise<string[]> {
  try {
    const results = await redis.georadius(GEO_KEY, lng, lat, radiusKm, 'km', 'ASC');
    return results as string[];
  } catch (err: any) {
    console.warn('[Redis Geo Warning] georadius failed, falling back to database query:', err.message);
    const onlinePartners = await prisma.partner.findMany({
      where: {
        isOnline: true,
        lastLat: { not: null },
        lastLng: { not: null }
      }
    });
    return onlinePartners
      .map(p => ({ id: p.id, dist: haversineDistance(lat, lng, p.lastLat!, p.lastLng!) }))
      .filter(p => p.dist <= radiusKm)
      .sort((a, b) => a.dist - b.dist)
      .map(p => p.id);
  }
}

export async function findPartnersNearJobWithDistance(
  lat: number,
  lng: number,
  radiusKm: number = 10
): Promise<Array<{ partnerId: string; distanceKm: number }>> {
  try {
    const results = await redis.georadius(
      GEO_KEY, lng, lat, radiusKm, 'km',
      'WITHCOORD', 'WITHDIST', 'ASC'
    ) as Array<[string, string, [string, string]]>;

    return results.map(([partnerId, dist]) => ({
      partnerId,
      distanceKm: parseFloat(parseFloat(dist).toFixed(1)),
    }));
  } catch (err: any) {
    console.warn('[Redis Geo Warning] georadius with distance failed, falling back to database query:', err.message);
    const onlinePartners = await prisma.partner.findMany({
      where: {
        isOnline: true,
        lastLat: { not: null },
        lastLng: { not: null }
      }
    });
    return onlinePartners
      .map(p => ({
        partnerId: p.id,
        distanceKm: parseFloat(haversineDistance(lat, lng, p.lastLat!, p.lastLng!).toFixed(1))
      }))
      .filter(p => p.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
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
