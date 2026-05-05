require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: "Придумай одну нову цікаву функцію для калькулятора маржинальності." }],
      model: "gpt-3.5-turbo",
    });

    console.log("Відповідь ШІ:");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("Помилка:", error.message);
  }
}

main();