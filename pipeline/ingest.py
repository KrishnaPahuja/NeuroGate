import imaplib
import email
import os
import json
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv('../.env.local')

EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASS = os.getenv('EMAIL_PASS')
IMAP_SERVER = 'imap.gmail.com'

DATA_DIR = '../data'
OUTPUT_FILE = os.path.join(DATA_DIR, 'raw_emails.json')


def clean_html(html_content):
    """Convert HTML email body to readable text."""
    soup = BeautifulSoup(html_content, "html.parser")

    for tag in soup(["script", "style"]):
        tag.extract()

    text = soup.get_text(separator=" ")
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))

    return "\n".join(chunk for chunk in chunks if chunk)


def fetch_unread_newsletters():
    print(f"🔄 Connecting to {EMAIL_USER}...")

    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL_USER, EMAIL_PASS)

        mail.select("inbox")

        two_days_ago = (datetime.now() - timedelta(days=2)).strftime("%d-%b-%Y")

        print(f"🔍 Searching: UNSEEN SINCE {two_days_ago}")

        status, messages = mail.search(None, 'UNSEEN', 'SINCE', two_days_ago)

        if status != "OK":
            print("❌ Search failed")
            return []

        email_ids = messages[0].split()

        if not email_ids:
            print("📭 No new emails found.")
            return []

        print(f"📬 Found {len(email_ids)} emails")

        extracted_data = []

        for e_id in email_ids:
            status, msg_data = mail.fetch(e_id, '(RFC822)')

            if status != "OK":
                continue

            for response_part in msg_data:
                if isinstance(response_part, tuple):

                    msg = email.message_from_bytes(response_part[1])

                    subject, encoding = email.header.decode_header(msg["Subject"])[0]

                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding or "utf-8", errors="ignore")

                    sender = msg.get("From")

                    body = ""

                    if msg.is_multipart():
                        for part in msg.walk():

                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))

                            if "attachment" in content_disposition:
                                continue

                            payload = part.get_payload(decode=True)
                            if not payload:
                                continue

                            try:
                                decoded = payload.decode(errors="ignore")
                            except:
                                continue

                            if content_type == "text/html":
                                body = clean_html(decoded)
                                break

                            if content_type == "text/plain":
                                body = decoded

                    else:
                        payload = msg.get_payload(decode=True)

                        if payload:
                            decoded = payload.decode(errors="ignore")

                            if msg.get_content_type() == "text/html":
                                body = clean_html(decoded)
                            else:
                                body = decoded

                    extracted_data.append({
                        "sender": sender,
                        "subject": subject,
                        "content": body
                    })

        mail.logout()

        return extracted_data

    except Exception as e:
        print(f"❌ Error during ingestion: {e}")
        return []


if __name__ == "__main__":

    emails = fetch_unread_newsletters()

    if emails:
        os.makedirs(DATA_DIR, exist_ok=True)

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(emails, f, indent=2)

        print(f"✅ Saved {len(emails)} emails to {OUTPUT_FILE}")