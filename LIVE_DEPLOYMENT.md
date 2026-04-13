# 🚀 LIVE DEPLOYMENT - INTERACTIVE GUIDE

## ✅ Step 1: GitHub (COMPLETE)
- [x] Code pushed to: https://github.com/akshatshakya27/Proctor
- [x] Ready for cloud deployment

---

## ⏭️ NEXT STEPS: Deploy Backend to Render

### What You Need:
- GitHub account (already connected)
- Render.com account (free)
- ~5-10 minutes

### Steps:

#### Step 2A: Create Render Account
1. **Open**: https://render.com
2. **Click**: "Sign up"
3. **Choose**: "Sign up with GitHub" (recommended)
4. **Authorize** Render to access your GitHub

#### Step 2B: Create Backend Service
1. **Logged in to Render.com**, click **"+ New"** button (top right)
2. **Select**: "Web Service"
3. **Select Repository**: `Proctor` (akshatshakya27)
4. **Fill these values**:
   ```
   Name:                  pheme-backend
   Environment:           Python 3
   Build Command:         pip install -r backend/requirements.txt
   Start Command:         uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
5. **Scroll Down** → **"Create Web Service"**
6. **Wait 3-5 minutes** for deployment

#### Step 2C: Add Environment Variables (While waiting)
1. **On your Render service page**, click **"Environment"** (left sidebar)
2. **Click "Add Environment Variable"** for each:

```
KEY                           VALUE
DATABASE_URL                  postgresql://postgres.bqsmpguckwqfuibduhrt:PhemeSoft2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
JWT_SECRET_KEY                shdjakshdfyastartdbfhjaystdfbftasbsfdjs
JWT_ALGORITHM                 HS256
ACCESS_TOKEN_EXPIRE_MINUTES   1440
BACKEND_HOST                  0.0.0.0
BACKEND_PORT                  8000
DESKTOP_UNLIMITED_RETAKES     false
ENVIRONMENT                   production
```

3. **Save Changes** → Service redeploys automatically

#### Step 2D: Verify Backend Deployment
Once build completes:
- **Check Status**: "Live" (green)
- **Copy URL**: Should look like `https://pheme-backend-XXXXX.onrender.com`
- **Visit**: `https://pheme-backend-XXXXX.onrender.com/docs`
- **Should see**: Interactive API documentation

**✅ When you see the API docs → Backend is LIVE!**

---

## ⏭️ NEXT STEPS: Deploy Frontend to Vercel

### What You Need:
- GitHub account (already connected)
- Vercel account (free - can create with GitHub)
- Node.js (already installed)
- ~3-5 minutes

### Commands (run in PowerShell):

```powershell
# Install Vercel CLI
npm install -g vercel

# Login to Vercel with GitHub
vercel login

# Deploy frontend
cd f:\Project\phemeAI\Proctor\frontend
vercel deploy --prod
```

**Follow prompts:**
- Project name: `pheme-frontend`
- Build: `dist`
- Settings: Accept defaults

**Result**: You'll get a URL like `https://pheme-frontend.vercel.app`

### Add Environment Variables to Vercel:

```powershell
# Add API URL
vercel env add VITE_API_URL
# When prompted, enter: https://pheme-backend-XXXXX.onrender.com/api

# Redeploy with new variables
vercel deploy --prod
```

**✅ When deployment completes → Frontend is LIVE!**

---

## ⏭️ NEXT STEPS: Update Desktop App

### 1. Update Config File
Edit: `f:\Project\phemeAI\Proctor\electron\desktop-config.json`

Replace the `backendUrl` with your Render backend URL:
```json
{
  "backendUrl": "https://pheme-backend-XXXXX.onrender.com"
}
```

### 2. Rebuild EXE
```powershell
cd f:\Project\phemeAI\Proctor\electron
npm run build:exe
```

Wait 10-15 minutes for build to complete.

