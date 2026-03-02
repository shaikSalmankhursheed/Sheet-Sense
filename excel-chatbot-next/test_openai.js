const OpenAI = require('openai');
console.log("Checking signature of retrieve...");

const openai = new OpenAI({ apiKey: "sk-fake" });
try {
  openai.beta.threads.runs.retrieve("thread_123", "run_456");
} catch (e) {
  console.log("Error:", e);
}
