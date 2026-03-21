const data = {
  email: 'test4@test.com',
  password: 'password123'
};

fetch('http://localhost:3000/users/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
  .then(res => res.text())
  .then(text => console.log('Response:', text))
  .catch(err => console.error('Error:', err));
