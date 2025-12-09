# 3D Maze Navigator

This is a 3D first-person maze navigation game built using Three.js and Vite.  
The project includes procedural maze generation, collision detection, mini-map, auto pathfinding, multi-level gameplay, timing, scoring, and zombie shooting.

Live Demo: https://3-d-maze-navigator.vercel.app


## Features

Core Features:
- Procedural maze generation (10x10 grid)
- First-person camera controls (WASD + mouse)
- Collision detection with maze walls
- Goal cube to complete each level
- Mini-map showing maze layout, player, and goal
- Timer, level display, and scoring system

Bonus Features Implemented:
- Auto pathfinding using BFS (press P)
- Zombie enemies inside the maze
- Shooting mechanic (left click)
- Multi-level maze progression
- Bonus scoring for faster completion
- Improved textures for walls and floor


## Controls

W or Up Arrow: Move forward  
S or Down Arrow: Move backward  
A or Left Arrow: Move left  
D or Right Arrow: Move right  
Mouse: Look around  
Left Click: Shoot  
P: Auto-path to the goal


## Tech Stack

- Three.js for 3D rendering  
- JavaScript (ES6)  
- HTML and CSS  
- Vite for development and build  
- BFS algorithm for auto navigation  
- Vercel for hosting  


## Folder Structure

3d-maze-navigator/
│
├── public/
│   ├── index.html
│   └── vite.svg
│
├── src/
│   ├── main.js
│   ├── counter.js
│   ├── javascript.svg
│   ├── style.css
│   └── textures/
│
├── package.json
├── .gitignore
└── README.md


## How to Run Locally

1. Clone the repository
   git clone https://github.com/sushmithaa54/3D-Maze-Navigator

2. Enter the project folder
   cd 3D-Maze-Navigator

3. Install dependencies
   npm install

4. Start the development server
   npm run dev

5. Open in the browser
   http://localhost:5173


## Algorithms Used

Maze Generation:
- Based on randomized depth-first search (DFS)
- Ensures a fully connected maze without blocked paths

Auto Pathfinding:
- Implemented using Breadth-First Search (BFS)
- Calculates shortest path to the goal
- Player automatically follows the calculated path


## Future Improvements

- Add improved textures and lighting
- Add sound effects and background music
- Add AI enemies with better movement
- Add a leaderboard and high-score system
- Add multiplayer maze mode


## Author

Sushmitha K G  
PA College of Engineering, Mangalore  
Game Development and Web Development Enthusiast
