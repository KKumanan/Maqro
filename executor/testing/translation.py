import pyautogui
import time

# Set a small delay between actions for reliability
pyautogui.PAUSE = 0.5

# Opening Apps
def open_app(app_name):
    pyautogui.click()
    pyautogui.hotkey('command', 'space')
    time.sleep(1)
    pyautogui.write(app_name)
    time.sleep(0.5)
    pyautogui.press('return')
    time.sleep(3)  # Wait for Spotify to fully launch

# Searching main searchbar (Chrome, Spotify)
def main_searchbar(search_query):
    pyautogui.click()
    pyautogui.hotkey('command', 'l')  # Open search in Spotify
    time.sleep(1)
    pyautogui.write(search_query)
    time.sleep(0.5)
    pyautogui.press('return')

open_app('Spotify')
main_searchbar('Liked Songs')