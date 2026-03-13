import os
import json
import asyncio
import edge_tts

# Paths
DATA_DIR = '../data'
INPUT_FILE = os.path.join(DATA_DIR, 'daily_briefing.json')
PUBLIC_DIR = '../public'

# THE CHANGE: Define our two output files instead of one
NARRATION_FILE = os.path.join(PUBLIC_DIR, 'narration.mp3')
PODCAST_FILE = os.path.join(PUBLIC_DIR, 'podcast.mp3')

# Temporary folder to hold the individual dialogue clips before stitching
TEMP_DIR = os.path.join(DATA_DIR, 'temp_audio')

def load_json(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

async def generate_narration(briefing_items):
    print("🎙️ Generating Single-Voice Narration...")
    script = "Welcome to your Neuro Gate daily briefing. Here is your synthesized signal, with zero noise.\n\n"
    
    for idx, item in enumerate(briefing_items):
        script += f"Update {idx + 1}: {item['title']}. \n"
        script += f"{item['summary']} \n\n"
        
    script += "That concludes your briefing. Have a focused day."

    VOICE = "en-US-ChristopherNeural"
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    communicate = edge_tts.Communicate(script, VOICE)
    await communicate.save(NARRATION_FILE)  # Saves as narration.mp3
    print(f"✅ Narration successfully saved to {NARRATION_FILE}")

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
    with open(PODCAST_FILE, 'wb') as outfile:  # Saves as podcast.mp3
        for temp_file in temp_files:
            with open(temp_file, 'rb') as infile:
                outfile.write(infile.read())
                
    # 3. Clean up the temporary files
    for temp_file in temp_files:
        os.remove(temp_file)
    os.rmdir(TEMP_DIR)
        
    print(f"✅ Podcast successfully saved to {PODCAST_FILE}")

async def generate_audio():
    print("🎧 Booting up Neuro Gate Audio Generator...")
    
    data = load_json(INPUT_FILE)
    
    if not data:
        print("❌ No briefing data found. Run shield_engine.py first.")
        return

    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    briefing_items = data.get('briefing_items', [])
    podcast_script = data.get('podcast_script', [])
    
    # THE BIG CHANGE: Run BOTH generators sequentially!
    if briefing_items:
        await generate_narration(briefing_items)
    else:
        print("📭 No standard briefing items found.")
        
    if podcast_script:
        await generate_podcast(podcast_script)
    else:
        print("📭 No podcast script found.")

if __name__ == "__main__":
    asyncio.run(generate_audio())