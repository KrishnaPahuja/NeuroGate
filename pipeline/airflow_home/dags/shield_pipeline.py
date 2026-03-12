from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'krishna',
    'depends_on_past': False,
    'start_date': datetime(2026, 3, 10),
    'email_on_failure': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=2),
}

# EXACT path from your Mac
PIPELINE_DIR = "/Users/krishnapahuja/Documents/Class Programming/Sem 8/PBL/YourBrainIsBeingControlled/cognitive-shield/pipeline"
VENV_PYTHON = f"{PIPELINE_DIR}/venv/bin/python"

with DAG(
    'cognitive_shield_daily_run',
    default_args=default_args,
    description='Fetches, de-biases, and narrates daily tech news',
    schedule_interval='0 6 * * *', 
    catchup=False,
    tags=['AI', 'News'],
) as dag:

    # Task 1: Fetch the emails
    task_ingest = BashOperator(
        task_id='ingest_emails',
        bash_command=f'cd "{PIPELINE_DIR}" && "{VENV_PYTHON}" ingest.py ',
    )

    # Task 2: Process with Groq Llama 70B
    task_shield = BashOperator(
        task_id='run_shield_engine',
        bash_command=f'cd "{PIPELINE_DIR}" && "{VENV_PYTHON}" shield_engine.py ',
    )

    # Task 3: Generate the MP3
    task_audio = BashOperator(
        task_id='generate_audio',
        bash_command=f'cd "{PIPELINE_DIR}" && "{VENV_PYTHON}" audio_gen.py ',
    )

    # Define the execution order
    task_ingest >> task_shield >> task_audio