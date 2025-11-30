# Weatherapp

This project runs a **Node.js weather application** inside a **Docker Compose stack** on a **Vagrant VM**, fronted by **Caddy** for HTTPS, and accessed securely through a **WireGuard VPN**.

---

## 📦 Prerequisites

- **Host machine** (Linux or macOS recommended)
- Installed tools:
  - [Vagrant](https://www.vagrantup.com/)
  - [VirtualBox](https://www.virtualbox.org/)
  - [wireguard-tools (the wg-quick command)](https://www.wireguard.com/)
  - `bash` shell running on Linux (untested) or MacOS
    - Windows may work, but many of the automated processes in `deploy.sh` will not work on Windows
  - `wg-quick` (WireGuard client utility)
  - [brew (MacOS)](https://brew.sh/)
  - sudo access on the host machine

---

## 🚀 Setup & Deployment

1. **Clone the repository**  

   ```bash
   git clone https://github.com/zbaker94/WeatherApp
   cd weatherapp

2. Run `chmod +x ./deploy.sh` and `chmod +x ./teardown.sh`

3. Create a `.env` file with your OpenWeather API key

- Copy the example and edit it to include your API key:

  ```bash
  cp .env.example .env
  # Then open `.env` and replace <YOUR OPEN WEATHER API KEY> with your actual key
  ```

4. Run (sudo) `deploy.sh`. This will:

- Start the Vagrant VM

- Provision Docker, WireGuard, and iptables

- Build and run the Docker Compose stack

- Export and install the Caddy root certificate

- Add weatherapp.local to your /etc/hosts

- Start the WireGuard client tunnel

- Open the app in your browser

4. Verify VPN connection with `sudo wg show`

- You can disconnect from the VPN to see that the app is inaccessible by running `sudo wg-quick down ./client.conf`
- You can destroy the deployment with (sudo) `teardown.sh`

## 🌐 Accessing the Application

- Once deployed, you can access the app at `https://weatherapp.local`
(A secure https connection is needed because we use the JavaScript geolocation API which requires a secure host.)

🚨 Note: There is a potential bug with `wg-quick down` on MacOS that may result in the VPN DNS server persisting. If you experience connectivity issues after running `teardown.sh` or `wg-quick down`, check you wifi configuration and remove the DNS address `10.8.0.1` if present.

## 📍 Running locally

To run the app alone locally, you will need Node and npm installed, and then simply run the following:

```bash
cp .env.example .env
# add your API key to `.env` then:
npm install
npm run dev
```

You may also access the VM directly by running `vagrant ssh`

## 🧩 How It Works

**App Overview**

- **Purpose:**: A small, maintainable weather app that fetches current conditions and basic details for a requested location.
- **Search Options:**: Users can search by **city name**, **ZIP/postal code**, or **coordinates** via the browser geolocation API.
- **API:**: Uses the OpenWeather API (`https://openweathermap.org/api`). Stores the API key in a `.env` file that is not sent to the client.
- **Architecture:**: Built with React + Vite + TypeScript using TanStack Start. The UI is broken into focused components (see `src/components/LocationText/`) and API calls are routed through modular server functions (`src/lib/serverFunctions/weatherAPI/`) with a provider pattern implemented for the weather API functionality.
- Tanstack Query is used for client-side data management.
- Zod schemas are utilized with the server functions to guarantee end-to-end type safety

#### Open `network.md` with a mermaid diagram viewer to see a visual representation

**Networking Overview**

1. The VPN connects to the host loopback at port 51820

    - Normally, this would be the server’s public IP
    - The VM instead forwards host UDP port 51820 → VM UDP port 51820.

2. **Browser on host** → Requests `https://weatherapp.local`.

    - DNS resolution via `/etc/hosts` → `10.8.0.1` (the ip of the server VPN interface).

    - Routed through WireGuard tunnel (`wg0`) because `10.8.0.0/24` (The VPN subnet as defined in the server config) is in `AllowedIPs` in `client.conf`.

3. **VM (WireGuard server)** → Receives traffic at `10.8.0.1` (as specified in the VM wireguard conf).

    - Forwards to Docker network due to VM iptables allowing bidirectional forwarding between wg0 and the VMs default network interface. Since the request is https it is routed to port 443 on the VM where the Caddy container is listening.

4. **Caddy container** → Listens on VM port `443`.

    - Terminates TLS using internal CA cert.

    - Proxies request to `weatherapp:3000`.

5. **Weatherapp container** → Node.js app responds on port `3000`.

6. **Response path** → Weatherapp → Caddy → VM → WireGuard tunnel → Host → Browser.

## **Potential Improvements**

- **Automated testing:**: Add comprehensive unit and integration tests (using Vitest and React Testing Library) for components, provider logic, and server-side transforms so regressions are caught early.
- **Validation of weather response schemas:**: Harden Zod schemas for OpenWeather responses — make non-essential fields optional or allow alternate types where the API can vary (e.g., missing `sea_level`, `grnd_level`, or optional `rain`/`gust` fields) and add tests to assert transform behavior against sample API payloads.
- **Cleaner construction of query strings:**: Centralize and simplify the logic that composes location queries (city, state, country, ZIP) into a small, well-tested utility to avoid edge cases and ensure consistent API requests.
- **Optimization of query keys:**: Normalize `react-query` keys (e.g., `['weather', lat, lon]`) to deterministic, explicit values so caching and invalidation behave predictably and avoid using `undefined` in keys.
- **General typing considerations:**: Review TypeScript types across the codebase and decide where `| undefined` or `| null` are appropriate; prefer explicit optional fields in schemas and avoid `any` while doing so. Document decisions for nullable/optional fields to improve readability and reduce runtime surprises.
- **Centralize the axios client:**: Create a shared HTTP client with sensible defaults (baseURL, timeout, retry/backoff) used by all OpenWeather calls. Possibly including in the weather api interface. This makes changes (retry behavior, logging, timeouts) trivial and keeps request code DRY.

- Split `setup.sh` functionality into discrete functions or scripts to improve readability, testability, and maintainability
- Support windows for deploy logic
- Move deploy scripts and other artifacts to a subdirectory to avoid polluting the root directory
- swap local VM-based example deploy to cloud-based deploy with private network, etc.
- More robust checking for prerequisites in `deploy.sh`
- Parameterize IP and ports used in deployment to allow more configurability

Any consolidation or architecture improvements should be weighed against the additional effort and cognitive load. Focus should be paid to functionality first and then DRYing the code as needed.
