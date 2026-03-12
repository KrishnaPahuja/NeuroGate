import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Define where our "database" lives
const dataFilePath = path.join(process.cwd(), 'data', 'preferences.json');

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // 1. Ask Groq to extract the topic from the user's natural language
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an extraction tool. The user will tell you something they do not want to read about anymore. Extract the core topic as a single lowercase word or short phrase. Return ONLY the topic, nothing else. Example: If user says "stop showing me news about calculus", you return "calculus".'
        },
        {
          role: 'user',
          content: message
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
    });

    const newTopicToBlock = completion.choices[0]?.message?.content?.trim().toLowerCase();

    if (!newTopicToBlock) {
      return NextResponse.json({ error: "Could not extract topic." }, { status: 400 });
    }

    // 2. Read the current JSON database
    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    const preferences = JSON.parse(fileData);

    // 3. Add the new topic if it isn't already there
    if (!preferences.blocked_topics.includes(newTopicToBlock)) {
      preferences.blocked_topics.push(newTopicToBlock);
      
      // 4. Save it back to the file
      fs.writeFileSync(dataFilePath, JSON.stringify(preferences, null, 2));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully blocked: ${newTopicToBlock}`,
      blocked_topics: preferences.blocked_topics 
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}