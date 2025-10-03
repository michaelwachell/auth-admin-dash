# Gigya Admin Dashboard

A Next.js admin interface for managing Gigya accounts, starting with the `accounts.rba.unlock` functionality.

## Features

- 🔓 Unlock user accounts via the RBA (Risk-Based Authentication) system
- 🔐 Secure server-to-server authentication
- 📊 Real-time response viewing with JSON formatting
- 📝 Activity history tracking
- 🎨 Dark theme UI inspired by clauduct-manager
- 🔔 Toast notifications for success/error states

## Setup

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Configure Gigya credentials:**
   
   Copy the example environment file and add your credentials:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gigya credentials:
   ```
   GIGYA_API_KEY=your_api_key_here
   GIGYA_SECRET_KEY=your_secret_key_here
   GIGYA_DATA_CENTER=us1  # or eu1, au1, etc.
   GIGYA_USER_KEY=your_user_key_here  # optional
   ```

3. **Run the development server:**
   ```bash
   yarn dev
   ```

4. **Open the application:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Architecture

### Tech Stack
- **Next.js 13.5** - React framework with API routes
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client for Gigya API calls
- **Lucide React** - Icons

### Project Structure
```
src/
├── pages/
│   ├── api/
│   │   └── gigya/
│   │       └── unlock.ts    # Server-side API route
│   ├── _app.tsx
│   ├── _document.tsx
│   └── index.tsx            # Main UI
├── components/
│   ├── UnlockForm.tsx       # Form for RBA unlock
│   ├── ResponseViewer.tsx   # JSON response display
│   └── Toast.tsx            # Notifications
├── lib/
│   └── gigya.ts            # Gigya client with signature generation
├── types/
│   └── gigya.ts            # TypeScript interfaces
└── styles/
    └── globals.css         # Global styles with Tailwind
```

### Security

- API credentials are kept server-side only
- Gigya API calls use server-to-server authentication (apiKey + secret + userKey)
- Input validation on both client and server
- No sensitive data exposed to the client

## API Reference

### POST /api/gigya/unlock

Unlocks a user account in the Gigya RBA system.

**Request Body:**
```json
{
  "UID": "user_id_here",           // At least one of UID, regToken, or IP required
  "regToken": "registration_token", // At least one of UID, regToken, or IP required
  "IP": "192.168.1.1",             // At least one of UID, regToken, or IP required
  "targetEnv": "mobile",            // Optional: "mobile", "browser", or "both"
  "ignoreApiQueue": false,          // Optional: Process immediately without queuing
  "httpStatusCodes": false          // Optional: Return HTTP status codes in response
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statusCode": 200,
    "callId": "...",
    "time": "..."
  }
}
```

## Extending the Dashboard

To add more Gigya endpoints:

1. Create a new API route in `src/pages/api/gigya/`
2. Add the method to `src/lib/gigya.ts`
3. Create a new form component in `src/components/`
4. Add a new page or section to the UI

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GIGYA_API_KEY` | Your Gigya API key | Yes |
| `GIGYA_SECRET_KEY` | Your Gigya secret key | Yes |
| `GIGYA_DATA_CENTER` | Gigya data center (us1, eu1, etc.) | Yes |
| `GIGYA_USER_KEY` | User key for server-to-server auth | No |
| `NEXT_PUBLIC_DATA_CENTER` | Display data center in UI | No |

## Development

```bash
# Run development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Run linting
yarn lint
```

## License

Private - Internal Use Only