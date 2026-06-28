const fetch = require('node-fetch');

async function test() {
  const lat = 25.5941;
  const lng = 85.1376;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'GigWork/1.0' } }
    );
    const data = await res.json();
    console.log('NOMINATIM URBAN RESPONSE:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
