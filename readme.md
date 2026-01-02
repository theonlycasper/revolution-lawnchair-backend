# Revolution Backend

A basic Express.js server featuring secure session-based authentication using **Argon2** password hashing and **SQLite**.

## Features

- **Secure Authentication:** Uses `argon2` for industry-standard password hashing.
- **Session Management:** Implements `express-session` for handling user logins and cookies.
- **Environment Configuration:** Uses `.env` files to manage secrets and config.
- **Containerization:** Includes a lightweight `Dockerfile` based on Alpine Linux.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Docker](https://www.docker.com/) (optional, for containerization)

## Configuration
**1. Create a `.env` file in the root directory:**
```bash
touch .env
```
**2. Add the following variables to `.env`:**
```env
PORT=3000
SESSION_TIME=10 #in minutes
SESSION_SECRET=change_this_to_a_long_random_string
DB_PATH=./database.sqlite (Optional, depending on your DB setup)
```
## Running the Server

### Local Development
Start the server using the npm script configured in `package.json`:

```bash
npm start
```

The server will start at `http://localhost:3000`.

### Docker Support

This project includes a Dockerfile utilizing Alpine Linux.

## Docker Compose
**1. Clone this repo:**
```bash
git clone https://github.com/theonlycasper/revolution-lawnchair-backend.git
cd ./revolution-lawnchair-backend
```

**2. Prepare the data folder and copy compose.yaml to root for Docker Compose:**
```bash
mkdir data
cp ./docker/compose-example.yaml ./compose.yaml
```

**3. Run the container (Docker Compose):**
```bash
docker compose up --build -d
```
You may choose to change variables and ports inside the compose file.

## Docker Run
**1. Clone this repo:**
```bash
git clone https://github.com/theonlycasper/revolution-lawnchair-backend.git
cd ./revolution-lawnchair-backend
```

**2. Build the image:**
```bash
docker build -t revolution .
```

**3b. Set environment variables in .env file:**
```bash
touch .env
echo "# Server Configuration\nPORT=3000\n\n# Security Secrets\nSESSION_SECRET=whatever_you_want\nSESSION_TIME=1 #in Minutes\n\n# Database Path\nDB_PATH=./database.db #REQUIRED" > .env
```

**4b. Run the container (Docker Run):**
Pass your `.env` file to the container to configure it at runtime:
```bash
docker run -p 3000:3000 --env-file .env revolution
```

## API Endpoints
### 1. Register User
- **URL:** `/api/register`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "name": "user1",
    "password": "mySecretPassword"
  }
  ```
### 2. Login User
- **URL:** `/api/login`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "name": "user1",
    "password": "mySecretPassword"
  }
  ```
- **Response:** Sets a `connect.sid` cookie upon success.
### 3. Get Current User
- **URL:** `/api/me`
- **Method:** `GET`
- **Auth Required:** Yes
- **Response:** Returns the profile data (display name, created date, status) for the currently logged-in user.
### 4. Update Profile
- **URL:** `/api/me/update`
- **Method:** `POST`
- **Auth Required:** Yes
- **Body (Update Password):**
  ```json
  {
    "changetype": "password",
    "password": "newPassword123"
  }
  ```
- **Body (Update Display Name):**
  ```json
  {
    "changetype": "displayname",
    "display_name": "Cool Alias"
  }
  ```
### 5. Get User Details (Admin)
- **URL:** `/api/admin/user/:username`
- **Method:** `GET`
- **Auth Required:** Yes (Admin Status)
- **Description:** Fetches raw status and details for a specific user to populate the admin editor.
### 6. Update User Status (Admin)
- **URL:** `/api/update`
- **Method:** `POST`
- **Auth Required:** Yes (Admin Status)
- **Description:** Updates the target user's status string and recalculates their integrity hash.
- **Body:**
  ```json
  {
    "target_username": "targetUser",
    "new_status": {
        "status": "ACTIVE",
        "admin": true,
        "vip": false,
        "verified": true
    }
  }
  ```
## License
Free Use