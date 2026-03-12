import os
import json
import asyncio
import edge_tts

# Paths
DATA_DIR = '../data'
INPUT_FILE = os.path.join(DATA_DIR, 'daily_briefing.json')

# We save the audio directly into the Next.js public folder so the web app can play it
PUBLIC_DIR = '../public'
OUTPUT_FILE = os.path.join(PUBLIC_DIR, 'briefing.mp3')

async def generate_audio():
    print("🎙️ Booting up Cognitive Shield Audio Generator...")
    
    if not os.path.exists(INPUT_FILE):
        print("❌ No briefing data found. Run shield_engine.py first.")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    briefing_items = data.get('briefing_items', [])
    
    if not briefing_items:
        print("📭 Briefing is empty. Nothing to narrate.")
        return

    # 1. Write the podcast script
    script = "Welcome to your Cognitive Shield daily briefing. Here is your synthesized signal, with zero noise.\n\n"
    
    for idx, item in enumerate(briefing_items):
        script += f"Update {idx + 1}: {item['title']}. \n"
        script += f"{item['summary']} \n\n"
        
    script += "That concludes your briefing. Have a focused day."

    print("🎧 Generating high-fidelity neural audio...")
    
    # 2. Select a premium, realistic voice
    # 'en-US-ChristopherNeural' is a great, professional male voice. 
    # For a British female voice, you could use 'en-GB-SoniaNeural'
    VOICE = "en-US-ChristopherNeural" 
    
    # Ensure the public directory exists
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    # 3. Generate and save the MP3
    communicate = edge_tts.Communicate(script, VOICE)
    await communicate.save(OUTPUT_FILE)
    
    print(f"✅ Daily Podcast successfully saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    # edge-tts is asynchronous, so we run it with asyncio
    asyncio.run(generate_audio())