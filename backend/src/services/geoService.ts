import { redis } from '../lib/redis';

const GEO_KEY = 'partners:online';

export async function addPartnerToPool(
  partnerId: string,
  lat: number,
  lng: number
): Promise<void> {
  await redis.geoadd(GEO_KEY, lng, lat, partnerId);
  await redis.hset(`partner:meta:${partnerId}`, { lat: lat.toString(), lng: lng.toString(), updatedAt: Date.now().toString() });
}

export async function updatePartnerLocation(
  partnerId: string,
  lat: number,
  lng: number
): Promise<void> {
  await redis.geoadd(GEO_KEY, lng, lat, partnerId);
  await redis.hset(`partner:meta:${partnerId}`, { lat: lat.toString(), lng: lng.toString(), updatedAt: Date.now().toString() });
}

export async function removePartnerFromPool(partnerId: string): Promise<void> {
  await redis.zrem(GEO_KEY, partnerId);
  await redis.del(`partner:meta:${partnerId}`);
}

export async function findPartnersNearJob(
  lat: number,
  lng: number,
  radiusKm: number = 10
): Promise<string[]> {
  const results = await redis.georadius(GEO_KEY, lng, lat, radiusKm, 'km', 'ASC');
  return results as string[];
}

export async function findPartnersNearJobWithDistance(
  lat: number,
  lng: number,
  radiusKm: number = 10
): Promise<Array<{ partnerId: string; distanceKm: number }>> {
  const results = await redis.georadius(
    GEO_KEY, lng, lat, radiusKm, 'km',
    'WITHCOORD', 'WITHDIST', 'ASC'
  ) as Array<[string, string, [string, string]]>;

  return results.map(([partnerId, dist]) => ({
    partnerId,
    distanceKm: parseFloat(parseFloat(dist).toFixed(1)),
  }));
}

export async function getPartnerLocation(
  partnerId: string
): Promise<{ lat: number; lng: number } | null> {
  const meta = await redis.hgetall(`partner:meta:${partnerId}`);
  if (!meta?.lat) return null;
  return { lat: parseFloat(meta.lat), lng: parseFloat(meta.lng) };
}
