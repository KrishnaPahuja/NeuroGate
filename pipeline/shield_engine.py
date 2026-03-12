import os
import json
from groq import Groq
from dotenv import load_dotenv

# Load the environment variables
load_dotenv('../.env.local')

# Setup paths
DATA_DIR = '../data'
RAW_EMAILS_FILE = os.path.join(DATA_DIR, 'raw_emails.json')
PREFS_FILE = os.path.join(DATA_DIR, 'preferences.json')
OUTPUT_FILE = os.path.join(DATA_DIR, 'daily_briefing.json')

def load_json(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def run_shield_engine():
    print("🧠 Booting up Cognitive Shield Engine...")

    # 1. Load the data
    emails = load_json(RAW_EMAILS_FILE)
    prefs = load_json(PREFS_FILE)

    if not emails:
        print("📭 No raw emails found to process. Run ingest.py first.")
        return

    # Extract preferences
    blocked_topics = prefs.get('blocked_topics', []) if prefs else []
    audio_format = prefs.get('audio_format', 'narration') if prefs else 'narration'
    
    print(f"🛡️ Active Filters (Blocked Topics): {blocked_topics}")
    print(f"🎙️ Target Audio Format: {audio_format}")

    # 2. Format the payload for the LLM
    email_text_payload = ""
    for idx, email in enumerate(emails):
        email_text_payload += f"--- EMAIL {idx+1} ---\nSender: {email['sender']}\nSubject: {email['subject']}\nContent: {email['content'][:2000]}...\n\n"

    # 3. Connect to Groq
    client = Groq(api_key=os.getenv('GROQ_API_KEY'))

    # DYNAMIC INSTRUCTIONS: Tell Groq how to behave based on the UI dropdown
    if audio_format == "podcast":
        format_instructions = """
        You must ALSO write a 2-host podcast script discussing these updates.
        The hosts are Alex and Sam. Make it conversational, engaging, and professional.
        Add a "podcast_script" array to the JSON output, containing objects with "speaker" and "text" keys.
        """
    else:
        format_instructions = """
        Provide a "podcast_script" key but leave it as an empty array [].
        """

    system_prompt = f"""
    You are an elite data de-biasing engine. Your job is to read raw tech newsletters and output a clean, neutral daily briefing.
    
    RULES:
    1. FILTERING: Absolutely DO NOT include any information related to these blocked topics: {blocked_topics}.
    2. DE-DUPLICATION: If multiple emails talk about the same event, merge them into ONE summary point.
    3. DE-BIASING: Remove all marketing jargon, promotional adjectives, and corporate bias. Keep only objective engineering/tech facts.
    4. METRICS: Keep track of how many duplicate stories you merged and how many marketing words/jargon you removed.

    {format_instructions}

    OUTPUT FORMAT:
    You must output ONLY valid JSON. Use this exact schema:
    {{
        "briefing_items": [
            {{
                "title": "Clean, neutral title",
                "summary": "Objective, factual summary",
                "sources": ["Sender 1", "Sender 2"]
            }}
        ],
        "metrics": {{
            "jargon_removed": <integer>,
            "duplicates_merged": <integer>,
            "blocked_topics_filtered": <integer>
        }},
        "podcast_script": [
            {{
                "speaker": "Alex",
                "text": "..."
            }},
            {{
                "speaker": "Sam",
                "text": "..."
            }}
        ]
    }}
    """

    print("🚀 Sending data to Groq (Llama 3.3 70B) for processing...")
    
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": email_text_payload}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2, # Bumped to 0.2 so the podcast dialogue is slightly more conversational
            response_format={"type": "json_object"} 
        )

        # 4. Save the sanitized data
        sanitized_data = json.loads(response.choices[0].message.content)
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(sanitized_data, f, indent=2)

        print(f"✅ Synthesis Complete! Saved to {OUTPUT_FILE}")
        print(f"📊 Shield Metrics: {sanitized_data['metrics']}")

    except Exception as e:
        print(f"❌ Error during AI processing: {e}")

if __name__ == "__main__":
    run_shield_engine()