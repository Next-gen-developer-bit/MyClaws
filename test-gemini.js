const apiKey = "AIzaSyDEWdZohtkFqxWOjXCSj3jje_Ff7OhyvvU";

async function testModel(modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: "Hello" }] }]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const text = await res.text();
  console.log(`--- ${modelName} ---`);
  console.log('Status:', res.status);
  console.log('Response:', text);
  console.log();
}

async function main() {
  await testModel('gemini-1.5-flash');
  await testModel('gemini-1.5-flash-latest');
  await testModel('gemini-1.5-pro');
  await testModel('gemini-pro');
  await testModel('gemini-2.0-flash');
}

main();
