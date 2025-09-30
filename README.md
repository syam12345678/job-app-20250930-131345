# JobBeacon: Curated IT Job Alerts on the Edge

[cloudflarebutton]

JobBeacon is a serverless, edge-native application designed to provide developers and IT professionals with timely, filtered job alerts. It aggregates job listings from various public APIs and RSS feeds, filters them based on user-defined preferences (keywords, role, location), and delivers notifications for new, relevant opportunities. The entire application runs on Cloudflare's serverless stack, ensuring high performance, scalability, and security. The frontend is a visually stunning, minimalist interface for managing subscriptions and browsing the latest job listings, while the backend worker handles aggregation, filtering, and storage using a Durable Object.

## Key Features

- **Serverless Architecture**: Runs entirely on the Cloudflare edge for global speed and scalability.
- **Job Aggregation**: Fetches IT job listings from multiple public APIs and RSS feeds.
- **Personalized Filtering**: Users can subscribe to alerts based on specific roles, keywords, and locations.
- **Persistent Storage**: Securely stores user preferences and job data using Cloudflare Durable Objects.
- **Scheduled Updates**: Automatically fetches new jobs on a schedule using Cron Triggers.
- **Edge Caching**: Caches API responses to reduce load on source APIs and improve performance.
- **Minimalist UI**: A clean, lightweight, and responsive interface for managing subscriptions and viewing jobs.

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Sonner
- **Backend**: Hono on Cloudflare Workers
- **State Management**: Zustand, React Hook Form
- **Data Persistence**: Cloudflare Durable Objects
- **Language**: TypeScript
- **Validation**: Zod

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.
- A [Cloudflare account](https://dash.cloudflare.com/sign-up).
- The `wrangler` CLI installed and authenticated: `bun install -g wrangler` and `wrangler login`.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd job_beacon
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Local Environment Variables:**
    Create a `.dev.vars` file in the root of the project for local development. While this project may not require initial secrets, it's good practice for `wrangler`.
    ```bash
    touch .dev.vars
    ```

### Running Locally

To run the full-stack application locally, use the provided development script. This will start the Vite dev server for the frontend and the `wrangler` dev server for the backend worker simultaneously.

```bash
bun dev
```

The frontend will be available at `http://localhost:3000` (or another port if 3000 is in use), and the worker will handle API requests.

## Project Structure

-   `src/`: Contains the frontend React application code.
    -   `pages/`: Top-level page components.
    -   `components/`: Reusable React components, including shadcn/ui components.
    -   `lib/`: Utility functions.
-   `worker/`: Contains the backend Cloudflare Worker code.
    -   `index.ts`: The main entry point for the worker (do not modify).
    -   `userRoutes.ts`: Define all API endpoints here.
    -   `durableObject.ts`: The implementation of the `GlobalDurableObject` for state management.
-   `shared/`: TypeScript types and mock data shared between the frontend and backend.

## Development

### Adding API Endpoints

To add a new API endpoint, open `worker/userRoutes.ts` and add a new route handler using Hono's syntax. Interact with the Durable Object to manage state.

```typescript
// in worker/userRoutes.ts
app.get('/api/new-endpoint', async (c) => {
  const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
  const data = await stub.getSomeData(); // Method defined in durableObject.ts
  return c.json({ success: true, data });
});
```

### Modifying the Durable Object

To add new stateful logic, open `worker/durableObject.ts` and add methods to the `GlobalDurableObject` class.

```typescript
// in worker/durableObject.ts
export class GlobalDurableObject extends DurableObject {
  async getSomeData(): Promise<string[]> {
    const data = await this.ctx.storage.get("some_key");
    return (data as string[]) || [];
  }

  async addSomeData(item: string): Promise<void> {
    const data = await this.getSomeData();
    data.push(item);
    await this.ctx.storage.put("some_key", data);
  }
}
```

## Deployment

This project is configured for one-command deployment to Cloudflare Workers.

1.  **Build the application:**
    The deployment script handles building automatically, but you can build manually with `bun run build`.

2.  **Deploy to Cloudflare:**
    Run the deploy script from the project root. `wrangler` will build the application, bundle the worker, and deploy it to your Cloudflare account.

    ```bash
    bun run deploy
    ```

Alternatively, deploy directly from your GitHub repository using the button below.

[cloudflarebutton]