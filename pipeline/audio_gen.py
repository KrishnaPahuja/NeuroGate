import os
import json
import asyncio
import edge_tts

# Paths
DATA_DIR = '../data'
INPUT_FILE = os.path.join(DATA_DIR, 'daily_briefing.json')
PREFS_FILE = os.path.join(DATA_DIR, 'preferences.json')
PUBLIC_DIR = '../public'
OUTPUT_FILE = os.path.join(PUBLIC_DIR, 'briefing.mp3')

# Temporary folder to hold the individual dialogue clips before stitching
TEMP_DIR = os.path.join(DATA_DIR, 'temp_audio')

def load_json(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

async def generate_narration(briefing_items):
    print("🎙️ Generating Single-Voice Narration...")
    script = "Welcome to your Cognitive Shield daily briefing. Here is your synthesized signal, with zero noise.\n\n"
    
    for idx, item in enumerate(briefing_items):
        script += f"Update {idx + 1}: {item['title']}. \n"
        script += f"{item['summary']} \n\n"
        
    script += "That concludes your briefing. Have a focused day."

    VOICE = "en-US-ChristopherNeural"
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    communicate = edge_tts.Communicate(script, VOICE)
    await communicate.save(OUTPUT_FILE)
    print(f"✅ Narration successfully saved to {OUTPUT_FILE}")

async def generate_podcast(podcast_script):
    print("🎙️ Generating 2-Host Podcast...")
    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    # Define our two hosts
    VOICE_ALEX = "en-US-ChristopherNeural" # Professional Male
    VOICE_SAM = "en-US-AriaNeural"         # Crisp Female
    
    temp_files = []
    
    # 1. Generate individual audio chunks for each line of dialogue
    for idx, line in enumerate(podcast_script):
        speaker = line.get("speaker", "Alex")
        text = line.get("text", "")
        
        # Pick the right voice based on the speaker's name
        voice = VOICE_ALEX if "alex" in speaker.lower() else VOICE_SAM
        
        temp_file = os.path.join(TEMP_DIR, f"chunk_{idx}.mp3")
        temp_files.append(temp_file)
        
        print(f"   -> Recording {speaker} (Chunk {idx+1}/{len(podcast_script)})...")
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(temp_file)
        
    # 2. Stitch them together using binary concatenation
    print("🎧 Stitching chunks together into master podcast track...")
    with open(OUTPUT_FILE, 'wb') as outfile:
        for temp_file in temp_files:
            with open(temp_file, 'rb') as infile:
                outfile.write(infile.read())
                
    # 3. Clean up the temporary files so we don't clutter your hard drive
    for temp_file in temp_files:
        os.remove(temp_file)
    os.rmdir(TEMP_DIR)
        
    print(f"✅ Podcast successfully saved to {OUTPUT_FILE}")

async def generate_audio():
    print("🎧 Booting up Cognitive Shield Audio Generator...")
    
    data = load_json(INPUT_FILE)
    prefs = load_json(PREFS_FILE)
    
    if not data:
        print("❌ No briefing data found. Run shield_engine.py first.")
        return
    
    # Figure out which format the user wants
    audio_format = prefs.get('audio_format', 'narration') if prefs else 'narration'
    briefing_items = data.get('briefing_items', [])
    podcast_script = data.get('podcast_script', [])
    
    # Route to the correct audio engine
    if audio_format == "podcast" and podcast_script:
        await generate_podcast(podcast_script)
    elif briefing_items:
        await generate_narration(briefing_items)
    else:
        print("📭 Briefing is empty. Nothing to narrate.")

if __name__ == "__main__":
    asyncio.run(generate_audio())