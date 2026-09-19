import { prisma } from './src/utils/prisma';
import { haversineDistance } from './src/utils/haversine';

async function list() {
  try {
    console.log('--- PARTNERS ---');
    const partners = await prisma.partner.findMany({
      include: { user: { select: { name: true } } }
    });
    for (const p of partners) {
      console.log(`Partner: ${p.user.name} | id: ${p.id} | isOnline: ${p.isOnline} | lat: ${p.lastLat} | lng: ${p.lastLng} | skills: ${p.skills}`);
    }

    console.log('\n--- JOBS ---');
    const jobs = await prisma.job.findMany({
      include: { client: { select: { name: true } } }
    });
    for (const j of jobs) {
      console.log(`Job ID: ${j.id} | status: ${j.status} | lat: ${j.lat} | lng: ${j.lng} | category: ${j.category} | femaleOnly: ${j.femaleOnly}`);
    }

    if (partners.length > 0 && jobs.length > 0) {
      console.log('\n--- DISTANCES ---');
      for (const p of partners) {
        for (const j of jobs) {
          if (p.lastLat !== null && p.lastLng !== null) {
            const dist = haversineDistance(p.lastLat, p.lastLng, j.lat, j.lng);
            console.log(`Distance between Partner ${p.user.name} and Job ${j.id} (${j.category}): ${dist.toFixed(2)} km`);
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

list();
