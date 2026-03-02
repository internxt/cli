# Internxt WebDAV (Docker Integration)

This repository provides a **Dockerized version of Internxt WebDAV**, making it easy to run on **NAS devices**, **servers**, or any environment where Docker is supported.  
With this image, you can quickly deploy and access your Internxt files over the WebDAV protocol.

---

## 🚀 Quick Start

### Using Docker Compose

```yaml
services:
  internxt-webdav:
    image: internxt/webdav:latest
    container_name: internxt-webdav
    restart: unless-stopped
    environment:
      INXT_USER: ""           # Your Internxt account email
      INXT_PASSWORD: ""       # Your Internxt account password
      INXT_TWOFACTORCODE: ""  # (Optional) Current 2FA one-time code
      INXT_OTPTOKEN: ""       # (Optional) OTP secret for auto-generating 2FA codes
      INXT_WORKSPACE_ID: ""   # (Optional) Workspace ID to use for WebDAV server
      WEBDAV_PORT: ""         # (Optional) WebDAV port. Defaults to 3005 if empty
      WEBDAV_PROTOCOL: ""     # (Optional) WebDAV protocol. Accepts 'http' or 'https'. Defaults to 'https' if empty
      WEBDAV_CUSTOM_AUTH: ""  # (Optional) Enable custom authentication. Set to 'true' to enable
      WEBDAV_USERNAME: ""     # (Optional) Custom username for WebDAV authentication
      WEBDAV_PASSWORD: ""     # (Optional) Custom password for WebDAV authentication
    ports:
      - "127.0.0.1:3005:3005" # Map container port to host. Change if WEBDAV_PORT is customized
```

Start it detached with:

```bash
docker compose up -d
```

### Using Docker CLI:

```bash
docker run -d \
  --name internxt-webdav \
  --restart unless-stopped \
  -e INXT_USER="your@email.com" \
  -e INXT_PASSWORD="your_password" \
  -e INXT_TWOFACTORCODE="" \
  -e INXT_OTPTOKEN="" \
  -e INXT_WORKSPACE_ID="" \
  -e WEBDAV_PORT="" \
  -e WEBDAV_PROTOCOL="" \
  -e WEBDAV_CUSTOM_AUTH="false" \
  -e WEBDAV_USERNAME="" \
  -e WEBDAV_PASSWORD="" \
  -p 127.0.0.1:3005:3005 \
  internxt/webdav:latest
```

### Using Docker on NAS Devices

You can also run the `internxt/webdav` image directly on popular NAS devices like **Synology** or **QNAP**.

**Synology DSM (Docker Package):**

1. Open the Docker app.
2. Go to **Registry**, search for `internxt/webdav`, and download the latest image.
3. Go to **Image**, select `internxt/webdav`, and click **Launch**.
4. Configure environment variables (`INXT_USER`, `INXT_PASSWORD`, etc.) and port mappings (e.g., `3005:3005`).
5. Start the container.

**QNAP Container Station:**

1. Open Container Station.
2. Click **Create Container** and search for `internxt/webdav`.
3. Select the latest image and click **Next**.
4. Set environment variables (`INXT_USER`, `INXT_PASSWORD`, etc.) and port mappings (e.g., `3005:3005`).
5. Apply settings and start the container.


## 🔑 Authentication & Environment Variables

| Variable             | Required | Description                                                                                    |
|----------------------|----------|------------------------------------------------------------------------------------------------|
| `INXT_USER`          | ✅ Yes   | Your Internxt account email.                                                                   |
| `INXT_PASSWORD`      | ✅ Yes   | Your Internxt account password.                                                                |
| `INXT_TWOFACTORCODE` | ❌ No    | Temporary one-time code from your 2FA app. Must be refreshed every startup.                    |
| `INXT_OTPTOKEN`      | ❌ No    | OTP secret key (base32). Used to auto-generate fresh codes at runtime.                         |
| `INXT_WORKSPACE_ID`  | ❌ No    | Workspace ID to use. If set, the WebDAV server will operate within this workspace.             |
| `WEBDAV_PORT`        | ❌ No    | Port for the WebDAV server. Defaults to `3005` if left empty.                                  |
| `WEBDAV_PROTOCOL`    | ❌ No    | Protocol for the WebDAV server. Accepts `http` or `https`. Defaults to `https` if left empty.  |
| `WEBDAV_CUSTOM_AUTH` | ❌ No    | Enable custom Basic Authentication for WebDAV. Set to `true` to enable.                        |
| `WEBDAV_USERNAME`    | ❌ No    | Username for custom WebDAV authentication. Required if `WEBDAV_CUSTOM_AUTH` is enabled.        |
| `WEBDAV_PASSWORD`    | ❌ No    | Password for custom WebDAV authentication. Required if `WEBDAV_CUSTOM_AUTH` is enabled.        |


---

### Custom WebDAV Authentication

By default, the WebDAV server starts with anonymous authentication enabled, meaning anyone with access to the server URL can connect without credentials. Under the hood, the server uses your Internxt credentials to access your files, but clients don't need to authenticate. If you want to restrict access to your WebDAV server or simply enhance its security, you can enable custom authentication with `WEBDAV_CUSTOM_AUTH`.

**Security recommendations:**
- 🚨 **We strongly recommend NOT exposing your WebDAV server to the internet.** Keep it on your secure local network whenever possible.
- ⚠️ **Do NOT use your Internxt username and password** for `WEBDAV_USERNAME` and `WEBDAV_PASSWORD`
- Create unique, strong credentials specifically for WebDAV access
- Try to always use HTTPS (`WEBDAV_PROTOCOL=https`) when enabling custom authentication

**Important:** When connecting to your WebDAV server with custom authentication enabled, you must use the credentials defined in `WEBDAV_USERNAME` and `WEBDAV_PASSWORD`, not your Internxt account credentials.

### 🔄 2FA Options Explained

If your Internxt account has **two-factor authentication enabled**, you can choose one of the following:

| Option                  | What it is                                                   | When to use it                           | Limitation |
|-------------------------|--------------------------------------------------------------|------------------------------------------|------------|
| **`INXT_TWOFACTORCODE`** | A **temporary code** generated by your authenticator app (e.g., Google Authenticator, Authy). | Use this if you want to provide the code manually. | Must be updated each time the container restarts. |
| **`INXT_OTPTOKEN`**     | The **private OTP secret** (the key you scan when setting up 2FA). | Use this for unattended containers. The server will generate fresh codes automatically. | If set, `INXT_TWOFACTORCODE` will be ignored. |

💡 **Recommended:** Use `INXT_OTPTOKEN` if you want your container to run unattended without re-entering codes on each restart.


### Using Workspaces
If you have access to Internxt Workspaces and want to use the WebDAV server with a specific workspace instead of your personal drive, you can set the INXT_WORKSPACE_ID environment variable.

## 🌐 Accessing WebDAV

Once running, your Internxt WebDAV server will be available at:

```
https://127.0.0.1:3005
```

## 📘 WebDAV Reference

For more details about WebDAV usage, configuration, and troubleshooting, please refer to the official WebDAV readme:

[WebDAV Readme](https://github.com/internxt/cli/blob/main/WEBDAV.md)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to open an issue or submit a pull request.
