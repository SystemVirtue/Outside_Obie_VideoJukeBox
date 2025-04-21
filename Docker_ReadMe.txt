--------------------
 Running with Docker:
--------------------

This method packages the application and its required Python server into a container, allowing you to run it without installing Python directly on your host machine (Docker Desktop or Docker Engine is required).

**Prerequisites:**

*   **Docker:** Install Docker Desktop (for Windows/macOS) or Docker Engine (for Linux). Download from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/).

**Setup:**

1.  Ensure the `Dockerfile` and `docker-compose.yml` files are in the same directory as all the other application files (`index.html`, `player.html`, `MASTER PLAYLIST.xml`, etc.).
2.  Make sure your `MASTER PLAYLIST.xml` file is up-to-date in this directory.

**Running:**

1.  **Open Terminal or Command Prompt/PowerShell.**
2.  **Navigate** to the directory containing the `Dockerfile` and other application files using the `cd` command.
3.  **Build and Run with Docker Compose (Recommended):**
    ```bash
    docker-compose up --build -d
    ```
    *   `up`: Creates and starts the container(s) defined in `docker-compose.yml`.
    *   `--build`: Builds the Docker image based on the `Dockerfile` the first time, or rebuilds if the `Dockerfile` or copied files (excluding volumes) have changed.
    *   `-d`: Runs the container in detached mode (in the background).
4.  **Access the Jukebox:**
    *   Open your web browser.
    *   Go to `http://localhost:8000` for the main interface.
    *   Open a **second** window/tab and go to `http://localhost:8000/player.html` for the player.
    *   Make the player window fullscreen (F11).
5.  **Stopping:**
    *   To stop the running container(s), open your Terminal/Command Prompt in the *same directory* and run:
        ```bash
        docker-compose down
        ```

**Updating the Playlist:**

*   If you used the recommended `docker-compose.yml` which mounts only `MASTER PLAYLIST.xml`:
    1.  Stop the container: `docker-compose down`
    2.  Replace the `MASTER PLAYLIST.xml` file on your host machine with the new version.
    3.  Restart the container: `docker-compose up -d` (You usually don't need `--build` just to update a mounted volume file).
*   If you mounted the entire directory (`./:/app`): Changes to any file on your host will reflect inside the container automatically (might require a browser refresh).

**Alternative Running (Without Docker Compose):**

1.  **Build the Image:**
    ```bash
    docker build -t my-jukebox-app .
    ```
    *(This builds the image and tags it as `my-jukebox-app`)*
2.  **Run the Container:**
    ```bash
    docker run -d -p 8000:8000 --name jukebox-container -v "$(pwd)/MASTER PLAYLIST.xml:/app/MASTER PLAYLIST.xml:ro" my-jukebox-app
    ```
    *   `-d`: Detached mode.
    *   `-p 8000:8000`: Maps host port 8000 to container port 8000.
    *   `--name jukebox-container`: Assigns a name to the container.
    *   `-v "$(pwd)/MASTER PLAYLIST.xml:/app/MASTER PLAYLIST.xml:ro"`: Mounts the XML file (adjust syntax slightly for Windows Command Prompt: `-v "%cd%/MASTER PLAYLIST.xml:/app/MASTER PLAYLIST.xml:ro"`).
    *   `my-jukebox-app`: The image name to run.
3.  **Stopping:**
    ```bash
    docker stop jukebox-container
    docker rm jukebox-container
    ```

--------------------
 Multi-Machine Access Note:
--------------------

Even when running in Docker, the communication between the Jukebox window and the Player window relies on `localStorage`, which is bound to the specific origin (hostname/IP address + port) you use in your browser.

*   Accessing both windows via `http://localhost:8000` on the **same machine** will work.
*   Accessing one via `http://localhost:8000` and the other via `http://<your-ip-address>:8000` (even on the same machine) will **FAIL**.
*   Accessing from **different machines** on the network (e.g., Jukebox on `http://<host-ip>:8000` and Player on `http://<host-ip>:8000` on another device) will also **FAIL** with the current `localStorage` method.

To enable control across different origins/machines, the communication mechanism needs to be changed from `localStorage` to a server-mediated approach like **WebSockets**. This would require replacing the Python `http.server` with a different server framework (e.g., Flask-SocketIO, FastAPI) and updating the JavaScript in both `script.js` and `player.js` to use WebSocket connections.

--------------------