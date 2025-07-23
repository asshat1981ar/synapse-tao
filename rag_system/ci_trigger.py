import subprocess

def trigger_ci():
    subprocess.run(["git", "add", "."], check=True)
    subprocess.run(["git", "commit", "-m", "Auto-tuned config based on metrics"], check=True)
    subprocess.run(["git", "push"], check=True)
