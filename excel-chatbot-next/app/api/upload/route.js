import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const apiKey = formData.get('apiKey');
    const assistantId = formData.get('assistantId'); // User can pass an existing assistant ID
    const file = formData.get('file');

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    let finalAssistantId = assistantId;
    let finalFileId = null;

    // 1. If user uploaded a new file, we must upload it to OpenAI's Vector store
    if (file && file.size > 0) {
        // Convert the web stream File into a Node Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Save it temporarily so the OpenAI Node SDK can read it
        const tempPath = path.join(process.cwd(), file.name);
        fs.writeFileSync(tempPath, buffer);

        // Upload to OpenAI
        const openAiFile = await openai.files.create({
            file: fs.createReadStream(tempPath),
            purpose: 'assistants',
        });
        
        finalFileId = openAiFile.id;

        // Clean up temp file
        fs.unlinkSync(tempPath);

        // 2a. If we don't have an assistant yet, build a new one without hardcoding file_ids
        if (!finalAssistantId) {
            const assistant = await openai.beta.assistants.create({
                name: "Excel Data Analyst",
                instructions: "You are an expert data analyst. You help answer questions based on the uploaded Excel file. Always calculate accurately using the Code Interpreter (python pandas) to read the excel file and return the specific computed answer.",
                model: "gpt-4o-mini",
                tools: [{ type: "code_interpreter" }]
            });
            finalAssistantId = assistant.id;
        }
    } else if (!finalAssistantId) {
         return NextResponse.json({ error: "You must provide either a File to create an Assistant, or an existing Assistant ID." }, { status: 400 });
    }

    // 3. Create a fresh conversation thread for this session
    const thread = await openai.beta.threads.create();

    return NextResponse.json({ 
        success: true, 
        assistantId: finalAssistantId, 
        threadId: thread.id,
        fileId: finalFileId
    });
  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
