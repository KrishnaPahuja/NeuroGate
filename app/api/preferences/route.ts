import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Define where our "database" lives
const dataFilePath = path.join(process.cwd(), 'data', 'preferences.json');

// Define the exact shape of our JSON file so TypeScript doesn't panic
interface UserPreferences {
  blocked_topics: string[];
  audio_format: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, audio_format } = body;

    // 1. Read the current JSON database with our explicit type
    let preferences: UserPreferences = { blocked_topics: [], audio_format: "narration" };
    
    if (fs.existsSync(dataFilePath)) {
      const fileData = fs.readFileSync(dataFilePath, 'utf8');
      if (fileData) {
        preferences = JSON.parse(fileData) as UserPreferences;
      }
    }

    // 2. Update the audio format if the frontend sent one
    if (audio_format) {
      preferences.audio_format = audio_format;
    }

    let newTopicToBlock: string | null = null;

    // 3. Ask Groq to extract the topic ONLY if the user typed a message
    if (message && message.trim() !== "") {
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

      const extracted = completion.choices[0]?.message?.content?.trim().toLowerCase();
      if (extracted) {
        newTopicToBlock = extracted;
      }

      // Add the new topic if it isn't already there
      if (newTopicToBlock && !preferences.blocked_topics.includes(newTopicToBlock)) {
        preferences.blocked_topics.push(newTopicToBlock);
      }
    }

    // 4. Save everything back to the file
    fs.writeFileSync(dataFilePath, JSON.stringify(preferences, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: newTopicToBlock 
        ? `Blocked: ${newTopicToBlock} & Set format to: ${preferences.audio_format}`
        : `Audio format updated to: ${preferences.audio_format}`,
      blocked_topics: preferences.blocked_topics,
      audio_format: preferences.audio_format
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}