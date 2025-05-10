import pyautogui
import time

# Set a small delay between actions for reliability
pyautogui.PAUSE = 0.5

# First, ensure we're on the desktop or a neutral window
pyautogui.hotkey('command', 'h')  # Hide current window
time.sleep(1)

# Open Spotify
pyautogui.hotkey("command", "space")
pyautogui.write("Spotify")
pyautogui.press("return")

# Search for liked songs
# pyautogui.click(410, 119)  # Click on search bar
pyautogui.hotkey('command', 'l')  # Open search in Spotify
pyautogui.write("Liked Songs")
pyautogui.press("return")