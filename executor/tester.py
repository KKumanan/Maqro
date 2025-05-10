import pyautogui
import time

# Set a small delay between actions for reliability
pyautogui.PAUSE = 0.5

# First, ensure we're on the desktop or a neutral window
pyautogui.hotkey('command', 'h')  # Hide current window
time.sleep(1)

# Open Spotlight and launch Spotify
pyautogui.hotkey('command', 'space')
time.sleep(1)
pyautogui.write('spotify')
time.sleep(0.5)
pyautogui.press('return')
time.sleep(3)  # Wait for Spotify to fully launch

# Click in the middle of the screen to ensure Spotify is focused
pyautogui.click(x=500, y=300)
time.sleep(1)

# Use Spotify's search shortcut and search for Daily Mix
pyautogui.hotkey('command', 'l')  # Open search in Spotify
time.sleep(1)
pyautogui.write('Daily Mix')
time.sleep(0.5)
pyautogui.press('return')