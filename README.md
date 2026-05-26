# Smart Grocery Planner

A web app that matches recipes to the ingredients you already have at home.

**Live demo:** https://engineering-project-sigma.vercel.app

---

## What it does

- Create an account and log in securely
- Manage your pantry - add, edit and remove ingredients with quantities and categories
- Get recipe suggestions ranked by how well they match your pantry
- See which ingredients you have and which ones you still need
- Click any recipe to view full ingredients, instructions and a link to the source

---

## Tech stack

| Layer       | Technology                                                    |
|-------------|---------------------------------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, React Router v6, TanStack Query |
| Backend     | Node.js, Express                                              |
| Database    | MongoDB Atlas (Mongoose)                                      |
| Auth        | JWT + bcrypt                                                  |
| Recipe data | Spoonacular API                                               |
| Hosting     | Vercel (frontend), Render (backend)                           |

---

## Local setup

### Prerequisites
- Node.js 18+
- A [MongoDB Atlas](https://mongodb.com/atlas) free cluster
- A [Spoonacular](https://spoonacular.com/food-api) free API key

### 1. Clone the repo

```bash
git clone https://github.com/MykytaDanets/Engineering-Project
cd engineering-project
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create `server/.env`:

```
MONGO_URI=your_mongoDB_link
JWT_SECRET=any_long_random_string
SPOONACULAR_API_KEY=your_key
CLIENT_URL=http://localhost:9040
PORT=5000
```

Start the server:

```bash
npm run dev
```

### 3. Set up the frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:9040

---

## Project structure

```
├── client/              # React frontend
│   └── src/
│       ├── api/            # Axios instance + endpoint functions
│       ├── components/     # NavBar, ItemForm, RecipeModal, InputField
│       ├── context/        # AuthContext (login, register, logout)
│       └── pages/          # Login, Register, Pantry, Recipes
│
└── server/              # Express backend
    ├── middleware/         # JWT auth middleware
    ├── models/             # Mongoose schemas (User, Pantry)
    ├── routes/             # auth, pantry, recipes
    └── utils/              # Response cache
```

---
