import pyautogui
import time

# Set a small delay between actions for reliability
pyautogui.PAUSE = 0.5

# First, ensure we're on the desktop or a neutral window
pyautogui.hotkey('command', 'h')  # Hide current window
time.sleep(1)

# Open Chrome through Spotlight
pyautogui.hotkey('command', 'space')
time.sleep(1)
pyautogui.write('chrome')
time.sleep(0.5)
pyautogui.press('return')
time.sleep(3)  # Wait longer for Chrome to open

# Click in the address bar and type Gmail URL
pyautogui.hotkey('command', 'l')  # Focus on address bar
time.sleep(1)
pyautogui.hotkey('command', 't')
pyautogui.write('https://mail.google.com')
pyautogui.press('return')
time.sleep(4)  # Wait longer for Gmail to load

# Click compose button (usually in top left)
pyautogui.click(x=100, y=200)  # Adjust these coordinates based on your screen
time.sleep(2)

# Fill in the email details
pyautogui.write('kkumanan@g.ucla.edu')
pyautogui.press('tab')
pyautogui.press('tab')  # Skip subject
pyautogui.write('Arjun is fat and full of lard')
time.sleep(1)

# Don't send the email - just leave it in compose
print("Email composition complete. Email has not been sent.") 