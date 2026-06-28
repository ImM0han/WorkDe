const fetch = require('node-fetch'); // we can also use dynamic import or just standard axios / fetch in node 18+

async function test() {
  const lat = 23.90511;
  const lng = 86.5150517;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'GigWork/1.0' } }
    );
    const data = await res.json();
    console.log('NOMINATIM RESPONSE:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
