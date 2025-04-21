=================================
OUTSIDE OBIE VIDEO JUKEBOX - README
=================================

This web application provides a touchscreen-friendly interface to browse and queue YouTube music videos from a master playlist XML file, controlling playback in a separate, dedicated fullscreen player window.

--------------------
 Files Included:
--------------------

*   `index.html`: The main user interface (jukebox controls, video grid).
*   `style.css`: Stylesheet for the main interface.
*   `script.js`: JavaScript logic for the main interface (data loading, filtering, queueing, commands).
*   `player.html`: The dedicated fullscreen player window.
*   `player.css`: Stylesheet for the player window.
*   `player.js`: JavaScript logic for the player window (YouTube API init, receiving commands).
*   `MASTER PLAYLIST.xml`: The consolidated playlist data file (you should have generated this).
*   `README.txt`: This file.

--------------------
 Prerequisites:
--------------------

1.  **Web Browser:** A modern web browser (Chrome, Firefox, Edge, Safari recommended).
2.  **Python 3:** Required to run the simple local web server. Most modern macOS and Linux systems have it pre-installed. Windows users may need to install it from [python.org](https://www.python.org/).
    *   To check if Python 3 is installed, open your Terminal (macOS/Linux) or Command Prompt (Windows) and type: `python --version` or `python3 --version`.
    *   Ensure Python is added to your system's PATH during installation (especially on Windows - check the box during setup).

--------------------
 Setup:
--------------------

1.  **Place Files:** Ensure all the files listed above (`index.html`, `style.css`, `script.js`, `player.html`, `player.css`, `player.js`, `MASTER PLAYLIST.xml`, `README.txt`) are located together in the **same directory** on your computer.
2.  **Verify `MASTER PLAYLIST.xml`:** Make sure your generated `MASTER PLAYLIST.xml` file is present in this directory and contains valid XML data.
3.  **Verify `OBIE FAVOURITES_GENRE`:** Open `script.js` (the main jukebox logic file) in a text editor. Find the line near the top:
    `const OBIE_FAVOURITES_GENRE = "OBIE FAVOURITES";`
    Make **ABSOLUTELY SURE** the text within the quotes (`"OBIE FAVOURITES"`) **EXACTLY** matches the genre name used in your `MASTER PLAYLIST.xml` for the songs you want to play randomly when the queue is empty. Case sensitivity and spacing matter.

--------------------
 Running the Jukebox:
--------------------

Because web browsers have security restrictions about loading local files directly (`file:///...`), you **MUST** run a simple local web server to access the application correctly.

**Step 1: Start the Local Web Server**

*   **On macOS or Linux:**
    1.  Open the **Terminal** application.
    2.  Navigate to the directory where you saved all the jukebox files using the `cd` command. For example, if they are on your Desktop in a folder named `JukeboxApp`:
        ```bash
        cd ~/Desktop/JukeboxApp
        ```
    3.  Start the Python HTTP server, binding it to all network interfaces (this allows access from other devices on your network if needed, though communication is currently designed for the same machine):
        ```bash
        python3 -m http.server 8000 --bind 0.0.0.0
        ```
        *   If port `8000` is already in use, you'll see an error. Try a different port like `8001`, `8080`, etc. (e.g., `python3 -m http.server 8080 --bind 0.0.0.0`). Remember the port you use.
    4.  Keep the Terminal window open! The server runs as long as this window is open. To stop the server, go back to the Terminal window and press `Ctrl + C`.

*   **On Windows:**
    1.  Open **Command Prompt** (search for `cmd`) or **PowerShell**.
    2.  Navigate to the directory where you saved all the jukebox files using the `cd` command. For example, if they are on your Desktop in a folder named `JukeboxApp`:
        ```bash
        cd %UserProfile%\Desktop\JukeboxApp
        ```
        (Or use the full path like `cd C:\Users\YourUsername\Desktop\JukeboxApp`)
    3.  Start the Python HTTP server, binding it to all network interfaces:
        ```bash
        python -m http.server 8000 --bind 0.0.0.0
        ```
        *   Note: Use `python` instead of `python3` if that's how Python is invoked on your system.
        *   If port `8000` is busy, try another like `8080` (e.g., `python -m http.server 8080 --bind 0.0.0.0`). Remember the port.
        *   **Firewall:** Windows Firewall might ask for permission to allow Python to accept network connections. You generally need to **Allow access**, especially if you intend to view the player on a different device later (though the current communication method doesn't support that easily).
    4.  Keep the Command Prompt/PowerShell window open! Closing it will stop the server. Press `Ctrl + C` in the window to stop the server.

**Step 2: Open the Browser Windows**

You need to open **two separate browser windows or tabs** on the **same machine** where the server is running:

1.  **Jukebox Interface Window:**
    *   Open your web browser (Chrome, Firefox, etc.).
    *   In the address bar, type: `http://localhost:8000` (replace `8000` with the port you used if different).
    *   Press Enter. You should see the main jukebox interface with the filters and video grid.

2.  **Player Window:**
    *   Open a **new** browser window or tab.
    *   In the address bar, type: `http://localhost:8000/player.html` (again, use the correct port).
    *   Press Enter. This window should initially be black or show a loading indicator briefly.
    *   **Move and Fullscreen:** Drag this player window to the display where you want the videos to show full screen. Press the **F11** key (or use the browser's View menu option) to make the window fullscreen.

**Step 3: Use the Jukebox**

*   Interact with the **Jukebox Interface Window** (`http://localhost:8000`).
*   Use the letter filters (A-Z) or genre filters to browse videos.
*   Click on a video tile. A confirmation popup will appear.
*   Click "YES" to add the video to the queue.
*   The **Player Window** (`http://localhost:8000/player.html`) should automatically start playing the first song added (after fading out the initial random track, if applicable) or continue playing the current track if the queue wasn't empty.
*   Use the "SKIP" button in the Jukebox Interface window to fade out the currently playing track and start the next one (from the queue or random).

--------------------
 Troubleshooting:
--------------------

*   **Player Window Shows "Player Failed to Initialize":**
    *   **Extensions:** This is the MOST common cause if it worked before or works in Incognito/Private mode. Disable ALL browser extensions in your normal profile and test again. Re-enable them one by one to find the blocker. Whitelist `localhost:8000` in the problematic extension if possible.
    *   **Network:** Check the Developer Tools (F12) Network tab in the *Player Window* (`player.html`). Are requests to `youtube.com` or `ytimg.com` blocked or failing? Check your firewall or antivirus.
    *   **Cache:** Clear your browser's cache thoroughly.
    *   **Console:** Check the Developer Tools (F12) Console tab in *both* windows for any red error messages.
*   **Queue Not Advancing:**
    *   Make sure both windows were opened using `http://localhost:8000` (same origin). `localStorage` communication fails otherwise.
    *   Check the console in both windows for errors related to `localStorage` or status updates (`STATUS_STORAGE_KEY`).
*   **Cannot Access from `localhost:8000`:**
    *   Ensure the Python server is running in the correct directory.
    *   Ensure you are using the correct port number.
    *   Check if another application is already using that port.
*   **Cannot Access from other devices (Not currently supported by communication method):**
    *   Ensure server was started with `--bind 0.0.0.0`.
    *   Ensure the firewall on the server machine allows incoming connections on the used port (e.g., 8000).
    *   Use the correct IP address of the server machine (e.g., `http://192.168.1.105:8000`).
    *   *Note:* The `localStorage` communication will **not** work between devices. WebSockets would be needed for that.

--------------------

Enjoy your Jukebox!