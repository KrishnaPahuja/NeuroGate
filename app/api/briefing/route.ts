import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataFilePath = path.join(process.cwd(), 'data', 'daily_briefing.json');
    
    // If the pipeline hasn't run yet, return empty data so the app doesn't crash
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({ briefing_items: [], metrics: null });
    }
    
    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    return NextResponse.json(JSON.parse(fileData));
  } catch (error) {
    console.error("Error reading briefing:", error);
    return NextResponse.json({ error: "Failed to load briefing" }, { status: 500 });
  }
}