**Result**: New EXE at `electron/dist/Pheme Secure Exam 1.0.0.exe`

### 3. Test the EXE
- Run the new EXE
- Should automatically connect to your live backend
- Test login with credentials

**✅ When you can login → Desktop app is configured!**

---

## ⏭️ FINAL STEP: Create Distribution Links

### Push Updated EXE to GitHub
```powershell
cd f:\Project\phemeAI\Proctor

# Add files
git add electron/dist/"Pheme Secure Exam 1.0.0.exe"
git add 'electron/dist/Pheme Secure Exam Setup 1.0.0.exe'

# Commit
git commit -m "Production EXE with live backend URL configured"

# Push
git push origin main
```

### Share These URLs

**For Students:**
```
📥 Download App:
https://github.com/akshatshakya27/Proctor/

Login Credentials: (provide separately to each student)

Instructions:
1. Download the EXE file from GitHub /releases
2. Double-click to run
3. Allow webcam/microphone access
4. Login with your credentials
5. Join exam!
```

**For Teachers/Admins:**
```
📊 Access Dashboard:
https://pheme-frontend.vercel.app

Login:
- Email: superadmin@pheme.testing
- Password: Testing123!
(Or other admin role credentials)
```

**For Proctors:**
```
👀 Live Monitoring:
https://pheme-frontend.vercel.app

Login:
- Email: examadmin@pheme.testing
- Password: Testing123!
```

---

## 🎉 YOUR SYSTEM IS NOW LIVE!

### Verify Everything Works:

```
✅ Backend API:     https://pheme-backend-XXXXX.onrender.com/docs
✅ Frontend:        https://pheme-frontend.vercel.app
✅ Desktop App:     electron/dist/Pheme Secure Exam 1.0.0.exe
✅ Database:        Supabase PostgreSQL (live)
✅ AI Engines:      Ready
✅ WebRTC:          Configured
✅ Chat:            Ready
```

---

## 📊 Deployment Checklist

- [ ] Render backend URL created
- [ ] Backend environment variables added
- [ ] Backend shows green "Live" status
- [ ] API docs load at backend URL/docs
- [ ] Vercel frontend deployed
- [ ] Frontend URL is live
- [ ] Desktop EXE updated with backend URL
- [ ] New EXE tested locally
- [ ] Files pushed to GitHub
- [ ] Test login works (all roles)
- [ ] Webcam detects in desktop app
- [ ] Chat tested (if applicable)

---

## 🆘 **COMMON ISSUES & FIXES**

### Backend won't build on Render
**Problem**: Build failed error  
**Fix**: Check logs on Render dashboard. Usually:
- `pip install -r backend/requirements.txt` failing
- Try: Update Python version to 3.12 in runtime settings

### Frontend won't deploy
**Problem**: Vercel deployment fails  
**Fix**:
```powershell
cd frontend
npm run build  # Test locally first
vercel deploy --prod
```

### EXE won't connect to backend
**Problem**: Can't reach backend  
**Fix**:
- Edit `electron/desktop-config.json` again
- Rebuild: `npm run build:exe`
- Test your backend URL manually in browser

### Still not working?
1. Check Render logs: Dashboard → Logs tab
2. Check Vercel logs: Deployments tab
3. Test backend URL in browser: `https://pheme-backend-XXXXX.onrender.com/docs`
4. Check internet connection

---

## 💡 TIPS

- **Render free tier**: Spins down after 15 min inactivity. Click "Keep Alive" to prevent.
- **Vercel free tier**: Always active, no spin-down
- **Test everything locally** before deploying
- **Save your backend URL** for later reference
- **Keep environment variables secure** (don't commit to GitHub)

---

## 📞 NEXT: 

When everything is deployed, you'll have:
- Live Backend API
- Live Frontend Dashboard
- EXE ready to distribute to students
- Everything accessible from anywhere

**Estimated total time: 20-30 minutes**

---

