# Chrome Extension Setup Guide

## 1. Create Extension Project

```bash
# From Desktop
mkdir opus1-extension
cd opus1-extension
npm init -y
```

## 2. Copy these files to opus1-extension/

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "Opus1 International Shipping",
  "version": "1.0.0",
  "description": "Ship internationally from any online store",
  
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  
  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ],
  
  "background": {
    "service_worker": "background/background.js"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/detector.js"],
      "run_at": "document_end"
    }
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "Opus1 Shipping",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png", 
    "128": "icons/icon128.png"
  },
  
  "web_accessible_resources": [
    {
      "resources": ["content/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### package.json
```json
{
  "name": "opus1-extension",
  "version": "1.0.0",
  "description": "Chrome extension for international shipping",
  "main": "background/background.js",
  "scripts": {
    "build": "echo 'Extension built'",
    "dev": "echo 'Extension in development'"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

## 3. Folder Structure to Create

```
opus1-extension/
├── manifest.json
├── package.json
├── background/
│   └── background.js
├── content/
│   ├── detector.js
│   ├── extractor.js
│   └── ui-injector.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── utils/
│   ├── api.js
│   ├── country-detect.js
│   └── form-filler.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 4. Development Workflow

```bash
# Terminal 1: Main app
cd /Users/benong/Desktop/Opus1
npm run dev

# Terminal 2: Extension development  
cd /Users/benong/Desktop/opus1-extension
# Edit files, then load in Chrome

# Chrome: chrome://extensions/
# Enable Developer mode
# Click "Load unpacked" → select opus1-extension folder
```

## 5. Next Steps

After creating the folder structure, I'll help you implement:
- Product page detection
- Data extraction 
- API communication with Opus1 app
- Forwarder selection UI
- Address generation & auto-fill