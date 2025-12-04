# 🚀 Speech Sensitivity Quick Start Guide

## ✅ Improvements Implemented

The system has been optimized for ChatGPT-like responsiveness to fast speech. All settings are now configurable via environment variables.

## 📝 Environment Variables

Add these to your `backend/.env` file to fine-tune speech detection sensitivity:

### 1. **VAD Threshold** (Most Important)
```bash
OPENAI_VAD_THRESHOLD=0.1
```
- **Default:** `0.1` (ChatGPT-like sensitivity)
- **Range:** `0.05` (very sensitive) to `0.2` (less sensitive)
- **What it does:** Controls how sensitive the system is to detecting speech
- **Lower = more sensitive** (better for fast speech)
- **Higher = less sensitive** (better for noisy environments)

### 2. **Silence Duration**
```bash
OPENAI_SILENCE_DURATION_MS=600
```
- **Default:** `600` (ChatGPT-like turn-taking)
- **Range:** `300ms` (very fast) to `1200ms` (slower, more conservative)
- **What it does:** How long to wait after speech ends before declaring turn completion
- **Lower = faster turn-taking** (AI responds sooner)
- **Higher = waits longer** (prevents mid-sentence cutoffs)

### 3. **Prefix Padding**
```bash
OPENAI_PREFIX_PADDING_MS=100
```
- **Default:** `100` (fast detection)
- **Range:** `50ms` (very fast) to `200ms` (more audio context)
- **What it does:** How much audio to buffer before speech detection
- **Lower = faster detection** (less latency)
- **Higher = more context** (better audio quality)

### 4. **Response Delay**
```bash
OPENAI_RESPONSE_DELAY_MS=50
```
- **Default:** `50` (near-instant)
- **Range:** `0ms` (instant) to `300ms` (delayed)
- **What it does:** Artificial delay before requesting AI response
- **Lower = faster response** (ChatGPT-like)
- **Higher = more conservative** (waits longer)

### 5. **Echo Grace Period**
```bash
OPENAI_ECHO_GRACE_PERIOD_MS=400
```
- **Default:** `400` (quick interruption allowed)
- **Range:** `200ms` (very quick) to `2000ms` (prevents all early interruptions)
- **What it does:** Time after AI starts speaking before allowing interruption
- **Lower = faster interruption** (ChatGPT-like)
- **Higher = prevents echo/feedback** (more conservative)

---

## 🎯 Recommended Settings by Use Case

### **Fast Speech / ChatGPT-Like (Current Defaults)**
```bash
OPENAI_VAD_THRESHOLD=0.1
OPENAI_SILENCE_DURATION_MS=600
OPENAI_PREFIX_PADDING_MS=100
OPENAI_RESPONSE_DELAY_MS=50
OPENAI_ECHO_GRACE_PERIOD_MS=400
```
**Best for:** Natural, fast-paced conversations

### **More Conservative (Less Sensitive)**
```bash
OPENAI_VAD_THRESHOLD=0.15
OPENAI_SILENCE_DURATION_MS=800
OPENAI_PREFIX_PADDING_MS=150
OPENAI_RESPONSE_DELAY_MS=100
OPENAI_ECHO_GRACE_PERIOD_MS=800
```
**Best for:** Noisy environments, preventing false positives

### **Maximum Sensitivity (Very Fast)**
```bash
OPENAI_VAD_THRESHOLD=0.08
OPENAI_SILENCE_DURATION_MS=400
OPENAI_PREFIX_PADDING_MS=50
OPENAI_RESPONSE_DELAY_MS=0
OPENAI_ECHO_GRACE_PERIOD_MS=300
```
**Best for:** Very fast speech, quick interruptions
**Warning:** May have more false positives in noisy environments

---

## 🔧 How to Apply Changes

1. **Add variables to `.env`:**
   ```bash
   cd backend
   nano .env  # or use your preferred editor
   ```

2. **Add the settings you want:**
   ```bash
   # Speech Detection Sensitivity (ChatGPT-like defaults)
   OPENAI_VAD_THRESHOLD=0.1
   OPENAI_SILENCE_DURATION_MS=600
   OPENAI_PREFIX_PADDING_MS=100
   OPENAI_RESPONSE_DELAY_MS=50
   OPENAI_ECHO_GRACE_PERIOD_MS=400
   ```

3. **Restart your backend:**
   ```bash
   npm run dev
   ```

4. **Test the changes:**
   - Make a test call
   - Try speaking quickly
   - Try interrupting the AI
   - Check if responsiveness improved

---

## 📊 What Changed from Before

| Setting | Before | After | Improvement |
|---------|--------|-------|-------------|
| VAD Threshold | 0.2 | 0.1 | **50% more sensitive** |
| Silence Duration | 1200ms | 600ms | **50% faster turn-taking** |
| Prefix Padding | 200ms | 100ms | **50% faster detection** |
| Response Delay | 300ms | 50ms | **83% faster response** |
| Echo Grace Period | 2000ms | 400ms | **80% faster interruption** |
| **Total Response Time** | **~1900ms** | **~800ms** | **58% faster** |

---

## 🧪 Testing Checklist

After applying changes, test:

- [ ] **Fast Speech:** Speak quickly - AI should detect immediately
- [ ] **Natural Pause:** Pause mid-sentence - should NOT cut off
- [ ] **Quick Interruption:** Interrupt AI quickly - should work within ~400ms
- [ ] **Background Noise:** Test in noisy environment - should not trigger false positives
- [ ] **Turn-Taking:** Normal conversation - should feel natural and responsive

---

## ⚠️ Troubleshooting

### **Too Sensitive (False Positives)**
- Increase `OPENAI_VAD_THRESHOLD` (try 0.12-0.15)
- Increase `OPENAI_ECHO_GRACE_PERIOD_MS` (try 600-800)
- Increase `OPENAI_SILENCE_DURATION_MS` (try 800-1000)

### **Not Sensitive Enough (Misses Fast Speech)**
- Decrease `OPENAI_VAD_THRESHOLD` (try 0.08-0.1)
- Decrease `OPENAI_SILENCE_DURATION_MS` (try 400-500)
- Decrease `OPENAI_RESPONSE_DELAY_MS` (try 0-25)
- Decrease `OPENAI_ECHO_GRACE_PERIOD_MS` (try 300-400)

### **Mid-Sentence Cutoffs**
- Increase `OPENAI_SILENCE_DURATION_MS` (try 700-900)
- Increase `OPENAI_PREFIX_PADDING_MS` (try 150-200)

### **Slow Response Time**
- Decrease `OPENAI_RESPONSE_DELAY_MS` (try 0-50)
- Decrease `OPENAI_SILENCE_DURATION_MS` (try 500-600)
- Decrease `OPENAI_PREFIX_PADDING_MS` (try 50-100)

---

## 📚 More Information

See `SPEECH_SENSITIVITY_ANALYSIS.md` for detailed analysis and technical explanations.

