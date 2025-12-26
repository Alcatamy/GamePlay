import subprocess
import time
import xml.etree.ElementTree as ET

ADB_DEVICE = "127.0.0.1:5555"
TARGET_TEXT = "Brais Méndez"
TARGET_AMOUNT = "34.708.710"

def adb_shell(cmd):
    return subprocess.run(f'adb -s {ADB_DEVICE} shell {cmd}', shell=True, capture_output=True, text=True)

def adb_pull(remote, local):
    subprocess.run(f'adb -s {ADB_DEVICE} pull {remote} {local}', shell=True, stdout=subprocess.DEVNULL)

def get_ui_hierarchy():
    adb_shell("uiautomator dump /sdcard/window_dump.xml")
    adb_pull("/sdcard/window_dump.xml", "window_dump.xml")
    try:
        return ET.parse("window_dump.xml").getroot()
    except:
        return None

def find_target(root):
    # Iterate all nodes, looks for message containing text and amount
    # Then look for sibling time
    # Structure: RelativeLayout -> [Title, Time, Message]
    for node in root.iter():
        if node.attrib.get('class') == 'android.widget.RelativeLayout':
            # Check children
            time_text = ""
            msg_text = ""
            
            for child in node:
                resid = child.attrib.get('resource-id', '')
                text = child.attrib.get('text', '')
                
                if 'tvLeagueActivityItemTimeAgo' in resid:
                    time_text = text
                if 'tvLeagueActivityItemMessage' in resid:
                    msg_text = text
            
            if TARGET_TEXT in msg_text and TARGET_AMOUNT in msg_text:
                return time_text, msg_text
    return None, None

def find_button_bounds(root, text_pattern="Ver más"):
    for node in root.iter():
        text = node.attrib.get('text', '')
        if text_pattern.lower() in text.lower():
            bounds = node.attrib.get('bounds', '') 
            import re
            match = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', bounds)
            if match:
                x1, y1, x2, y2 = map(int, match.groups())
                return (x1 + x2) // 2, (y1 + y2) // 2
    return None

def main():
    print(f"🔍 Searching for Brais Méndez ({TARGET_AMOUNT})...")
    
    for i in range(100):
        root = get_ui_hierarchy()
        if not root: continue
        
        found_time, found_msg = find_target(root)
        if found_time:
            print(f"\n✅ FOUND!")
            print(f"Time: {found_time}")
            print(f"Message: {found_msg}")
            with open("brais_result.txt", "w") as f:
                f.write(f"Time: {found_time}\nMessage: {found_msg}")
            break
            
        # Scroll logic
        btn = find_button_bounds(root)
        if btn:
            print(f"   [{i}] Clicking Ver más...")
            adb_shell(f"input tap {btn[0]} {btn[1]}")
            time.sleep(2.5)
            # small scroll to reveal
            adb_shell("input swipe 360 800 360 600 300")
            time.sleep(0.5)
        else:
            print(f"   [{i}] Scrolling...")
            adb_shell("input swipe 360 1200 360 600 300") # Fast scroll
            time.sleep(1)

if __name__ == "__main__":
    main()
