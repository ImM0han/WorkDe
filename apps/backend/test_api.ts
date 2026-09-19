import axios from 'axios';

async function test() {
  try {
    // 1. Get a token
    // We need a token. We can generate one directly using jwt.
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: '69f6438571d682a144f4c3fc', role: 'CLIENT' }, 'qBixcDJGLZT+iL9G1epgQfQYb07LcDpBO6JpJC+d5t4=');

    const payload = {
      label: 'Home',
      customLabel: '',
      name: 'Test Name',
      phone: '1234567890',
      flat: 'Flat 1',
      street: 'Test Street',
      landmark: '',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      lat: 12.34,
      lng: 56.78,
      fullAddress: 'Flat 1, Test Street, Test City, Test State, 123456'
    };

    const res = await axios.post('http://localhost:4000/addresses', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Success:', res.status, res.data);
  } catch (error: any) {
    console.error('Error:', error.response?.status, error.response?.data);
  }
}

test();
