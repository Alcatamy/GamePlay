"""
Automated Bluestacks Activity Capture & Comparison Script
Captures the Fantasy app activity feed automatically via ADB
"""
import subprocess
import time
import os

ADB_DEVICE = "127.0.0.1:5555"
OUTPUT_DIR = "bluestacks_captures"
NUM_SCROLLS = 15  # Number of times to scroll to capture history

def adb(cmd):
    """Run ADB command"""
    full_cmd = f'adb -s {ADB_DEVICE} {cmd}'
    result = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
    return result.returncode == 0

def capture_screen(filename):
    """Capture screenshot and save to file"""
    cmd = f'adb -s {ADB_DEVICE} exec-out screencap -p > {filename}'
    subprocess.run(cmd, shell=True)
    print(f"📸 Captured: {filename}")

def scroll_down():
    """Scroll down in the app"""
    adb('shell input swipe 360 1400 360 400 200')
    time.sleep(0.8)

def main():
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("🚀 Starting automated Bluestacks capture...")
    print(f"📂 Output directory: {OUTPUT_DIR}")
    
    # Capture initial screen
    capture_screen(f"{OUTPUT_DIR}/screen_00.png")
    
    # Scroll and capture
    for i in range(1, NUM_SCROLLS + 1):
        print(f"📜 Scrolling {i}/{NUM_SCROLLS}...")
        scroll_down()
        capture_screen(f"{OUTPUT_DIR}/screen_{i:02d}.png")
    
    print(f"\n✅ Done! Captured {NUM_SCROLLS + 1} screenshots in '{OUTPUT_DIR}/'")
    print("📋 You can now review them to compare against the CSV.")

if __name__ == "__main__":
    main()
