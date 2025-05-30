import pyautogui
import time

# Open Chrome
pyautogui.press('win')
time.sleep(1)
pyautogui.write('chrome')
time.sleep(1)
pyautogui.press('enter')
time.sleep(5)

# Go to gmail.com
pyautogui.write('https://www.gmail.com')
pyautogui.press('enter')
