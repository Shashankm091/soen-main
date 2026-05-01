# Project Report: SOEN Chat App
## Real-time AI-Powered Collaborative Code Editor

### 1. Executive Summary
The **SOEN Chat App** is a sophisticated full-stack web application designed for real-time collaboration and AI-assisted development. It combines the power of modern web technologies with advanced AI models to provide a seamless environment for developers to chat, collaborate on code, and leverage AI for code generation and debugging.

---

### 2. Key Features
- **Real-time Collaboration**: Multi-user chat and code editing powered by Socket.io.
- **AI Integration**: Integration with OpenRouter (using models like GPT-OSS-120b) to provide intelligent code suggestions and automatic project structure updates.
- **Shared Project Workspace**: Users can create projects, invite members, and maintain a shared `fileTree` that updates in real-time.
- **Rich Code Editor**: A full-featured code editor with syntax highlighting and multi-file support.
- **User Authentication**: Secure JWT-based authentication system with features like Registration, Login, and Password Recovery (Forgot/Reset Password).
- **Presence Indicators**: Real-time tracking of online users and typing indicators.
- **Responsive UI**: A modern, dark-themed interface built with React and Tailwind CSS.

---

### 3. Technology Stack

#### **Frontend**
- **Library**: React.js
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Real-time Communication**: Socket.io-client
- **Build Tool**: Vite
- **Code Highlighting**: Highlight.js / Markdown-it

#### **Backend**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JSON Web Token (JWT) & bcryptjs
- **Real-time Engine**: Socket.io
- **AI Integration**: OpenAI SDK (connecting to OpenRouter API)

#### **Deployment**
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway / Render
- **Infrastructure**: Nixpacks configuration for standardized builds

---

### 4. Technical Architecture

#### **Backend Structure**
The backend follows a modular service-controller-model architecture:
- **Controllers**: Handle HTTP requests and business logic (e.g., `user.controller.js`, `project.controller.js`).
- **Models**: Define data schemas for MongoDB (`User`, `Project`, `Message`).
- **Services**: Encapsulate complex logic, such as AI generation (`ai.service.js`) and user management.
- **Routes**: Define API endpoints.
- **Middleware**: Handle authentication and request validation.

#### **Real-time Logic**
- **Socket.io** is used to create "Rooms" based on Project IDs.
- Messages sent with the `@ai` tag are intercepted by the backend, which calls the AI service.
- The AI response, if it contains code, can automatically update the project's state in the database and sync it across all connected clients.

---

### 5. AI Integration Workflow
1. User types a message containing `@ai` (e.g., "@ai create a simple login form").
2. The backend sends the prompt along with the current project context (file tree and active file) to OpenRouter.
3. The AI generates a structured response (JSON) containing an explanation and a suggested `fileTree`.
4. The backend parses the response, updates the project in MongoDB, and broadcasts the new message and updated code to all project members.

---

### 6. Installation & Setup

#### **Prerequisites**
- Node.js (v18+)
- MongoDB Atlas account
- OpenRouter API Key

#### **Backend Setup**
1. Navigate to the `backend` folder.
2. Create a `.env` file with the following:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   OPENAI_API_KEY=your_openrouter_api_key
   ```
3. Run `npm install` followed by `npm start`.

#### **Frontend Setup**
1. Navigate to the `frontend` folder.
2. Create a `.env.local` file:
   ```env
   VITE_API_URL=http://localhost:3000
   ```
3. Run `npm install` followed by `npm run dev`.

---

### 7. Future Enhancements
- **Integrated Terminal**: Add a real-time terminal for running commands.
- **Live Preview**: Enable a "Browser in Browser" feature for previewing web apps.
- **Voice Chat**: Integrate WebRTC for voice collaboration within projects.
- **Git Integration**: Direct push/pull capabilities to GitHub/GitLab.

---

### 8. Conclusion
The **SOEN Chat App** demonstrates the potential of combining collaborative tools with Generative AI. It provides a robust foundation for remote development teams and educational environments where real-time feedback and AI assistance are invaluable.
