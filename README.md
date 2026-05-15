# 🎮 Space Invaders

A classic Space Invaders game built with Angular! Defend Earth from the alien invasion.

## 🚀 Play Online

Your kids can play the game online here:
**https://timothyoverton.github.io/space-invaders/**

Just click the link and start playing! No installation needed.

## 🎮 How to Play

### Controls
- **Move Left**: Press `←` (left arrow) or `A`
- **Move Right**: Press `→` (right arrow) or `D`  
- **Shoot**: Press `SPACE`

### Goal
- 🎯 Shoot down all the red aliens before they reach you
- 📈 Clear all enemies to advance to the next level
- 💥 Avoid getting hit by alien fire

### Scoring
- 🏆 10 points per enemy destroyed
- ⬆️ Each level gets harder and faster!

## 🖥️ How to Run Locally

If you want to run the game on your own computer:

### Requirements
- Node.js 20+ ([download here](https://nodejs.org/))
- Git

### Steps

1. **Clone the game**:
   ```bash
   git clone https://github.com/Timothyoverton/space-invaders.git
   cd space-invaders
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the game**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   - Automatically opens at `http://localhost:4200/`
   - Or manually visit that address

## 🛠️ Development

### Available Commands
- `npm start` - Run development server (http://localhost:4200/)
- `npm run build` - Build for development
- `npm run build:prod` - Build for production
- `npm test` - Run tests

### Want to Modify the Game?

The game code is in `src/app/`:
- `app.ts` - Game logic and controls
- `app.html` - Game layout
- `app.css` - Game styling

Feel free to customize colors, difficulty, enemy patterns, or add new features!

## 🎨 Game Features

- ✨ Retro arcade-style graphics
- 🎯 Progressive difficulty (enemies get faster each level)
- 💪 Collision detection
- 📊 Score and level tracking
- 🎮 Smooth keyboard controls
- 🎬 Game over screen with restart button

## 📱 Browser Support

Works on:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern web browser

## 🤝 Contributing

Want to improve the game? Feel free to:
1. Clone the repository
2. Make your changes
3. Test locally with `npm start`
4. Submit a pull request!

Ideas for enhancements:
- Add sound effects
- Add power-ups
- Change enemy patterns
- Add high score tracking
- Add mobile touch controls
- Create different difficulty modes

## 📝 License

Enjoy the game! This is a fun project for kids and families. 🎉

---

**Made with ❤️ using Angular** - Have fun playing! 🚀

---

## 📚 For Future Claude: Complete Workflow for Cloning, Building & Deploying

If you're a future Claude instance that needs to clone an Angular stub repo, create a new project, and deploy it to GitHub Pages, here's the complete process:

### 1. **Initial Setup**
```bash
# Initialize git in target directory
git init

# Clone the stub repo
git clone https://github.com/Timothyoverton/angular-web-stub /tmp/angular-web-stub

# Copy all files from stub (excluding .git)
cp -r /tmp/angular-web-stub/* .
cp /tmp/angular-web-stub/.gitignore .
cp /tmp/angular-web-stub/.editorconfig .
```

### 2. **Configure Project Files**
Update these files with the new project name:
- **package.json**: Update `name` field and all build paths
  - Line: `"name": "PROJECT-NAME"`
  - Build script: `"build:prod": "ng build --configuration production --base-href=\"/PROJECT-NAME/\""`
  - Deploy script: `"deploy": "ng build --configuration production --base-href=\"/PROJECT-NAME/\" && npx angular-cli-ghpages --dir=dist/PROJECT-NAME/browser"`

- **angular.json**: Update project name and output path
  - Project name: `"PROJECT-NAME"`
  - Build target references: `"buildTarget": "PROJECT-NAME:build:..."`

### 3. **Setup Git Remote**
```bash
git config --global user.email "USER@EMAIL.COM"
git config --global user.name "User Name"
git add -A
git commit -m "Initial project setup from angular-web-stub"
git remote add origin https://github.com/USERNAME/PROJECT-NAME.git
git push -u origin master
```

**Note**: User must provide GitHub Personal Access Token for authentication if not already authenticated

### 4. **Enable GitHub Pages**
Use GitHub API to enable Pages:
```bash
curl -X POST \
  -H "Authorization: token GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/USERNAME/PROJECT-NAME/pages \
  -d '{"source": {"branch": "master", "path": "/"}}'
```

Then update to serve from `/docs` folder:
```bash
curl -X PUT \
  -H "Authorization: token GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/USERNAME/PROJECT-NAME/pages \
  -d '{"source": {"branch": "master", "path": "/docs"}}'
```

### 5. **Build & Deploy**
```bash
# Download Node.js if not available (use v22+ for Angular 20)
curl -fsSL https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz | tar -xJ -C /tmp
export PATH="/tmp/node-v22.12.0-linux-x64/bin:$PATH"

# Install and build
npm install
npm run build:prod

# Copy built files to /docs folder
mkdir -p docs
cp -r dist/PROJECT-NAME/browser/* docs/
touch docs/.nojekyll

# Commit and push
git add -f docs
git commit -m "Deploy to GitHub Pages"
git push -u origin master
```

### 6. **Verification**
```bash
# Test that the page is loading
curl -s https://USERNAME.github.io/PROJECT-NAME/ | grep "app-root"
```

### ⚠️ Critical Notes

1. **Node.js Version**: Angular 20+ requires Node.js v20.19+ or v22.12+. Use v22 if the build fails with version warnings.

2. **GitHub Pages + Jekyll**: GitHub Pages runs Jekyll by default, which interferes with static assets:
   - Create `.nojekyll` file in `/docs` folder to disable Jekyll
   - Serve from `/docs` folder instead of repository root

3. **Token Scope**: GitHub Personal Access Token must have `repo` scope. Workflow scope is needed only if pushing GitHub Actions workflow files.

4. **Build Output**: Angular 17+ builds to `dist/PROJECT-NAME/browser/`, NOT `dist/PROJECT-NAME/`. Always copy from the `/browser` subfolder.

5. **base-href**: Must match GitHub Pages URL path exactly:
   - For `https://username.github.io/project-name/` use `--base-href="/project-name/"`
   - Update in both `package.json` build scripts AND `src/index.html` `<base href>`

6. **Deployment Timeline**: GitHub Pages may take 2-5 minutes to update after pushing changes. Wait and clear browser cache if needed.

### 📋 Quick Reference Checklist
- ✅ Clone stub and copy files
- ✅ Update project name in package.json (3 places)
- ✅ Update project name in angular.json
- ✅ Create git remote and push
- ✅ Enable GitHub Pages via API (POST then PUT to `/docs` path)
- ✅ Install Node.js v22+
- ✅ Run `npm install && npm run build:prod`
- ✅ Create `/docs` folder with built files
- ✅ Add `.nojekyll` to `/docs` folder
- ✅ Push `/docs` folder to GitHub
- ✅ Wait 2-5 minutes and verify site loads

### 🔗 Live Site URL
After deployment, the game will be live at:
```
https://USERNAME.github.io/PROJECT-NAME/
```

---
