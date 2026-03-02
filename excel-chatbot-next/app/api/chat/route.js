import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { apiKey, assistantId, threadId, fileId, message } = await req.json();

    if (!apiKey || !assistantId || !threadId || !message) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    // 0. Cancel any active runs so we don't get the "Can't add messages while run is active" error
    const activeRuns = await openai.beta.threads.runs.list(threadId);
    for (const activeRun of activeRuns.data) {
        if (['queued', 'in_progress', 'requires_action'].includes(activeRun.status)) {
            try {
                // The Node SDK signature for cancel is runs.cancel(run_id, params)
                await openai.beta.threads.runs.cancel(activeRun.id, { thread_id: threadId });
            } catch (err) {
                console.warn("Could not cancel run:", err);
            }
        }
    }

    // 1. Add the user's message to the specific thread
    const messagePayload = {
      role: "user",
      content: message,
    };
    
    // As per the standard minimal flow, attach the file directly to the message
    if (fileId) {
        messagePayload.attachments = [
            {
                file_id: fileId,
                tools: [{ type: "code_interpreter" }]
            }
        ];
    }

    await openai.beta.threads.messages.create(threadId, messagePayload);

    // 2. Start the Assistant Run (which tells it to read the file and answer)
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId
    });

    // 3. Poll for Completion (Code Interpreter takes a few seconds to run pandas queries)
    // The Node SDK signature for retrieve is runs.retrieve(run_id, params)
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
    
    // Polling loop
    while (runStatus.status !== 'completed') {
      if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
         console.error("Run failed:", runStatus);
         return NextResponse.json({ error: `Assistant run ${runStatus.status}` }, { status: 500 });
      }
      // Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
    }

    // 4. Retrieve the new messages from the Assistant
    const messages = await openai.beta.threads.messages.list(threadId);
    
    // The messages list is ordered by descending created_at (newest first)
    // Find the newest message from the assistant that belongs to this run
    const assistantMessage = messages.data.find(
        (m) => m.role === 'assistant' && m.run_id === run.id
    );

    if (!assistantMessage) {
         return NextResponse.json({ error: "No response generated" }, { status: 500 });
    }

    // Return the text content
    return NextResponse.json({ 
        success: true,
        text: assistantMessage.content[0].text.value 
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
